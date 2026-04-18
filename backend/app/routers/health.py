from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from .. import models, schemas
from ..auth import get_current_user, get_user_email, get_user_id
from ..database import get_db
from ..logging_config import get_logger
from ..rate_limit import RATE_READ, RATE_WRITE, limiter
from .utils import baby_access_filter, require_write_access, verify_baby_access

logger = get_logger(__name__)

router = APIRouter(prefix="/health", tags=["health"], dependencies=[Depends(get_current_user)])


def get_accessible_baby(db: Session, baby_id: int, user_id: str, user_email: str):
    """Get a baby if user owns it or it's shared with them."""
    baby = db.query(models.Baby).filter(models.Baby.id == baby_id, baby_access_filter(user_id, user_email)).first()
    return baby


# ============================================================================
# Doctor Visits
# ============================================================================


@router.get("/doctor-visits/", response_model=list[schemas.DoctorVisitResponse])
@limiter.limit(RATE_READ)
def get_doctor_visits(
    request: Request,
    baby_id: int,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id),
    user_email: str = Depends(get_user_email),
):
    baby = get_accessible_baby(db, baby_id, user_id, user_email)
    if not baby:
        raise HTTPException(status_code=404, detail="Baby not found")

    return (
        db.query(models.DoctorVisit)
        .filter(models.DoctorVisit.baby_id == baby_id)
        .order_by(desc(models.DoctorVisit.visit_date))
        .all()
    )


@router.post("/doctor-visits/", response_model=schemas.DoctorVisitResponse)
@limiter.limit(RATE_WRITE)
def create_doctor_visit(
    request: Request,
    visit: schemas.DoctorVisitCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id),
    user_email: str = Depends(get_user_email),
):
    baby, role = verify_baby_access(db, visit.baby_id, user_id, user_email)
    require_write_access(role)

    db_visit = models.DoctorVisit(**visit.model_dump())
    db.add(db_visit)
    db.commit()
    db.refresh(db_visit)
    logger.info("Created doctor visit", extra={"baby_id": visit.baby_id, "visit_id": db_visit.id})
    return db_visit


@router.put("/doctor-visits/{visit_id}", response_model=schemas.DoctorVisitResponse)
@limiter.limit(RATE_WRITE)
def update_doctor_visit(
    request: Request,
    visit_id: int,
    visit_data: schemas.DoctorVisitCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id),
    user_email: str = Depends(get_user_email),
):
    visit = (
        db.query(models.DoctorVisit)
        .join(models.Baby)
        .filter(models.DoctorVisit.id == visit_id, baby_access_filter(user_id, user_email))
        .first()
    )
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")

    _, role = verify_baby_access(db, visit.baby_id, user_id, user_email)
    require_write_access(role)

    for key, value in visit_data.model_dump().items():
        if key != "baby_id":
            setattr(visit, key, value)

    db.commit()
    db.refresh(visit)
    return visit


@router.delete("/doctor-visits/{visit_id}")
@limiter.limit(RATE_WRITE)
def delete_doctor_visit(
    request: Request,
    visit_id: int,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id),
    user_email: str = Depends(get_user_email),
):
    visit = (
        db.query(models.DoctorVisit)
        .join(models.Baby)
        .filter(models.DoctorVisit.id == visit_id, baby_access_filter(user_id, user_email))
        .first()
    )
    if not visit:
        logger.warning("Delete doctor visit not found", extra={"visit_id": visit_id})
        raise HTTPException(status_code=404, detail="Visit not found")

    _, role = verify_baby_access(db, visit.baby_id, user_id, user_email)
    require_write_access(role)

    logger.info("Deleted doctor visit", extra={"visit_id": visit_id})
    db.delete(visit)
    db.commit()
    return {"message": "Deleted"}


# ============================================================================
# Vaccinations
# ============================================================================


