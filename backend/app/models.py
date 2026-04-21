from datetime import UTC, datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, Numeric, String
from sqlalchemy.dialects.postgresql import ARRAY, JSONB
from sqlalchemy.orm import relationship

from .database import Base


# Helper for timezone-aware UTC timestamps (datetime.utcnow is deprecated in Python 3.12+)
def utc_now():
    return datetime.now(UTC)


# ============================================================================
# User Model - for premium status and user settings
# ============================================================================


class User(Base):
    """
    User model to store user-specific data.
    The user_id comes from Cognito (sub claim).
    """

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, unique=True, index=True, nullable=False)  # Cognito sub
    email = Column(String, index=True, nullable=True)
    is_premium = Column(Boolean, default=False, nullable=False)
    premium_since = Column(DateTime, nullable=True)  # When premium was activated
    promo_code_used = Column(String, nullable=True)  # Which promo code was redeemed
    stripe_customer_id = Column(String, nullable=True, index=True)
    stripe_subscription_id = Column(String, nullable=True)
    premium_plan = Column(String, nullable=True)  # 'monthly' or 'yearly'
    premium_expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)
    onboarding_completed_at = Column(DateTime, nullable=True)
    tour_completed_at = Column(DateTime, nullable=True)
    telegram_chat_id = Column(String, nullable=True, index=True)
    country = Column(String(2), nullable=True)


class Baby(Base):
    __tablename__ = "babies"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)
    owner_email = Column(String, nullable=True)
    name = Column(String, nullable=False)
    birth_date = Column(DateTime, nullable=True)
    gender = Column(String, nullable=True)  # 'boy', 'girl', or null
    profile_photo_url = Column(String, nullable=True)
    blood_type = Column(String(5), nullable=True)
    birthplace = Column(String(200), nullable=True)
    birth_time = Column(String(5), nullable=True)
    shared_with = Column(JSONB, default=list, server_default="[]")
    created_at = Column(DateTime, default=utc_now)

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
    teeth = relationship("Tooth", back_populates="baby", cascade="all, delete-orphan")
    sick_days = relationship("SickDay", back_populates="baby", cascade="all, delete-orphan")
    allergies = relationship("Allergy", back_populates="baby", cascade="all, delete-orphan")
    # Activity relationships
    potty_logs = relationship("Potty", back_populates="baby", cascade="all, delete-orphan")
    tummy_times = relationship("TummyTime", back_populates="baby", cascade="all, delete-orphan")
    baths = relationship("Bath", back_populates="baby", cascade="all, delete-orphan")
    supplements = relationship("Supplement", back_populates="baby", cascade="all, delete-orphan")
    solids = relationship("Solid", back_populates="baby", cascade="all, delete-orphan")


class Feeding(Base):
    __tablename__ = "feedings"

    id = Column(Integer, primary_key=True, index=True)
    baby_id = Column(Integer, ForeignKey("babies.id"), nullable=False)
    time = Column(DateTime, nullable=False)
    type = Column(String, nullable=False)  # 'formula', 'breast', 'bottle', 'solid'
    duration_minutes = Column(Integer, nullable=True)
    amount_ml = Column(Integer, nullable=True)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=utc_now)

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
    created_at = Column(DateTime, default=utc_now)

    baby = relationship("Baby", back_populates="diapers")


class Sleep(Base):
    __tablename__ = "sleeps"

    id = Column(Integer, primary_key=True, index=True)
    baby_id = Column(Integer, ForeignKey("babies.id"), nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=True)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=utc_now)

    baby = relationship("Baby", back_populates="sleeps")

    @property
    def duration_minutes(self) -> "int | None":
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
    created_at = Column(DateTime, default=utc_now)

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
    next_visit_date = Column(DateTime, nullable=True)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=utc_now)

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
    created_at = Column(DateTime, default=utc_now)

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
    created_at = Column(DateTime, default=utc_now)

    baby = relationship("Baby", back_populates="medications")


class Milestone(Base):
    __tablename__ = "milestones"

    id = Column(Integer, primary_key=True, index=True)
    baby_id = Column(Integer, ForeignKey("babies.id"), nullable=False)
    milestone_type = Column(String(100), nullable=False)
    achieved_date = Column(DateTime, nullable=False)
    photo_url = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=utc_now)

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
    created_at = Column(DateTime, default=utc_now)

    baby = relationship("Baby", back_populates="growth_records")


