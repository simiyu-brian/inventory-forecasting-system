import pandas as pd
from sqlalchemy import create_engine, text

# Database connection
engine = create_engine('postgresql+psycopg2://postgres:simiyu@localhost:5432/inventory_db')

# Read CSV
df = pd.read_csv(r'C:\Users\admin\Downloads\sales_analysis.csv')
df['Date'] = pd.to_datetime(df['Date']).dt.strftime('%Y-%m-%d')
df['Time'] = pd.to_datetime(df['Time'], format='%I:%M:%S %p').dt.strftime('%H:%M:%S')

# 1. Load STORES 
stores = df[['Branch', 'City']].drop_duplicates().reset_index(drop=True)
stores.columns = ['branch_name', 'city']

with engine.begin() as conn:
    for _, row in stores.iterrows():
        conn.execute(text("""
            INSERT INTO stores (branch_name, city)
            VALUES (:branch, :city)
            ON CONFLICT DO NOTHING
        """), {"branch": row['branch_name'], "city": row['city']})

print("Stores loaded")

#  2. Load PRODUCTS 
products = df[['Product line', 'Unit price']].drop_duplicates(subset='Product line').reset_index(drop=True)
products.columns = ['product_line', 'unit_price']

with engine.begin() as conn:
    for _, row in products.iterrows():
        conn.execute(text("""
            INSERT INTO products (product_line, unit_price)
            VALUES (:product_line, :unit_price)
            ON CONFLICT DO NOTHING
        """), {"product_line": row['product_line'], "unit_price": row['unit_price']})

print("Products loaded")

# 3. Load SALES TRANSACTIONS
with engine.begin() as conn:
    store_map = {row.branch_name: row.store_id for row in conn.execute(text("SELECT store_id, branch_name FROM stores"))}
    product_map = {row.product_line: row.product_id for row in conn.execute(text("SELECT product_id, product_line FROM products"))}

for _, row in df.iterrows():
    with engine.begin() as conn:
        conn.execute(text("""
            INSERT INTO sales_transactions (
                invoice_id, store_id, product_id, customer_type, gender,
                quantity_sold, unit_price, tax, total_sales,
                sale_date, sale_time, payment_method, rating
            ) VALUES (
                :invoice_id, :store_id, :product_id, :customer_type, :gender,
                :quantity_sold, :unit_price, :tax, :total_sales,
                :sale_date, :sale_time, :payment_method, :rating
            ) ON CONFLICT (invoice_id) DO NOTHING
        """), {
            "invoice_id": row['Invoice ID'],
            "store_id": store_map[row['Branch']],
            "product_id": product_map[row['Product line']],
            "customer_type": row['Customer type'],
            "gender": row['Gender'],
            "quantity_sold": int(row['Quantity']),
            "unit_price": float(row['Unit price']),
            "tax": float(row['Tax 5%']),
            "total_sales": float(row['Sales']),
            "sale_date": row['Date'],
            "sale_time": row['Time'],
            "payment_method": row['Payment'],
            "rating": float(row['Rating'])
        })

print("Transactions loaded")
print("All data ingested successfully!")