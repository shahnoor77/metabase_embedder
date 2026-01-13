"""
Authentication routes for user signup, login, and token management.
Reliable version with Python 3.12 compatibility and Metabase integration.
"""
import logging
from datetime import datetime, timedelta
from typing import Optional
import bcrypt
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from pydantic import BaseModel

from app.database import get_db
from app.models import User
from app.config import Settings

router = APIRouter(prefix="/api/auth", tags=["authentication"])
logger = logging.getLogger(__name__)

# ==================== Security Configuration ====================
settings = Settings()

# OAuth2 scheme - MUST match the actual endpoint path
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# ==================== Pydantic Schemas ====================

class UserSignup(BaseModel):
    email: str
    password: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    email: str
    first_name: Optional[str]
    last_name: Optional[str]
    metabase_user_id: Optional[int]
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    sub: Optional[str] = None


# ==================== Security Utilities ====================

def get_password_hash(password: str) -> str:
    """Hash password using bcrypt."""
    if not password:
        raise ValueError("Password cannot be empty")
    
    password_bytes = password.encode('utf-8')
    
    if len(password_bytes) > 72:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Password is too long (max 72 characters)"
        )
    
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash."""
    try:
        password_bytes = plain_password.encode('utf-8')
        hashed_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(password_bytes, hashed_bytes)
    except Exception as e:
        logger.error(f"Password verification error: {e}")
        return False


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token."""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """Dependency to get the current authenticated user."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        sub = payload.get("sub")
        if sub is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    # Support either email (str) or id (int) in "sub"
    user = None
    try:
        user_id = int(sub)
        user = db.query(User).filter(User.id == user_id).first()
    except (TypeError, ValueError):
        user = db.query(User).filter(User.email == str(sub)).first()
    
    if user is None:
        raise credentials_exception
    
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    
    return user


def get_metabase_client():
    """Get Metabase client instance."""
    from app.metabase.client import MetabaseClient
    
    return MetabaseClient(
        base_url=settings.METABASE_URL,
        admin_email=settings.METABASE_ADMIN_EMAIL,
        admin_password=settings.METABASE_ADMIN_PASSWORD,
        embedding_secret=settings.METABASE_EMBEDDING_SECRET,
        public_url=getattr(settings, 'METABASE_PUBLIC_URL', settings.METABASE_URL)
    )


# ==================== Routes ====================

@router.post("/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def signup(user_data: UserSignup, db: Session = Depends(get_db)):
    """
    Register a new user.
    Creates both app user AND Metabase user (as regular user, not admin).
    Auto-assigns user to default workspace.
    """
    # 1. Check if user exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # 2. Create user in app database
    new_user = User(
        email=user_data.email,
        hashed_password=get_password_hash(user_data.password),
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        is_active=True
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # 3. Create Metabase user (as regular user, NOT admin)
    try:
        mb_client = get_metabase_client()
        
        # Check if Metabase user already exists
        mb_user = await mb_client.get_user_by_email(user_data.email)
        
        if not mb_user:
            # Create as REGULAR user (not admin)
            mb_user = await mb_client.create_metabase_user(
                email=user_data.email,
                first_name=user_data.first_name or "User",
                last_name=user_data.last_name or "User",
                password=user_data.password,
                is_superuser=False  # ← CRITICAL: Regular user, no admin access!
            )
            
            logger.info(f"Created Metabase user for {user_data.email} with ID {mb_user.get('id')}")
        
        # Store Metabase user ID
        if mb_user and mb_user.get("id"):
            new_user.metabase_user_id = mb_user.get("id")
            
            # Add to "All Users" group (ensures they see default database)
            try:
                all_users_group_id = await mb_client.get_all_users_group_id()
                await mb_client.add_user_to_group(mb_user["id"], all_users_group_id)
                logger.info(f"Added user to All Users group (ID: {all_users_group_id})")
            except Exception as group_error:
                logger.warning(f"User might already be in All Users group: {str(group_error)}")
            
            db.commit()
            db.refresh(new_user)
    
    except Exception as e:
        logger.error(f"Metabase sync failed: {str(e)}")
    
    # 4. Auto-assign to default workspace
    await assign_user_to_default_workspace(new_user, db, mb_client)
    
    return new_user


@router.post("/login", response_model=Token)
async def login(
    request: Request,
    db: Session = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
):
    """
    Login and get access token.
    Auto-assigns user to default workspace on first login.
    """
    # Prefer OAuth2 form (Swagger/clients)
    email = form_data.username
    password = form_data.password

    # Fallback to JSON body for manual requests
    if not email:
        try:
            body = await request.json()
            email = body.get("email") or body.get("username")
            password = body.get("password")
        except Exception:
            pass

    if not email or not password:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Email and password required"
        )

    # Find user
    user = db.query(User).filter(User.email == email).first()
    
    if not user or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    # Auto-assign to default workspace if not already assigned
    if not user.default_workspace_assigned:
        try:
            mb_client = get_metabase_client()
            await assign_user_to_default_workspace(user, db, mb_client)
        except Exception as ws_err:
            logger.warning(f"Failed to assign default workspace: {ws_err}")
    
    # Create access token
    token_data = {"sub": user.email}
    access_token = create_access_token(data=token_data)
    
    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


async def assign_user_to_default_workspace(
    user: User,
    db: Session,
    mb_client: MetabaseClient
):
    """
    Auto-assign user to default workspace.
    Creates default workspace if it doesn't exist.
    """
    try:
        from app.models import Workspace, WorkspaceMember
        
        # Check if default workspace exists
        default_ws = db.query(Workspace).filter_by(
            is_default=True,
            is_active=True
        ).first()
        
        if not default_ws:
            logger.info("Creating default workspace...")
            
            # Create default workspace
            default_ws = Workspace(
                name="My Workspace",
                description="Your personal workspace for dashboards",
                owner_id=user.id,
                is_default=True,
                is_active=True
            )
            
            db.add(default_ws)
            db.flush()
            
            # Create Metabase collection for default workspace
            try:
                collection = await mb_client.create_collection(
                    name="My Workspace",
                    description="Default workspace collection"
                )
                
                default_ws.metabase_collection_id = collection.get("id")
                default_ws.metabase_collection_name = collection.get("name")
                
                # Create permission group
                group = await mb_client.create_group(name="My Workspace Team")
                default_ws.metabase_group_id = group.get("id")
                default_ws.metabase_group_name = group.get("name")
                
                db.commit()
                logger.info(f"Created default workspace with collection {default_ws.metabase_collection_id}")
                
            except Exception as mb_err:
                logger.error(f"Failed to create Metabase resources: {mb_err}")
                db.rollback()
                raise
        
        # Add user to default workspace if not already member
        is_member = db.query(WorkspaceMember).filter_by(
            workspace_id=default_ws.id,
            user_id=user.id
        ).first()
        
        if not is_member:
            member = WorkspaceMember(
                workspace_id=default_ws.id,
                user_id=user.id,
                role="owner" if default_ws.owner_id == user.id else "editor"
            )
            db.add(member)
            
            # Add user to Metabase group
            if user.metabase_user_id and default_ws.metabase_group_id:
                try:
                    await mb_client.add_user_to_group(
                        user_id=user.metabase_user_id,
                        group_id=default_ws.metabase_group_id
                    )
                    logger.info(f"Added user to default workspace group")
                except Exception as group_err:
                    logger.warning(f"Could not add user to group: {group_err}")
        
        # Mark user as assigned
        user.default_workspace_assigned = True
        db.commit()
        
        logger.info(f"User {user.email} assigned to default workspace")
        
    except Exception as e:
        logger.error(f"Error assigning default workspace: {str(e)}")
        db.rollback()
        raise