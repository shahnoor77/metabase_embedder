from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional
import os

class Settings(BaseSettings):
    # Application Database
    APP_DB_HOST: str = "postgres_app"
    APP_DB_PORT: int = 5432
    APP_DB_NAME: str = "metabase_app"
    APP_DB_USER: str = "app_user"
    APP_DB_PASSWORD: str = "app123"
    DATABASE_URL: str

    # JWT
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = 24

    # Metabase (Aligned with main.py)
    METABASE_URL: str = "http://metabase:3000"
    METABASE_ADMIN_EMAIL: str 
    METABASE_ADMIN_PASSWORD: str
    METABASE_EMBEDDING_SECRET: str

    # Analytics DB (External)
    ANALYTICS_DB_HOST: Optional[str] = None
    ANALYTICS_DB_PORT: Optional[int] = None
    ANALYTICS_DB_NAME: Optional[str] = None
    ANALYTICS_DB_USER: Optional[str] = None
    ANALYTICS_DB_PASSWORD: Optional[str] = None

    # Pydantic configuration to prevent 'extra_forbidden' errors
    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore", # This ignores any extra keys in .env
        case_sensitive=True
    )

settings = Settings()