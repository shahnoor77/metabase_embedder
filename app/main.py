from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.auth.routes import router as auth_router
from app.workspace.routes import router as workspace_router
from app.dashboard.routes import router as dashboard_router
from app.metabase.routes import router as metabase_router  # NEW

app = FastAPI(
    title="Metabase SaaS API",
    description="SaaS application with embedded Metabase analytics",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/auth", tags=["authentication"])
app.include_router(workspace_router, prefix="/api/workspaces", tags=["workspaces"])
app.include_router(dashboard_router, prefix="/api/dashboards", tags=["dashboards"])
app.include_router(metabase_router, prefix="/api/metabase", tags=["metabase"])  # NEW

@app.get("/")
def root():
    return {
        "message": "Metabase SaaS API",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/health")
def health():
    return {"status": "healthy"}