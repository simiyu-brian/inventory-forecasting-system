"""
routers/data_quality.py
Exposes your data_quality.py checks as REST endpoints so results
can be consumed by a dashboard or monitoring tool.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from core.database import get_db
from core.security import require_any_role, require_admin

router = APIRouter()


def _check(db, sql, params=None) -> int:
    return db.execute(text(sql), params or {}).scalar() or 0


@router.get("/report", summary="Run all 8 data quality checks")
def full_quality_report(db: Session = Depends(get_db), current_user: dict = Depends(require_any_role)):
    """
    Runs all 8 checks from `data_quality.py` against the live DB and returns
    a structured JSON report. Each check returns PASS or FAIL + count.
    """
    checks = []
    issues = 0

    # CHECK 1: Row count
    count = _check(db, "SELECT COUNT(*) FROM sales_transactions")
    passed = count > 0
    checks.append({"id": 1, "name": "Row Count", "value": count, "status": "PASS" if passed else "FAIL",
                   "detail": "sales_transactions has data" if passed else "Table is empty"})
    if not passed: issues += 1

    # CHECK 2: Null values in critical columns
    nulls = _check(db, """
        SELECT COUNT(*) FROM sales_transactions
        WHERE invoice_id IS NULL OR store_id IS NULL OR product_id IS NULL
           OR sale_date IS NULL OR quantity_sold IS NULL OR total_sales IS NULL
    """)
    passed = nulls == 0
    checks.append({"id": 2, "name": "Null Values", "value": nulls, "status": "PASS" if passed else "FAIL",
                   "detail": "No nulls in critical columns" if passed else f"{nulls} null(s) found"})
    if not passed: issues += 1

    # CHECK 3: Duplicate invoice IDs
    dupes = _check(db, """
        SELECT COUNT(*) FROM (
            SELECT invoice_id FROM sales_transactions
            GROUP BY invoice_id HAVING COUNT(*) > 1
        ) d
    """)
    passed = dupes == 0
    checks.append({"id": 3, "name": "Duplicate Invoice IDs", "value": dupes, "status": "PASS" if passed else "FAIL",
                   "detail": "No duplicates" if passed else f"{dupes} duplicate invoice(s)"})
    if not passed: issues += 1

    # CHECK 4: Invalid quantities
    bad_qty = _check(db, "SELECT COUNT(*) FROM sales_transactions WHERE quantity_sold <= 0 OR quantity_sold > 10000")
    passed = bad_qty == 0
    checks.append({"id": 4, "name": "Invalid Quantities", "value": bad_qty, "status": "PASS" if passed else "FAIL",
                   "detail": "All quantities valid (1–10000)" if passed else f"{bad_qty} invalid quantity rows"})
    if not passed: issues += 1

    # CHECK 5: Negative prices
    bad_price = _check(db, "SELECT COUNT(*) FROM sales_transactions WHERE unit_price < 0 OR total_sales < 0")
    passed = bad_price == 0
    checks.append({"id": 5, "name": "Negative Prices", "value": bad_price, "status": "PASS" if passed else "FAIL",
                   "detail": "All prices positive" if passed else f"{bad_price} negative price rows"})
    if not passed: issues += 1

    # CHECK 6: Ratings out of range
    bad_rating = _check(db, "SELECT COUNT(*) FROM sales_transactions WHERE rating < 1 OR rating > 10")
    passed = bad_rating == 0
    checks.append({"id": 6, "name": "Rating Range (1–10)", "value": bad_rating, "status": "PASS" if passed else "FAIL",
                   "detail": "All ratings within 1–10" if passed else f"{bad_rating} out-of-range ratings"})
    if not passed: issues += 1

    # CHECK 7: Invalid payment methods
    bad_pay = _check(db, "SELECT COUNT(*) FROM sales_transactions WHERE payment_method NOT IN ('Cash', 'Ewallet', 'Credit card')")
    passed = bad_pay == 0
    checks.append({"id": 7, "name": "Payment Methods", "value": bad_pay, "status": "PASS" if passed else "FAIL",
                   "detail": "All values: Cash / Ewallet / Credit card" if passed else f"{bad_pay} unknown payment method(s)"})
    if not passed: issues += 1

    # CHECK 8: Source vs fact_sales row match
    source_count = _check(db, "SELECT COUNT(*) FROM sales_transactions")
    fact_count   = _check(db, "SELECT COUNT(*) FROM fact_sales")
    passed = source_count == fact_count
    checks.append({"id": 8, "name": "Row Count Match (staging vs fact_sales)",
                   "value": {"sales_transactions": source_count, "fact_sales": fact_count},
                   "status": "PASS" if passed else "FAIL",
                   "detail": "Row counts match" if passed else f"Mismatch: {source_count} vs {fact_count}"})
    if not passed: issues += 1

    return {
        "overall_status": "PASS" if issues == 0 else "FAIL",
        "total_checks": len(checks),
        "issues_found": issues,
        "checks": checks,
    }


@router.get("/check/nulls", summary="Check null values only")
def check_nulls(db: Session = Depends(get_db), current_user: dict = Depends(require_any_role)):
    count = _check(db, """
        SELECT COUNT(*) FROM sales_transactions
        WHERE invoice_id IS NULL OR store_id IS NULL OR product_id IS NULL
           OR sale_date IS NULL OR quantity_sold IS NULL OR total_sales IS NULL
    """)
    return {"check": "null_values", "count": count, "status": "PASS" if count == 0 else "FAIL"}


@router.get("/check/duplicates", summary="Check duplicate invoice IDs only")
def check_duplicates(db: Session = Depends(get_db), current_user: dict = Depends(require_any_role)):
    count = _check(db, """
        SELECT COUNT(*) FROM (
            SELECT invoice_id FROM sales_transactions
            GROUP BY invoice_id HAVING COUNT(*) > 1
        ) d
    """)
    return {"check": "duplicate_invoices", "count": count, "status": "PASS" if count == 0 else "FAIL"}


@router.get("/check/row-match", summary="Compare staging vs fact_sales row counts")
def check_row_match(db: Session = Depends(get_db), current_user: dict = Depends(require_any_role)):
    staging = _check(db, "SELECT COUNT(*) FROM sales_transactions")
    fact    = _check(db, "SELECT COUNT(*) FROM fact_sales")
    return {
        "check": "row_count_match",
        "sales_transactions": staging,
        "fact_sales": fact,
        "match": staging == fact,
        "status": "PASS" if staging == fact else "FAIL",
    }
