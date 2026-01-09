"""
Workspace routes for creating and managing user workspaces with Metabase integration.
Includes Auto-Sync logic to discover dashboards created inside Metabase.
"""
import logging
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models import User, Workspace, WorkspaceMember, Dashboard
from app.auth.routes import get_current_user
from app.metabase.client import MetabaseClient
from app.config import settings

router = APIRouter(prefix="/api/workspaces", tags=["workspaces"])
logger = logging.getLogger(__name__)

# ==================== Dependency Injection ====================

def get_metabase_client() -> MetabaseClient:
    """Get Metabase client instance using app settings."""
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
    is_public: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class EmbeddedUrlResponse(BaseModel):
    url: str
    expires_in_minutes: int

# ==================== Internal Logic (The Sync Engine) ====================

async def sync_workspace_dashboards_logic(workspace_id: int, db: Session, mb_client: MetabaseClient):
    """
    Scans Metabase Collection for new dashboards and updates the local PostgreSQL database.
    This ensures that dashboards created in the Metabase UI appear in our app.
    """
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace or not workspace.metabase_collection_id:
        return []

    try:
        # 1. Fetch all items from the Metabase Collection
        items = await mb_client.get_collection_items(workspace.metabase_collection_id)
        
        # 2. Filter for dashboards and update local DB
        for item in items:
            if item.get("model") == "dashboard":
                mb_id = item.get("id")
                mb_name = item.get("name")
                
                # Check if dashboard already exists in our Postgres
                existing_dash = db.query(Dashboard).filter(
                    Dashboard.workspace_id == workspace_id,
                    Dashboard.metabase_dashboard_id == mb_id
                ).first()
                
                if not existing_dash:
                    # New dashboard discovered! Save it to Postgres.
                    new_dash = Dashboard(
                        workspace_id=workspace_id,
                        metabase_dashboard_id=mb_id,
                        metabase_dashboard_name=mb_name,
                        is_public=True,
                        created_at=datetime.utcnow()
                    )
                    db.add(new_dash)
                    await mb_client.enable_dashboard_embedding(mb_id)
                else:
                    # Dashboard exists, update name in case it was renamed in Metabase
                    existing_dash.metabase_dashboard_name = mb_name
        
        db.commit()
    except Exception as e:
        logger.error(f"Sync failed for workspace {workspace_id}: {str(e)}")
        db.rollback()

# ==================== Workspace Routes ====================

