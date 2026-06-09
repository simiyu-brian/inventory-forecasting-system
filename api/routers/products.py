"""
routers/products.py
Maps to: products table (product_id, product_line, unit_price)
         dim_product  (product_key, product_id, product_line, unit_price)
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional
from core.database import get_db
from core.security import require_any_role, require_admin

router = APIRouter()

class ProductCreate(BaseModel):
    product_line: str
    unit_price: float

class ProductUpdate(BaseModel):
    product_line: Optional[str] = None
    unit_price: Optional[float] = None


@router.get("/", summary="List all product lines")
def list_products(db: Session = Depends(get_db), current_user: dict = Depends(require_any_role)):
    """Returns all rows from the `products` table."""
    rows = db.execute(text("SELECT product_id, product_line, unit_price FROM products ORDER BY product_id")).fetchall()
    return {"products": [{"product_id": r.product_id, "product_line": r.product_line, "unit_price": float(r.unit_price)} for r in rows]}


@router.get("/{product_id}", summary="Get a product by ID")
def get_product(product_id: int, db: Session = Depends(get_db), current_user: dict = Depends(require_any_role)):
    row = db.execute(text("SELECT product_id, product_line, unit_price FROM products WHERE product_id = :id"), {"id": product_id}).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found")
    return {"product_id": row.product_id, "product_line": row.product_line, "unit_price": float(row.unit_price)}


@router.post("/", status_code=201, summary="Add a new product line")
def create_product(payload: ProductCreate, db: Session = Depends(get_db), current_user: dict = Depends(require_admin)):
    """Insert a new product line. **Admin only.**"""
    db.execute(
        text("INSERT INTO products (product_line, unit_price) VALUES (:product_line, :unit_price) ON CONFLICT DO NOTHING"),
        {"product_line": payload.product_line, "unit_price": payload.unit_price}
    )
    db.commit()
    return {"message": "Product created", "product_line": payload.product_line}


@router.put("/{product_id}", summary="Update a product")
def update_product(product_id: int, payload: ProductUpdate, db: Session = Depends(get_db), current_user: dict = Depends(require_admin)):
    """Update product line name or price. **Admin only.**"""
    updates = {k: v for k, v in payload.dict().items() if v is not None}
    if not updates:
        return {"message": "No changes provided"}
    set_clause = ", ".join(f"{k} = :{k}" for k in updates)
    updates["id"] = product_id
    db.execute(text(f"UPDATE products SET {set_clause} WHERE product_id = :id"), updates)
    db.commit()
    return {"message": f"Product {product_id} updated", "changes": payload.dict(exclude_none=True)}


@router.delete("/{product_id}", summary="Delete a product")
def delete_product(product_id: int, db: Session = Depends(get_db), current_user: dict = Depends(require_admin)):
    """Delete a product record. **Admin only.**"""
    db.execute(text("DELETE FROM products WHERE product_id = :id"), {"id": product_id})
    db.commit()
    return {"message": f"Product {product_id} deleted"}
