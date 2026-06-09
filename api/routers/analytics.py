"""
routers/analytics.py
Queries the star schema (fact_sales + dims) for business analytics.
All read-only — any authenticated user.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional
from core.database import get_db
from core.security import require_any_role

router = APIRouter()


@router.get("/sales-by-product", summary="Total sales grouped by product line")
def sales_by_product(
    year: Optional[int] = Query(None, description="Filter by year"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_any_role),
):
    """
    Returns total_sales, quantity_sold, and avg_rating per product line.
    Queries fact_sales JOIN dim_product.
    """
    where = "WHERE dd.year = :year" if year else ""
    params = {"year": year} if year else {}
    rows = db.execute(text(f"""
        SELECT
            dp.product_line,
            SUM(fs.quantity_sold)              AS total_units,
            ROUND(SUM(fs.total_sales)::numeric, 2) AS total_revenue,
            ROUND(AVG(fs.rating)::numeric, 2)      AS avg_rating
        FROM fact_sales fs
        JOIN dim_product dp ON fs.product_key = dp.product_key
        JOIN dim_date   dd ON fs.date_key     = dd.date_key
        {where}
        GROUP BY dp.product_line
        ORDER BY total_revenue DESC
    """), params).fetchall()
    return {"sales_by_product": [dict(r._mapping) for r in rows]}


@router.get("/sales-by-store", summary="Total sales grouped by store/branch")
def sales_by_store(
    year: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_any_role),
):
    """Returns revenue, units sold, and avg rating per branch."""
    where = "WHERE dd.year = :year" if year else ""
    params = {"year": year} if year else {}
    rows = db.execute(text(f"""
        SELECT
            ds.branch_name,
            ds.city,
            SUM(fs.quantity_sold)                  AS total_units,
            ROUND(SUM(fs.total_sales)::numeric, 2) AS total_revenue,
            ROUND(AVG(fs.rating)::numeric, 2)      AS avg_rating
        FROM fact_sales fs
        JOIN dim_store ds ON fs.store_key = ds.store_key
        JOIN dim_date  dd ON fs.date_key  = dd.date_key
        {where}
        GROUP BY ds.branch_name, ds.city
        ORDER BY total_revenue DESC
    """), params).fetchall()
    return {"sales_by_store": [dict(r._mapping) for r in rows]}


@router.get("/sales-by-month", summary="Monthly revenue trend")
def sales_by_month(
    year: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_any_role),
):
    """Monthly breakdown of revenue, units, and gross income."""
    where = "WHERE dd.year = :year" if year else ""
    params = {"year": year} if year else {}
    rows = db.execute(text(f"""
        SELECT
            dd.year,
            dd.month_number,
            dd.month_name,
            SUM(fs.quantity_sold)                  AS total_units,
            ROUND(SUM(fs.total_sales)::numeric, 2) AS total_revenue,
            ROUND(SUM(fs.gross_income)::numeric, 2) AS total_gross_income
        FROM fact_sales fs
        JOIN dim_date dd ON fs.date_key = dd.date_key
        {where}
        GROUP BY dd.year, dd.month_number, dd.month_name
        ORDER BY dd.year, dd.month_number
    """), params).fetchall()
    return {"monthly_trend": [dict(r._mapping) for r in rows]}


@router.get("/sales-by-payment", summary="Sales breakdown by payment method")
def sales_by_payment(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_any_role),
):
    """Compares Cash vs Ewallet vs Credit card usage and revenue."""
    rows = db.execute(text("""
        SELECT
            payment_method,
            COUNT(*)                               AS transaction_count,
            ROUND(SUM(total_sales)::numeric, 2)    AS total_revenue,
            ROUND(AVG(total_sales)::numeric, 2)    AS avg_basket
        FROM fact_sales
        GROUP BY payment_method
        ORDER BY total_revenue DESC
    """)).fetchall()
    return {"sales_by_payment": [dict(r._mapping) for r in rows]}


@router.get("/sales-by-gender", summary="Sales breakdown by customer gender")
def sales_by_gender(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_any_role),
):
    rows = db.execute(text("""
        SELECT
            gender,
            COUNT(*)                               AS transactions,
            ROUND(SUM(total_sales)::numeric, 2)    AS total_revenue,
            ROUND(AVG(rating)::numeric, 2)         AS avg_rating
        FROM fact_sales
        GROUP BY gender
    """)).fetchall()
    return {"sales_by_gender": [dict(r._mapping) for r in rows]}


@router.get("/top-products", summary="Top N product lines by revenue")
def top_products(
    n: int = Query(5, ge=1, le=20, description="Number of top products to return"),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_any_role),
):
    rows = db.execute(text("""
        SELECT
            dp.product_line,
            ROUND(SUM(fs.total_sales)::numeric, 2) AS total_revenue,
            SUM(fs.quantity_sold)                  AS total_units
        FROM fact_sales fs
        JOIN dim_product dp ON fs.product_key = dp.product_key
        GROUP BY dp.product_line
        ORDER BY total_revenue DESC
        LIMIT :n
    """), {"n": n}).fetchall()
    return {"top_products": [dict(r._mapping) for r in rows]}


@router.get("/weekend-vs-weekday", summary="Revenue: weekends vs weekdays")
def weekend_vs_weekday(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_any_role),
):
    """Uses dim_date.is_weekend to compare weekend and weekday performance."""
    rows = db.execute(text("""
        SELECT
            dd.is_weekend,
            COUNT(*)                               AS transactions,
            ROUND(SUM(fs.total_sales)::numeric, 2) AS total_revenue,
            ROUND(AVG(fs.total_sales)::numeric, 2) AS avg_transaction
        FROM fact_sales fs
        JOIN dim_date dd ON fs.date_key = dd.date_key
        GROUP BY dd.is_weekend
    """)).fetchall()
    return {"weekend_vs_weekday": [dict(r._mapping) for r in rows]}
