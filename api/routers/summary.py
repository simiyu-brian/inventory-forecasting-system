"""
routers/summary.py
GET /api/v1/summary?period=30d

Fixes:
  - totalSkus, lowStock, outOfStock pulled from inventory table (were 0)
  - openAlerts pulled from alerts table (was 0)
  - topMovers changePct is period-over-period (was 0%)
  - salesTrend pulled from fact_sales (already working in analytics)
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from core.database import get_db
from core.security import require_any_role

router = APIRouter()

PERIOD_MAP = {
    "7d":  7,
    "30d": 30,
    "90d": 90,
}


@router.get("/", summary="Dashboard summary — KPIs, trend, top movers")
def get_summary(
    period: str = Query("30d", description="7d | 30d | 90d"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_any_role),
):
    days = PERIOD_MAP.get(period, 30)

    # ── 1. KPIs from inventory ────────────────────────────────
    inv = db.execute(text("""
        SELECT
            COUNT(*)                                              AS total_skus,
            COUNT(*) FILTER (WHERE quantity_on_hand = 0)         AS out_of_stock,
            COUNT(*) FILTER (
                WHERE quantity_on_hand > 0
                  AND quantity_on_hand <= reorder_point
            )                                                     AS low_stock
        FROM inventory
    """)).fetchone()

    # ── 2. Revenue: current period vs previous period ─────────
    rev = db.execute(text("""
        SELECT
            COALESCE(SUM(total_sales) FILTER (
                WHERE sale_date >= CURRENT_DATE - :days * INTERVAL '1 day'
            ), 0) AS revenue,
            COALESCE(SUM(total_sales) FILTER (
                WHERE sale_date >= CURRENT_DATE - :days2 * INTERVAL '1 day'
                  AND sale_date <  CURRENT_DATE - :days  * INTERVAL '1 day'
            ), 0) AS revenue_prev
        FROM sales_transactions
    """), {"days": days, "days2": days * 2}).fetchone()

    # ── 3. Open alerts ────────────────────────────────────────
    open_alerts = db.execute(
        text("SELECT COUNT(*) FROM alerts WHERE resolved = FALSE")
    ).scalar() or 0

    # ── 4. Stock health buckets ───────────────────────────────
    health = db.execute(text("""
        SELECT
            COUNT(*) FILTER (WHERE quantity_on_hand > reorder_point)          AS ok,
            COUNT(*) FILTER (
                WHERE quantity_on_hand > 0 AND quantity_on_hand <= reorder_point
            )                                                                  AS warning,
            COUNT(*) FILTER (WHERE quantity_on_hand = 0)                      AS critical
        FROM inventory
    """)).fetchone()

    # ── 5. Sales trend (one row per day for the period) ───────
    trend_rows = db.execute(text("""
        SELECT
            sale_date::text AS date,
            ROUND(SUM(total_sales)::numeric, 2) AS value
        FROM sales_transactions
        WHERE sale_date >= CURRENT_DATE - :days * INTERVAL '1 day'
        GROUP BY sale_date
        ORDER BY sale_date
    """), {"days": days}).fetchall()

    # ── 6. Top movers — period-over-period changePct ──────────
    movers = db.execute(text("""
        WITH current_period AS (
            SELECT
                st.product_id,
                SUM(st.total_sales) AS revenue_curr
            FROM sales_transactions st
            WHERE st.sale_date >= CURRENT_DATE - :days * INTERVAL '1 day'
            GROUP BY st.product_id
        ),
        prev_period AS (
            SELECT
                st.product_id,
                SUM(st.total_sales) AS revenue_prev
            FROM sales_transactions st
            WHERE st.sale_date >= CURRENT_DATE - :days2 * INTERVAL '1 day'
              AND st.sale_date <  CURRENT_DATE - :days  * INTERVAL '1 day'
            GROUP BY st.product_id
        )
        SELECT
            p.product_id,
            p.product_line,
            COALESCE(c.revenue_curr, 0) AS revenue_curr,
            COALESCE(pr.revenue_prev, 0) AS revenue_prev,
            CASE
                WHEN COALESCE(pr.revenue_prev, 0) = 0 THEN NULL
                ELSE ROUND(
                    ((COALESCE(c.revenue_curr,0) - COALESCE(pr.revenue_prev,0))
                     / COALESCE(pr.revenue_prev,0) * 100)::numeric,
                    1
                )
            END AS change_pct
        FROM products p
        LEFT JOIN current_period  c  ON c.product_id  = p.product_id
        LEFT JOIN prev_period     pr ON pr.product_id = p.product_id
        WHERE COALESCE(c.revenue_curr, 0) > 0
           OR COALESCE(pr.revenue_prev, 0) > 0
        ORDER BY ABS(COALESCE(change_pct, 0)) DESC
        LIMIT 5
    """), {"days": days, "days2": days * 2}).fetchall()

    top_movers = [
        {
            "productId": str(r.product_id),
            "name":      r.product_line,
            "changePct": float(r.change_pct) if r.change_pct is not None else 0.0,
        }
        for r in movers
    ]

    return {
        "kpis": {
            "totalSkus":        int(inv.total_skus),
            "lowStock":         int(inv.low_stock),
            "outOfStock":       int(inv.out_of_stock),
            "revenue":          float(rev.revenue),
            "revenuePrevPeriod": float(rev.revenue_prev),
            "openAlerts":       int(open_alerts),
        },
        "stockHealth": {
            "ok":       int(health.ok),
            "warning":  int(health.warning),
            "critical": int(health.critical),
        },
        "salesTrend": [
            {"date": r.date, "value": float(r.value)}
            for r in trend_rows
        ],
        "topMovers": top_movers,
    }