@router.get("/vaccinations/", response_model=list[schemas.VaccinationResponse])
@limiter.limit(RATE_READ)
def get_vaccinations(
    request: Request,
    baby_id: int,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id),
    user_email: str = Depends(get_user_email),
):
    baby = get_accessible_baby(db, baby_id, user_id, user_email)
    if not baby:
        raise HTTPException(status_code=404, detail="Baby not found")

    return (
        db.query(models.Vaccination)
        .filter(models.Vaccination.baby_id == baby_id)
        .order_by(desc(models.Vaccination.given_date))
        .all()
    )


@router.post("/vaccinations/", response_model=schemas.VaccinationResponse)
@limiter.limit(RATE_WRITE)
def create_vaccination(
    request: Request,
    vaccination: schemas.VaccinationCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id),
    user_email: str = Depends(get_user_email),
):
    baby, role = verify_baby_access(db, vaccination.baby_id, user_id, user_email)
    require_write_access(role)

    db_vacc = models.Vaccination(**vaccination.model_dump())
    db.add(db_vacc)
    db.commit()
    db.refresh(db_vacc)
    logger.info("Created vaccination", extra={"baby_id": vaccination.baby_id, "vaccination_id": db_vacc.id})
    return db_vacc


@router.put("/vaccinations/{vaccination_id}", response_model=schemas.VaccinationResponse)
@limiter.limit(RATE_WRITE)
def update_vaccination(
    request: Request,
    vaccination_id: int,
    vaccination_data: schemas.VaccinationCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id),
    user_email: str = Depends(get_user_email),
):
    vacc = (
        db.query(models.Vaccination)
        .join(models.Baby)
        .filter(models.Vaccination.id == vaccination_id, baby_access_filter(user_id, user_email))
        .first()
    )
    if not vacc:
        raise HTTPException(status_code=404, detail="Vaccination not found")

    _, role = verify_baby_access(db, vacc.baby_id, user_id, user_email)
    require_write_access(role)

    for key, value in vaccination_data.model_dump().items():
        if key != "baby_id":
            setattr(vacc, key, value)

    db.commit()
    db.refresh(vacc)
    return vacc


@router.delete("/vaccinations/{vaccination_id}")
@limiter.limit(RATE_WRITE)
def delete_vaccination(
    request: Request,
    vaccination_id: int,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id),
    user_email: str = Depends(get_user_email),
):
    vacc = (
        db.query(models.Vaccination)
        .join(models.Baby)
        .filter(models.Vaccination.id == vaccination_id, baby_access_filter(user_id, user_email))
        .first()
    )
    if not vacc:
        logger.warning("Delete vaccination not found", extra={"vaccination_id": vaccination_id})
        raise HTTPException(status_code=404, detail="Vaccination not found")

    _, role = verify_baby_access(db, vacc.baby_id, user_id, user_email)
    require_write_access(role)

    logger.info("Deleted vaccination", extra={"vaccination_id": vaccination_id})
    db.delete(vacc)
    db.commit()
    return {"message": "Deleted"}


# ============================================================================
# Medications
# ============================================================================


@router.get("/medications/", response_model=list[schemas.MedicationResponse])
@limiter.limit(RATE_READ)
def get_medications(
    request: Request,
    baby_id: int,
    active_only: bool = False,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id),
    user_email: str = Depends(get_user_email),
):
    baby = get_accessible_baby(db, baby_id, user_id, user_email)
    if not baby:
        raise HTTPException(status_code=404, detail="Baby not found")

    query = db.query(models.Medication).filter(models.Medication.baby_id == baby_id)
    if active_only:
        query = query.filter(models.Medication.is_active)

    return query.order_by(desc(models.Medication.start_date)).all()


@router.post("/medications/", response_model=schemas.MedicationResponse)
@limiter.limit(RATE_WRITE)
def create_medication(
    request: Request,
    medication: schemas.MedicationCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id),
    user_email: str = Depends(get_user_email),
):
    baby, role = verify_baby_access(db, medication.baby_id, user_id, user_email)
    require_write_access(role)

    db_med = models.Medication(**medication.model_dump())
    db.add(db_med)
    db.commit()
    db.refresh(db_med)
    logger.info("Created medication", extra={"baby_id": medication.baby_id, "medication_id": db_med.id})
    return db_med


