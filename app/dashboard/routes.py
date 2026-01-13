"""
Dashboard management routes.
Handles dashboard creation, publishing, and user dashboard associations.
"""
import logging
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.database import get_db
from app.models import User, Workspace, Dashboard, UserDashboard, WorkspaceMember
from app.auth.routes import get_current_user
from app.metabase.client import MetabaseClient
from app.config import Settings

router = APIRouter(prefix="/api/dashboards", tags=["dashboards"])
logger = logging.getLogger(__name__)
settings = Settings()

# ==================== Dependency Injection ====================

def get_metabase_client() -> MetabaseClient:
    """Get Metabase client instance."""
    return MetabaseClient(
        base_url=settings.METABASE_URL,
        admin_email=settings.METABASE_ADMIN_EMAIL,
        admin_password=settings.METABASE_ADMIN_PASSWORD,
        embedding_secret=settings.METABASE_EMBEDDING_SECRET,
        public_url=getattr(settings, 'METABASE_PUBLIC_URL', settings.METABASE_URL)
    )

# ==================== Pydantic Schemas ====================

class DashboardCreate(BaseModel):
    workspace_id: int
    name: str
    description: Optional[str] = None


class DashboardPublish(BaseModel):
    dashboard_id: int


class UserDashboardResponse(BaseModel):
    id: int
    workspace_id: int
    metabase_dashboard_id: int
    metabase_dashboard_name: str
    description: Optional[str]
    is_published: bool
    is_owner: bool
    is_pinned: bool
    created_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True


class DashboardEditorUrlResponse(BaseModel):
    editor_url: str
    dashboard_id: int
    metabase_dashboard_id: int


class DashboardEmbedResponse(BaseModel):
    embed_url: str
    editor_url: str
    dashboard_id: int
    is_owner: bool


# ==================== Routes ====================

@router.post("", response_model=UserDashboardResponse, status_code=status.HTTP_201_CREATED)
async def create_dashboard(
    dashboard_data: DashboardCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    mb_client: MetabaseClient = Depends(get_metabase_client)
):
    """
    Create a new dashboard in a workspace.
    
    Flow:
    1. Verify user has access to workspace
    2. Create dashboard in Metabase
    3. Enable embedding on the dashboard
    4. Create local dashboard record
    5. Associate user as owner
    """
    # 1. Verify workspace access
    workspace = db.query(Workspace).filter(Workspace.id == dashboard_data.workspace_id).first()
    if not workspace:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Workspace not found"
        )
    
    member = db.query(WorkspaceMember).filter_by(
        workspace_id=workspace.id,
        user_id=current_user.id
    ).first()
    
    if not member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this workspace"
        )
    
    try:
        # 2. Create dashboard in Metabase
        logger.info(f"Creating dashboard '{dashboard_data.name}' in workspace {workspace.id}")
        
        mb_dashboard = await mb_client.create_dashboard(
            name=dashboard_data.name,
            collection_id=workspace.metabase_collection_id
        )
        
        dashboard_id = mb_dashboard.get("id")
        
        if not dashboard_id:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create dashboard in Metabase"
            )
        
        # 3. Enable embedding (auto-publish)
        try:
            await mb_client.ensure_dashboard_embedding(dashboard_id)
            logger.info(f"Enabled embedding for dashboard {dashboard_id}")
        except Exception as embed_err:
            logger.warning(f"Could not enable embedding: {embed_err}")
        
        # 4. Create local dashboard record
        new_dashboard = Dashboard(
            workspace_id=workspace.id,
            metabase_dashboard_id=dashboard_id,
            metabase_dashboard_name=dashboard_data.name,
            description=dashboard_data.description,
            is_public=True,
            is_published=True
        )
        
        db.add(new_dashboard)
        db.flush()  # Get the ID before creating UserDashboard
        
        # 5. Associate user as owner
        user_dashboard = UserDashboard(
            user_id=current_user.id,
            dashboard_id=new_dashboard.id,
            is_owner=True,
            is_pinned=True  # Auto-pin user's own dashboards
        )
        
        db.add(user_dashboard)
        db.commit()
        db.refresh(new_dashboard)
        
        logger.info(f"Successfully created dashboard {new_dashboard.id}")
        
        response = UserDashboardResponse.model_validate(new_dashboard)
        response.is_owner = True
        response.is_pinned = True
        
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Dashboard creation failed: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create dashboard: {str(e)}"
        )


