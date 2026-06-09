import pandas as pd
from sqlalchemy import create_engine, text

engine = create_engine('postgresql+psycopg2://postgres:simiyu@localhost:5432/inventory_db')

print("=" * 50)
print("DATA QUALITY REPORT")
print("=" * 50)

issues_found = 0

with engine.connect() as conn:

    # ── CHECK 1: Row Count ─────────────────────────────
    result = conn.execute(text("SELECT COUNT(*) FROM sales_transactions")).scalar()
    print(f"\n1. Total rows in sales_transactions: {result}")
    if result == 0:
        print("   FAIL - Table is empty!")
        issues_found += 1
    else:
        print("   PASS - Table has data")

    # ── CHECK 2: Null Values ───────────────────────────
    null_check = conn.execute(text("""
        SELECT COUNT(*) FROM sales_transactions
        WHERE invoice_id IS NULL
        OR store_id IS NULL
        OR product_id IS NULL
        OR sale_date IS NULL
        OR quantity_sold IS NULL
        OR total_sales IS NULL
    """)).scalar()
    print(f"\n2. Null values in critical columns: {null_check}")
    if null_check > 0:
        print("   FAIL - Null values found!")
        issues_found += 1
    else:
        print("   PASS - No nulls found")

    # ── CHECK 3: Duplicate Invoice IDs ─────────────────
    dupes = conn.execute(text("""
        SELECT COUNT(*) FROM (
            SELECT invoice_id, COUNT(*) as cnt
            FROM sales_transactions
            GROUP BY invoice_id
            HAVING COUNT(*) > 1
        ) duplicates
    """)).scalar()
    print(f"\n3. Duplicate invoice IDs: {dupes}")
    if dupes > 0:
        print("   FAIL - Duplicates found!")
        issues_found += 1
    else:
        print("   PASS - No duplicates")

    # ── CHECK 4: Invalid Quantities ────────────────────
    bad_qty = conn.execute(text("""
        SELECT COUNT(*) FROM sales_transactions
        WHERE quantity_sold <= 0 OR quantity_sold > 10000
    """)).scalar()
    print(f"\n4. Invalid quantities (<=0 or >10000): {bad_qty}")
    if bad_qty > 0:
        print("   FAIL - Invalid quantities found!")
        issues_found += 1
    else:
        print("   PASS - All quantities valid")

    # ── CHECK 5: Invalid Prices ────────────────────────
    bad_price = conn.execute(text("""
        SELECT COUNT(*) FROM sales_transactions
        WHERE unit_price < 0 OR total_sales < 0
    """)).scalar()
    print(f"\n5. Negative prices or sales: {bad_price}")
    if bad_price > 0:
        print("   FAIL - Negative values found!")
        issues_found += 1
    else:
        print("   PASS - All prices valid")

    # ── CHECK 6: Ratings Out of Range ──────────────────
    bad_rating = conn.execute(text("""
        SELECT COUNT(*) FROM sales_transactions
        WHERE rating < 1 OR rating > 10
    """)).scalar()
    print(f"\n6. Ratings out of range (1-10): {bad_rating}")
    if bad_rating > 0:
        print("   FAIL - Invalid ratings found!")
        issues_found += 1
    else:
        print("   PASS - All ratings valid")

    # ── CHECK 7: Invalid Payment Methods ───────────────
    bad_payment = conn.execute(text("""
        SELECT COUNT(*) FROM sales_transactions
        WHERE payment_method NOT IN ('Cash', 'Ewallet', 'Credit card')
    """)).scalar()
    print(f"\n7. Invalid payment methods: {bad_payment}")
    if bad_payment > 0:
        print("   FAIL - Unknown payment methods found!")
        issues_found += 1
    else:
        print("   PASS - All payment methods valid")

    # ── CHECK 8: Fact vs Source Row Count Match ─────────
    source_count = conn.execute(text("SELECT COUNT(*) FROM sales_transactions")).scalar()
    fact_count = conn.execute(text("SELECT COUNT(*) FROM fact_sales")).scalar()
    print(f"\n8. Row count match (source vs fact_sales): {source_count} vs {fact_count}")
    if source_count != fact_count:
        print("   FAIL - Row counts do not match!")
        issues_found += 1
    else:
        print("   PASS - Row counts match")

print("\n" + "=" * 50)
if issues_found == 0:
    print(f"ALL CHECKS PASSED - Data quality is good!")
else:
    print(f"ISSUES FOUND: {issues_found} check(s) failed!")
print("=" * 50)