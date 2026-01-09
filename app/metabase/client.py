import httpx
import jwt
import logging
import time
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

class MetabaseClient:
    def __init__(self, base_url: str, admin_email: str, admin_password: str, embedding_secret: str):
        self.base_url = base_url.rstrip("/")
        self.admin_email = admin_email
        self.admin_password = admin_password
        self.embedding_secret = embedding_secret
        self.session_token = None
        self.token_expiry = 0

    def _get_headers(self) -> Dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self.session_token:
            headers["X-Metabase-Session"] = self.session_token
        return headers

    async def _get_session_token(self):
        """Authenticates with Metabase and caches the session token."""
        if self.session_token and time.time() < self.token_expiry:
            return self.session_token
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/api/session",
                json={"username": self.admin_email, "password": self.admin_password}
            )
            response.raise_for_status()
            self.session_token = response.json()["id"]
            self.token_expiry = time.time() + 3600  # 1 hour validity
            return self.session_token

    async def check_health(self) -> bool:
        """Checks if the Metabase service is reachable."""
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(f"{self.base_url}/api/health", timeout=5.0)
                return resp.status_code == 200
        except:
            return False

    async def setup_admin(self, setup_token: str):
        """Handles the initial Metabase setup (Provisioning the first admin)."""
        payload = {
            "token": setup_token,
            "user": {
                "first_name": "Admin", 
                "last_name": "User", 
                "email": self.admin_email, 
                "password": self.admin_password
            },
            "prefs": {"site_name": "Analytics Platform"}
        }
        async with httpx.AsyncClient() as client:
            resp = await client.post(f"{self.base_url}/api/setup", json=payload)
            resp.raise_for_status()

    async def setup_metabase(self):
        """Enables global embedding settings in Metabase."""
        await self._get_session_token()
        async with httpx.AsyncClient() as client:
            await client.put(
                f"{self.base_url}/api/setting/enable-embedding", 
                json={"value": True}, 
                headers=self._get_headers()
            )

    async def get_setup_token(self) -> Optional[str]:
        """Retrieves the setup token required for first-time provisioning."""
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{self.base_url}/api/session/properties")
            return resp.json().get("setup-token")

    # ==================== COLLECTIONS ====================

    async def create_collection(self, name: str, description: str = ""):
        """Create a new collection for a workspace."""
        await self._get_session_token()
        payload = {
            "name": name,
            "color": "#509EE3",
            "description": description,
            "parent_id": None
        }
        async with httpx.AsyncClient() as client:
            response = await client.post(f"{self.base_url}/api/collection", json=payload, headers=self._get_headers())
            response.raise_for_status()
            return response.json()

    async def enable_collection_embedding(self, collection_id: int):
        """The 'Self-Healing' fix: Programmatically toggles 'Enable Embedding' for a collection."""
        await self._get_session_token()
        async with httpx.AsyncClient() as client:
            response = await client.put(
                f"{self.base_url}/api/collection/{collection_id}", 
                json={"enabled_embedding": True}, 
                headers=self._get_headers()
            )
            return response.status_code

    async def get_collection_items(self, collection_id: int) -> list:
        """Fetches all items (dashboards, questions) inside a collection."""
        await self._get_session_token()
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"{self.base_url}/api/collection/{collection_id}/items", headers=self._get_headers())
            data = resp.json()
            return data.get("data", data) if isinstance(data, dict) else data

    # ==================== DATABASE PROVISIONING ====================

    async def add_database(self, name: str, engine: str, host: str, port: int, dbname: str, user: str, password: str):
        """Connects a new database to Metabase."""
        await self._get_session_token()
        details = {
            "host": host,
            "port": int(port),
            "dbname": dbname,
            "user": user,
            "password": password,
            "ssl": False
        }
        payload = {
            "name": name,
            "engine": engine,
            "details": details,
            "auto_run_queries": True,
            "is_full_sync": True
        }
        async with httpx.AsyncClient() as client:
            response = await client.post(f"{self.base_url}/api/database", json=payload, headers=self._get_headers())
            if response.status_code != 200:
                logger.error(f"Failed to add DB: {response.text}")
                return None
            return response.json()

    async def list_databases(self):
        """Lists all databases connected to Metabase."""
        await self._get_session_token()
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{self.base_url}/api/database", headers=self._get_headers())
            data = response.json()
            return data.get("data", data) if isinstance(data, dict) else data

    # ==================== PERMISSIONS & GROUPS ====================

    async def create_group(self, name: str):
        """Creates a Metabase permission group."""
        await self._get_session_token()
        async with httpx.AsyncClient() as client:
            response = await client.post(f"{self.base_url}/api/permissions/group", json={"name": name}, headers=self._get_headers())
            response.raise_for_status()
            return response.json()

    async def get_all_users_group_id(self) -> int:
        """Finds the ID of the default 'All Users' group."""
        await self._get_session_token()
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{self.base_url}/api/permissions/group", headers=self._get_headers())
            for g in response.json():
                if g.get("name") == "All Users": return g["id"]
        return 1

    async def set_database_permissions(self, group_id: int, database_id: int, schema_name: str = "public", permission: str = "all"):
        """Updates the permission graph for a database."""
        await self._get_session_token()
        async with httpx.AsyncClient() as client:
            graph_resp = await client.get(f"{self.base_url}/api/permissions/graph", headers=self._get_headers())
            graph = graph_resp.json()
            
            if "groups" not in graph: graph["groups"] = {}
            if str(group_id) not in graph["groups"]: graph["groups"][str(group_id)] = {}
            
            graph["groups"][str(group_id)][str(database_id)] = {
                "schemas": {schema_name: permission},
                "native": "write"
            }
            await client.put(f"{self.base_url}/api/permissions/graph", json=graph, headers=self._get_headers())

    async def set_collection_permissions(self, group_id: int, collection_id: int, permission: str = "write"):
        """Updates the permission graph for a collection."""
        await self._get_session_token()
        async with httpx.AsyncClient() as client:
            payload = {"groups": {str(group_id): {str(collection_id): permission}}}
            return await client.put(f"{self.base_url}/api/collection/graph", json=payload, headers=self._get_headers())

    async def add_user_to_group(self, user_id: int, group_id: int):
        """Adds a Metabase user to a permission group."""
        await self._get_session_token()
        payload = {"group_id": group_id, "user_id": user_id}
        async with httpx.AsyncClient() as client:
            response = await client.post(f"{self.base_url}/api/permissions/membership", json=payload, headers=self._get_headers())
            return response.json()

    # ==================== EMBEDDING & URLS ====================

    def get_dashboard_embed_url(self, dashboard_id: int) -> str:
        """Generates a signed JWT URL for an individual dashboard iframe."""
        payload = {
            "resource": {"dashboard": dashboard_id},
            "params": {},
            "exp": int(time.time()) + 3600 
        }
        token = jwt.encode(payload, self.embedding_secret, algorithm="HS256")
        return f"{self.base_url}/embed/dashboard/{token}#bordered=false&titled=false"

    def get_embedded_collection_url(self, collection_id: int) -> str:
        """Generates a signed JWT URL for an entire collection iframe."""
        payload = {
            "resource": {"collection": collection_id},
            "params": {},
            "exp": int(time.time()) + 3600
        }
        token = jwt.encode(payload, self.embedding_secret, algorithm="HS256")
        return f"/embed/collection/{token}"
    
    async def enable_dashboard_embedding(self, dashboard_id: int):
        """
        The 'Automation' fix: Programmatically enables embedding for a specific dashboard.
        This prevents the 'Embedding is not enabled for this object' error.
        """
        await self._get_session_token()
        async with httpx.AsyncClient() as client:
            try:
                response = await client.put(
                    f"{self.base_url}/api/dashboard/{dashboard_id}", 
                    json={"enable_embedding": True}, 
                    headers=self._get_headers()
                )
                response.raise_for_status()
                logger.info(f"Successfully enabled embedding for Metabase dashboard {dashboard_id}")
                return True
            except Exception as e:
                logger.error(f"Failed to enable embedding for dashboard {dashboard_id}: {str(e)}")
                return False