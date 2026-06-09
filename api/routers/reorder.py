"""
routers/reorder.py
GET  /api/v1/reorder/suggestions     — products at/below reorder point with EOQ qty
GET  /api/v1/purchase-orders         — all purchase orders
POST /api/v1/purchase-orders         — create a new PO
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional
from core.database import get_db
from core.security import require_any_role, require_manager_or_above
import math

router = APIRouter()


class PurchaseOrderCreate(BaseModel):
    productId: str
    supplierName: str
    qty: int
    expectedDate: str          # YYYY-MM-DD


def _eoq(annual_demand: float, order_cost: float = 50, holding_cost: float = 2) -> int:
    """
    Economic Order Quantity formula: sqrt(2DS/H)
    D = annual demand, S = order cost per order, H = holding cost per unit per year.
    Falls back to reorder_qty stored in inventory if demand is zero.
    """
    if annual_demand <= 0:
        return 50
    return max(1, math.ceil(math.sqrt((2 * annual_demand * order_cost) / holding_cost)))


# ── GET /api/v1/reorder/suggestions ──────────────────────────

@router.get("/suggestions", summary="Products at/below reorder point with EOQ suggestion")
def reorder_suggestions(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_any_role),
):
    """
    Returns products whose current stock is at or below their reorder point.
    Suggested order quantity is EOQ-based, using the last 12 months of sales
    as the annual demand proxy.
    """
    rows = db.execute(text("""
        SELECT
            i.product_id,
            p.product_line,
            i.quantity_on_hand,
            i.reorder_point,
            i.reorder_qty,
            COALESCE(s.name, 'Unknown') AS supplier_name,
            COALESCE(
                (
                    SELECT SUM(st.quantity_sold)
                    FROM sales_transactions st
                    WHERE st.product_id = i.product_id
                      AND st.sale_date >= CURRENT_DATE - INTERVAL '12 months'
                ),
                0
            ) AS annual_demand
        FROM inventory i
        JOIN products p ON p.product_id = i.product_id
        LEFT JOIN suppliers s ON s.supplier_id = i.supplier_id
        WHERE i.quantity_on_hand <= i.reorder_point
        ORDER BY i.quantity_on_hand ASC
    """)).fetchall()

    results = []
    for r in rows:
        suggested = _eoq(float(r.annual_demand)) if r.annual_demand else r.reorder_qty
        results.append({
            "productId":    str(r.product_id),
            "name":         r.product_line,
            "currentStock": r.quantity_on_hand,
            "reorderPoint": r.reorder_point,
            "suggestedQty": suggested,
            "supplierName": r.supplier_name,
        })

    return results


# ── GET /api/v1/purchase-orders ───────────────────────────────

@router.get("/purchase-orders", summary="List all purchase orders")
def list_purchase_orders(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_any_role),
):
    rows = db.execute(text("""
        SELECT
            po.po_id, po.product_id, p.product_line,
            po.supplier_name, po.qty, po.status,
            po.expected_date, po.created_at
        FROM purchase_orders po
        JOIN products p ON p.product_id = po.product_id
        ORDER BY po.created_at DESC
    """)).fetchall()

    return [
        {
            "poId":         str(r.po_id),
            "productId":    str(r.product_id),
            "productName":  r.product_line,
            "supplierName": r.supplier_name,
            "qty":          r.qty,
            "status":       r.status,
            "expectedDate": str(r.expected_date) if r.expected_date else None,
        }
        for r in rows
    ]


# ── POST /api/v1/purchase-orders ─────────────────────────────

@router.post("/purchase-orders", status_code=201, summary="Create a purchase order")
def create_purchase_order(
    payload: PurchaseOrderCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_manager_or_above),
):
    product_id = int(payload.productId)

    exists = db.execute(
        text("SELECT 1 FROM products WHERE product_id = :pid"),
        {"pid": product_id}
    ).scalar()
    if not exists:
        raise HTTPException(status_code=404, detail=f"Product {product_id} not found")

    row = db.execute(text("""
        INSERT INTO purchase_orders (product_id, supplier_name, qty, status, expected_date)
        VALUES (:pid, :supplier, :qty, 'pending', :expected)
        RETURNING po_id
    """), {
        "pid":      product_id,
        "supplier": payload.supplierName,
        "qty":      payload.qty,
        "expected": payload.expectedDate,
    }).fetchone()
    db.commit()

    return {
        "poId":         str(row.po_id),
        "productId":    str(product_id),
        "supplierName": payload.supplierName,
        "qty":          payload.qty,
        "status":       "pending",
        "expectedDate": payload.expectedDate,
    }
