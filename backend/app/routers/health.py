from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List

from .. import models, schemas
from ..database import get_db
from ..auth import get_current_user

router = APIRouter(
    prefix="/health",
    tags=["health"],
    dependencies=[Depends(get_current_user)]
)


# ============================================================================
# Doctor Visits
# ============================================================================

@router.get("/doctor-visits/", response_model=List[schemas.DoctorVisitResponse])
def get_doctor_visits(baby_id: int, db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    baby = db.query(models.Baby).filter(
        models.Baby.id == baby_id,
        (models.Baby.user_id == user_id) | (models.Baby.shared_with_emails.any(user_id))
    ).first()
    if not baby:
        raise HTTPException(status_code=404, detail="Baby not found")
    
    return db.query(models.DoctorVisit).filter(
        models.DoctorVisit.baby_id == baby_id
    ).order_by(desc(models.DoctorVisit.visit_date)).all()


@router.post("/doctor-visits/", response_model=schemas.DoctorVisitResponse)
def create_doctor_visit(visit: schemas.DoctorVisitCreate, db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    baby = db.query(models.Baby).filter(
        models.Baby.id == visit.baby_id,
        (models.Baby.user_id == user_id) | (models.Baby.shared_with_emails.any(user_id))
    ).first()
    if not baby:
        raise HTTPException(status_code=404, detail="Baby not found")
    
    db_visit = models.DoctorVisit(**visit.model_dump())
    db.add(db_visit)
    db.commit()
    db.refresh(db_visit)
    return db_visit


@router.delete("/doctor-visits/{visit_id}")
def delete_doctor_visit(visit_id: int, db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
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
def get_vaccinations(baby_id: int, db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    baby = db.query(models.Baby).filter(
        models.Baby.id == baby_id,
        (models.Baby.user_id == user_id) | (models.Baby.shared_with_emails.any(user_id))
    ).first()
    if not baby:
        raise HTTPException(status_code=404, detail="Baby not found")
    
    return db.query(models.Vaccination).filter(
        models.Vaccination.baby_id == baby_id
    ).order_by(desc(models.Vaccination.given_date)).all()


@router.post("/vaccinations/", response_model=schemas.VaccinationResponse)
def create_vaccination(vaccination: schemas.VaccinationCreate, db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    baby = db.query(models.Baby).filter(
        models.Baby.id == vaccination.baby_id,
        (models.Baby.user_id == user_id) | (models.Baby.shared_with_emails.any(user_id))
    ).first()
    if not baby:
        raise HTTPException(status_code=404, detail="Baby not found")
    
    db_vacc = models.Vaccination(**vaccination.model_dump())
    db.add(db_vacc)
    db.commit()
    db.refresh(db_vacc)
    return db_vacc


@router.delete("/vaccinations/{vaccination_id}")
def delete_vaccination(vaccination_id: int, db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
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
def get_medications(baby_id: int, active_only: bool = False, db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    baby = db.query(models.Baby).filter(
        models.Baby.id == baby_id,
        (models.Baby.user_id == user_id) | (models.Baby.shared_with_emails.any(user_id))
    ).first()
    if not baby:
        raise HTTPException(status_code=404, detail="Baby not found")
    
    query = db.query(models.Medication).filter(models.Medication.baby_id == baby_id)
    if active_only:
        query = query.filter(models.Medication.is_active == True)
    
    return query.order_by(desc(models.Medication.start_date)).all()


@router.post("/medications/", response_model=schemas.MedicationResponse)
def create_medication(medication: schemas.MedicationCreate, db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    baby = db.query(models.Baby).filter(
        models.Baby.id == medication.baby_id,
        (models.Baby.user_id == user_id) | (models.Baby.shared_with_emails.any(user_id))
    ).first()
    if not baby:
        raise HTTPException(status_code=404, detail="Baby not found")
    
    db_med = models.Medication(**medication.model_dump())
    db.add(db_med)
    db.commit()
    db.refresh(db_med)
    return db_med


@router.delete("/medications/{medication_id}")
def delete_medication(medication_id: int, db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
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
def get_milestones(baby_id: int, db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    baby = db.query(models.Baby).filter(
        models.Baby.id == baby_id,
        (models.Baby.user_id == user_id) | (models.Baby.shared_with_emails.any(user_id))
    ).first()
    if not baby:
        raise HTTPException(status_code=404, detail="Baby not found")
    
    return db.query(models.Milestone).filter(
        models.Milestone.baby_id == baby_id
    ).order_by(desc(models.Milestone.achieved_date)).all()


@router.post("/milestones/", response_model=schemas.MilestoneResponse)
def create_milestone(milestone: schemas.MilestoneCreate, db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    baby = db.query(models.Baby).filter(
        models.Baby.id == milestone.baby_id,
        (models.Baby.user_id == user_id) | (models.Baby.shared_with_emails.any(user_id))
    ).first()
    if not baby:
        raise HTTPException(status_code=404, detail="Baby not found")
    
    db_milestone = models.Milestone(**milestone.model_dump())
    db.add(db_milestone)
    db.commit()
    db.refresh(db_milestone)
    return db_milestone


@router.delete("/milestones/{milestone_id}")
def delete_milestone(milestone_id: int, db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
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
def get_growth_records(baby_id: int, db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    baby = db.query(models.Baby).filter(
        models.Baby.id == baby_id,
        (models.Baby.user_id == user_id) | (models.Baby.shared_with_emails.any(user_id))
    ).first()
    if not baby:
        raise HTTPException(status_code=404, detail="Baby not found")
    
    return db.query(models.GrowthRecord).filter(
        models.GrowthRecord.baby_id == baby_id
    ).order_by(desc(models.GrowthRecord.recorded_date)).all()


@router.post("/growth/", response_model=schemas.GrowthRecordResponse)
def create_growth_record(record: schemas.GrowthRecordCreate, db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    baby = db.query(models.Baby).filter(
        models.Baby.id == record.baby_id,
        (models.Baby.user_id == user_id) | (models.Baby.shared_with_emails.any(user_id))
    ).first()
    if not baby:
        raise HTTPException(status_code=404, detail="Baby not found")
    
    db_record = models.GrowthRecord(**record.model_dump())
    db.add(db_record)
    db.commit()
    db.refresh(db_record)
    return db_record


@router.delete("/growth/{record_id}")
def delete_growth_record(record_id: int, db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    record = db.query(models.GrowthRecord).filter(models.GrowthRecord.id == record_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    
    db.delete(record)
    db.commit()
    return {"message": "Deleted"}
