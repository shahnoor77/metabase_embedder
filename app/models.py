from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Table
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB
from datetime import datetime
from app.database import Base
from typing import Optional

workspace_users = Table(
    'workspace_users',
    Base.metadata,
    Column('workspace_id', Integer, ForeignKey('workspaces.id', ondelete='CASCADE')),
    Column('user_id', Integer, ForeignKey('users.id', ondelete='CASCADE'))
)

class User(Base):
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String)
    metabase_user_id :Optional[int]= Column(Integer, nullable=True)  # NEW: Store Metabase user ID
    metabase_password :Optional[str] = Column(String, nullable=True)  # NEW: Store Metabase password (hashed)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    workspaces = relationship('Workspace', secondary=workspace_users, back_populates='users')
    owned_workspaces = relationship('Workspace', back_populates='owner', foreign_keys='Workspace.owner_id')

class Workspace(Base):
    __tablename__ = 'workspaces'
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, index=True, nullable=False)
    owner_id = Column(Integer, ForeignKey('users.id'))
    metabase_group_id = Column(Integer)
    metabase_collection_id = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    owner = relationship('User', back_populates='owned_workspaces', foreign_keys=[owner_id])
    users = relationship('User', secondary=workspace_users, back_populates='workspaces')
    dashboards = relationship('Dashboard', back_populates='workspace', cascade='all, delete-orphan')

class Dashboard(Base):
    __tablename__ = 'dashboards'
    
    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(Integer, ForeignKey('workspaces.id', ondelete='CASCADE'))
    metabase_dashboard_id = Column(Integer, nullable=False)
    name = Column(String, nullable=False)
    created_by_id = Column(Integer, ForeignKey('users.id'))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    workspace = relationship('Workspace', back_populates='dashboards')
    created_by = relationship('User', foreign_keys=[created_by_id])
    versions = relationship('DashboardVersion', back_populates='dashboard', cascade='all, delete-orphan')

class DashboardVersion(Base):
    __tablename__ = 'dashboard_versions'
    
    id = Column(Integer, primary_key=True, index=True)
    dashboard_id = Column(Integer, ForeignKey('dashboards.id', ondelete='CASCADE'))
    snapshot = Column(JSONB)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    dashboard = relationship('Dashboard', back_populates='versions')