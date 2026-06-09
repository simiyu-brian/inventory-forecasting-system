"""
routers/alerts.py
GET  /api/v1/alerts           — list active or all alerts
POST /api/v1/alerts/generate  — trigger alert generation from current inventory
POST /api/v1/alerts/{id}/resolve
"""
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from core.database import get_db
from core.security import require_any_role, require_manager_or_above

router = APIRouter()


def _alert_row(r) -> dict:
    return {
        "alertId":     str(r.alert_id),
        "productId":   str(r.product_id),
        "productName": r.product_line,
        "type":        r.type,
        "severity":    r.severity,
        "message":     r.message,
        "createdAt":   r.created_at.isoformat() if r.created_at else None,
        "resolved":    r.resolved,
    }


# ── GET /api/v1/alerts?status=active ─────────────────────────

@router.get("/", summary="List alerts")
def list_alerts(
    status: str = Query("active", description="active | all"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_any_role),
):
    """
    Returns alerts joined with product name.
    status=active  → unresolved only (default)
    status=all     → include resolved
    """
    where = "" if status == "all" else "WHERE a.resolved = FALSE"

    rows = db.execute(text(f"""
        SELECT
            a.alert_id, a.product_id, p.product_line,
            a.type, a.severity, a.message,
            a.created_at, a.resolved
        FROM alerts a
        JOIN products p ON p.product_id = a.product_id
        {where}
        ORDER BY a.created_at DESC
    """)).fetchall()

    return [_alert_row(r) for r in rows]


# ── POST /api/v1/alerts/generate ─────────────────────────────
# Call this after ETL or stock adjustment to refresh alert state.

@router.post("/generate", summary="Generate alerts from current inventory")
def generate_alerts(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_manager_or_above),
):
    """
    Scans inventory and inserts new low-stock / out-of-stock alerts.
    Skips products that already have an open alert of the same type.
    """
    # Products at or below reorder point (but not zero)
    low = db.execute(text("""
        SELECT i.product_id, p.product_line,
               i.quantity_on_hand, i.reorder_point
        FROM inventory i
        JOIN products p ON p.product_id = i.product_id
        WHERE i.quantity_on_hand > 0
          AND i.quantity_on_hand <= i.reorder_point
          AND NOT EXISTS (
              SELECT 1 FROM alerts a
              WHERE a.product_id = i.product_id
                AND a.type = 'low-stock'
                AND a.resolved = FALSE
          )
    """)).fetchall()

    # Products with zero stock
    out = db.execute(text("""
        SELECT i.product_id, p.product_line, i.reorder_point
        FROM inventory i
        JOIN products p ON p.product_id = i.product_id
        WHERE i.quantity_on_hand = 0
          AND NOT EXISTS (
              SELECT 1 FROM alerts a
              WHERE a.product_id = i.product_id
                AND a.type = 'low-stock'
                AND a.resolved = FALSE
          )
    """)).fetchall()

    inserted = 0
    for r in low:
        db.execute(text("""
            INSERT INTO alerts (product_id, type, severity, message)
            VALUES (:pid, 'low-stock', 'warning', :msg)
        """), {
            "pid": r.product_id,
            "msg": f"Stock ({r.quantity_on_hand}) below reorder point ({r.reorder_point})",
        })
        inserted += 1

    for r in out:
        db.execute(text("""
            INSERT INTO alerts (product_id, type, severity, message)
            VALUES (:pid, 'low-stock', 'critical', :msg)
        """), {
            "pid": r.product_id,
            "msg": f"Out of stock — reorder point is {r.reorder_point}",
        })
        inserted += 1

    db.commit()
    return {"ok": True, "alertsCreated": inserted}


# ── POST /api/v1/alerts/{alert_id}/resolve ───────────────────

@router.post("/{alert_id}/resolve", summary="Resolve an alert")
def resolve_alert(
    alert_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_manager_or_above),
):
    result = db.execute(text("""
        UPDATE alerts
        SET resolved = TRUE, resolved_at = NOW()
        WHERE alert_id = :aid AND resolved = FALSE
    """), {"aid": alert_id})
    db.commit()

    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail=f"Alert {alert_id} not found or already resolved")

    return {"ok": True}