@router.put("/medications/{medication_id}", response_model=schemas.MedicationResponse)
@limiter.limit(RATE_WRITE)
def update_medication(
    request: Request,
    medication_id: int,
    medication_data: schemas.MedicationCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id),
    user_email: str = Depends(get_user_email),
):
    med = (
        db.query(models.Medication)
        .join(models.Baby)
        .filter(models.Medication.id == medication_id, baby_access_filter(user_id, user_email))
        .first()
    )
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")

    _, role = verify_baby_access(db, med.baby_id, user_id, user_email)
    require_write_access(role)

    for key, value in medication_data.model_dump().items():
        if key != "baby_id":
            setattr(med, key, value)

    db.commit()
    db.refresh(med)
    return med


@router.patch("/medications/{medication_id}/toggle", response_model=schemas.MedicationResponse)
@limiter.limit(RATE_WRITE)
def toggle_medication_active(
    request: Request,
    medication_id: int,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id),
    user_email: str = Depends(get_user_email),
):
    med = (
        db.query(models.Medication)
        .join(models.Baby)
        .filter(models.Medication.id == medication_id, baby_access_filter(user_id, user_email))
        .first()
    )
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")

    _, role = verify_baby_access(db, med.baby_id, user_id, user_email)
    require_write_access(role)

    med.is_active = not med.is_active
    db.commit()
    db.refresh(med)
    return med


@router.delete("/medications/{medication_id}")
@limiter.limit(RATE_WRITE)
def delete_medication(
    request: Request,
    medication_id: int,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id),
    user_email: str = Depends(get_user_email),
):
    med = (
        db.query(models.Medication)
        .join(models.Baby)
        .filter(models.Medication.id == medication_id, baby_access_filter(user_id, user_email))
        .first()
    )
    if not med:
        logger.warning("Delete medication not found", extra={"medication_id": medication_id})
        raise HTTPException(status_code=404, detail="Medication not found")

    _, role = verify_baby_access(db, med.baby_id, user_id, user_email)
    require_write_access(role)

    logger.info("Deleted medication", extra={"medication_id": medication_id})
    db.delete(med)
    db.commit()
    return {"message": "Deleted"}


# ============================================================================
# Milestones
# ============================================================================


@router.get("/milestones/", response_model=list[schemas.MilestoneResponse])
@limiter.limit(RATE_READ)
def get_milestones(
    request: Request,
    baby_id: int,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id),
    user_email: str = Depends(get_user_email),
):
    baby = get_accessible_baby(db, baby_id, user_id, user_email)
    if not baby:
        raise HTTPException(status_code=404, detail="Baby not found")

    return (
        db.query(models.Milestone)
        .filter(models.Milestone.baby_id == baby_id)
        .order_by(desc(models.Milestone.achieved_date))
        .all()
    )


@router.post("/milestones/", response_model=schemas.MilestoneResponse)
@limiter.limit(RATE_WRITE)
def create_milestone(
    request: Request,
    milestone: schemas.MilestoneCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id),
    user_email: str = Depends(get_user_email),
):
    baby, role = verify_baby_access(db, milestone.baby_id, user_id, user_email)
    require_write_access(role)

    db_milestone = models.Milestone(**milestone.model_dump())
    db.add(db_milestone)
    db.commit()
    db.refresh(db_milestone)
    logger.info("Created milestone", extra={"baby_id": milestone.baby_id, "milestone_id": db_milestone.id})
    return db_milestone


