"""
Database models for the application.
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Text, JSON, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()


class User(Base):
    """User model - stores application users."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    
    # Metabase integration - stores the Metabase user ID
    metabase_user_id = Column(Integer, nullable=True)
    
    # Track if user has been assigned to default workspace
    default_workspace_assigned = Column(Boolean, default=False)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    workspaces = relationship("Workspace", back_populates="owner", cascade="all, delete-orphan")
    workspace_members = relationship("WorkspaceMember", back_populates="user", cascade="all, delete-orphan")
    user_dashboards = relationship("UserDashboard", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, metabase_user_id={self.metabase_user_id})>"


class Workspace(Base):
    """Workspace model - represents a user's workspace with collections."""
    __tablename__ = "workspaces"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Metabase integration fields
    metabase_collection_id = Column(Integer, nullable=True)
    metabase_collection_name = Column(String, nullable=True)
    metabase_group_id = Column(Integer, nullable=True)
    metabase_group_name = Column(String, nullable=True)
    
    # Database connection for this workspace
    database_id = Column(Integer, nullable=True)  # Metabase database ID
    
    # Flag to identify default workspace
    is_default = Column(Boolean, default=False)
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=True)
    
    # Relationships
    owner = relationship("User", back_populates="workspaces")
    members = relationship("WorkspaceMember", back_populates="workspace", cascade="all, delete-orphan")
    dashboards = relationship("Dashboard", back_populates="workspace", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Workspace(id={self.id}, name={self.name}, owner_id={self.owner_id})>"


class WorkspaceMember(Base):
    """WorkspaceMember model - many-to-many relationship between users and workspaces."""
    __tablename__ = "workspace_members"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    role = Column(String, default="viewer")  # owner, editor, viewer
    joined_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    workspace = relationship("Workspace", back_populates="members")
    user = relationship("User", back_populates="workspace_members")

    def __repr__(self):
        return f"<WorkspaceMember(workspace_id={self.workspace_id}, user_id={self.user_id}, role={self.role})>"


class Dashboard(Base):
    """Dashboard model - stores references to Metabase dashboards."""
    __tablename__ = "dashboards"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=False)
    
    # Metabase dashboard reference
    metabase_dashboard_id = Column(Integer, nullable=False, unique=True)
    metabase_dashboard_name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    
    is_public = Column(Boolean, default=True, nullable=True)
    resource_type = Column(String, default="dashboard", nullable=True)
    
    # Dashboard status
    is_published = Column(Boolean, default=False)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=True)
    
    # Relationships
    workspace = relationship("Workspace", back_populates="dashboards")
    user_dashboards = relationship("UserDashboard", back_populates="dashboard", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Dashboard(id={self.id}, name={self.metabase_dashboard_name}, workspace_id={self.workspace_id})>"


class UserDashboard(Base):
    """UserDashboard model - tracks user ownership and access to dashboards."""
    __tablename__ = "user_dashboards"
    __table_args__ = (UniqueConstraint('user_id', 'dashboard_id', name='uq_user_dashboard'),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    dashboard_id = Column(Integer, ForeignKey("dashboards.id"), nullable=False)
    
    # User's dashboard metadata
    is_owner = Column(Boolean, default=False)  # User created this dashboard
    is_pinned = Column(Boolean, default=False)  # User favorited it
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="user_dashboards")
    dashboard = relationship("Dashboard", back_populates="user_dashboards")

    def __repr__(self):
        return f"<UserDashboard(user_id={self.user_id}, dashboard_id={self.dashboard_id}, is_owner={self.is_owner})>"


class MetabaseSession(Base):
    """MetabaseSession model - tracks active Metabase sessions for audit."""
    __tablename__ = "metabase_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    workspace_id = Column(Integer, ForeignKey("workspaces.id"), nullable=True)
    
    session_token = Column(String, nullable=True)  # Store hashed token for audit
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User")
    workspace = relationship("Workspace")

    def __repr__(self):
        return f"<MetabaseSession(id={self.id}, user_id={self.user_id}, expires_at={self.expires_at})>"