@router.get("/my-dashboards", response_model=List[UserDashboardResponse])
async def list_my_dashboards(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    List all dashboards owned/accessed by the current user.
    Shows "Your Dashboards" section.
    """
    try:
        # Get all user_dashboard associations for this user
        user_dashboards = db.query(UserDashboard)\
            .filter(UserDashboard.user_id == current_user.id)\
            .all()
        
        if not user_dashboards:
            return []
        
        dashboards = []
        for ud in user_dashboards:
            dashboard = ud.dashboard
            response = UserDashboardResponse.model_validate(dashboard)
            response.is_owner = ud.is_owner
            response.is_pinned = ud.is_pinned
            dashboards.append(response)
        
        return dashboards
        
    except Exception as e:
        logger.error(f"Failed to list dashboards: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch dashboards"
        )


@router.get("/{dashboard_id}/embed", response_model=DashboardEmbedResponse)
async def get_dashboard_embed_and_editor(
    dashboard_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    mb_client: MetabaseClient = Depends(get_metabase_client)
):
    """
    Get embed URL and dashboard editor URL for a specific dashboard.
    Returns both viewer and editor URLs with restrictions.
    """
    # Verify dashboard exists and user has access
    user_dashboard = db.query(UserDashboard).filter_by(
        user_id=current_user.id,
        dashboard_id=dashboard_id
    ).first()
    
    if not user_dashboard:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Dashboard not found or access denied"
        )
    
    dashboard = user_dashboard.dashboard
    
    try:
        # Ensure embedding is enabled
        await mb_client.ensure_dashboard_embedding(dashboard.metabase_dashboard_id)
        
        # Generate embed URL (viewer mode)
        embed_url = mb_client.get_dashboard_embed_url(
            dashboard_id=dashboard.metabase_dashboard_id,
            user_email=current_user.email,
            filters={}
        )
        
        # Generate editor URL (restricted dashboard editor)
        editor_url = mb_client.get_dashboard_editor_url(
            dashboard_id=dashboard.metabase_dashboard_id,
            user_email=current_user.email,
            is_owner=user_dashboard.is_owner
        )
        
        return {
            "embed_url": embed_url,
            "editor_url": editor_url,
            "dashboard_id": dashboard.id,
            "is_owner": user_dashboard.is_owner
        }
        
    except Exception as e:
        logger.error(f"Failed to generate URLs: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate dashboard URLs"
        )


@router.post("/{dashboard_id}/publish", status_code=status.HTTP_200_OK)
async def publish_dashboard(
    dashboard_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    mb_client: MetabaseClient = Depends(get_metabase_client)
):
    """
    Publish a dashboard (make it public and enable embedding).
    Only owners can publish.
    """
    # Verify ownership
    user_dashboard = db.query(UserDashboard).filter_by(
        user_id=current_user.id,
        dashboard_id=dashboard_id
    ).first()
    
    if not user_dashboard or not user_dashboard.is_owner:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only dashboard owner can publish"
        )
    
    dashboard = user_dashboard.dashboard
    
    try:
        # Enable embedding in Metabase
        await mb_client.ensure_dashboard_embedding(dashboard.metabase_dashboard_id)
        
        # Update local record
        dashboard.is_published = True
        dashboard.is_public = True
        db.commit()
        
        logger.info(f"Published dashboard {dashboard.id}")
        
        return {
            "status": "published",
            "dashboard_id": dashboard.id,
            "message": "Dashboard published successfully"
        }
        
    except Exception as e:
        logger.error(f"Failed to publish dashboard: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to publish dashboard"
        )


@router.delete("/{dashboard_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_dashboard(
    dashboard_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a dashboard (only owner can delete).
    Note: Metabase dashboard deletion requires admin access, so we only soft-delete locally.
    """
    user_dashboard = db.query(UserDashboard).filter_by(
        user_id=current_user.id,
        dashboard_id=dashboard_id
    ).first()
    
    if not user_dashboard or not user_dashboard.is_owner:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only dashboard owner can delete"
        )
    
    try:
        # Soft delete - remove user association
        db.delete(user_dashboard)
        
        # If no more users have access, deactivate the dashboard
        remaining_users = db.query(UserDashboard).filter_by(
            dashboard_id=dashboard_id
        ).count()
        
        if remaining_users == 0:
            dashboard = db.query(Dashboard).filter_by(id=dashboard_id).first()
            if dashboard:
                dashboard.is_published = False
        
        db.commit()
        logger.info(f"Deleted user dashboard association for dashboard {dashboard_id}")
        
    except Exception as e:
        logger.error(f"Failed to delete dashboard: {str(e)}")
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete dashboard"
        )