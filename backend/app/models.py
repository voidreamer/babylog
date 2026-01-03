from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Numeric
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base


class Baby(Base):
    __tablename__ = "babies"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)
    owner_email = Column(String, nullable=True)
    name = Column(String, nullable=False)
    birth_date = Column(DateTime, nullable=True)
    gender = Column(String, nullable=True)  # 'boy', 'girl', or null
    shared_with_emails = Column(ARRAY(String), default=list)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    feedings = relationship("Feeding", back_populates="baby", cascade="all, delete-orphan")
    diapers = relationship("Diaper", back_populates="baby", cascade="all, delete-orphan")
    sleeps = relationship("Sleep", back_populates="baby", cascade="all, delete-orphan")
    pumpings = relationship("Pumping", back_populates="baby", cascade="all, delete-orphan")
    # Health relationships
    doctor_visits = relationship("DoctorVisit", back_populates="baby", cascade="all, delete-orphan")
    vaccinations = relationship("Vaccination", back_populates="baby", cascade="all, delete-orphan")
    medications = relationship("Medication", back_populates="baby", cascade="all, delete-orphan")
    milestones = relationship("Milestone", back_populates="baby", cascade="all, delete-orphan")
    growth_records = relationship("GrowthRecord", back_populates="baby", cascade="all, delete-orphan")
    # Activity relationships
    potty_logs = relationship("Potty", back_populates="baby", cascade="all, delete-orphan")
    tummy_times = relationship("TummyTime", back_populates="baby", cascade="all, delete-orphan")
    baths = relationship("Bath", back_populates="baby", cascade="all, delete-orphan")


class Feeding(Base):
    __tablename__ = "feedings"
    
    id = Column(Integer, primary_key=True, index=True)
    baby_id = Column(Integer, ForeignKey("babies.id"), nullable=False)
    time = Column(DateTime, nullable=False)
    type = Column(String, nullable=False)  # 'formula', 'breast', 'bottle', 'solid'
    duration_minutes = Column(Integer, nullable=True)
    amount_ml = Column(Integer, nullable=True)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    baby = relationship("Baby", back_populates="feedings")


class Diaper(Base):
    __tablename__ = "diapers"
    
    id = Column(Integer, primary_key=True, index=True)
    baby_id = Column(Integer, ForeignKey("babies.id"), nullable=False)
    time = Column(DateTime, nullable=False)
    type = Column(String, nullable=False)  # 'pee', 'poo', 'mixed'
    # Poo details
    poo_color = Column(String, nullable=True)  # 'yellow', 'brown', 'green', 'black', 'red', 'white', 'orange'
    poo_consistency = Column(String, nullable=True)  # 'liquid', 'soft', 'formed', 'hard', 'pellets'
    poo_amount = Column(String, nullable=True)  # 'small', 'medium', 'large', 'blowout'
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    baby = relationship("Baby", back_populates="diapers")


class Sleep(Base):
    __tablename__ = "sleeps"
    
    id = Column(Integer, primary_key=True, index=True)
    baby_id = Column(Integer, ForeignKey("babies.id"), nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=True)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    baby = relationship("Baby", back_populates="sleeps")
    
    @property
    def duration_minutes(self) -> int | None:
        if self.end_time and self.start_time:
            return int((self.end_time - self.start_time).total_seconds() / 60)
        return None


class Pumping(Base):
    __tablename__ = "pumpings"
    
    id = Column(Integer, primary_key=True, index=True)
    baby_id = Column(Integer, ForeignKey("babies.id"), nullable=False)
    time = Column(DateTime, nullable=False)
    duration_minutes = Column(Integer, nullable=True)
    amount_ml = Column(Integer, nullable=True)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    baby = relationship("Baby", back_populates="pumpings")


# ============================================================================
# Health Integration Models
# ============================================================================

class DoctorVisit(Base):
    __tablename__ = "doctor_visits"
    
    id = Column(Integer, primary_key=True, index=True)
    baby_id = Column(Integer, ForeignKey("babies.id"), nullable=False)
    visit_date = Column(DateTime, nullable=False)
    doctor_name = Column(String(200), nullable=True)
    visit_type = Column(String(50), nullable=True)
    weight_kg = Column(Numeric(5, 2), nullable=True)
    height_cm = Column(Numeric(5, 2), nullable=True)
    head_cm = Column(Numeric(5, 2), nullable=True)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    baby = relationship("Baby", back_populates="doctor_visits")


class Vaccination(Base):
    __tablename__ = "vaccinations"
    
    id = Column(Integer, primary_key=True, index=True)
    baby_id = Column(Integer, ForeignKey("babies.id"), nullable=False)
    vaccine_name = Column(String(200), nullable=False)
    dose_number = Column(Integer, default=1)
    given_date = Column(DateTime, nullable=False)
    next_due_date = Column(DateTime, nullable=True)
    administered_by = Column(String(200), nullable=True)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    baby = relationship("Baby", back_populates="vaccinations")


class Medication(Base):
    __tablename__ = "medications"
    
    id = Column(Integer, primary_key=True, index=True)
    baby_id = Column(Integer, ForeignKey("babies.id"), nullable=False)
    medication_name = Column(String(200), nullable=False)
    dosage = Column(String(100), nullable=True)
    frequency = Column(String(100), nullable=True)
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    baby = relationship("Baby", back_populates="medications")


class Milestone(Base):
    __tablename__ = "milestones"
    
    id = Column(Integer, primary_key=True, index=True)
    baby_id = Column(Integer, ForeignKey("babies.id"), nullable=False)
    milestone_type = Column(String(100), nullable=False)
    achieved_date = Column(DateTime, nullable=False)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    baby = relationship("Baby", back_populates="milestones")


class GrowthRecord(Base):
    __tablename__ = "growth_records"
    
    id = Column(Integer, primary_key=True, index=True)
    baby_id = Column(Integer, ForeignKey("babies.id"), nullable=False)
    recorded_date = Column(DateTime, nullable=False)
    weight_kg = Column(Numeric(5, 2), nullable=True)
    height_cm = Column(Numeric(5, 2), nullable=True)
    head_cm = Column(Numeric(5, 2), nullable=True)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    baby = relationship("Baby", back_populates="growth_records")


# ============================================================================
# Activity Tracking Models
# ============================================================================

class Potty(Base):
    __tablename__ = "potty"
    
    id = Column(Integer, primary_key=True, index=True)
    baby_id = Column(Integer, ForeignKey("babies.id"), nullable=False)
    time = Column(DateTime, nullable=False)
    result = Column(String, nullable=False)  # 'success', 'accident', 'attempt'
    potty_type = Column(String, nullable=True)  # 'pee', 'poo', 'both'
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    baby = relationship("Baby", back_populates="potty_logs")


class TummyTime(Base):
    __tablename__ = "tummy_time"
    
    id = Column(Integer, primary_key=True, index=True)
    baby_id = Column(Integer, ForeignKey("babies.id"), nullable=False)
    start_time = Column(DateTime, nullable=False)
    duration_minutes = Column(Integer, nullable=True)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    baby = relationship("Baby", back_populates="tummy_times")


class Bath(Base):
    __tablename__ = "baths"
    
    id = Column(Integer, primary_key=True, index=True)
    baby_id = Column(Integer, ForeignKey("babies.id"), nullable=False)
    time = Column(DateTime, nullable=False)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    baby = relationship("Baby", back_populates="baths")
