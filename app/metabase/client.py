import httpx
import jwt
import logging
import time
import asyncio
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
        if self.session_token and time.time() < self.token_expiry:
            return self.session_token

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/api/session",
                json={"username": self.admin_email, "password": self.admin_password}
            )
            response.raise_for_status()
            self.session_token = response.json()["id"]
            self.token_expiry = time.time() + (60 * 60 * 2) 
            return self.session_token

    # ==================== STARTUP & SETUP ====================

    async def check_health(self, retries: int = 5, delay: int = 10) -> bool:
        for i in range(retries):
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.get(f"{self.base_url}/api/health", timeout=5.0)
                    if response.status_code == 200:
                        return True
            except Exception:
                pass
            logger.info(f"Waiting for Metabase... ({i+1}/{retries})")
            await asyncio.sleep(delay)
        return False

    async def get_setup_token(self) -> Optional[str]:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"{self.base_url}/api/session/properties")
                return response.json().get("setup-token")
        except Exception:
            return None

    async def setup_admin(self, setup_token: str):
        payload = {
            "token": setup_token,
            "user": {
                "first_name": "Admin", "last_name": "User",
                "email": self.admin_email, "password": self.admin_password,
                "site_name": "Analytics Platform"
            },
            "prefs": {"allow_tracking": False, "site_name": "Analytics Platform"}
        }
        async with httpx.AsyncClient() as client:
            response = await client.post(f"{self.base_url}/api/setup", json=payload)
            response.raise_for_status()
            self.session_token = response.json().get("id")
            return self.session_token

    async def setup_metabase(self):
        await self._get_session_token()
        async with httpx.AsyncClient() as client:
            await client.put(
                f"{self.base_url}/api/setting/enable-embedding",
                json={"value": True},
                headers=self._get_headers()
            )

    # ==================== DATABASE PROVISIONING ====================

    async def add_database(self, name: str, engine: str, host: str, port: int, dbname: str, user: str, password: str):
        await self._get_session_token()
        
        # Postgres specific details
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
            "engine": engine, # "postgres"
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
        await self._get_session_token()
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{self.base_url}/api/database", headers=self._get_headers())
            data = response.json()
            return data.get("data", data) if isinstance(data, dict) else data

    async def get_all_users_group_id(self) -> int:
        await self._get_session_token()
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{self.base_url}/api/permissions/group", headers=self._get_headers())
            for g in response.json():
                if g.get("name") == "All Users": return g["id"]
        return 1

    async def set_database_permissions(self, group_id: int, database_id: int, schema_name: str = "public", permission: str = "all"):
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