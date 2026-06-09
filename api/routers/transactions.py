"""
routers/transactions.py
Maps to: sales_transactions table
Fields: invoice_id, store_id, product_id, customer_type, gender,
        quantity_sold, unit_price, tax, total_sales,
        sale_date, sale_time, payment_method, rating
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional, Literal
from core.database import get_db
from core.security import require_any_role, require_admin

router = APIRouter()

class TransactionCreate(BaseModel):
    invoice_id: str
    store_id: int
    product_id: int
    customer_type: Literal["Member", "Normal"]
    gender: Literal["Male", "Female"]
    quantity_sold: int
    unit_price: float
    tax: float
    total_sales: float
    sale_date: str        # YYYY-MM-DD
    sale_time: str        # HH:MM:SS
    payment_method: Literal["Cash", "Ewallet", "Credit card"]
    rating: Optional[float] = None


@router.get("/", summary="List sales transactions")
def list_transactions(
    store_id: Optional[int]   = Query(None, description="Filter by store"),
    product_id: Optional[int] = Query(None, description="Filter by product"),
    from_date: Optional[str]  = Query(None, description="Start date YYYY-MM-DD"),
    to_date: Optional[str]    = Query(None, description="End date YYYY-MM-DD"),
    payment_method: Optional[str] = Query(None, description="Cash | Ewallet | Credit card"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=1000),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_any_role),
):
    """
    Paginated list of sales transactions.
    Filter by store, product, date range, or payment method.
    """
    filters = ["1=1"]
    params: dict = {"skip": skip, "limit": limit}

    if store_id:
        filters.append("store_id = :store_id")
        params["store_id"] = store_id
    if product_id:
        filters.append("product_id = :product_id")
        params["product_id"] = product_id
    if from_date:
        filters.append("sale_date >= :from_date")
        params["from_date"] = from_date
    if to_date:
        filters.append("sale_date <= :to_date")
        params["to_date"] = to_date
    if payment_method:
        filters.append("payment_method = :payment_method")
        params["payment_method"] = payment_method

    where = " AND ".join(filters)
    rows = db.execute(text(f"""
        SELECT invoice_id, store_id, product_id, customer_type, gender,
               quantity_sold, unit_price, tax, total_sales,
               sale_date, sale_time, payment_method, rating
        FROM sales_transactions
        WHERE {where}
        ORDER BY sale_date DESC, sale_time DESC
        OFFSET :skip LIMIT :limit
    """), params).fetchall()

    total = db.execute(text(f"SELECT COUNT(*) FROM sales_transactions WHERE {where}"),
                       {k: v for k, v in params.items() if k not in ("skip", "limit")}).scalar()

    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "transactions": [dict(r._mapping) for r in rows],
    }


@router.get("/summary", summary="Sales summary stats")
def sales_summary(db: Session = Depends(get_db), current_user: dict = Depends(require_any_role)):
    """High-level totals: total transactions, revenue, avg rating, top payment method."""
    row = db.execute(text("""
        SELECT
            COUNT(*)                        AS total_transactions,
            ROUND(SUM(total_sales)::numeric, 2)   AS total_revenue,
            ROUND(SUM(tax)::numeric, 2)            AS total_tax,
            ROUND(AVG(rating)::numeric, 2)         AS avg_rating,
            SUM(quantity_sold)              AS total_units_sold
        FROM sales_transactions
    """)).fetchone()
    return dict(row._mapping)


@router.get("/{invoice_id}", summary="Get a transaction by invoice ID")
def get_transaction(invoice_id: str, db: Session = Depends(get_db), current_user: dict = Depends(require_any_role)):
    row = db.execute(
        text("SELECT * FROM sales_transactions WHERE invoice_id = :id"),
        {"id": invoice_id}
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail=f"Invoice {invoice_id} not found")
    return dict(row._mapping)


@router.post("/", status_code=201, summary="Insert a single transaction")
def create_transaction(payload: TransactionCreate, db: Session = Depends(get_db), current_user: dict = Depends(require_admin)):
    """
    Manually insert one sales transaction.
    For bulk ingestion use the ETL pipeline endpoint.
    **Admin only.**
    """
    db.execute(text("""
        INSERT INTO sales_transactions (
            invoice_id, store_id, product_id, customer_type, gender,
            quantity_sold, unit_price, tax, total_sales,
            sale_date, sale_time, payment_method, rating
        ) VALUES (
            :invoice_id, :store_id, :product_id, :customer_type, :gender,
            :quantity_sold, :unit_price, :tax, :total_sales,
            :sale_date, :sale_time, :payment_method, :rating
        ) ON CONFLICT (invoice_id) DO NOTHING
    """), payload.dict())
    db.commit()
    return {"message": "Transaction inserted", "invoice_id": payload.invoice_id}


@router.delete("/{invoice_id}", summary="Delete a transaction")
def delete_transaction(invoice_id: str, db: Session = Depends(get_db), current_user: dict = Depends(require_admin)):
    """Delete a transaction by invoice ID. **Admin only.**"""
    db.execute(text("DELETE FROM sales_transactions WHERE invoice_id = :id"), {"id": invoice_id})
    db.commit()
    return {"message": f"Transaction {invoice_id} deleted"}