@router.post("", response_model=WorkspaceResponse, status_code=status.HTTP_201_CREATED)
async def create_workspace(
    workspace_data: WorkspaceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    mb_client: MetabaseClient = Depends(get_metabase_client)
):
    """Create a new workspace with Metabase collection and permissions."""
    try:
        # 1. Create Metabase collection
        collection = await mb_client.create_collection(
            name=workspace_data.name,
            description=workspace_data.description or ""
        )
        collection_id = collection.get("id")
        collection_name = collection.get("name")
        
        # 2. Enable embedding for the collection
        await mb_client.enable_collection_embedding(collection_id)
        
        # 3. Create Metabase permission group
        group_name = f"{workspace_data.name} Team"
        group = await mb_client.create_group(name=group_name)
        group_id = group.get("id")
        
        # 4. Set permissions
        await mb_client.set_collection_permissions(group_id, collection_id, "write")
        
        analytics_db_id = None
        try:
            databases = await mb_client.list_databases()
            for db_item in databases:
                if db_item.get("name") == "Analytics":
                    analytics_db_id = db_item["id"]
                    await mb_client.set_database_permissions(group_id, analytics_db_id)
                    break
        except Exception as db_err:
            logger.error(f"Database permission sync failed: {db_err}")

        # 5. Add user to group
        if current_user.metabase_user_id:
            await mb_client.add_user_to_group(current_user.metabase_user_id, group_id)
        
        # 6. Save Workspace to Postgres
        new_workspace = Workspace(
            name=workspace_data.name,
            description=workspace_data.description,
            owner_id=current_user.id,
            metabase_collection_id=collection_id,
            metabase_collection_name=collection_name,
            metabase_group_id=group_id,
            metabase_group_name=group_name,
            database_id=analytics_db_id,
            is_active=True
        )
        db.add(new_workspace)
        db.commit()
        db.refresh(new_workspace)
        
        # 7. Add owner as member
        db.add(WorkspaceMember(workspace_id=new_workspace.id, user_id=current_user.id, role="owner"))
        db.commit()
        
        return new_workspace
        
    except Exception as e:
        logger.error(f"Workspace creation failed: {str(e)}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("", response_model=List[WorkspaceResponse])
async def list_workspaces(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """List workspaces where user is owner or member."""
    return db.query(Workspace).join(WorkspaceMember, Workspace.id == WorkspaceMember.workspace_id)\
             .filter(WorkspaceMember.user_id == current_user.id, Workspace.is_active == True).all()

@router.get("/{workspace_id}", response_model=WorkspaceResponse)
async def get_workspace(workspace_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id, Workspace.is_active == True).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    member = db.query(WorkspaceMember).filter_by(workspace_id=workspace_id, user_id=current_user.id).first()
    if not member:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return workspace

# ==================== Dashboard & Embedding Routes ====================

@router.get("/{workspace_id}/dashboards", response_model=List[DashboardResponse])
async def list_dashboards(
    workspace_id: int, 
    current_user: User = Depends(get_current_user), 
    db: Session = Depends(get_db),
    mb_client: MetabaseClient = Depends(get_metabase_client)
):
    """
    List dashboards belonging to a workspace. 
    Triggers an AUTO-SYNC with Metabase before returning the list.
    """
    member = db.query(WorkspaceMember).filter_by(workspace_id=workspace_id, user_id=current_user.id).first()
    if not member:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Run the Sync Logic to pull new dashboards from Metabase
    await sync_workspace_dashboards_logic(workspace_id, db, mb_client)
        
    # Now return whatever is in our local database
    return db.query(Dashboard).filter(Dashboard.workspace_id == workspace_id).all()

@router.get("/dashboards/{dashboard_id}/embed", response_model=EmbeddedUrlResponse)
async def get_dashboard_embed_url(
    dashboard_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    mb_client: MetabaseClient = Depends(get_metabase_client)
):
    """Returns a secure, JWT-signed URL for an individual dashboard."""
    dashboard = db.query(Dashboard).filter(Dashboard.id == dashboard_id).first()
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")

    member = db.query(WorkspaceMember).filter_by(workspace_id=dashboard.workspace_id, user_id=current_user.id).first()
    if not member:
        raise HTTPException(status_code=403, detail="Access denied")

    full_url = mb_client.get_dashboard_embed_url(dashboard.metabase_dashboard_id)
    
    return {
        "url": full_url,
        "expires_in_minutes": 60
    }

@router.get("/{workspace_id}/embed", response_model=EmbeddedUrlResponse)
async def get_workspace_collection_url(
    workspace_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    mb_client: MetabaseClient = Depends(get_metabase_client)
):
    """Returns a JWT-signed URL for the entire workspace collection."""
    workspace = db.query(Workspace).filter_by(id=workspace_id, is_active=True).first()
    if not workspace or not workspace.metabase_collection_id:
        raise HTTPException(status_code=404, detail="Workspace collection not found")

    member = db.query(WorkspaceMember).filter_by(workspace_id=workspace_id, user_id=current_user.id).first()
    if not member:
        raise HTTPException(status_code=403, detail="Access denied")

    path = mb_client.get_embedded_collection_url(workspace.metabase_collection_id)
    full_url = f"{mb_client.base_url}{path}"
    
    return {
        "url": full_url,
        "expires_in_minutes": 60
    }