@router.put("/milestones/{milestone_id}", response_model=schemas.MilestoneResponse)
@limiter.limit(RATE_WRITE)
def update_milestone(
    request: Request,
    milestone_id: int,
    milestone_data: schemas.MilestoneCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id),
    user_email: str = Depends(get_user_email),
):
    milestone = (
        db.query(models.Milestone)
        .join(models.Baby)
        .filter(models.Milestone.id == milestone_id, baby_access_filter(user_id, user_email))
        .first()
    )
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")

    _, role = verify_baby_access(db, milestone.baby_id, user_id, user_email)
    require_write_access(role)

    for key, value in milestone_data.model_dump().items():
        if key != "baby_id":
            setattr(milestone, key, value)

    db.commit()
    db.refresh(milestone)
    return milestone


@router.delete("/milestones/{milestone_id}")
@limiter.limit(RATE_WRITE)
def delete_milestone(
    request: Request,
    milestone_id: int,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id),
    user_email: str = Depends(get_user_email),
):
    milestone = (
        db.query(models.Milestone)
        .join(models.Baby)
        .filter(models.Milestone.id == milestone_id, baby_access_filter(user_id, user_email))
        .first()
    )
    if not milestone:
        logger.warning("Delete milestone not found", extra={"milestone_id": milestone_id})
        raise HTTPException(status_code=404, detail="Milestone not found")

    _, role = verify_baby_access(db, milestone.baby_id, user_id, user_email)
    require_write_access(role)

    logger.info("Deleted milestone", extra={"milestone_id": milestone_id})
    db.delete(milestone)
    db.commit()
    return {"message": "Deleted"}


# ============================================================================
# Growth Records
# ============================================================================


@router.get("/growth/", response_model=list[schemas.GrowthRecordResponse])
@limiter.limit(RATE_READ)
def get_growth_records(
    request: Request,
    baby_id: int,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id),
    user_email: str = Depends(get_user_email),
):
    baby = get_accessible_baby(db, baby_id, user_id, user_email)
    if not baby:
        raise HTTPException(status_code=404, detail="Baby not found")

    return (
        db.query(models.GrowthRecord)
        .filter(models.GrowthRecord.baby_id == baby_id)
        .order_by(desc(models.GrowthRecord.recorded_date))
        .all()
    )


@router.post("/growth/", response_model=schemas.GrowthRecordResponse)
@limiter.limit(RATE_WRITE)
def create_growth_record(
    request: Request,
    record: schemas.GrowthRecordCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id),
    user_email: str = Depends(get_user_email),
):
    baby, role = verify_baby_access(db, record.baby_id, user_id, user_email)
    require_write_access(role)

    db_record = models.GrowthRecord(**record.model_dump())
    db.add(db_record)
    db.commit()
    db.refresh(db_record)
    logger.info("Created growth record", extra={"baby_id": record.baby_id, "record_id": db_record.id})
    return db_record


@router.put("/growth/{record_id}", response_model=schemas.GrowthRecordResponse)
@limiter.limit(RATE_WRITE)
def update_growth_record(
    request: Request,
    record_id: int,
    record_data: schemas.GrowthRecordCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id),
    user_email: str = Depends(get_user_email),
):
    record = (
        db.query(models.GrowthRecord)
        .join(models.Baby)
        .filter(models.GrowthRecord.id == record_id, baby_access_filter(user_id, user_email))
        .first()
    )
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    _, role = verify_baby_access(db, record.baby_id, user_id, user_email)
    require_write_access(role)

    for key, value in record_data.model_dump().items():
        if key != "baby_id":
            setattr(record, key, value)

    db.commit()
    db.refresh(record)
    return record


@router.delete("/growth/{record_id}")
@limiter.limit(RATE_WRITE)
def delete_growth_record(
    request: Request,
    record_id: int,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id),
    user_email: str = Depends(get_user_email),
):
    record = (
        db.query(models.GrowthRecord)
        .join(models.Baby)
        .filter(models.GrowthRecord.id == record_id, baby_access_filter(user_id, user_email))
        .first()
    )
    if not record:
        logger.warning("Delete growth record not found", extra={"record_id": record_id})
        raise HTTPException(status_code=404, detail="Record not found")

    _, role = verify_baby_access(db, record.baby_id, user_id, user_email)
    require_write_access(role)

    logger.info("Deleted growth record", extra={"record_id": record_id})
    db.delete(record)
    db.commit()
    return {"message": "Deleted"}


