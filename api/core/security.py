"""
core/security.py — JWT auth + role guards
Roles: admin | manager | analyst (analyst = read-only)
Set DISABLE_AUTH=true in .env to bypass all auth (internal service mode).
"""
import os
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY    = os.getenv("SECRET_KEY", "change-this-secret-in-production")
ALGORITHM     = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24
DISABLE_AUTH  = os.getenv("DISABLE_AUTH", "false").lower() == "true"

pwd_context   = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=not DISABLE_AUTH)

_SERVICE_USER = {"user_id": "service", "role": "admin", "email": "internal@invensight"}


def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode["exp"] = expire
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(token: Optional[str] = Depends(oauth2_scheme)) -> dict:
    if DISABLE_AUTH:
        return _SERVICE_USER
    if not token:
        raise HTTPException(status_code=401, detail="Authentication required.")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        role    = payload.get("role", "analyst")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token.")
        return {"user_id": user_id, "role": role, "email": payload.get("email")}
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    if not DISABLE_AUTH and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required.")
    return current_user

def require_any_role(current_user: dict = Depends(get_current_user)) -> dict:
    return current_user

def require_manager_or_above(current_user: dict = Depends(get_current_user)) -> dict:
    if not DISABLE_AUTH and current_user["role"] not in ("admin", "manager"):
        raise HTTPException(status_code=403, detail="Manager or admin access required.")
    return current_user
