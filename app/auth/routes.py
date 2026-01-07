"""
Authentication routes for user signup, login, and token management.
Reliable version with Python 3.12 compatibility.
"""
import logging
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel

from app.database import get_db
from app.models import User
from app.config import Settings

router = APIRouter(prefix="/auth", tags=["authentication"])
logger = logging.getLogger(__name__)

# ==================== Security Configuration ====================
settings = Settings()

# Fix for Python 3.12 + Passlib + Bcrypt
# bcrypt__handle_max_72_chars=True prevents the ValueError crash
pwd_context = CryptContext(
    schemes=["bcrypt"], 
    deprecated="auto"
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

# ==================== Pydantic Schemas ====================

class UserSignup(BaseModel):
    email: str  # Changed from EmailStr to allow .local domains
    password: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None

class UserLogin(BaseModel):
    email: str  # Changed from EmailStr
    password: str

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

# ==================== Security Utilities ====================

def verify_password(plain_password: str, hashed_password: str) -> bool:
    if len(plain_password.encode('utf-8'))>72:
        return False
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    if not password:
        raise ValueError("Password cannot be empty")
    if len(password.encode('utf-8')) > 72:
        raise HTTPException(
            status_code=400, 
            detail="Password exceeds the 72-byte limit for Bcrypt."
        )
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

# ==================== Routes ====================

@router.post("/signup", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def signup(user_data: UserSignup, db: Session = Depends(get_db)):
    # 1. Check existence
    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # 2. Hash and Save
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
    
    # 3. Metabase Provisioning
    try:
        from app.auth.routes import get_metabase_client # Local import to avoid circulars
        mb_client = get_metabase_client()
        mb_user = await mb_client.get_user_by_email(user_data.email)
        
        if not mb_user:
            mb_user = await mb_client.create_metabase_user(
                email=user_data.email,
                first_name=user_data.first_name or "User",
                last_name=user_data.last_name or "User",
                password=user_data.password
            )
        
        if mb_user.get("id"):
            new_user.metabase_user_id = mb_user.get("id")
            db.commit()
    except Exception as e:
        logger.error(f"Metabase sync failed: {str(e)}")
        
    return new_user

@router.post("/login", response_model=Token)
async def login(login_data: UserLogin, db: Session = Depends(get_db)):
    # Look up by email (matching our JSON schema)
    user = db.query(User).filter(User.email == login_data.email).first()
    
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    return {
        "access_token": create_access_token(data={"sub": user.email}),
        "token_type": "bearer"
    }