"""
routers/inventory.py
Serves GET /api/v1/inventory — real stock levels from the inventory table.
Also handles stock adjustments with a full audit log.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional, Literal
from core.database import get_db
from core.security import require_any_role, require_manager_or_above

router = APIRouter()


class StockAdjustment(BaseModel):
    newStock: int
    reason: str


class InventoryCreate(BaseModel):
    product_id: int
    warehouse_id: int = 1
    quantity_on_hand: int
    reorder_point: int = 20
    reorder_qty: int = 50
    supplier_id: Optional[int] = None


# ── helpers ──────────────────────────────────────────────────

def _row_to_dict(r) -> dict:
    return {
        "productId":     str(r.product_id),
        "name":          r.product_line,
        "category":      r.product_line,          # products table has no category column; use product_line
        "stock":         r.quantity_on_hand,
        "reorderPoint":  r.reorder_point,
        "warehouse":     r.warehouse_name or "Main",
        "supplierName":  r.supplier_name or "Unknown",
        "leadTimeDays":  r.lead_time_days or 3,
    }


# ── GET /api/v1/inventory  (contract: GET /api/inventory) ────

@router.get("/", summary="List current stock levels")
def list_inventory(
    warehouse_id: Optional[int] = Query(None),
    low_stock_only: bool = Query(False),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_any_role),
):
    """
    Returns all products with live stock, reorder point, warehouse, and supplier.
    Matches the integration contract shape expected by GET /api/inventory.
    """
    filters = ["1=1"]
    params: dict = {"skip": skip, "limit": limit}

    if warehouse_id:
        filters.append("i.warehouse_id = :warehouse_id")
        params["warehouse_id"] = warehouse_id

    if low_stock_only:
        filters.append("i.quantity_on_hand <= i.reorder_point")

    where = " AND ".join(filters)

    rows = db.execute(text(f"""
        SELECT
            p.product_id,
            p.product_line,
            i.quantity_on_hand,
            i.reorder_point,
            w.name          AS warehouse_name,
            s.name          AS supplier_name,
            s.lead_time_days
        FROM inventory i
        JOIN products   p ON p.product_id   = i.product_id
        LEFT JOIN warehouses w ON w.warehouse_id = i.warehouse_id
        LEFT JOIN suppliers  s ON s.supplier_id  = i.supplier_id
        WHERE {where}
        ORDER BY p.product_id
        OFFSET :skip LIMIT :limit
    """), params).fetchall()

    return [_row_to_dict(r) for r in rows]


# ── GET /api/v1/inventory/summary ────────────────────────────

@router.get("/summary", summary="Inventory summary stats")
def inventory_summary(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_any_role),
):
    """Aggregated inventory stats used by the dashboard KPI cards."""
    row = db.execute(text("""
        SELECT
            COUNT(*)                                            AS total_skus,
            COALESCE(SUM(quantity_on_hand), 0)                 AS total_units,
            COUNT(*) FILTER (WHERE quantity_on_hand = 0)       AS out_of_stock,
            COUNT(*) FILTER (
                WHERE quantity_on_hand > 0
                  AND quantity_on_hand <= reorder_point
            )                                                  AS low_stock,
            COUNT(*) FILTER (
                WHERE quantity_on_hand > reorder_point * 2
            )                                                  AS overstock
        FROM inventory
    """)).fetchone()

    return {
        "totalSkus":       int(row.total_skus),
        "totalUnits":      int(row.total_units),
        "lowStock":        int(row.low_stock),
        "outOfStock":      int(row.out_of_stock),
        "overstockItems":  int(row.overstock),
    }


# ── GET /api/v1/inventory/{product_id} ───────────────────────

@router.get("/{product_id}", summary="Get stock level for a product")
def get_product_inventory(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_any_role),
):
    row = db.execute(text("""
        SELECT
            p.product_id, p.product_line,
            i.quantity_on_hand, i.quantity_reserved, i.reorder_point,
            w.name AS warehouse_name, s.name AS supplier_name, s.lead_time_days
        FROM inventory i
        JOIN products p ON p.product_id = i.product_id
        LEFT JOIN warehouses w ON w.warehouse_id = i.warehouse_id
        LEFT JOIN suppliers  s ON s.supplier_id  = i.supplier_id
        WHERE i.product_id = :pid
        LIMIT 1
    """), {"pid": product_id}).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail=f"No inventory record for product {product_id}")

    return _row_to_dict(row)


# ── POST /api/v1/inventory/{product_id}/adjust ───────────────
# Matches contract: POST /api/inventory/:productId/adjust
# Body: { "newStock": 45, "reason": "Stock count correction" }

@router.post("/{product_id}/adjust", summary="Adjust stock level")
def adjust_stock(
    product_id: int,
    payload: StockAdjustment,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_manager_or_above),
):
    """
    Set stock to newStock and log the change.
    Calculates quantity_change = newStock - current for the audit log.
    """
    current = db.execute(
        text("SELECT quantity_on_hand FROM inventory WHERE product_id = :pid LIMIT 1"),
        {"pid": product_id}
    ).scalar()

    if current is None:
        raise HTTPException(status_code=404, detail=f"No inventory record for product {product_id}")

    quantity_change = payload.newStock - current

    db.execute(text("""
        UPDATE inventory
        SET quantity_on_hand = :new_stock, last_updated = NOW()
        WHERE product_id = :pid
    """), {"new_stock": payload.newStock, "pid": product_id})

    db.execute(text("""
        INSERT INTO stock_adjustments
            (product_id, quantity_change, reason, adjusted_by)
        VALUES (:pid, :change, :reason, :user)
    """), {
        "pid":    product_id,
        "change": quantity_change,
        "reason": payload.reason,
        "user":   current_user.get("email", current_user["user_id"]),
    })

    db.commit()
    return {"ok": True}


# ── POST /api/v1/inventory/ (create initial record) ──────────

@router.post("/", status_code=201, summary="Initialize inventory for a product")
def create_inventory_record(
    payload: InventoryCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_manager_or_above),
):
    db.execute(text("""
        INSERT INTO inventory
            (product_id, warehouse_id, supplier_id, quantity_on_hand, reorder_point, reorder_qty)
        VALUES (:product_id, :warehouse_id, :supplier_id, :qty, :rp, :rq)
        ON CONFLICT (product_id, warehouse_id) DO UPDATE
            SET quantity_on_hand = EXCLUDED.quantity_on_hand,
                reorder_point    = EXCLUDED.reorder_point,
                last_updated     = NOW()
    """), {
        "product_id":   payload.product_id,
        "warehouse_id": payload.warehouse_id,
        "supplier_id":  payload.supplier_id,
        "qty":          payload.quantity_on_hand,
        "rp":           payload.reorder_point,
        "rq":           payload.reorder_qty,
    })
    db.commit()
    return {"message": "Inventory record created", "product_id": payload.product_id}


# ── GET /api/v1/inventory/history/{product_id} ───────────────

@router.get("/history/{product_id}", summary="Stock movement history")
def get_stock_history(
    product_id: int,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_any_role),
):
    rows = db.execute(text("""
        SELECT adjustment_id, quantity_change, reason, notes, adjusted_by, adjusted_at
        FROM stock_adjustments
        WHERE product_id = :pid
        ORDER BY adjusted_at DESC
        LIMIT :limit
    """), {"pid": product_id, "limit": limit}).fetchall()

    return {"product_id": product_id, "history": [dict(r._mapping) for r in rows]}
