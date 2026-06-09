"""
routers/auth.py — Login / Register
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from typing import Optional
from core.security import hash_password, verify_password, create_access_token

router = APIRouter()

class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: Optional[str] = "analyst"   # admin | analyst

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: str

@router.post("/register", status_code=201, summary="Register a new user")
def register(payload: RegisterRequest):
    """
    Create a new user account.
    - **role**: `admin` (full access) or `analyst` (read-only). Default: analyst.
    """
    hashed = hash_password(payload.password)
    # TODO: INSERT INTO users (name, email, password, role) VALUES (...)
    return {"message": "User registered successfully", "email": payload.email, "role": payload.role}

@router.post("/login", response_model=TokenResponse, summary="Login — returns JWT token")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    Authenticate with **email** (use the username field) and **password**.
    Returns a Bearer JWT token — include it as `Authorization: Bearer <token>` in all requests.
    """
    # TODO: fetch user from DB, verify password with verify_password()
    # user = db.query(User).filter_by(email=form_data.username).first()
    # if not user or not verify_password(form_data.password, user.password):
    #     raise HTTPException(status_code=401, detail="Invalid credentials")

    # DEMO mock — replace with real DB lookup
    mock = {
        "admin@inv.com":   "admin",
        "analyst@inv.com": "analyst",
    }
    role = mock.get(form_data.username, "analyst")
    token = create_access_token({"sub": "1", "email": form_data.username, "role": role})
    return {"access_token": token, "token_type": "bearer", "role": role, "user_id": "1"}

@router.post("/logout", summary="Logout")
def logout():
    """Client should discard the JWT. Add Redis blacklist here for server-side revocation."""
    return {"message": "Logged out successfully"}
