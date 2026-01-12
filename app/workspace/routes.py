"""
Workspace routes for creating and managing user workspaces with Metabase integration.
Includes Auto-Sync logic to discover dashboards created inside Metabase.
"""
import logging
import time
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models import User, Workspace, WorkspaceMember, Dashboard
from app.auth.routes import get_current_user
from app.metabase.client import MetabaseClient
from app.config import Settings

router = APIRouter(prefix="/api/workspaces", tags=["workspaces"])
logger = logging.getLogger(__name__)
settings = Settings()

# ==================== Dependency Injection ====================

def get_metabase_client() -> MetabaseClient:
    """Get Metabase client instance using app settings."""
    return MetabaseClient(
        base_url=settings.METABASE_URL,
        admin_email=settings.METABASE_ADMIN_EMAIL,
        admin_password=settings.METABASE_ADMIN_PASSWORD,
        embedding_secret=settings.METABASE_EMBEDDING_SECRET,
        public_url=getattr(settings, 'METABASE_PUBLIC_URL', settings.METABASE_URL)
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
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class DashboardResponse(BaseModel):
    id: int
    workspace_id: int
    metabase_dashboard_id: int
    metabase_dashboard_name: str
    is_public: Optional[bool] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class EmbeddedUrlResponse(BaseModel):
    url: str
    expires_in_minutes: int


# ==================== Internal Logic (The Sync Engine) ====================

async def sync_workspace_dashboards_logic(
    workspace_id: int,
    db: Session,
    mb_client: MetabaseClient
):
    """
    Sync dashboards and questions from Metabase collection to local database.
    Automatically enables embedding for newly discovered items.
    """
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    
    if not workspace or not workspace.metabase_collection_id:
        logger.warning(f"Workspace {workspace_id} has no Metabase collection")
        return []

    try:
        # Get all items from Metabase collection
        items = await mb_client.get_collection_items(workspace.metabase_collection_id)
        
        synced_count = 0
        
        for item in items:
            model_type = item.get("model")
            
            # Only sync dashboards and questions (cards)
            if model_type not in ["dashboard", "card"]:
                continue
            
            mb_id = item.get("id")
            mb_name = item.get("name")
            
            if not mb_id or not mb_name:
                continue

            # Check if item already exists in our database
            existing_item = db.query(Dashboard).filter(
                Dashboard.workspace_id == workspace_id,
                Dashboard.metabase_dashboard_id == mb_id
            ).first()
            
            if not existing_item:
                # Create new dashboard record
                new_item = Dashboard(
                    workspace_id=workspace_id,
                    metabase_dashboard_id=mb_id,
                    metabase_dashboard_name=mb_name,
                    is_public=False
                )
                db.add(new_item)
                synced_count += 1
                
                # Enable embedding for this new item
                try:
                    # Use appropriate resource type
                    resource_type = "dashboard" if model_type == "dashboard" else "card"
                    await mb_client.enable_resource_embedding(mb_id, resource_type)
                    logger.info(f"Enabled embedding for {resource_type} {mb_id}")
                except Exception as e:
                    logger.warning(f"Could not enable embedding for {model_type} {mb_id}: {str(e)}")
        
        db.commit()
        
        if synced_count > 0:
            logger.info(f"Synced {synced_count} new items for workspace {workspace_id}")
        
        return synced_count
        
    except Exception as e:
        logger.error(f"Dashboard sync failed for workspace {workspace_id}: {str(e)}")
        db.rollback()
        raise


# ==================== Workspace Routes ====================

@router.post("", response_model=WorkspaceResponse, status_code=status.HTTP_201_CREATED)
async def create_workspace(
    workspace_data: WorkspaceCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    mb_client: MetabaseClient = Depends(get_metabase_client)
):
    """
    Create a new workspace with Metabase collection and permissions.
    
    This endpoint:
    1. Creates a Metabase collection
    2. Enables embedding for the collection
    3. Creates a permission group (with conflict handling)
    4. Sets collection and database permissions
    5. Adds the user to the group
    6. Saves the workspace to the database
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
        
        logger.info(f"Created Metabase collection: {collection_id}")
        
        # 2. Enable embedding for the collection
        try:
            await mb_client.enable_collection_embedding(collection_id)
            logger.info(f"Enabled embedding for collection {collection_id}")
        except Exception as embed_err:
            logger.warning(f"Could not enable collection embedding: {embed_err}")
        
        # 3. Create Metabase permission group (with conflict handling)
        group_name = f"{workspace_data.name} Team"
        group_id = None
        
        try:
            # Try to create the group
            group = await mb_client.create_group(name=group_name)
            group_id = group.get("id")
            logger.info(f"Created new Metabase group '{group_name}' (ID: {group_id})")
            
        except Exception as group_err:
            logger.warning(f"Group creation failed, checking for existing group: {group_err}")
            
            # Group might already exist - the create_group method in client.py
            # already has fallback logic to find existing groups
            # If it still failed, create with timestamp
            try:
                unique_group_name = f"{group_name}_{int(time.time())}"
                group = await mb_client.create_group(name=unique_group_name)
                group_id = group.get("id")
                group_name = unique_group_name
                logger.info(f"Created timestamped group '{group_name}' (ID: {group_id})")
            except Exception as final_err:
                logger.error(f"Failed to create group even with timestamp: {final_err}")
                raise HTTPException(
                    status_code=500,
                    detail="Failed to create workspace group in Metabase"
                )
        
        if not group_id:
            raise HTTPException(
                status_code=500,
                detail="Failed to get group ID from Metabase"
            )
        
        # 4. Set collection permissions for the group (write access)
        logger.info(f"Setting write permissions for group {group_id} on collection {collection_id}")
        
        await mb_client.set_collection_permissions(
            group_id=group_id,
            collection_id=collection_id,
            permission="write"
        )
        
        # 5. Set database permissions for default database
        analytics_db_id = None
        
        try:
            databases = await mb_client.list_databases()
            
            # Look for "Analytics Database" (exact name from init-analytics.sql)
            for db_item in databases:
                db_name = db_item.get("name", "")
                if db_name in ["Analytics Database", "Analytics"]:  # Support both names
                    analytics_db_id = db_item["id"]
                    
                    logger.info(f"Setting database permissions for group {group_id} on database {analytics_db_id}")
                    
                    await mb_client.set_database_permissions(
                        group_id=group_id,
                        database_id=analytics_db_id,
                        schema_name="public",
                        permission="all"
                    )
                    
                    logger.info("Database permissions set successfully")
                    break
            
            if not analytics_db_id:
                logger.warning("Analytics Database not found in Metabase")
                
        except Exception as db_err:
            logger.error(f"Database permission sync failed: {db_err}")
            # Don't fail workspace creation if this fails

        # 6. Add user to workspace group
        if current_user.metabase_user_id:
            try:
                await mb_client.add_user_to_group(
                    user_id=current_user.metabase_user_id,
                    group_id=group_id
                )
                logger.info(f"Added user {current_user.email} to group {group_id}")
            except Exception as add_err:
                logger.warning(f"Failed to add user to group: {add_err}")
        else:
            logger.warning(f"User {current_user.email} has no metabase_user_id")
        
        # 7. Save Workspace to database
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
        
        # 8. Add owner as workspace member
        member = WorkspaceMember(
            workspace_id=new_workspace.id,
            user_id=current_user.id,
            role="owner"
        )
        
        db.add(member)
        db.commit()
        
        logger.info(f"Successfully created workspace {new_workspace.id}")
        
        return new_workspace
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        logger.error(f"Workspace creation failed: {str(e)}")
        db.rollback()
        
        # Attempt cleanup
        try:
            if 'collection_id' in locals() and collection_id:
                # Note: We don't have a delete_collection method yet
                logger.warning(f"Collection {collection_id} may need manual cleanup")
        except Exception as cleanup_err:
            logger.error(f"Cleanup failed: {cleanup_err}")
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create workspace: {str(e)}"
        )


@router.get("", response_model=List[WorkspaceResponse])
async def list_workspaces(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List workspaces where user is owner or member."""
    workspaces = db.query(Workspace)\
        .join(WorkspaceMember, Workspace.id == WorkspaceMember.workspace_id)\
        .filter(
            WorkspaceMember.user_id == current_user.id,
            Workspace.is_active == True
        )\
        .all()
    
    return workspaces


@router.get("/{workspace_id}", response_model=WorkspaceResponse)
async def get_workspace(
    workspace_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific workspace by ID."""
    workspace = db.query(Workspace).filter(
        Workspace.id == workspace_id,
        Workspace.is_active == True
    ).first()
    
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found"
        )
    
    # Check if user has access
    member = db.query(WorkspaceMember).filter_by(
        workspace_id=workspace_id,
        user_id=current_user.id
    ).first()
    
    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this workspace"
        )
    
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
    # Check access
    member = db.query(WorkspaceMember).filter_by(
        workspace_id=workspace_id,
        user_id=current_user.id
    ).first()
    
    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this workspace"
        )
    
    # Auto-sync dashboards from Metabase
    try:
        await sync_workspace_dashboards_logic(workspace_id, db, mb_client)
    except Exception as sync_err:
        logger.error(f"Dashboard sync failed: {sync_err}")
        # Continue even if sync fails
    else:
        # After sync, ensure all dashboards in this workspace are embedding-enabled
        dashboards = db.query(Dashboard).filter(
            Dashboard.workspace_id == workspace_id
        ).all()
        for dash in dashboards:
            try:
                await mb_client.ensure_dashboard_embedding(dash.metabase_dashboard_id)
            except Exception as embed_err:
                logger.warning(f"Failed to ensure embedding for dashboard {dash.id}: {embed_err}")
    
    # Return dashboards from database
    dashboards = db.query(Dashboard).filter(
        Dashboard.workspace_id == workspace_id
    ).all()
    
    return dashboards


@router.get("/dashboards/{dashboard_id}/embed", response_model=EmbeddedUrlResponse)
async def get_dashboard_embed_url(
    dashboard_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    mb_client: MetabaseClient = Depends(get_metabase_client)
):
    """Get embedded URL for a specific dashboard."""
    dashboard = db.query(Dashboard).filter(Dashboard.id == dashboard_id).first()
    
    if not dashboard:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dashboard not found"
        )
    
    # Check if user has access to the workspace
    member = db.query(WorkspaceMember).filter_by(
        workspace_id=dashboard.workspace_id,
        user_id=current_user.id
    ).first()
    
    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this dashboard"
        )
    
    await mb_client.ensure_dashboard_embedding(dashboard.metabase_dashboard_id)
    
    # FIX: Pass current_user.email to the client
    url_path = mb_client.get_dashboard_embed_url(
        dashboard_id=dashboard.metabase_dashboard_id,
        user_email=current_user.email,  # <--- REQUIRED
        filters={}
    )
    
    return {
        "url": url_path,
        "expires_in_minutes": 60
    }


@router.get("/{workspace_id}/embed", response_model=EmbeddedUrlResponse)
async def get_workspace_collection_url(
    workspace_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    mb_client: MetabaseClient = Depends(get_metabase_client)
):
    """
    Returns a JWT-signed URL for the entire workspace collection.
    Ensures collection embedding is enabled before generating the URL.
    """
    # 1. Fetch workspace and validate existence
    workspace = db.query(Workspace).filter_by(
        id=workspace_id,
        is_active=True
    ).first()
    
    if not workspace or not workspace.metabase_collection_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace collection not found"
        )
    
    # 2. Check user access to this specific workspace
    member = db.query(WorkspaceMember).filter_by(
        workspace_id=workspace_id,
        user_id=current_user.id
    ).first()
    
    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this workspace"
        )
    
    # 3. CRITICAL: Ensure collection embedding is enabled in Metabase
    try:
        # Verify the collection exists in Metabase
        collection = await mb_client.get_collection(workspace.metabase_collection_id)
        if not collection:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Collection {workspace.metabase_collection_id} not found in Metabase"
            )
        
        # Ensure 'enable_embedding' is set to True via API
        # This handles the 'Not Found' error for interactive frames
        embedding_enabled = await mb_client.enable_resource_embedding(
            workspace.metabase_collection_id, 
            resource_type="collection"
        )
        
        if not embedding_enabled:
            logger.warning(f"Could not enable embedding for collection {workspace.metabase_collection_id}")
            # Fallback check
            if collection.get("enable_embedding") is not True:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to enable collection embedding. Check Metabase Admin settings."
                )
        
        logger.info(f"Ensured embedding is enabled for collection {workspace.metabase_collection_id}")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error ensuring collection embedding: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to prepare collection for embedding: {str(e)}"
        )
    
    # 4. Generate the signed URL
    # FIX: We now pass current_user.email to satisfy the new client method signature
    # and provide the identity needed for Interactive Embedding.
    try:
        url_path = mb_client.get_embedded_collection_url(
            collection_id=workspace.metabase_collection_id,
            user_email=current_user.email
        )
        
        return {
            "url": url_path,
            "expires_in_minutes": 60
        }
    except Exception as e:
        logger.error(f"Failed to generate signed URL: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not generate secure embedding link."
        )
        