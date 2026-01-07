from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_
from typing import List

from .. import models, schemas
from ..database import get_db
from ..auth import get_current_user, get_user_id, get_user_email

router = APIRouter(
    prefix="/health",
    tags=["health"],
    dependencies=[Depends(get_current_user)]
)


def get_accessible_baby(db: Session, baby_id: int, user_id: str, user_email: str):
    """Get a baby if user owns it or it's shared with them."""
    baby = db.query(models.Baby).filter(
        models.Baby.id == baby_id,
        or_(
            models.Baby.user_id == user_id,
            models.Baby.shared_with_emails.any(user_email)
        )
    ).first()
    return baby


# ============================================================================
# Doctor Visits
# ============================================================================

@router.get("/doctor-visits/", response_model=List[schemas.DoctorVisitResponse])
def get_doctor_visits(
    baby_id: int, 
    db: Session = Depends(get_db), 
    user_id: str = Depends(get_user_id),
    user_email: str = Depends(get_user_email)
):
    baby = get_accessible_baby(db, baby_id, user_id, user_email)
    if not baby:
        raise HTTPException(status_code=404, detail="Baby not found")
    
    return db.query(models.DoctorVisit).filter(
        models.DoctorVisit.baby_id == baby_id
    ).order_by(desc(models.DoctorVisit.visit_date)).all()


@router.post("/doctor-visits/", response_model=schemas.DoctorVisitResponse)
def create_doctor_visit(
    visit: schemas.DoctorVisitCreate, 
    db: Session = Depends(get_db), 
    user_id: str = Depends(get_user_id),
    user_email: str = Depends(get_user_email)
):
    baby = get_accessible_baby(db, visit.baby_id, user_id, user_email)
    if not baby:
        raise HTTPException(status_code=404, detail="Baby not found")
    
    db_visit = models.DoctorVisit(**visit.model_dump())
    db.add(db_visit)
    db.commit()
    db.refresh(db_visit)
    return db_visit


@router.put("/doctor-visits/{visit_id}", response_model=schemas.DoctorVisitResponse)
def update_doctor_visit(
    visit_id: int,
    visit_data: schemas.DoctorVisitCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id)
):
    visit = db.query(models.DoctorVisit).filter(models.DoctorVisit.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")

    for key, value in visit_data.model_dump().items():
        if key != 'baby_id':
            setattr(visit, key, value)

    db.commit()
    db.refresh(visit)
    return visit


@router.delete("/doctor-visits/{visit_id}")
def delete_doctor_visit(
    visit_id: int,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id)
):
    visit = db.query(models.DoctorVisit).filter(models.DoctorVisit.id == visit_id).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")

    db.delete(visit)
    db.commit()
    return {"message": "Deleted"}


# ============================================================================
# Vaccinations
# ============================================================================

@router.get("/vaccinations/", response_model=List[schemas.VaccinationResponse])
def get_vaccinations(
    baby_id: int, 
    db: Session = Depends(get_db), 
    user_id: str = Depends(get_user_id),
    user_email: str = Depends(get_user_email)
):
    baby = get_accessible_baby(db, baby_id, user_id, user_email)
    if not baby:
        raise HTTPException(status_code=404, detail="Baby not found")
    
    return db.query(models.Vaccination).filter(
        models.Vaccination.baby_id == baby_id
    ).order_by(desc(models.Vaccination.given_date)).all()


@router.post("/vaccinations/", response_model=schemas.VaccinationResponse)
def create_vaccination(
    vaccination: schemas.VaccinationCreate, 
    db: Session = Depends(get_db), 
    user_id: str = Depends(get_user_id),
    user_email: str = Depends(get_user_email)
):
    baby = get_accessible_baby(db, vaccination.baby_id, user_id, user_email)
    if not baby:
        raise HTTPException(status_code=404, detail="Baby not found")
    
    db_vacc = models.Vaccination(**vaccination.model_dump())
    db.add(db_vacc)
    db.commit()
    db.refresh(db_vacc)
    return db_vacc


