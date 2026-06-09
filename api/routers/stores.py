"""
routers/stores.py
Maps to: stores table (store_id, branch_name, city)
         dim_store  (store_key, store_id, branch_name, city)
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional
from core.database import get_db
from core.security import require_any_role, require_admin

router = APIRouter()

class StoreCreate(BaseModel):
    branch_name: str
    city: str

class StoreUpdate(BaseModel):
    branch_name: Optional[str] = None
    city: Optional[str] = None


@router.get("/", summary="List all stores")
def list_stores(db: Session = Depends(get_db), current_user: dict = Depends(require_any_role)):
    """Returns all stores from the `stores` table."""
    rows = db.execute(text("SELECT store_id, branch_name, city FROM stores ORDER BY store_id")).fetchall()
    return {"stores": [{"store_id": r.store_id, "branch_name": r.branch_name, "city": r.city} for r in rows]}


@router.get("/{store_id}", summary="Get a store by ID")
def get_store(store_id: int, db: Session = Depends(get_db), current_user: dict = Depends(require_any_role)):
    """Returns a single store including its sales summary from dim_store."""
    row = db.execute(text("SELECT store_id, branch_name, city FROM stores WHERE store_id = :id"), {"id": store_id}).fetchone()
    if not row:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail=f"Store {store_id} not found")
    return {"store_id": row.store_id, "branch_name": row.branch_name, "city": row.city}


@router.post("/", status_code=201, summary="Add a new store")
def create_store(payload: StoreCreate, db: Session = Depends(get_db), current_user: dict = Depends(require_admin)):
    """Insert a new store into `stores`. **Admin only.**"""
    db.execute(
        text("INSERT INTO stores (branch_name, city) VALUES (:branch_name, :city) ON CONFLICT DO NOTHING"),
        {"branch_name": payload.branch_name, "city": payload.city}
    )
    db.commit()
    return {"message": "Store created", "branch_name": payload.branch_name, "city": payload.city}


@router.put("/{store_id}", summary="Update a store")
def update_store(store_id: int, payload: StoreUpdate, db: Session = Depends(get_db), current_user: dict = Depends(require_admin)):
    """Update branch name or city. **Admin only.**"""
    updates = {k: v for k, v in payload.dict().items() if v is not None}
    if not updates:
        return {"message": "No changes provided"}
    set_clause = ", ".join(f"{k} = :{k}" for k in updates)
    updates["id"] = store_id
    db.execute(text(f"UPDATE stores SET {set_clause} WHERE store_id = :id"), updates)
    db.commit()
    return {"message": f"Store {store_id} updated", "changes": payload.dict(exclude_none=True)}


@router.delete("/{store_id}", summary="Delete a store")
def delete_store(store_id: int, db: Session = Depends(get_db), current_user: dict = Depends(require_admin)):
    """Delete a store record. **Admin only.**"""
    db.execute(text("DELETE FROM stores WHERE store_id = :id"), {"id": store_id})
    db.commit()
    return {"message": f"Store {store_id} deleted"}
