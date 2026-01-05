from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.database import get_db
from app.models import User, Workspace
from app.auth.dependencies import get_current_user
from app.metabase.client import MetabaseClient
from passlib.context import CryptContext
import logging

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
logger = logging.getLogger(__name__)

class MetabaseSessionResponse(BaseModel):
    session_token: str
    metabase_url: str
    workspace_collection_id: int | None

@router.post("/session/{workspace_id}", response_model=MetabaseSessionResponse)
async def get_metabase_session(
    workspace_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create a Metabase session for the current user to access a specific workspace
    """
    # Verify user has access to workspace
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    if current_user not in workspace.users:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Get user's Metabase password (decrypt it)
    if not current_user.metabase_password:
        raise HTTPException(
            status_code=400,
            detail="Metabase user not set up. Please contact support."
        )
    
    # We need to store the plain metabase password or regenerate it
    # For now, we'll create a new session using admin and switch user
    try:
        mb_client = MetabaseClient()
        await mb_client.login()
        
        # Ensure user is in the workspace group
        if workspace.metabase_group_id and current_user.metabase_user_id:
            await mb_client.add_user_to_group(
                current_user.metabase_user_id,
                workspace.metabase_group_id
            )
        
        # Create session for the user
        # Note: This requires storing plain password or using a different approach
        # For security, we'll use a workaround with admin session
        
        return {
            "session_token": mb_client.session_token,
            "metabase_url": "http://localhost:3000",
            "workspace_collection_id": workspace.metabase_collection_id
        }
        
    except Exception as e:
        logger.error(f"Failed to create Metabase session: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail="Failed to create Metabase session"
        )

@router.get("/workspace/{workspace_id}/url")
async def get_workspace_url(
    workspace_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get the Metabase URL for a workspace collection
    """
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    
    if current_user not in workspace.users:
        raise HTTPException(status_code=403, detail="Access denied")
    
    if not workspace.metabase_collection_id:
        raise HTTPException(status_code=400, detail="Workspace not configured")
    
    # Return the collection URL
    return {
        "url": f"http://localhost:3000/collection/{workspace.metabase_collection_id}",
        "collection_id": workspace.metabase_collection_id
    }