# ============================================================================
# Teeth (Teething Tracker)
# ============================================================================


@router.get("/teeth/", response_model=list[schemas.ToothResponse])
@limiter.limit(RATE_READ)
def get_teeth(
    request: Request,
    baby_id: int,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id),
    user_email: str = Depends(get_user_email),
):
    baby = get_accessible_baby(db, baby_id, user_id, user_email)
    if not baby:
        raise HTTPException(status_code=404, detail="Baby not found")

    return (
        db.query(models.Tooth)
        .filter(models.Tooth.baby_id == baby_id)
        .order_by(desc(func.coalesce(models.Tooth.emerged_date, models.Tooth.emerging_date)))
        .all()
    )


@router.post("/teeth/", response_model=schemas.ToothResponse)
@limiter.limit(RATE_WRITE)
def create_tooth(
    request: Request,
    tooth: schemas.ToothCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id),
    user_email: str = Depends(get_user_email),
):
    baby, role = verify_baby_access(db, tooth.baby_id, user_id, user_email)
    require_write_access(role)

    if tooth.emerging_date is None and tooth.emerged_date is None:
        raise HTTPException(status_code=400, detail="Provide at least one of emerging_date or emerged_date")

    # Check if tooth at this position already exists
    existing = (
        db.query(models.Tooth)
        .filter(models.Tooth.baby_id == tooth.baby_id, models.Tooth.position == tooth.position)
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="Tooth at this position already recorded")

    db_tooth = models.Tooth(**tooth.model_dump())
    db.add(db_tooth)
    db.commit()
    db.refresh(db_tooth)
    logger.info("Created tooth record", extra={"baby_id": tooth.baby_id, "tooth_id": db_tooth.id})
    return db_tooth


@router.put("/teeth/{tooth_id}", response_model=schemas.ToothResponse)
@limiter.limit(RATE_WRITE)
def update_tooth(
    request: Request,
    tooth_id: int,
    tooth_data: schemas.ToothCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id),
    user_email: str = Depends(get_user_email),
):
    tooth = (
        db.query(models.Tooth)
        .join(models.Baby)
        .filter(models.Tooth.id == tooth_id, baby_access_filter(user_id, user_email))
        .first()
    )
    if not tooth:
        raise HTTPException(status_code=404, detail="Tooth not found")

    _, role = verify_baby_access(db, tooth.baby_id, user_id, user_email)
    require_write_access(role)

    for key, value in tooth_data.model_dump().items():
        if key != "baby_id":
            setattr(tooth, key, value)

    db.commit()
    db.refresh(tooth)
    return tooth


@router.delete("/teeth/{tooth_id}")
@limiter.limit(RATE_WRITE)
def delete_tooth(
    request: Request,
    tooth_id: int,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id),
    user_email: str = Depends(get_user_email),
):
    tooth = (
        db.query(models.Tooth)
        .join(models.Baby)
        .filter(models.Tooth.id == tooth_id, baby_access_filter(user_id, user_email))
        .first()
    )
    if not tooth:
        logger.warning("Delete tooth not found", extra={"tooth_id": tooth_id})
        raise HTTPException(status_code=404, detail="Tooth not found")

    _, role = verify_baby_access(db, tooth.baby_id, user_id, user_email)
    require_write_access(role)

    logger.info("Deleted tooth record", extra={"tooth_id": tooth_id})
    db.delete(tooth)
    db.commit()
    return {"message": "Deleted"}


# ============================================================================
# Sick Days
# ============================================================================


@router.get("/sick-days/", response_model=list[schemas.SickDayResponse])
@limiter.limit(RATE_READ)
def get_sick_days(
    request: Request,
    baby_id: int,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id),
    user_email: str = Depends(get_user_email),
):
    baby = get_accessible_baby(db, baby_id, user_id, user_email)
    if not baby:
        raise HTTPException(status_code=404, detail="Baby not found")

    return db.query(models.SickDay).filter(models.SickDay.baby_id == baby_id).order_by(desc(models.SickDay.date)).all()


