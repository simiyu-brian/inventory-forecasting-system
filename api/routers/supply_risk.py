"""
routers/supply_risk.py
Maps to: supply_risk_events table
Fields: event_id, headline, source, url, scraped_date, keywords_matched, created_at
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from pydantic import BaseModel
from typing import Optional
from datetime import date
from core.database import get_db
from core.security import require_any_role, require_admin

router = APIRouter()

VALID_SOURCES = ["BBC News", "Google News"]

SUPPLY_KEYWORDS = [
    "shortage", "supply chain", "drought", "flood", "war", "sanctions",
    "trade ban", "export ban", "price surge", "inflation", "disruption",
    "wheat", "grain", "milk", "dairy", "sugar", "fuel", "transport",
    "strike", "port", "shipment", "harvest", "crop"
]


@router.get("/", summary="List supply risk events")
def list_events(
    source: Optional[str]    = Query(None, description="BBC News | Google News"),
    keyword: Optional[str]   = Query(None, description="Filter by keyword in keywords_matched"),
    from_date: Optional[date] = Query(None, description="Start date YYYY-MM-DD"),
    to_date: Optional[date]   = Query(None, description="End date YYYY-MM-DD"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=500),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_any_role),
):
    """
    Returns supply risk events scraped from BBC and Google News.
    Filter by source, keyword, or date range.
    """
    filters = ["1=1"]
    params: dict = {"skip": skip, "limit": limit}

    if source:
        filters.append("source = :source")
        params["source"] = source
    if keyword:
        filters.append("keywords_matched ILIKE :keyword")
        params["keyword"] = f"%{keyword}%"
    if from_date:
        filters.append("scraped_date >= :from_date")
        params["from_date"] = str(from_date)
    if to_date:
        filters.append("scraped_date <= :to_date")
        params["to_date"] = str(to_date)

    where = " AND ".join(filters)
    rows = db.execute(text(f"""
        SELECT event_id, headline, source, url, scraped_date, keywords_matched, created_at
        FROM supply_risk_events
        WHERE {where}
        ORDER BY scraped_date DESC, event_id DESC
        OFFSET :skip LIMIT :limit
    """), params).fetchall()

    total = db.execute(
        text(f"SELECT COUNT(*) FROM supply_risk_events WHERE {where}"),
        {k: v for k, v in params.items() if k not in ("skip", "limit")}
    ).scalar()

    return {
        "total": total,
        "skip": skip,
        "limit": limit,
        "events": [dict(r._mapping) for r in rows],
    }


@router.get("/today", summary="Get today's supply risk events")
def todays_events(db: Session = Depends(get_db), current_user: dict = Depends(require_any_role)):
    """Returns all supply risk events scraped today."""
    rows = db.execute(text("""
        SELECT event_id, headline, source, url, scraped_date, keywords_matched, created_at
        FROM supply_risk_events
        WHERE scraped_date = CURRENT_DATE
        ORDER BY event_id DESC
    """)).fetchall()
    return {"date": str(date.today()), "count": len(rows), "events": [dict(r._mapping) for r in rows]}


@router.get("/keywords", summary="List all tracked supply risk keywords")
def get_keywords(current_user: dict = Depends(require_any_role)):
    """Returns the full list of keywords the scraper monitors."""
    return {"keywords": SUPPLY_KEYWORDS, "total": len(SUPPLY_KEYWORDS)}


@router.get("/stats", summary="Supply risk event statistics")
def event_stats(db: Session = Depends(get_db), current_user: dict = Depends(require_any_role)):
    """Returns count by source and top keywords found this week."""
    by_source = db.execute(text("""
        SELECT source, COUNT(*) as count
        FROM supply_risk_events
        GROUP BY source ORDER BY count DESC
    """)).fetchall()

    by_date = db.execute(text("""
        SELECT scraped_date, COUNT(*) as count
        FROM supply_risk_events
        GROUP BY scraped_date
        ORDER BY scraped_date DESC
        LIMIT 7
    """)).fetchall()

    return {
        "by_source": [dict(r._mapping) for r in by_source],
        "last_7_days": [dict(r._mapping) for r in by_date],
    }


@router.get("/{event_id}", summary="Get a single supply risk event")
def get_event(event_id: int, db: Session = Depends(get_db), current_user: dict = Depends(require_any_role)):
    row = db.execute(
        text("SELECT * FROM supply_risk_events WHERE event_id = :id"), {"id": event_id}
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail=f"Event {event_id} not found")
    return dict(row._mapping)


@router.delete("/{event_id}", summary="Delete a supply risk event")
def delete_event(event_id: int, db: Session = Depends(get_db), current_user: dict = Depends(require_admin)):
    """Remove a specific event. **Admin only.**"""
    db.execute(text("DELETE FROM supply_risk_events WHERE event_id = :id"), {"id": event_id})
    db.commit()
    return {"message": f"Event {event_id} deleted"}


@router.delete("/", summary="Clear all supply risk events for today")
def clear_todays_events(db: Session = Depends(get_db), current_user: dict = Depends(require_admin)):
    """Delete all events scraped today (useful before re-running scraper). **Admin only.**"""
    result = db.execute(text("DELETE FROM supply_risk_events WHERE scraped_date = CURRENT_DATE"))
    db.commit()
    return {"message": f"Deleted today's supply risk events", "rows_deleted": result.rowcount}
