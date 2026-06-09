"""
routers/etl.py
Wraps your existing pipeline.py / etl.py / ingest.py scripts as REST endpoints.
Admin only — these are destructive/long-running operations.
"""
import subprocess
import sys
import os
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional
from core.database import get_db
from core.security import require_admin

router = APIRouter()

SCRIPTS_DIR = os.getenv("SCRIPTS_DIR", r"C:\Users\admin\Documents")


def _run_script(script_name: str) -> dict:
    """Run a pipeline script and return result."""
    path = os.path.join(SCRIPTS_DIR, script_name)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail=f"Script not found: {path}")
    started = datetime.now()
    result = subprocess.run([sys.executable, path], capture_output=True, text=True)
    duration = (datetime.now() - started).total_seconds()
    return {
        "script": script_name,
        "success": result.returncode == 0,
        "duration_seconds": round(duration, 2),
        "stdout": result.stdout[-3000:] if result.stdout else "",   # last 3000 chars
        "stderr": result.stderr[-1000:] if result.stderr else "",
        "started_at": started.isoformat(),
    }


# ── Full Pipeline ──────────────────────────────────────

@router.post("/pipeline/run", summary="Run the full pipeline (ingest → ETL → quality check)")
def run_full_pipeline(current_user: dict = Depends(require_admin)):
    """
    Executes all 3 steps in order:
    1. `ingest.py`  — loads raw CSV into stores / products / sales_transactions
    2. `etl.py`     — transforms into star schema (dim_store, dim_product, dim_date, fact_sales)
    3. `data_quality.py` — runs 8 quality checks

    **Admin only.** Long-running — consider calling async in production.
    """
    results = []
    for script in ["ingest.py", "etl.py", "data_quality.py"]:
        step = _run_script(script)
        results.append(step)
        if not step["success"]:
            return {
                "pipeline_status": "FAILED",
                "failed_at": script,
                "steps": results,
            }
    return {"pipeline_status": "SUCCESS", "steps": results}


# ── Individual Steps ───────────────────────────────────

@router.post("/ingest/run", summary="Run ingest.py — load raw CSV into staging tables")
def run_ingest(current_user: dict = Depends(require_admin)):
    """
    Runs `ingest.py`:
    - Reads `sales_analysis.csv`
    - Loads `stores`, `products`, `sales_transactions`
    Uses `ON CONFLICT DO NOTHING` so safe to re-run.
    **Admin only.**
    """
    return _run_script("ingest.py")


@router.post("/etl/run", summary="Run etl.py — populate star schema")
def run_etl(current_user: dict = Depends(require_admin)):
    """
    Runs `etl.py`:
    - Truncates `fact_sales`, `dim_date`, `dim_store`, `dim_product`
    - Rebuilds all dimension and fact tables from staging data
    **Admin only. Warning: truncates star schema first.**
    """
    return _run_script("etl.py")


@router.post("/scraper/run", summary="Run scraper.py — fetch supply risk events")
def run_scraper(current_user: dict = Depends(require_admin)):
    """
    Runs `scraper.py`:
    - Scrapes BBC News RSS and Google News RSS
    - Filters by supply-chain keywords
    - Saves new events to `supply_risk_events` table
    Safe to re-run (deduplicates by headline + date).
    **Admin only.**
    """
    return _run_script("scraper.py")


# ── Star Schema Status ─────────────────────────────────

@router.get("/star-schema/status", summary="Check row counts across star schema tables")
def star_schema_status(db: Session = Depends(get_db), current_user: dict = Depends(require_admin)):
    """
    Returns row counts for all star schema tables so you can verify
    the ETL ran correctly.
    """
    tables = ["dim_store", "dim_product", "dim_date", "fact_sales"]
    counts = {}
    for tbl in tables:
        try:
            counts[tbl] = db.execute(text(f"SELECT COUNT(*) FROM {tbl}")).scalar()
        except Exception:
            counts[tbl] = "table not found"
    return {"star_schema_row_counts": counts}
