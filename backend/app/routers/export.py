"""
Data export endpoints.

Allows users to export their baby's data in various formats.
Premium feature for subscription users.
"""

import csv
import io
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from ..auth import get_current_user, get_user_email
from ..database import get_db
from ..logging_config import get_logger
from ..models import Bath, Diaper, Feeding, Potty, Pumping, Sleep, Supplement, TummyTime
from ..rate_limit import RATE_EXPORT, limiter
from .utils import verify_baby_access

logger = get_logger(__name__)

router = APIRouter(prefix="/export", tags=["export"])


def format_datetime(dt: datetime | None) -> str:
    """Format datetime for export."""
    if dt is None:
        return ""
    return dt.strftime("%Y-%m-%d %H:%M:%S")


def format_date(dt: datetime | None) -> str:
    """Format date only for export."""
    if dt is None:
        return ""
    return dt.strftime("%Y-%m-%d")


@router.get("/csv/{baby_id}")
@limiter.limit(RATE_EXPORT)
async def export_baby_data_csv(
    request: Request,
    baby_id: int,
    data_type: str = Query("all", description="Type of data: all, feedings, sleeps, diapers, pumpings, activities"),
    start_date: str | None = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: str | None = Query(None, description="End date (YYYY-MM-DD)"),
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
    db: Session = Depends(get_db),
):
    """
    Export baby data as CSV.

    Returns a downloadable CSV file with the requested data.
    Premium feature - requires active subscription.
    """
    user_id = user.get("sub")
    baby, _role = verify_baby_access(db, baby_id, user_id, user_email)

    # Parse date filters
    start_dt = None
    end_dt = None
    if start_date:
        try:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d").replace(tzinfo=UTC)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid start_date format. Use YYYY-MM-DD")
    if end_date:
        try:
            end_dt = datetime.strptime(end_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59, tzinfo=UTC)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid end_date format. Use YYYY-MM-DD")

    output = io.StringIO()
    writer = csv.writer(output)

    # Helper to apply date filter
    def apply_date_filter(query, time_column):
        if start_dt:
            query = query.filter(time_column >= start_dt)
        if end_dt:
            query = query.filter(time_column <= end_dt)
        return query

    sections_written = 0

    # Export feedings
    if data_type in ("all", "feedings"):
        query = db.query(Feeding).filter(Feeding.baby_id == baby_id)
        query = apply_date_filter(query, Feeding.time)
        feedings = query.order_by(Feeding.time.desc()).all()

        if feedings or data_type == "feedings":
            if sections_written > 0:
                writer.writerow([])  # Blank line between sections
            writer.writerow(["=== FEEDINGS ==="])
            writer.writerow(["Date", "Time", "Type", "Duration (min)", "Amount (ml)", "Notes"])
            for f in feedings:
                writer.writerow(
                    [
                        format_date(f.time),
                        f.time.strftime("%H:%M") if f.time else "",
                        f.type or "",
                        f.duration_minutes or "",
                        f.amount_ml or "",
                        f.notes or "",
                    ]
                )
            sections_written += 1

    # Export sleeps
    if data_type in ("all", "sleeps"):
        query = db.query(Sleep).filter(Sleep.baby_id == baby_id)
        query = apply_date_filter(query, Sleep.start_time)
        sleeps = query.order_by(Sleep.start_time.desc()).all()

        if sleeps or data_type == "sleeps":
            if sections_written > 0:
                writer.writerow([])
            writer.writerow(["=== SLEEP ==="])
            writer.writerow(["Date", "Start Time", "End Time", "Duration (min)", "Notes"])
            for s in sleeps:
                duration = s.duration_minutes if s.end_time else ""
                writer.writerow(
                    [
                        format_date(s.start_time),
                        s.start_time.strftime("%H:%M") if s.start_time else "",
                        s.end_time.strftime("%H:%M") if s.end_time else "ongoing",
                        duration,
                        s.notes or "",
                    ]
                )
            sections_written += 1

    # Export diapers
    if data_type in ("all", "diapers"):
        query = db.query(Diaper).filter(Diaper.baby_id == baby_id)
        query = apply_date_filter(query, Diaper.time)
        diapers = query.order_by(Diaper.time.desc()).all()

        if diapers or data_type == "diapers":
            if sections_written > 0:
                writer.writerow([])
            writer.writerow(["=== DIAPERS ==="])
            writer.writerow(["Date", "Time", "Type", "Poo Color", "Poo Consistency", "Poo Amount", "Notes"])
            for d in diapers:
                writer.writerow(
                    [
                        format_date(d.time),
                        d.time.strftime("%H:%M") if d.time else "",
                        d.type or "",
                        d.poo_color or "",
                        d.poo_consistency or "",
                        d.poo_amount or "",
                        d.notes or "",
                    ]
                )
            sections_written += 1

    # Export pumpings
    if data_type in ("all", "pumpings"):
        query = db.query(Pumping).filter(Pumping.baby_id == baby_id)
        query = apply_date_filter(query, Pumping.time)
        pumpings = query.order_by(Pumping.time.desc()).all()

        if pumpings or data_type == "pumpings":
            if sections_written > 0:
                writer.writerow([])
            writer.writerow(["=== PUMPING ==="])
            writer.writerow(["Date", "Time", "Duration (min)", "Amount (ml)", "Notes"])
            for p in pumpings:
                writer.writerow(
                    [
                        format_date(p.time),
                        p.time.strftime("%H:%M") if p.time else "",
                        p.duration_minutes or "",
                        p.amount_ml or "",
                        p.notes or "",
                    ]
                )
            sections_written += 1

    # Export activities (potty, tummy time, bath, supplements)
    if data_type in ("all", "activities"):
        # Potty
        query = db.query(Potty).filter(Potty.baby_id == baby_id)
        query = apply_date_filter(query, Potty.time)
        potty_logs = query.order_by(Potty.time.desc()).all()

        if potty_logs:
            if sections_written > 0:
                writer.writerow([])
            writer.writerow(["=== POTTY TRAINING ==="])
            writer.writerow(["Date", "Time", "Result", "Type", "Notes"])
            for p in potty_logs:
                writer.writerow(
                    [
                        format_date(p.time),
                        p.time.strftime("%H:%M") if p.time else "",
                        p.result or "",
                        p.potty_type or "",
                        p.notes or "",
                    ]
                )
            sections_written += 1

        # Tummy time
        query = db.query(TummyTime).filter(TummyTime.baby_id == baby_id)
        query = apply_date_filter(query, TummyTime.start_time)
        tummy_times = query.order_by(TummyTime.start_time.desc()).all()

        if tummy_times:
            if sections_written > 0:
                writer.writerow([])
            writer.writerow(["=== TUMMY TIME ==="])
            writer.writerow(["Date", "Time", "Duration (min)", "Notes"])
            for t in tummy_times:
                writer.writerow(
                    [
                        format_date(t.start_time),
                        t.start_time.strftime("%H:%M") if t.start_time else "",
                        t.duration_minutes or "",
                        t.notes or "",
                    ]
                )
            sections_written += 1

        # Baths
        query = db.query(Bath).filter(Bath.baby_id == baby_id)
        query = apply_date_filter(query, Bath.time)
        baths = query.order_by(Bath.time.desc()).all()

        if baths:
            if sections_written > 0:
                writer.writerow([])
            writer.writerow(["=== BATHS ==="])
            writer.writerow(["Date", "Time", "Notes"])
            for b in baths:
                writer.writerow([format_date(b.time), b.time.strftime("%H:%M") if b.time else "", b.notes or ""])
            sections_written += 1

        # Supplements
        query = db.query(Supplement).filter(Supplement.baby_id == baby_id)
        query = apply_date_filter(query, Supplement.time)
        supplements = query.order_by(Supplement.time.desc()).all()

        if supplements:
            if sections_written > 0:
                writer.writerow([])
            writer.writerow(["=== SUPPLEMENTS ==="])
            writer.writerow(["Date", "Time", "Name", "Dosage", "Notes"])
            for s in supplements:
                writer.writerow(
                    [
                        format_date(s.time),
                        s.time.strftime("%H:%M") if s.time else "",
                        s.name or "",
                        s.dosage or "",
                        s.notes or "",
                    ]
                )
            sections_written += 1

    # Add metadata header
    metadata = io.StringIO()
    metadata_writer = csv.writer(metadata)
    metadata_writer.writerow([f"HeyBub Data Export - {baby.name}"])
    metadata_writer.writerow([f"Exported: {datetime.now(UTC).strftime('%Y-%m-%d %H:%M:%S')} UTC"])
    if baby.birth_date:
        metadata_writer.writerow([f"Birth Date: {format_date(baby.birth_date)}"])
    if start_date or end_date:
        date_range = f"Date Range: {start_date or 'beginning'} to {end_date or 'now'}"
        metadata_writer.writerow([date_range])
    metadata_writer.writerow([])

    # Combine metadata + data
    full_output = metadata.getvalue() + output.getvalue()

    # Generate filename
    timestamp = datetime.now().strftime("%Y%m%d")
    filename = f"heybub_{baby.name.lower().replace(' ', '_')}_{timestamp}.csv"

    logger.info("Exported CSV", extra={"baby_id": baby_id, "data_type": data_type})
    return StreamingResponse(
        io.BytesIO(full_output.encode("utf-8")),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/json/{baby_id}")
@limiter.limit(RATE_EXPORT)
async def export_baby_data_json(
    request: Request,
    baby_id: int,
    start_date: str | None = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: str | None = Query(None, description="End date (YYYY-MM-DD)"),
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
    db: Session = Depends(get_db),
):
    """
    Export all baby data as JSON.

    Returns a complete JSON export for data portability.
    Premium feature - requires active subscription.
    """
    user_id = user.get("sub")
    baby, _role = verify_baby_access(db, baby_id, user_id, user_email)

    # Parse date filters
    start_dt = None
    end_dt = None
    if start_date:
        try:
            start_dt = datetime.strptime(start_date, "%Y-%m-%d").replace(tzinfo=UTC)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid start_date format")
    if end_date:
        try:
            end_dt = datetime.strptime(end_date, "%Y-%m-%d").replace(hour=23, minute=59, second=59, tzinfo=UTC)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid end_date format")

    def apply_date_filter(query, time_column):
        if start_dt:
            query = query.filter(time_column >= start_dt)
        if end_dt:
            query = query.filter(time_column <= end_dt)
        return query

    # Build export data
    export_data = {
        "export_info": {
            "format_version": "1.0",
            "exported_at": datetime.now(UTC).isoformat(),
            "date_range": {"start": start_date, "end": end_date},
        },
        "baby": {"name": baby.name, "birth_date": format_date(baby.birth_date), "gender": baby.gender},
        "feedings": [],
        "sleeps": [],
        "diapers": [],
        "pumpings": [],
        "potty": [],
        "tummy_time": [],
        "baths": [],
        "supplements": [],
    }

    # Feedings
    query = apply_date_filter(db.query(Feeding).filter(Feeding.baby_id == baby_id), Feeding.time)
    for f in query.order_by(Feeding.time.desc()).all():
        export_data["feedings"].append(
            {
                "time": f.time.isoformat() if f.time else None,
                "type": f.type,
                "duration_minutes": f.duration_minutes,
                "amount_ml": f.amount_ml,
                "notes": f.notes,
            }
        )

    # Sleeps
    query = apply_date_filter(db.query(Sleep).filter(Sleep.baby_id == baby_id), Sleep.start_time)
    for s in query.order_by(Sleep.start_time.desc()).all():
        export_data["sleeps"].append(
            {
                "start_time": s.start_time.isoformat() if s.start_time else None,
                "end_time": s.end_time.isoformat() if s.end_time else None,
                "duration_minutes": s.duration_minutes,
                "notes": s.notes,
            }
        )

    # Diapers
    query = apply_date_filter(db.query(Diaper).filter(Diaper.baby_id == baby_id), Diaper.time)
    for d in query.order_by(Diaper.time.desc()).all():
        export_data["diapers"].append(
            {
                "time": d.time.isoformat() if d.time else None,
                "type": d.type,
                "poo_color": d.poo_color,
                "poo_consistency": d.poo_consistency,
                "poo_amount": d.poo_amount,
                "notes": d.notes,
            }
        )

    # Pumpings
    query = apply_date_filter(db.query(Pumping).filter(Pumping.baby_id == baby_id), Pumping.time)
    for p in query.order_by(Pumping.time.desc()).all():
        export_data["pumpings"].append(
            {
                "time": p.time.isoformat() if p.time else None,
                "duration_minutes": p.duration_minutes,
                "amount_ml": p.amount_ml,
                "notes": p.notes,
            }
        )

    # Potty
    query = apply_date_filter(db.query(Potty).filter(Potty.baby_id == baby_id), Potty.time)
    for p in query.order_by(Potty.time.desc()).all():
        export_data["potty"].append(
            {
                "time": p.time.isoformat() if p.time else None,
                "result": p.result,
                "potty_type": p.potty_type,
                "notes": p.notes,
            }
        )

    # Tummy time
    query = apply_date_filter(db.query(TummyTime).filter(TummyTime.baby_id == baby_id), TummyTime.start_time)
    for t in query.order_by(TummyTime.start_time.desc()).all():
        export_data["tummy_time"].append(
            {
                "start_time": t.start_time.isoformat() if t.start_time else None,
                "duration_minutes": t.duration_minutes,
                "notes": t.notes,
            }
        )

    # Baths
    query = apply_date_filter(db.query(Bath).filter(Bath.baby_id == baby_id), Bath.time)
    for b in query.order_by(Bath.time.desc()).all():
        export_data["baths"].append({"time": b.time.isoformat() if b.time else None, "notes": b.notes})

    # Supplements
    query = apply_date_filter(db.query(Supplement).filter(Supplement.baby_id == baby_id), Supplement.time)
    for s in query.order_by(Supplement.time.desc()).all():
        export_data["supplements"].append(
            {"time": s.time.isoformat() if s.time else None, "name": s.name, "dosage": s.dosage, "notes": s.notes}
        )

    logger.info("Exported JSON", extra={"baby_id": baby_id})
    return export_data