@router.post("/sick-days/", response_model=schemas.SickDayResponse)
@limiter.limit(RATE_WRITE)
def create_sick_day(
    request: Request,
    sick_day: schemas.SickDayCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id),
    user_email: str = Depends(get_user_email),
):
    baby, role = verify_baby_access(db, sick_day.baby_id, user_id, user_email)
    require_write_access(role)

    db_sick_day = models.SickDay(**sick_day.model_dump())
    db.add(db_sick_day)
    db.commit()
    db.refresh(db_sick_day)
    logger.info("Created sick day", extra={"baby_id": sick_day.baby_id, "sick_day_id": db_sick_day.id})
    return db_sick_day


@router.put("/sick-days/{sick_day_id}", response_model=schemas.SickDayResponse)
@limiter.limit(RATE_WRITE)
def update_sick_day(
    request: Request,
    sick_day_id: int,
    sick_day_data: schemas.SickDayCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id),
    user_email: str = Depends(get_user_email),
):
    sick_day = (
        db.query(models.SickDay)
        .join(models.Baby)
        .filter(models.SickDay.id == sick_day_id, baby_access_filter(user_id, user_email))
        .first()
    )
    if not sick_day:
        raise HTTPException(status_code=404, detail="Sick day not found")

    _, role = verify_baby_access(db, sick_day.baby_id, user_id, user_email)
    require_write_access(role)

    for key, value in sick_day_data.model_dump().items():
        if key != "baby_id":
            setattr(sick_day, key, value)

    db.commit()
    db.refresh(sick_day)
    return sick_day


@router.delete("/sick-days/{sick_day_id}")
@limiter.limit(RATE_WRITE)
def delete_sick_day(
    request: Request,
    sick_day_id: int,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id),
    user_email: str = Depends(get_user_email),
):
    sick_day = (
        db.query(models.SickDay)
        .join(models.Baby)
        .filter(models.SickDay.id == sick_day_id, baby_access_filter(user_id, user_email))
        .first()
    )
    if not sick_day:
        logger.warning("Delete sick day not found", extra={"sick_day_id": sick_day_id})
        raise HTTPException(status_code=404, detail="Sick day not found")

    _, role = verify_baby_access(db, sick_day.baby_id, user_id, user_email)
    require_write_access(role)

    logger.info("Deleted sick day", extra={"sick_day_id": sick_day_id})
    db.delete(sick_day)
    db.commit()
    return {"message": "Deleted"}


# ============================================================================
# Allergies
# ============================================================================


@router.get("/allergies/", response_model=list[schemas.AllergyResponse])
@limiter.limit(RATE_READ)
def get_allergies(
    request: Request,
    baby_id: int,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id),
    user_email: str = Depends(get_user_email),
):
    baby = get_accessible_baby(db, baby_id, user_id, user_email)
    if not baby:
        raise HTTPException(status_code=404, detail="Baby not found")

    return db.query(models.Allergy).filter(models.Allergy.baby_id == baby_id).order_by(models.Allergy.allergen).all()


@router.post("/allergies/", response_model=schemas.AllergyResponse)
@limiter.limit(RATE_WRITE)
def create_allergy(
    request: Request,
    allergy: schemas.AllergyCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id),
    user_email: str = Depends(get_user_email),
):
    baby, role = verify_baby_access(db, allergy.baby_id, user_id, user_email)
    require_write_access(role)

    db_allergy = models.Allergy(**allergy.model_dump())
    db.add(db_allergy)
    db.commit()
    db.refresh(db_allergy)
    logger.info("Created allergy", extra={"baby_id": allergy.baby_id, "allergy_id": db_allergy.id})
    return db_allergy


