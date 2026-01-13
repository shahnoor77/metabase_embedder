from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

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
    METABASE_URL: str = "http://metabase:3000"  # Internal Docker URL for backend
    METABASE_PUBLIC_URL: str = "http://localhost:3000"  # Public URL for frontend embeds
    METABASE_ADMIN_EMAIL: str 
    METABASE_ADMIN_PASSWORD: str
    METABASE_EMBEDDING_SECRET: str

    # External Analytics Database (SQL Server running elsewhere)
    ANALYTICS_DB_HOST: str
    ANALYTICS_DB_PORT: int
    ANALYTICS_DB_NAME: str
    ANALYTICS_DB_USER: str
    ANALYTICS_DB_PASSWORD: str

    ACCESS_TOKEN_EXPIRE_MINUTES: int

    # Pydantic configuration
    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
        case_sensitive=True
    )

settings = Settings()