class Tooth(Base):
    """Track individual baby teeth emergence."""

    __tablename__ = "teeth"

    id = Column(Integer, primary_key=True, index=True)
    baby_id = Column(Integer, ForeignKey("babies.id"), nullable=False)
    position = Column(String(20), nullable=False)  # e.g., "upper_A_left", "lower_E_right"
    emerging_date = Column(DateTime, nullable=True)
    emerged_date = Column(DateTime, nullable=True)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=utc_now)

    baby = relationship("Baby", back_populates="teeth")


class SickDay(Base):
    """Track illness episodes and symptoms."""

    __tablename__ = "sick_days"

    id = Column(Integer, primary_key=True, index=True)
    baby_id = Column(Integer, ForeignKey("babies.id"), nullable=False)
    date = Column(DateTime, nullable=False)
    symptoms = Column(ARRAY(String), default=list)  # ["fever", "cough", "runny_nose"]
    temperature = Column(Numeric(4, 1), nullable=True)  # e.g., 38.5
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=utc_now)

    baby = relationship("Baby", back_populates="sick_days")


class Allergy(Base):
    """Track known allergies for safety reference."""

    __tablename__ = "allergies"

    id = Column(Integer, primary_key=True, index=True)
    baby_id = Column(Integer, ForeignKey("babies.id"), nullable=False)
    allergen = Column(String(100), nullable=False)  # "Dairy", "Peanuts", "Eggs"
    severity = Column(String(20), nullable=True)  # "mild", "moderate", "severe"
    reaction = Column(String, nullable=True)  # "hives", "vomiting", "swelling"
    discovered_date = Column(DateTime, nullable=True)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=utc_now)

    baby = relationship("Baby", back_populates="allergies")


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
    created_at = Column(DateTime, default=utc_now)

    baby = relationship("Baby", back_populates="potty_logs")


class TummyTime(Base):
    __tablename__ = "tummy_time"

    id = Column(Integer, primary_key=True, index=True)
    baby_id = Column(Integer, ForeignKey("babies.id"), nullable=False)
    start_time = Column(DateTime, nullable=False)
    duration_minutes = Column(Integer, nullable=True)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=utc_now)

    baby = relationship("Baby", back_populates="tummy_times")


class Bath(Base):
    __tablename__ = "baths"

    id = Column(Integer, primary_key=True, index=True)
    baby_id = Column(Integer, ForeignKey("babies.id"), nullable=False)
    time = Column(DateTime, nullable=False)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=utc_now)

    baby = relationship("Baby", back_populates="baths")


class Solid(Base):
    """Track solid food introductions and meals."""

    __tablename__ = "solids"

    id = Column(Integer, primary_key=True, index=True)
    baby_id = Column(Integer, ForeignKey("babies.id"), nullable=False)
    time = Column(DateTime, nullable=False)
    food_name = Column(String, nullable=False)  # e.g., "avocado", "banana", "rice cereal"
    amount = Column(String, nullable=True)  # "small", "medium", "large" or free text
    reaction = Column(String, nullable=True)  # "liked", "disliked", "allergic", "neutral"
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=utc_now)

    baby = relationship("Baby", back_populates="solids")


class Supplement(Base):
    """Track daily supplements like Vitamin D, Iron, etc."""

    __tablename__ = "supplements"

    id = Column(Integer, primary_key=True, index=True)
    baby_id = Column(Integer, ForeignKey("babies.id"), nullable=False)
    time = Column(DateTime, nullable=False)
    name = Column(String, nullable=False)  # 'vitamin_d', 'iron', 'dha', 'probiotic', 'other'
    dosage = Column(String, nullable=True)  # e.g., "400 IU", "1ml"
    notes = Column(String, nullable=True)
    created_at = Column(DateTime, default=utc_now)

    baby = relationship("Baby", back_populates="supplements")


# ============================================================================
# Analytics & Marketing Models
# ============================================================================


class AnalyticsEvent(Base):
    """Lightweight event tracking for product analytics."""

    __tablename__ = "analytics_events"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)
    event_name = Column(String(100), nullable=False, index=True)
    event_data = Column(String, nullable=True)  # JSON string
    session_id = Column(String(64), nullable=True, index=True)
    created_at = Column(DateTime, default=utc_now, index=True)


class PushSubscription(Base):
    """Web Push subscription info for notifications."""

    __tablename__ = "push_subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, index=True, nullable=False)
    endpoint = Column(String, nullable=False, unique=True)
    p256dh_key = Column(String, nullable=False)
    auth_key = Column(String, nullable=False)
    created_at = Column(DateTime, default=utc_now)