@router.put("/allergies/{allergy_id}", response_model=schemas.AllergyResponse)
@limiter.limit(RATE_WRITE)
def update_allergy(
    request: Request,
    allergy_id: int,
    allergy_data: schemas.AllergyCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id),
    user_email: str = Depends(get_user_email),
):
    allergy = (
        db.query(models.Allergy)
        .join(models.Baby)
        .filter(models.Allergy.id == allergy_id, baby_access_filter(user_id, user_email))
        .first()
    )
    if not allergy:
        raise HTTPException(status_code=404, detail="Allergy not found")

    _, role = verify_baby_access(db, allergy.baby_id, user_id, user_email)
    require_write_access(role)

    for key, value in allergy_data.model_dump().items():
        if key != "baby_id":
            setattr(allergy, key, value)

    db.commit()
    db.refresh(allergy)
    return allergy


@router.delete("/allergies/{allergy_id}")
@limiter.limit(RATE_WRITE)
def delete_allergy(
    request: Request,
    allergy_id: int,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id),
    user_email: str = Depends(get_user_email),
):
    allergy = (
        db.query(models.Allergy)
        .join(models.Baby)
        .filter(models.Allergy.id == allergy_id, baby_access_filter(user_id, user_email))
        .first()
    )
    if not allergy:
        logger.warning("Delete allergy not found", extra={"allergy_id": allergy_id})
        raise HTTPException(status_code=404, detail="Allergy not found")

    _, role = verify_baby_access(db, allergy.baby_id, user_id, user_email)
    require_write_access(role)

    logger.info("Deleted allergy", extra={"allergy_id": allergy_id})
    db.delete(allergy)
    db.commit()
    return {"message": "Deleted"}


# ============================================================================
# Upcoming Items (Dashboard)
# ============================================================================


@router.get("/upcoming/")
@limiter.limit(RATE_READ)
def get_upcoming(
    request: Request,
    baby_id: int,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id),
    user_email: str = Depends(get_user_email),
):
    baby = get_accessible_baby(db, baby_id, user_id, user_email)
    if not baby:
        raise HTTPException(status_code=404, detail="Baby not found")

    today = datetime.now(UTC).replace(tzinfo=None)
    horizon = today + timedelta(days=30)
    upcoming = []

    # Vaccinations with next_due_date in the next 30 days
    vaccinations = (
        db.query(models.Vaccination)
        .filter(
            models.Vaccination.baby_id == baby_id,
            models.Vaccination.next_due_date >= today,
            models.Vaccination.next_due_date <= horizon,
        )
        .order_by(models.Vaccination.next_due_date)
        .all()
    )

    for v in vaccinations:
        upcoming.append(
            {
                "type": "vaccination",
                "title": f"{v.vaccine_name} (Dose {v.dose_number + 1})",
                "date": v.next_due_date.isoformat(),
                "color": "lavender",
            }
        )

    # Doctor visits with next_visit_date in the next 30 days
    visits = (
        db.query(models.DoctorVisit)
        .filter(
            models.DoctorVisit.baby_id == baby_id,
            models.DoctorVisit.next_visit_date >= today,
            models.DoctorVisit.next_visit_date <= horizon,
        )
        .order_by(models.DoctorVisit.next_visit_date)
        .all()
    )

    for v in visits:
        label = v.visit_type or "Doctor Visit"
        if v.doctor_name:
            label += f" — {v.doctor_name}"
        upcoming.append(
            {"type": "doctor_visit", "title": label, "date": v.next_visit_date.isoformat(), "color": "lavender"}
        )

    # Active medications
    medications = (
        db.query(models.Medication).filter(models.Medication.baby_id == baby_id, models.Medication.is_active).all()
    )

    for m in medications:
        upcoming.append(
            {
                "type": "medication",
                "title": m.medication_name,
                "date": None,
                "frequency": m.frequency,
                "dosage": m.dosage,
                "color": "peach",
            }
        )

    # Sort: dated items first by date, then undated (medications)
    dated = sorted([i for i in upcoming if i.get("date")], key=lambda x: x["date"])
    undated = [i for i in upcoming if not i.get("date")]

    return {"upcoming": dated + undated}
