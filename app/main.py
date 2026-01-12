"""
Main FastAPI application entry point.
Handles startup initialization, Metabase setup, and routing.
"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import httpx

from app.config import Settings
from app.database import engine, SessionLocal
from app.models import Base
from app.metabase.client import MetabaseClient

# Import routers
from app.auth.routes import router as auth_router
from app.workspace.routes import router as workspace_router  

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load settings
settings = Settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan manager.
    Handles startup and shutdown operations.
    """
    logger.info("=" * 60)
    logger.info("Starting Metabase Embedder Application")
    logger.info("=" * 60)
    
    # ==================== STARTUP ====================
    
    # 1. Create database tables
    try:
        logger.info("Creating database tables...")
        Base.metadata.create_all(bind=engine)
        logger.info("✓ Database tables created successfully")
    except Exception as e:
        logger.error(f"✗ Failed to create database tables: {str(e)}")
        raise
    
    # 2. Initialize Metabase client
    mb_client = MetabaseClient(
        base_url=settings.METABASE_URL,
        admin_email=settings.METABASE_ADMIN_EMAIL,
        admin_password=settings.METABASE_ADMIN_PASSWORD,
        embedding_secret=settings.METABASE_EMBEDDING_SECRET,
        public_url=getattr(settings, 'METABASE_PUBLIC_URL', settings.METABASE_URL)
    )
    
    # 3. Check Metabase health
    logger.info("Checking Metabase health...")
    is_healthy = await mb_client.check_health()
    
    if not is_healthy:
        logger.warning("⚠ Metabase is not responding yet. It may still be starting up.")
        logger.warning("⚠ The application will continue, but Metabase features may not work immediately.")
    else:
        logger.info("✓ Metabase is healthy and responding")
        
        # 4. Handle first-time setup
        try:
            setup_token = await mb_client.get_setup_token()
            
            if setup_token:
                logger.info("Fresh Metabase instance detected. Running initial setup...")
                
                try:
                    await mb_client.setup_admin(setup_token)
                    logger.info("✓ Admin user created successfully")
                except httpx.HTTPStatusError as e:
                    if e.response.status_code == 403:
                        logger.info("✓ Admin already exists, skipping setup")
                    else:
                        logger.error(f"✗ Setup error: {e.response.text}")
                        raise
            else:
                logger.info("✓ Metabase is already configured")
                
        except Exception as e:
            logger.error(f"✗ Error during Metabase setup: {str(e)}")
        
        # 5. Enable global embedding settings
        try:
            logger.info("Enabling Metabase embedding...")
            await mb_client.setup_metabase()
            logger.info("✓ Metabase embedding enabled")
        except Exception as e:
            logger.error(f"✗ Failed to enable embedding: {str(e)}")
        
        # 6. Connect Analytics Database to Metabase
        try:
            logger.info("Checking Analytics Database connection...")
            databases = await mb_client.list_databases()
            
            # Look for Analytics Database (support multiple names)
            analytics_db = None
            for db_item in databases:
                if isinstance(db_item, dict):
                    db_name = db_item.get('name', '')
                    if db_name in ['Analytics Database', 'Analytics']:
                        analytics_db = db_item
                        break
            
            db_id = None
            
            if not analytics_db:
                logger.info("Analytics Database not found. Adding it to Metabase...")
                
                db_result = await mb_client.add_database(
                    name="Analytics Database",
                    engine="postgres",
                    host=settings.ANALYTICS_DB_HOST,
                    port=settings.ANALYTICS_DB_PORT,
                    dbname=settings.ANALYTICS_DB_NAME,
                    user=settings.ANALYTICS_DB_USER,
                    password=settings.ANALYTICS_DB_PASSWORD
                )
                
                if db_result:
                    db_id = db_result.get('id')
                    logger.info(f"✓ Analytics Database added (ID: {db_id})")
                else:
                    logger.error("✗ Failed to add Analytics Database")
            else:
                db_id = analytics_db.get('id')
                logger.info(f"✓ Analytics Database already exists (ID: {db_id})")
            
            # 7. Set default permissions for "All Users" group
            if db_id:
                try:
                    logger.info("Setting default database permissions for All Users group...")
                    
                    all_users_group_id = await mb_client.get_all_users_group_id()
                    
                    await mb_client.set_database_permissions(
                        group_id=all_users_group_id,
                        database_id=db_id,
                        schema_name="public",
                        permission="all"
                    )
                    
                    logger.info(f"✓ Database permissions set for All Users (Group ID: {all_users_group_id})")
                    
                except Exception as perm_err:
                    logger.error(f"✗ Failed to set database permissions: {str(perm_err)}")
            
        except Exception as db_err:
            logger.error(f"✗ Failed to configure Analytics Database: {str(db_err)}")
    
    logger.info("=" * 60)
    logger.info("Application startup complete!")
    logger.info("=" * 60)
    
    # Application is now running
    yield
    
    # ==================== SHUTDOWN ====================
    logger.info("Shutting down application...")
    logger.info("Goodbye!")


# Create FastAPI application
app = FastAPI(
    title="Metabase Embedder API",
    description="API for managing Metabase workspaces with embedded analytics",
    version="1.0.0",
    lifespan=lifespan
)


# ==================== CORS Configuration ====================

# IMPORTANT: Update these origins for production!
# Don't use ["*"] in production - it's a security risk
CORS_ORIGINS = [
    "http://localhost:3001",  # Frontend dev server
    "http://localhost:3000",  # Alternative frontend port
    "http://localhost:5173",  # Vite dev server
]

# Add production origins if specified
if hasattr(settings, 'FRONTEND_URL') and settings.FRONTEND_URL:
    CORS_ORIGINS.append(settings.FRONTEND_URL)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,  # Specific origins only!
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================== Exception Handlers ====================

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Handle HTTP exceptions with consistent format."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "status_code": exc.status_code
        }
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """Handle unexpected exceptions."""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "status_code": 500
        }
    )


# ==================== Include Routers ====================

# Both routers already have their prefixes defined:
# - auth_router has prefix="/api/auth"
# - workspace_router has prefix="/api/workspaces"
app.include_router(auth_router)
app.include_router(workspace_router)


# ==================== Root Endpoints ====================

@app.get("/")
async def root():
    """Root endpoint - API status."""
    return {
        "status": "ok",
        "message": "Metabase Embedder API is running",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "metabase-embedder-api"
    }


@app.get("/api")
async def api_info():
    """API information endpoint."""
    return {
        "name": "Metabase Embedder API",
        "version": "1.0.0",
        "endpoints": {
            "auth": "/api/auth",
            "workspaces": "/api/workspaces",
            "docs": "/docs",
            "health": "/health"
        }
    }


# ==================== Development Info ====================

if __name__ == "__main__":
    import uvicorn
    
    logger.info("Starting development server...")
    logger.info("=" * 60)
    logger.info("API will be available at: http://localhost:8000")
    logger.info("API documentation: http://localhost:8000/docs")
    logger.info("=" * 60)
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )