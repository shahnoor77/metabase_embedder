"""
Authentication routes for user signup, login, and token management.
Reliable version with Python 3.12 compatibility.
"""
import logging
from datetime import datetime, timedelta
from typing import Optional
import bcrypt
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
    deprecated="auto",
    bcrypt__ident="2b"
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

class TokenData(BaseModel):
    email: Optional[str] = None


# ==================== Security Utilities ====================
def get_password_hash(password: str) -> str:
    if not password:
        raise ValueError("Password cannot be empty")
    password_bytes = password.encode('utf-8')
    if len(password_bytes) > 72:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Password is too long (max 72 character)."
        )
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        password_bytes = plain_password.encode('utf-8')
        hashed_bytes = hashed_password.encode('utf-8')
        return bcrypt.checkpw(password_bytes, hashed_bytes)
    except Exception as e:
        logger.error(f"Password varification error: {e}")
        return False
        
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

# Add this function in the Security Utilities section
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
        # Decode the JWT
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = TokenData(email=email)
    except JWTError:
        raise credentials_exception
    
    # Find user in DB
    user = db.query(User).filter(User.email == token_data.email).first()
    
    if user is None:
        raise credentials_exception
    
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    
    return user


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
        from app.metabase.client import MetabaseClient
        mb_client = MetabaseClient(
            base_url=settings.METABASE_URL,
            admin_email=settings.METABASE_ADMIN_EMAIL,
            admin_password=settings.METABASE_ADMIN_EMAIL,
            embedding_secret=settings.METABASE_EMBEDDING_SECRET
        )
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