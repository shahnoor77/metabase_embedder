import httpx
import logging
from typing import Dict, Any, Optional
from app.config import settings

logger = logging.getLogger(__name__)

class MetabaseClient:
    def __init__(self):
        self.base_url = settings.METABASE_URL
        self.admin_email = settings.METABASE_EMAIL
        self.admin_password = settings.METABASE_PASSWORD
        self.session_token: Optional[str] = None

    async def login(self):
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{self.base_url}/api/session",
                json={"username": self.admin_email, "password": self.admin_password}
            )
            response.raise_for_status()
            self.session_token = response.json()["id"]
            logger.info("Successfully logged into Metabase as Admin")

    def _headers(self) -> Dict[str, str]:
        if not self.session_token:
            raise ValueError("Not logged in. Call login() first.")
        return {"X-Metabase-Session": self.session_token}

    async def create_group(self, name: str) -> Dict[str, Any]:
        """Creates a group or returns existing one to avoid 400 errors."""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/api/permissions/group",
                headers=self._headers(),
                json={"name": name}
            )
            if response.status_code == 400:
                all_groups = await client.get(f"{self.base_url}/api/permissions/group", headers=self._headers())
                for g in all_groups.json():
                    if g["name"] == name:
                        return g
            response.raise_for_status()
            return response.json()

    async def create_collection(self, name: str) -> Dict[str, Any]:
        """Creates a collection or returns existing one."""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/api/collection",
                headers=self._headers(),
                json={"name": name, "color": "#509EE3", "parent_id": None}
            )
            if response.status_code == 400:
                all_cols = await client.get(f"{self.base_url}/api/collection", headers=self._headers())
                for c in all_cols.json():
                    if c["name"] == name:
                        return c
            response.raise_for_status()
            return response.json()

    # ... keep set_collection_permissions and set_database_permissions from your current file ...
    
    async def create_dashboard(self, name: str, collection_id: int) -> Dict[str, Any]:
        """Actually creates a dashboard inside the workspace collection."""
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/api/dashboard",
                headers=self._headers(),
                json={
                    "name": name,
                    "collection_id": collection_id
                }
            )
            response.raise_for_status()
            return response.json()