@router.put("/vaccinations/{vaccination_id}", response_model=schemas.VaccinationResponse)
def update_vaccination(
    vaccination_id: int,
    vaccination_data: schemas.VaccinationCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id)
):
    vacc = db.query(models.Vaccination).filter(models.Vaccination.id == vaccination_id).first()
    if not vacc:
        raise HTTPException(status_code=404, detail="Vaccination not found")

    for key, value in vaccination_data.model_dump().items():
        if key != 'baby_id':
            setattr(vacc, key, value)

    db.commit()
    db.refresh(vacc)
    return vacc


@router.delete("/vaccinations/{vaccination_id}")
def delete_vaccination(
    vaccination_id: int, 
    db: Session = Depends(get_db), 
    user_id: str = Depends(get_user_id)
):
    vacc = db.query(models.Vaccination).filter(models.Vaccination.id == vaccination_id).first()
    if not vacc:
        raise HTTPException(status_code=404, detail="Vaccination not found")
    
    db.delete(vacc)
    db.commit()
    return {"message": "Deleted"}


# ============================================================================
# Medications
# ============================================================================

@router.get("/medications/", response_model=List[schemas.MedicationResponse])
def get_medications(
    baby_id: int, 
    active_only: bool = False, 
    db: Session = Depends(get_db), 
    user_id: str = Depends(get_user_id),
    user_email: str = Depends(get_user_email)
):
    baby = get_accessible_baby(db, baby_id, user_id, user_email)
    if not baby:
        raise HTTPException(status_code=404, detail="Baby not found")
    
    query = db.query(models.Medication).filter(models.Medication.baby_id == baby_id)
    if active_only:
        query = query.filter(models.Medication.is_active == True)
    
    return query.order_by(desc(models.Medication.start_date)).all()


@router.post("/medications/", response_model=schemas.MedicationResponse)
def create_medication(
    medication: schemas.MedicationCreate, 
    db: Session = Depends(get_db), 
    user_id: str = Depends(get_user_id),
    user_email: str = Depends(get_user_email)
):
    baby = get_accessible_baby(db, medication.baby_id, user_id, user_email)
    if not baby:
        raise HTTPException(status_code=404, detail="Baby not found")
    
    db_med = models.Medication(**medication.model_dump())
    db.add(db_med)
    db.commit()
    db.refresh(db_med)
    return db_med


@router.put("/medications/{medication_id}", response_model=schemas.MedicationResponse)
def update_medication(
    medication_id: int,
    medication_data: schemas.MedicationCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id)
):
    med = db.query(models.Medication).filter(models.Medication.id == medication_id).first()
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")

    for key, value in medication_data.model_dump().items():
        if key != 'baby_id':
            setattr(med, key, value)

    db.commit()
    db.refresh(med)
    return med


@router.patch("/medications/{medication_id}/toggle", response_model=schemas.MedicationResponse)
def toggle_medication_active(
    medication_id: int,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id)
):
    med = db.query(models.Medication).filter(models.Medication.id == medication_id).first()
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")

    med.is_active = not med.is_active
    db.commit()
    db.refresh(med)
    return med


@router.delete("/medications/{medication_id}")
def delete_medication(
    medication_id: int, 
    db: Session = Depends(get_db), 
    user_id: str = Depends(get_user_id)
):
    med = db.query(models.Medication).filter(models.Medication.id == medication_id).first()
    if not med:
        raise HTTPException(status_code=404, detail="Medication not found")
    
    db.delete(med)
    db.commit()
    return {"message": "Deleted"}


# ============================================================================
# Milestones
# ============================================================================

