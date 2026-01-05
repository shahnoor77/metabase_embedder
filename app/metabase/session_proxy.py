import secrets
from datetime import datetime, timedelta
from typing import Optional, Dict
from app.models import User
from app.metabase.client import MetabaseClient

# In-memory session store (use Redis in production)
session_store: Dict[str, Dict] = {}

async def create_proxy_session(user: User, workspace_id: int) -> str:
    """
    Create a proxy session token that will be exchanged for Metabase session
    """
    proxy_token = secrets.token_urlsafe(32)
    
    session_store[proxy_token] = {
        "user_id": user.id,
        "workspace_id": workspace_id,
        "created_at": datetime.utcnow(),
        "expires_at": datetime.utcnow() + timedelta(minutes=5)
    }
    
    return proxy_token

def get_proxy_session(proxy_token: str) -> Optional[Dict]:
    """
    Get and consume a proxy session
    """
    session = session_store.pop(proxy_token, None)
    
    if not session:
        return None
    
    # Check if expired
    if session["expires_at"] < datetime.utcnow():
        return None
    
    return session