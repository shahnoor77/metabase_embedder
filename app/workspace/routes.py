"""
Workspace routes for creating and managing user workspaces with Metabase integration.
"""
import logging
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models import User, Workspace, WorkspaceMember, Dashboard

from app.metabase.client import MetabaseClient
from app.config import Settings

router = APIRouter(prefix="/workspaces", tags=["workspaces"])
logger = logging.getLogger(__name__)
settings = Settings()

# ==================== Dependency Injection ====================

def get_metabase_client() -> MetabaseClient:
    """Get Metabase client instance."""
    return MetabaseClient(
        base_url=settings.METABASE_URL,
        admin_email=settings.METABASE_ADMIN_EMAIL,
        admin_password=settings.METABASE_ADMIN_PASSWORD,
        embedding_secret=settings.METABASE_EMBEDDING_SECRET
    )


# ==================== Pydantic Schemas ====================

class WorkspaceCreate(BaseModel):
    name: str
    description: Optional[str] = None


class WorkspaceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class WorkspaceResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    owner_id: int
    metabase_collection_id: Optional[int]
    metabase_collection_name: Optional[str]
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class DashboardResponse(BaseModel):
    id: int
    workspace_id: int
    metabase_dashboard_id: int
    metabase_dashboard_name: str
    description: Optional[str]
    is_public: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class EmbeddedUrlResponse(BaseModel):
    url: str
    expires_in_minutes: int


# ==================== Workspace Routes ====================
from app.auth.routes import get_current_user
@router.post("", response_model=WorkspaceResponse, status_code=status.HTTP_201_CREATED)

async def create_workspace(
    workspace_data: WorkspaceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    mb_client: MetabaseClient = Depends(get_metabase_client)
):
    """
    Create a new workspace with Metabase collection and permissions.
    1. Creates Metabase Collection
    2. Enables Embedding for that collection
    3. Sets up Groups and Permissions
    4. Records workspace in local DB
    """
    try:
        # 1. Create Metabase collection
        logger.info(f"Creating Metabase collection for workspace: {workspace_data.name}")
        
        collection = await mb_client.create_collection(
            name=workspace_data.name,
            description=workspace_data.description or ""
        )
        
        collection_id = collection.get("id")
        collection_name = collection.get("name")
        
        # --- FIX: Automatically enable the embedding toggle in Metabase ---
        await mb_client.enable_collection_embedding(collection_id)
        logger.info(f"Embedding enabled for collection: {collection_id}")
        
        # 2. Create Metabase permission group
        group_name = f"{workspace_data.name} Team"
        group = await mb_client.create_group(name=group_name)
        group_id = group.get("id")
        group_name = group.get("name")
        
        # 3. Set collection permissions for the group (write access)
        await mb_client.set_collection_permissions(
            group_id=group_id,
            collection_id=collection_id,
            permission="write"
        )
        
        # 4. Set database permissions (Assumes "Analytics Database" exists in Metabase)
        analytics_db = None
        try:
            databases = await mb_client.list_databases()
            for db_item in databases:
                if db_item.get("name") == "Analytics":
                    analytics_db = db_item
                    break
            
            if analytics_db:
                await mb_client.set_database_permissions(
                    group_id=group_id,
                    database_id=analytics_db["id"],
                    schema_name="public",
                    permission="all"
                )
        except Exception as db_perm_error:
            logger.error(f"Error setting database permissions: {str(db_perm_error)}")
        
        # 5. Add user to workspace group
        if current_user.metabase_user_id:
            try:
                await mb_client.add_user_to_group(current_user.metabase_user_id, group_id)
            except Exception as add_error:
                logger.warning(f"Error adding user to group: {str(add_error)}")
        
        # 6. Create workspace in application database
        new_workspace = Workspace(
            name=workspace_data.name,
            description=workspace_data.description,
            owner_id=current_user.id,
            metabase_collection_id=collection_id,
            metabase_collection_name=collection_name,
            metabase_group_id=group_id,
            metabase_group_name=group_name,
            database_id=analytics_db["id"] if analytics_db else None,
            is_active=True
        )
        
        db.add(new_workspace)
        db.commit()
        db.refresh(new_workspace)
        
        # 7. Add owner as workspace member
        member = WorkspaceMember(
            workspace_id=new_workspace.id,
            user_id=current_user.id,
            role="owner"
        )
        db.add(member)
        db.commit()
        
        return new_workspace
        
    except Exception as e:
        logger.error(f"Error creating workspace: {str(e)}")
        db.rollback()
        # Cleanup Metabase if local DB fails
        try:
            if 'collection_id' in locals():
                await mb_client.delete_collection(collection_id)
            if 'group_id' in locals():
                await mb_client.delete_group(group_id)
        except:
            pass
        raise HTTPException(status_code=500, detail=f"Failed to create workspace: {str(e)}")


@router.get("", response_model=List[WorkspaceResponse])
async def list_workspaces(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """List all workspaces where user is an owner or member."""
    owned = db.query(Workspace).filter(Workspace.owner_id == current_user.id, Workspace.is_active == True).all()
    member_of = db.query(Workspace).join(WorkspaceMember).filter(WorkspaceMember.user_id == current_user.id, Workspace.is_active == True).all()
    
    unique_workspaces = {ws.id: ws for ws in (owned + member_of)}.values()
    return list(unique_workspaces)


@router.get("/{workspace_id}", response_model=WorkspaceResponse)
async def get_workspace(workspace_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Retrieve details for a specific workspace."""
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id, Workspace.is_active == True).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    # Check access
    is_member = db.query(WorkspaceMember).filter(WorkspaceMember.workspace_id == workspace_id, WorkspaceMember.user_id == current_user.id).first()
    if not is_member and workspace.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="You do not have access to this workspace")
    
    return workspace


@router.get("/{workspace_id}/embedded-url", response_model=EmbeddedUrlResponse)
async def get_workspace_embedded_url(
    workspace_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    mb_client: MetabaseClient = Depends(get_metabase_client)
):
    """
    Returns a fully qualified, JWT-signed URL for embedding the workspace collection.
    """
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id, Workspace.is_active == True).first()
    
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    # Verify access
    is_member = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == workspace_id, 
        WorkspaceMember.user_id == current_user.id
    ).first()

    if not is_member and workspace.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if not workspace.metabase_collection_id:
        raise HTTPException(status_code=400, detail="Metabase integration is not set up for this workspace")
    
    # Generate the JWT-signed path (e.g., /embed/collection/...)
    url_path = mb_client.get_embedded_collection_url(workspace.metabase_collection_id)
    
    # --- FIX: Combine Base URL + Path for a valid Iframe Source ---
    full_url = f"{settings.METABASE_URL.rstrip('/')}{url_path}"
    
    return {
        "url": full_url,
        "expires_in_minutes": 60
    }


@router.get("/{workspace_id}/dashboards", response_model=List[DashboardResponse])
async def list_workspace_dashboards(workspace_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """List dashboards associated with the workspace."""
    # Ensure user has access to the workspace first
    await get_workspace(workspace_id, current_user, db)
    return db.query(Dashboard).filter(Dashboard.workspace_id == workspace_id).all()