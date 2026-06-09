"""
Inventory Forecasting System — REST API
PostgreSQL · ETL · Star Schema · Supply Risk Scraper
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import auth, stores, products, transactions, etl, supply_risk, data_quality, analytics

app = FastAPI(
    title="Inventory Forecasting System API",
    description="REST API for Intelligent Inventory Forecasting & Sales Analytics System",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,          prefix="/api/v1/auth",          tags=["Authentication"])
app.include_router(stores.router,        prefix="/api/v1/stores",        tags=["Stores"])
app.include_router(products.router,      prefix="/api/v1/products",      tags=["Products"])
app.include_router(transactions.router,  prefix="/api/v1/transactions",  tags=["Sales Transactions"])
app.include_router(etl.router,           prefix="/api/v1/etl",           tags=["ETL Pipeline"])
app.include_router(supply_risk.router,   prefix="/api/v1/supply-risk",   tags=["Supply Risk Events"])
app.include_router(data_quality.router,  prefix="/api/v1/data-quality",  tags=["Data Quality"])
app.include_router(analytics.router,     prefix="/api/v1/analytics",     tags=["Analytics"])


@app.get("/", tags=["Health"])
def root():
    return {"status": "ok", "service": "Inventory Forecasting System API v1.0"}

@app.get("/health", tags=["Health"])
def health():
    return {"status": "healthy"}
