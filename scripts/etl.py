import pandas as pd
from sqlalchemy import create_engine, text

engine = create_engine('postgresql+psycopg2://postgres:simiyu@localhost:5432/inventory_db')

print("Starting ETL...")

# Clear star schema tables before reloading
with engine.begin() as conn:
    conn.execute(text("TRUNCATE TABLE fact_sales CASCADE"))
    conn.execute(text("TRUNCATE TABLE dim_date CASCADE"))
    conn.execute(text("TRUNCATE TABLE dim_store CASCADE"))
    conn.execute(text("TRUNCATE TABLE dim_product CASCADE"))
print("Star schema cleared")

#1. Load DIM_STORE 
with engine.begin() as conn:
    stores = conn.execute(text("SELECT store_id, branch_name, city FROM stores")).fetchall()
    for row in stores:
        conn.execute(text("""
            INSERT INTO dim_store (store_id, branch_name, city)
            VALUES (:store_id, :branch_name, :city)
            ON CONFLICT DO NOTHING
        """), {"store_id": row.store_id, "branch_name": row.branch_name, "city": row.city})

print("dim_store loaded")

# 2. Load DIM_PRODUCT 
with engine.begin() as conn:
    products = conn.execute(text("SELECT product_id, product_line, unit_price FROM products")).fetchall()
    for row in products:
        conn.execute(text("""
            INSERT INTO dim_product (product_id, product_line, unit_price)
            VALUES (:product_id, :product_line, :unit_price)
            ON CONFLICT DO NOTHING
        """), {"product_id": row.product_id, "product_line": row.product_line, "unit_price": float(row.unit_price)})

print("dim_product loaded")

# 3. Load DIM_DATE 
with engine.begin() as conn:
    dates = conn.execute(text("SELECT DISTINCT sale_date FROM sales_transactions ORDER BY sale_date")).fetchall()
    for row in dates:
        d = pd.Timestamp(row.sale_date)
        conn.execute(text("""
            INSERT INTO dim_date (full_date, day_of_week, day_number, month_number, month_name, quarter, year, is_weekend)
            VALUES (:full_date, :day_of_week, :day_number, :month_number, :month_name, :quarter, :year, :is_weekend)
            ON CONFLICT DO NOTHING
        """), {
            "full_date": d.strftime('%Y-%m-%d'),
            "day_of_week": d.strftime('%A'),
            "day_number": d.day,
            "month_number": d.month,
            "month_name": d.strftime('%B'),
            "quarter": d.quarter,
            "year": d.year,
            "is_weekend": d.weekday() >= 5
        })

print("dim_date loaded")

# 4. Load FACT_SALES 
with engine.begin() as conn:
    store_map = {r.branch_name: r.store_key for r in conn.execute(text("SELECT store_key, branch_name FROM dim_store"))}
    product_map = {r.product_line: r.product_key for r in conn.execute(text("SELECT product_key, product_line FROM dim_product"))}
    date_map = {str(r.full_date): r.date_key for r in conn.execute(text("SELECT date_key, full_date FROM dim_date"))}

    transactions = conn.execute(text("""
        SELECT t.invoice_id, s.branch_name, p.product_line,
               t.sale_date, t.customer_type, t.gender,
               t.quantity_sold, t.unit_price, t.tax,
               t.total_sales, t.rating, t.payment_method
        FROM sales_transactions t
        JOIN stores s ON t.store_id = s.store_id
        JOIN products p ON t.product_id = p.product_id
    """)).fetchall()

with engine.begin() as conn:
    for row in transactions:
        conn.execute(text("""
            INSERT INTO fact_sales (
                invoice_id, store_key, product_key, date_key,
                customer_type, gender, quantity_sold, unit_price,
                tax, total_sales, gross_income, rating, payment_method
            ) VALUES (
                :invoice_id, :store_key, :product_key, :date_key,
                :customer_type, :gender, :quantity_sold, :unit_price,
                :tax, :total_sales, :gross_income, :rating, :payment_method
            )
        """), {
            "invoice_id": row.invoice_id,
            "store_key": store_map[row.branch_name],
            "product_key": product_map[row.product_line],
            "date_key": date_map[str(row.sale_date)],
            "customer_type": row.customer_type,
            "gender": row.gender,
            "quantity_sold": row.quantity_sold,
            "unit_price": float(row.unit_price),
            "tax": float(row.tax),
            "total_sales": float(row.total_sales),
            "gross_income": float(row.tax),
            "rating": float(row.rating) if row.rating else None,
            "payment_method": row.payment_method
        })

print("fact_sales loaded")
print("ETL complete! Star schema is ready.")