from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from app.database import get_db
from app.models import User, Workspace, Dashboard
from app.auth.dependencies import get_current_user
from app.metabase.client import MetabaseClient

router = APIRouter()

class DashboardCreate(BaseModel):
    workspace_id: int
    name: str

class DashboardResponse(BaseModel):
    id: int
    workspace_id: int
    metabase_dashboard_id: int
    metabase_dashboard_name: str
    embed_url: Optional[str] = None
    
    class Config:
        from_attributes = True

def check_workspace_access(user: User, workspace: Workspace):
    """Helper to check if user is owner or member of the workspace."""
    is_owner = workspace.owner_id == user.id
    is_member = any(member.user_id == user.id for member in workspace.members)
    if not (is_owner or is_member):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this workspace"
        )

@router.post("", response_model=DashboardResponse, status_code=status.HTTP_201_CREATED)
async def create_dashboard(
    dashboard_data: DashboardCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    workspace = db.query(Workspace).filter(Workspace.id == dashboard_data.workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    check_workspace_access(current_user, workspace)
    
    mb_client = MetabaseClient()
    await mb_client.login()
    
    try:
        mb_dashboard = await mb_client.create_dashboard(
            dashboard_data.name,
            workspace.metabase_collection_id
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Metabase error: {str(e)}")
    
    dashboard = Dashboard(
        workspace_id=workspace.id,
        metabase_dashboard_id=mb_dashboard["id"],
        metabase_dashboard_name=dashboard_data.name,
    )
    
    db.add(dashboard)
    db.commit()
    db.refresh(dashboard)
    return dashboard

@router.get("", response_model=List[DashboardResponse])
def list_dashboards(
    workspace_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    check_workspace_access(current_user, workspace)
    return workspace.dashboards

@router.get("/{dashboard_id}", response_model=DashboardResponse)
async def get_dashboard(
    dashboard_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    dashboard = db.query(Dashboard).filter(Dashboard.id == dashboard_id).first()
    if not dashboard:
        raise HTTPException(status_code=404, detail="Dashboard not found")
    
    check_workspace_access(current_user, dashboard.workspace)
    
    mb_client = MetabaseClient()
    await mb_client.login()
    
    try:
        embed_url = mb_client.generate_embed_url(dashboard.metabase_dashboard_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Embed error: {str(e)}")
    
    response_data = DashboardResponse.model_validate(dashboard)
    response_data.embed_url = embed_url
    return response_data