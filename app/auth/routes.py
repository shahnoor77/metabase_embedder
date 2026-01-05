from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
from jose import jwt
from datetime import datetime, timedelta
import secrets
import logging

from app.database import get_db
from app.models import User
from app.config import settings
from app.auth.dependencies import get_current_user
from app.metabase.client import MetabaseClient

router = APIRouter()
# Using Argon2 removes the 72-byte password limit
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")
logger = logging.getLogger(__name__)

# --- Schemas ---

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    metabase_session_id: str | None = None

class UserResponse(BaseModel):
    id: int
    email: str
    full_name: str
    metabase_user_id: int | None = None
    
    class Config:
        from_attributes = True

# --- Routes ---

@router.post("/signup", response_model=Token, status_code=status.HTTP_201_CREATED)
async def signup(user_data: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == user_data.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # 1. Generate local and Metabase passwords
    hashed_password = pwd_context.hash(user_data.password)
    raw_mb_password = secrets.token_urlsafe(32) # Long and secure
    
    # 2. Save User to Postgres
    user = User(
        email=user_data.email,
        hashed_password=hashed_password,
        full_name=user_data.full_name,
        # We store the raw password briefly to create the MB user, 
        # but in production you'd hash this or use a secure vault.
        metabase_password=raw_mb_password 
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # 3. Create Metabase User via API
    try:
        name_parts = user_data.full_name.split(' ', 1)
        mb_client = MetabaseClient()
        await mb_client.login()
        mb_user = await mb_client.create_metabase_user(
            email=user_data.email,
            first_name=name_parts[0],
            last_name=name_parts[1] if len(name_parts) > 1 else "User",
            password=raw_mb_password
        )
        user.metabase_user_id = mb_user['id']
        db.commit()
    except Exception as e:
        logger.error(f"Metabase auto-creation failed: {e}")

    # 4. Generate App Token
    token = jwt.encode({"sub": str(user.id), "exp": datetime.utcnow() + timedelta(hours=24)}, settings.JWT_SECRET_KEY)
    return {"access_token": token, "token_type": "bearer"}

@router.post("/login", response_model=Token)
async def login(credentials: UserLogin, db: Session = Depends(get_db)):
    # 1. Authenticate with App DB
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user or not pwd_context.verify(credentials.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # 2. Attempt to get Metabase Session for seamless iframe login
    mb_session_id = None
    if user.metabase_user_id and user.metabase_password:
        mb_client = MetabaseClient()
        mb_session_id = await mb_client.get_user_session(user.email, user.metabase_password)
    
    token = jwt.encode({"sub": str(user.id), "exp": datetime.utcnow() + timedelta(hours=24)}, settings.JWT_SECRET_KEY)
    return {
        "access_token": token, 
        "token_type": "bearer",
        "metabase_session_id": mb_session_id
    }