@router.get("/milestones/", response_model=List[schemas.MilestoneResponse])
def get_milestones(
    baby_id: int, 
    db: Session = Depends(get_db), 
    user_id: str = Depends(get_user_id),
    user_email: str = Depends(get_user_email)
):
    baby = get_accessible_baby(db, baby_id, user_id, user_email)
    if not baby:
        raise HTTPException(status_code=404, detail="Baby not found")
    
    return db.query(models.Milestone).filter(
        models.Milestone.baby_id == baby_id
    ).order_by(desc(models.Milestone.achieved_date)).all()


@router.post("/milestones/", response_model=schemas.MilestoneResponse)
def create_milestone(
    milestone: schemas.MilestoneCreate, 
    db: Session = Depends(get_db), 
    user_id: str = Depends(get_user_id),
    user_email: str = Depends(get_user_email)
):
    baby = get_accessible_baby(db, milestone.baby_id, user_id, user_email)
    if not baby:
        raise HTTPException(status_code=404, detail="Baby not found")
    
    db_milestone = models.Milestone(**milestone.model_dump())
    db.add(db_milestone)
    db.commit()
    db.refresh(db_milestone)
    return db_milestone


@router.put("/milestones/{milestone_id}", response_model=schemas.MilestoneResponse)
def update_milestone(
    milestone_id: int,
    milestone_data: schemas.MilestoneCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id)
):
    milestone = db.query(models.Milestone).filter(models.Milestone.id == milestone_id).first()
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")

    for key, value in milestone_data.model_dump().items():
        if key != 'baby_id':
            setattr(milestone, key, value)

    db.commit()
    db.refresh(milestone)
    return milestone


@router.delete("/milestones/{milestone_id}")
def delete_milestone(
    milestone_id: int, 
    db: Session = Depends(get_db), 
    user_id: str = Depends(get_user_id)
):
    milestone = db.query(models.Milestone).filter(models.Milestone.id == milestone_id).first()
    if not milestone:
        raise HTTPException(status_code=404, detail="Milestone not found")
    
    db.delete(milestone)
    db.commit()
    return {"message": "Deleted"}


# ============================================================================
# Growth Records
# ============================================================================

@router.get("/growth/", response_model=List[schemas.GrowthRecordResponse])
def get_growth_records(
    baby_id: int, 
    db: Session = Depends(get_db), 
    user_id: str = Depends(get_user_id),
    user_email: str = Depends(get_user_email)
):
    baby = get_accessible_baby(db, baby_id, user_id, user_email)
    if not baby:
        raise HTTPException(status_code=404, detail="Baby not found")
    
    return db.query(models.GrowthRecord).filter(
        models.GrowthRecord.baby_id == baby_id
    ).order_by(desc(models.GrowthRecord.recorded_date)).all()


@router.post("/growth/", response_model=schemas.GrowthRecordResponse)
def create_growth_record(
    record: schemas.GrowthRecordCreate, 
    db: Session = Depends(get_db), 
    user_id: str = Depends(get_user_id),
    user_email: str = Depends(get_user_email)
):
    baby = get_accessible_baby(db, record.baby_id, user_id, user_email)
    if not baby:
        raise HTTPException(status_code=404, detail="Baby not found")
    
    db_record = models.GrowthRecord(**record.model_dump())
    db.add(db_record)
    db.commit()
    db.refresh(db_record)
    return db_record


@router.put("/growth/{record_id}", response_model=schemas.GrowthRecordResponse)
def update_growth_record(
    record_id: int,
    record_data: schemas.GrowthRecordCreate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_user_id)
):
    record = db.query(models.GrowthRecord).filter(models.GrowthRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    for key, value in record_data.model_dump().items():
        if key != 'baby_id':
            setattr(record, key, value)

    db.commit()
    db.refresh(record)
    return record


@router.delete("/growth/{record_id}")
def delete_growth_record(
    record_id: int, 
    db: Session = Depends(get_db), 
    user_id: str = Depends(get_user_id)
):
    record = db.query(models.GrowthRecord).filter(models.GrowthRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    
    db.delete(record)
    db.commit()
    return {"message": "Deleted"}
