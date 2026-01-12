"""
Complete Metabase API client with all required methods.
"""
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
        
        async with httpx.AsyncClient(timeout=30.0) as client:
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
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(f"{self.base_url}/api/health")
                return resp.status_code == 200
        except:
            return False

    async def get_setup_token(self) -> Optional[str]:
        """Retrieves the setup token required for first-time provisioning."""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(f"{self.base_url}/api/session/properties")
                if resp.status_code == 200:
                    return resp.json().get("setup-token")
        except Exception as e:
            logger.error(f"Error getting setup token: {str(e)}")
        return None

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
            "prefs": {"site_name": "Analytics Platform", "allow_tracking": False}
        }
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(f"{self.base_url}/api/setup", json=payload)
            resp.raise_for_status()
            logger.info("Metabase admin setup completed")

    async def setup_metabase(self):
        """Enables global embedding settings in Metabase."""
        await self._get_session_token()
        async with httpx.AsyncClient(timeout=30.0) as client:
            await client.put(
                f"{self.base_url}/api/setting/enable-embedding",
                json={"value": True},
                headers=self._get_headers()
            )
            logger.info("Metabase embedding enabled")

    # ==================== USER MANAGEMENT ====================

    async def create_metabase_user(
        self,
        email: str,
        first_name: str,
        last_name: str,
        password: str,
        is_superuser: bool = False
    ) -> Dict:
        """
        Create a new Metabase user.
        
        Args:
            email: User email
            first_name: First name
            last_name: Last name
            password: Password
            is_superuser: Whether user is admin (DEFAULT: False for regular users)
            
        Returns:
            Created user data with 'id' field
        """
        await self._get_session_token()
        
        logger.info(f"Creating Metabase user: {email} (superuser={is_superuser})")
        
        user_data = {
            "first_name": first_name,
            "last_name": last_name,
            "email": email,
            "password": password,
            "is_superuser": is_superuser  # CRITICAL: False means no admin access
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{self.base_url}/api/user",
                json=user_data,
                headers=self._get_headers()
            )
            
            if response.status_code >= 400:
                logger.error(f"Failed to create user: {response.status_code} - {response.text}")
                response.raise_for_status()
            
            return response.json()

    async def get_user_by_email(self, email: str) -> Optional[Dict]:
        """
        Fetches all users from Metabase and returns the one matching the email.
        
        Returns:
            User dict with 'id' field, or None if not found
        """
        await self._get_session_token()
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{self.base_url}/api/user",
                headers=self._get_headers()
            )
            response.raise_for_status()
            
            users = response.json()
            # Handle both list and dict with 'data' key
            user_list = users if isinstance(users, list) else users.get("data", [])
            
            for user in user_list:
                if user.get("email") == email:
                    return user
            
            return None

    # ==================== COLLECTIONS ====================

    async def create_collection(self, name: str, description: str = "") -> Dict:
        """Create a new collection for a workspace."""
        await self._get_session_token()
        
        payload = {
            "name": name,
            "color": "#509EE3",
            "description": description,
            "parent_id": None
        }
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{self.base_url}/api/collection",
                json=payload,
                headers=self._get_headers()
            )
            response.raise_for_status()
            return response.json()

    async def enable_collection_embedding(self, collection_id: int):
        """Programmatically toggles 'Enable Embedding' for a collection."""
        await self._get_session_token()
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.put(
                f"{self.base_url}/api/collection/{collection_id}",
                json={"enable_embedding": True},
                headers=self._get_headers()
            )
            return response.status_code == 200

    async def get_collection_items(self, collection_id: int) -> list:
        """Fetches all items (dashboards, questions) inside a collection."""
        await self._get_session_token()
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(
                f"{self.base_url}/api/collection/{collection_id}/items",
                headers=self._get_headers()
            )
            resp.raise_for_status()
            data = resp.json()
            return data.get("data", data) if isinstance(data, dict) else data

    # ==================== DATABASE PROVISIONING ====================

    async def add_database(
        self,
        name: str,
        engine: str,
        host: str,
        port: int,
        dbname: str,
        user: str,
        password: str
    ) -> Optional[Dict]:
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
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{self.base_url}/api/database",
                json=payload,
                headers=self._get_headers()
            )
            
            if response.status_code != 200:
                logger.error(f"Failed to add DB: {response.text}")
                return None
            
            return response.json()

    async def list_databases(self) -> list:
        """Lists all databases connected to Metabase."""
        await self._get_session_token()
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{self.base_url}/api/database",
                headers=self._get_headers()
            )
            response.raise_for_status()
            data = response.json()
            return data.get("data", data) if isinstance(data, dict) else data

    # ==================== PERMISSIONS & GROUPS ====================

    async def create_group(self, name: str) -> Dict:
        """Creates a Metabase permission group."""
        await self._get_session_token()
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.post(
                    f"{self.base_url}/api/permissions/group",
                    json={"name": name},
                    headers=self._get_headers()
                )
                
                if response.status_code >= 400:
                    logger.error(f"Group creation failed: {response.status_code} - {response.text}")
                
                response.raise_for_status()
                return response.json()
                
            except Exception as e:
                logger.error(f"Error creating group '{name}': {str(e)}")
                # Try to find existing group with same name as fallback
                groups_resp = await client.get(
                    f"{self.base_url}/api/permissions/group",
                    headers=self._get_headers()
                )
                if groups_resp.status_code == 200:
                    for g in groups_resp.json():
                        if g.get("name") == name:
                            logger.info(f"Found existing group: {name}")
                            return g
                raise

    async def get_all_users_group_id(self) -> int:
        """Finds the ID of the default 'All Users' group."""
        await self._get_session_token()
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{self.base_url}/api/permissions/group",
                headers=self._get_headers()
            )
            response.raise_for_status()
            
            for g in response.json():
                if g.get("name") == "All Users":
                    return g["id"]
            
            return 1  # Default fallback

    async def set_database_permissions(
        self,
        group_id: int,
        database_id: int,
        schema_name: str = "public",
        permission: str = "all"
    ):
        """Updates the permission graph for a database."""
        await self._get_session_token()
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            graph_resp = await client.get(
                f"{self.base_url}/api/permissions/graph",
                headers=self._get_headers()
            )
            graph = graph_resp.json()
            
            if "groups" not in graph:
                graph["groups"] = {}
            if str(group_id) not in graph["groups"]:
                graph["groups"][str(group_id)] = {}
            
            graph["groups"][str(group_id)][str(database_id)] = {
                "schemas": {schema_name: permission},
                "native": "write"
            }
            
            await client.put(
                f"{self.base_url}/api/permissions/graph",
                json=graph,
                headers=self._get_headers()
            )
            
            logger.info(f"Set database permissions for group {group_id} on database {database_id}")

    async def set_collection_permissions(
        self,
        group_id: int,
        collection_id: int,
        permission: str = "write"
    ):
        """Updates the permission graph for a collection."""
        await self._get_session_token()
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            payload = {"groups": {str(group_id): {str(collection_id): permission}}}
            response = await client.put(
                f"{self.base_url}/api/collection/graph",
                json=payload,
                headers=self._get_headers()
            )
            return response.status_code == 200

    async def add_user_to_group(self, user_id: int, group_id: int):
        """Adds a Metabase user to a permission group."""
        await self._get_session_token()
        
        payload = {"group_id": group_id, "user_id": user_id}
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{self.base_url}/api/permissions/membership",
                json=payload,
                headers=self._get_headers()
            )
            
            if response.status_code >= 400:
                logger.warning(f"Failed to add user to group: {response.text}")
            
            return response.json() if response.status_code < 400 else None

    # ==================== DASHBOARDS ====================

    async def list_dashboards(self, collection_id: Optional[int] = None) -> List[Dict]:
        """List dashboards, optionally filtered by collection."""
        await self._get_session_token()
        
        params = {}
        if collection_id is not None:
            params["collection"] = collection_id
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                f"{self.base_url}/api/dashboard",
                params=params,
                headers=self._get_headers()
            )
            response.raise_for_status()
            data = response.json()
            return data if isinstance(data, list) else data.get("data", [])

    async def enable_dashboard_embedding(self, dashboard_id: int) -> bool:
        """Programmatically enables embedding for a specific dashboard."""
        await self._get_session_token()
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.put(
                    f"{self.base_url}/api/dashboard/{dashboard_id}",
                    json={"enable_embedding": True},
                    headers=self._get_headers()
                )
                response.raise_for_status()
                logger.info(f"Successfully enabled embedding for dashboard {dashboard_id}")
                return True
            except Exception as e:
                logger.error(f"Failed to enable embedding for dashboard {dashboard_id}: {str(e)}")
                return False

    async def enable_resource_embedding(self, resource_id: int, resource_type: str = "dashboard") -> bool:
        """
        Enable embedding for a dashboard or card (question).
        
        Args:
            resource_id: Dashboard or card ID
            resource_type: Either "dashboard" or "card"
            
        Returns:
            True if successful, False otherwise
        """
        await self._get_session_token()
        
        endpoint = "dashboard" if resource_type == "dashboard" else "card"
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.put(
                    f"{self.base_url}/api/{endpoint}/{resource_id}",
                    json={"enable_embedding": True},
                    headers=self._get_headers()
                )
                response.raise_for_status()
                logger.info(f"Enabled embedding for {resource_type} {resource_id}")
                return True
            except Exception as e:
                logger.error(f"Failed to enable embedding for {resource_type} {resource_id}: {str(e)}")
                return False

    # ==================== EMBEDDING & URLS ====================

    def get_dashboard_embed_url(self, dashboard_id: int, filters: dict = None) -> str:
        """Generates a signed JWT URL with optional locked parameters."""
        payload = {
            "resource": {"dashboard": dashboard_id},
            "params": filters or {},
            "exp": int(time.time()) + 3600
        }
        token = jwt.encode(payload, self.embedding_secret, algorithm="HS256")
        return f"/embed/dashboard/{token}#bordered=false&titled=false"

    def get_embedded_collection_url(self, collection_id: int) -> str:
        """Generates a signed JWT URL for the entire workspace collection."""
        payload = {
            "resource": {"collection": collection_id},
            "params": {},
            "exp": int(time.time()) + 3600
        }
        token = jwt.encode(payload, self.embedding_secret, algorithm="HS256")
        return f"/embed/collection/{token}#bordered=false&titled=true"