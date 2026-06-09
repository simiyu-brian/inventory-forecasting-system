-- =============================================================
-- 001_inventory_schema.sql
-- Run once against inventory_db to add the missing tables.
-- Safe to re-run (uses IF NOT EXISTS / ON CONFLICT DO NOTHING).
-- =============================================================

-- 1. Warehouses lookup
CREATE TABLE IF NOT EXISTS warehouses (
    warehouse_id   SERIAL PRIMARY KEY,
    name           TEXT NOT NULL UNIQUE,
    location       TEXT
);

INSERT INTO warehouses (name, location) VALUES ('Main', 'Nairobi') ON CONFLICT DO NOTHING;

-- 2. Suppliers lookup
CREATE TABLE IF NOT EXISTS suppliers (
    supplier_id    SERIAL PRIMARY KEY,
    name           TEXT NOT NULL UNIQUE,
    contact_email  TEXT,
    lead_time_days INT NOT NULL DEFAULT 3
);

-- 3. Inventory — one row per product, tracks live stock
CREATE TABLE IF NOT EXISTS inventory (
    inventory_id    SERIAL PRIMARY KEY,
    product_id      INT  NOT NULL REFERENCES products(product_id) ON DELETE CASCADE,
    warehouse_id    INT  NOT NULL REFERENCES warehouses(warehouse_id) DEFAULT 1,
    supplier_id     INT  REFERENCES suppliers(supplier_id),
    quantity_on_hand   INT NOT NULL DEFAULT 0,
    quantity_reserved  INT NOT NULL DEFAULT 0,
    reorder_point      INT NOT NULL DEFAULT 20,
    reorder_qty        INT NOT NULL DEFAULT 50,   -- EOQ default until calculated
    last_updated       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (product_id, warehouse_id)
);

-- 4. Stock adjustment audit log
CREATE TABLE IF NOT EXISTS stock_adjustments (
    adjustment_id  SERIAL PRIMARY KEY,
    product_id     INT  NOT NULL REFERENCES products(product_id),
    quantity_change INT NOT NULL,
    reason         TEXT NOT NULL,
    notes          TEXT,
    adjusted_by    TEXT,
    adjusted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Alerts
CREATE TABLE IF NOT EXISTS alerts (
    alert_id      SERIAL PRIMARY KEY,
    product_id    INT  NOT NULL REFERENCES products(product_id),
    type          TEXT NOT NULL CHECK (type IN ('low-stock','anomaly','expiry')),
    severity      TEXT NOT NULL CHECK (severity IN ('warning','critical')),
    message       TEXT NOT NULL,
    resolved      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    resolved_at   TIMESTAMPTZ
);

-- 6. Purchase orders
CREATE TABLE IF NOT EXISTS purchase_orders (
    po_id           SERIAL PRIMARY KEY,
    product_id      INT  NOT NULL REFERENCES products(product_id),
    supplier_id     INT  REFERENCES suppliers(supplier_id),
    supplier_name   TEXT NOT NULL,
    qty             INT  NOT NULL,
    status          TEXT NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending','confirmed','shipped','received')),
    expected_date   DATE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================
-- Seed inventory rows for every existing product so the
-- GET /api/inventory endpoint returns real rows immediately.
-- Adjust quantity_on_hand / reorder_point values as needed.
-- =============================================================
INSERT INTO inventory (product_id, warehouse_id, quantity_on_hand, reorder_point, reorder_qty)
SELECT product_id, 1,
       (RANDOM() * 80 + 2)::INT,   -- random stock 2-82 for demo
       20,
       50
FROM products
ON CONFLICT (product_id, warehouse_id) DO NOTHING;
