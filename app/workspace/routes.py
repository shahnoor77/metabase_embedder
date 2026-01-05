from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Workspace
from app.auth.dependencies import get_current_user
from app.metabase.client import MetabaseClient
from pydantic import BaseModel

router = APIRouter()

class DashboardCreate(BaseModel):
    name: str
    workspace_id: int

@router.post("")
async def create_new_dashboard(
    data: DashboardCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    workspace = db.query(Workspace).filter(Workspace.id == data.workspace_id).first()
    if not workspace or workspace.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized for this workspace")

    mb_client = MetabaseClient()
    await mb_client.login()
    
    try:
        # Create dashboard in the specific workspace folder
        mb_dashboard = await mb_client.create_dashboard(
            name=data.name,
            collection_id=workspace.metabase_collection_id
        )
        return mb_dashboard
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Metabase Error: {str(e)}")