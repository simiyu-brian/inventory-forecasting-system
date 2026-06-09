"""
routers/users.py - User management (Admin only for write operations)
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional
from core.database import get_db
from core.security import require_admin, require_any_role

router = APIRouter()


class UserUpdate(BaseModel):
    name: Optional[str]
    role: Optional[str]
    is_active: Optional[bool]


# ─── Endpoints ──────────────────────────────

@router.get("/", summary="List all users")
def list_users(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin),   # Admin only
):
    """Get a paginated list of all system users. **Admin only.**"""
    # TODO: return db.query(UserModel).offset(skip).limit(limit).all()
    return {"users": [], "total": 0, "skip": skip, "limit": limit}


@router.get("/me", summary="Get my profile")
def get_my_profile(current_user: dict = Depends(require_any_role)):
    """Returns the profile of the currently authenticated user."""
    return current_user


@router.get("/{user_id}", summary="Get user by ID")
def get_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """Get a specific user's details. **Admin only.**"""
    # TODO: fetch from DB
    return {"user_id": user_id, "detail": "not implemented"}


@router.patch("/{user_id}", summary="Update user role or status")
def update_user(
    user_id: int,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """Update a user's name, role, or active status. **Admin only.**"""
    return {"message": f"User {user_id} updated", "changes": payload.dict(exclude_none=True)}


@router.delete("/{user_id}", summary="Delete a user")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_admin),
):
    """Soft-delete or permanently remove a user. **Admin only.**"""
    return {"message": f"User {user_id} deleted"}
