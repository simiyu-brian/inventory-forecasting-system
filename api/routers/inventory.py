"""
routers/inventory.py - Stock levels, adjustments, and low-stock alerts
  Roles:
    GET  → any authenticated user
    POST / PATCH → manager or admin
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional, Literal
from core.database import get_db
from core.security import require_any_role, require_manager_or_above

router = APIRouter()


class StockAdjustment(BaseModel):
    product_id: int
    quantity_change: int          # positive = restock, negative = sale/shrinkage
    reason: Literal["restock", "sale", "adjustment", "damage", "return"]
    notes: Optional[str] = None


class InventoryCreate(BaseModel):
    product_id: int
    warehouse_id: int
    quantity_on_hand: int
    quantity_reserved: int = 0


# ─── Endpoints ──────────────────────────────

@router.get("/", summary="List current stock levels")
def list_inventory(
    warehouse_id: Optional[int] = Query(None),
    low_stock_only: bool = Query(False, description="Return only items below reorder point"),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_any_role),
):
    """
    Get current inventory levels across all products/warehouses.
    - Set `low_stock_only=true` to get items that need restocking.
    """
    return {"inventory": [], "total": 0, "low_stock_count": 0}


@router.get("/summary", summary="Inventory summary stats")
def inventory_summary(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_any_role),
):
    """Returns aggregated inventory stats: total SKUs, total units, low-stock count, overstock count."""
    return {
        "total_skus": 0,
        "total_units": 0,
        "low_stock_items": 0,
        "overstock_items": 0,
        "out_of_stock_items": 0,
    }


@router.get("/{product_id}", summary="Get stock level for a product")
def get_product_inventory(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_any_role),
):
    """Returns stock level details for a specific product."""
    return {"product_id": product_id, "quantity_on_hand": 0, "quantity_reserved": 0, "reorder_point": 0}


@router.post("/", status_code=201, summary="Initialize inventory for a product")
def create_inventory_record(
    payload: InventoryCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_manager_or_above),
):
    """Create initial inventory record for a product-warehouse pair. **Manager / Admin only.**"""
    return {"message": "Inventory record created", "product_id": payload.product_id}


@router.post("/adjust", summary="Adjust stock quantity")
def adjust_stock(
    payload: StockAdjustment,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_manager_or_above),
):
    """
    Record a stock adjustment (restock, sale, damage, return).
    All adjustments are logged in the audit trail.
    **Manager / Admin only.**
    """
    return {
        "message": "Stock adjusted",
        "product_id": payload.product_id,
        "quantity_change": payload.quantity_change,
        "reason": payload.reason,
    }


@router.get("/history/{product_id}", summary="Get stock movement history")
def get_stock_history(
    product_id: int,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_any_role),
):
    """Returns the stock adjustment history for a product (audit log)."""
    return {"product_id": product_id, "history": []}
