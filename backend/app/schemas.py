import warnings
from datetime import UTC, datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator


# Custom datetime serialization to ensure UTC 'Z' suffix
def serialize_datetime(dt: datetime) -> str:
    if dt is None:
        return None
    # Ensure timezone-aware and convert to ISO format with Z suffix
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


# ============================================================================
# Baby Schemas
# ============================================================================

GenderEnum = Literal["boy", "girl"]


class BabyBase(BaseModel):
    name: str = Field(..., max_length=200)
    birth_date: datetime | None = None
    gender: GenderEnum | None = None
    profile_photo_url: str | None = None
    blood_type: str | None = None
    birthplace: str | None = None
    birth_time: str | None = None


class BabyCreate(BabyBase):
    pass


class BabyUpdate(BaseModel):
    name: str | None = None
    birth_date: datetime | None = None
    gender: GenderEnum | None = None
    profile_photo_url: str | None = None
    blood_type: str | None = None
    birthplace: str | None = None
    birth_time: str | None = None


CaregiverRole = Literal["viewer", "caregiver"]


class CaregiverEntry(BaseModel):
    email: str
    role: CaregiverRole = "caregiver"


class BabyResponse(BabyBase):
    id: int
    user_id: str
    owner_email: str | None = None
    shared_with: list[CaregiverEntry] = []
    is_owner: bool = True
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, json_encoders={datetime: serialize_datetime})


class BabyShareRequest(BaseModel):
    email: str
    role: CaregiverRole = "caregiver"


class CaregiverRoleUpdate(BaseModel):
    email: str
    role: CaregiverRole


# ============================================================================
# Feeding Schemas
# ============================================================================

FeedingTypeEnum = Literal["formula", "breast", "bottle", "solid"]


class FeedingBase(BaseModel):
    time: datetime
    type: FeedingTypeEnum
    duration_minutes: int | None = None
    amount_ml: int | None = None
    notes: str | None = Field(None, max_length=2000)


class FeedingCreate(FeedingBase):
    baby_id: int
    # Input-only bounds; response models stay unconstrained so legacy rows still serialize
    duration_minutes: int | None = Field(None, ge=0, le=24 * 60)
    amount_ml: int | None = Field(None, ge=0, le=2000)

    @model_validator(mode="after")
    def validate_feeding_amount(self):
        if self.type in ("formula", "bottle") and self.amount_ml is not None and self.amount_ml <= 0:
            raise ValueError("amount_ml must be greater than 0 for formula/bottle feedings")
        return self


class FeedingUpdate(BaseModel):
    time: datetime | None = None
    type: FeedingTypeEnum | None = None
    duration_minutes: int | None = Field(None, ge=0, le=24 * 60)
    amount_ml: int | None = Field(None, gt=0, le=2000)
    notes: str | None = Field(None, max_length=2000)


class FeedingResponse(FeedingBase):
    id: int
    baby_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, json_encoders={datetime: serialize_datetime})


# ============================================================================
# Diaper Schemas (Enhanced with poo details)
# ============================================================================

DiaperTypeEnum = Literal["pee", "poo", "mixed"]
PooColorEnum = Literal["yellow", "brown", "green", "black", "red", "white", "orange"]
PooConsistencyEnum = Literal["liquid", "soft", "formed", "hard", "pellets"]
PooAmountEnum = Literal["small", "medium", "large", "blowout"]


class DiaperBase(BaseModel):
    time: datetime
    type: DiaperTypeEnum
    poo_color: PooColorEnum | None = None
    poo_consistency: PooConsistencyEnum | None = None
    poo_amount: PooAmountEnum | None = None
    notes: str | None = Field(None, max_length=2000)


class DiaperCreate(DiaperBase):
    baby_id: int

    @model_validator(mode="after")
    def validate_poo_color(self):
        if self.type in ("poo", "mixed") and self.poo_color is None:
            warnings.warn(
                "poo_color is recommended when diaper type is 'poo' or 'mixed'",
                UserWarning,
                stacklevel=2,
            )
        return self


class DiaperUpdate(BaseModel):
    time: datetime | None = None
    type: DiaperTypeEnum | None = None
    poo_color: PooColorEnum | None = None
    poo_consistency: PooConsistencyEnum | None = None
    poo_amount: PooAmountEnum | None = None
    notes: str | None = Field(None, max_length=2000)


class DiaperResponse(DiaperBase):
    id: int
    baby_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, json_encoders={datetime: serialize_datetime})


# ============================================================================
# Sleep Schemas
# ============================================================================


class SleepBase(BaseModel):
    start_time: datetime
    end_time: datetime | None = None
    notes: str | None = Field(None, max_length=2000)


class SleepCreate(SleepBase):
    baby_id: int

    @model_validator(mode="after")
    def validate_sleep_times(self):
        if self.start_time and self.end_time and self.end_time <= self.start_time:
            raise ValueError("end_time must be after start_time")
        return self


class SleepUpdate(BaseModel):
    start_time: datetime | None = None
    end_time: datetime | None = None
    notes: str | None = Field(None, max_length=2000)

    @model_validator(mode="after")
    def validate_sleep_times(self):
        if self.start_time and self.end_time and self.end_time <= self.start_time:
            raise ValueError("end_time must be after start_time")
        return self


class SleepResponse(SleepBase):
    id: int
    baby_id: int
    duration_minutes: int | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, json_encoders={datetime: serialize_datetime})


# ============================================================================
# Pumping Schemas
# ============================================================================


class PumpingBase(BaseModel):
    time: datetime
    duration_minutes: int | None = None
    amount_ml: int | None = None
    notes: str | None = Field(None, max_length=2000)


class PumpingCreate(PumpingBase):
    baby_id: int
    # Input-only bounds; response models stay unconstrained so legacy rows still serialize
    duration_minutes: int | None = Field(None, ge=0, le=24 * 60)
    amount_ml: int | None = Field(None, ge=0, le=2000)


class PumpingUpdate(BaseModel):
    time: datetime | None = None
    duration_minutes: int | None = Field(None, ge=0, le=24 * 60)
    amount_ml: int | None = Field(None, ge=0, le=2000)
    notes: str | None = Field(None, max_length=2000)


class PumpingResponse(PumpingBase):
    id: int
    baby_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, json_encoders={datetime: serialize_datetime})


# ============================================================================
# Timeline / Event Schemas
# ============================================================================


class TimelineEvent(BaseModel):
    id: int
    event_type: str  # "feeding", "diaper", "sleep", "pumping"
    time: datetime
    details: dict

    model_config = ConfigDict(from_attributes=True, json_encoders={datetime: serialize_datetime})


# ============================================================================
# Dashboard / Summary Schemas
# ============================================================================


class DailySummary(BaseModel):
    date: str
    total_feedings: int
    total_ml: int
    breast_count: int
    bottle_count: int
    formula_count: int
    solid_count: int
    total_diapers: int
    pee_count: int
    poo_count: int
    mixed_count: int
    total_sleep_minutes: int
    sleep_count: int
    total_pumping_ml: int
    pumping_count: int
    # Activity counts
    potty_count: int = 0
    potty_success_count: int = 0
    tummy_count: int = 0
    tummy_minutes: int = 0
    bath_count: int = 0
    supplement_count: int = 0
    solid_meal_count: int = 0


class DashboardStats(BaseModel):
    last_feeding: FeedingResponse | None = None
    last_diaper: DiaperResponse | None = None
    last_sleep: SleepResponse | None = None
    last_pumping: PumpingResponse | None = None
    last_potty: Optional["PottyResponse"] = None
    last_tummy: Optional["TummyTimeResponse"] = None
    last_bath: Optional["BathResponse"] = None
    last_supplement: Optional["SupplementResponse"] = None
    last_solid: Optional["SolidResponse"] = None
    current_sleep: SleepResponse | None = None
    daily_summary: DailySummary | None = None


# ============================================================================
# Health Integration Schemas
# ============================================================================

VisitTypeEnum = Literal["checkup", "sick", "emergency", "specialist", "vaccination"]


class DoctorVisitBase(BaseModel):
    visit_date: datetime
    doctor_name: str | None = None
    visit_type: VisitTypeEnum | None = None
    weight_kg: float | None = None
    height_cm: float | None = None
    head_cm: float | None = None
    next_visit_date: datetime | None = None
    notes: str | None = Field(None, max_length=2000)


class DoctorVisitCreate(DoctorVisitBase):
    baby_id: int

    @model_validator(mode="after")
    def validate_visit_dates(self):
        if self.next_visit_date is not None and self.next_visit_date < self.visit_date:
            raise ValueError("next_visit_date must be on or after visit_date")
        return self


class DoctorVisitResponse(DoctorVisitBase):
    id: int
    baby_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, json_encoders={datetime: serialize_datetime})


class DoctorVisitUpdate(BaseModel):
    visit_date: datetime | None = None
    doctor_name: str | None = None
    visit_type: VisitTypeEnum | None = None
    weight_kg: float | None = None
    height_cm: float | None = None
    head_cm: float | None = None
    next_visit_date: datetime | None = None
    notes: str | None = Field(None, max_length=2000)


class VaccinationBase(BaseModel):
    vaccine_name: str = Field(..., max_length=200)
    dose_number: int = 1
    given_date: datetime
    next_due_date: datetime | None = None
    administered_by: str | None = None
    notes: str | None = Field(None, max_length=2000)


class VaccinationCreate(VaccinationBase):
    baby_id: int


class VaccinationResponse(VaccinationBase):
    id: int
    baby_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, json_encoders={datetime: serialize_datetime})


class VaccinationUpdate(BaseModel):
    vaccine_name: str | None = None
    dose_number: int | None = None
    given_date: datetime | None = None
    next_due_date: datetime | None = None
    administered_by: str | None = None
    notes: str | None = Field(None, max_length=2000)


class MedicationBase(BaseModel):
    medication_name: str = Field(..., max_length=200)
    dosage: str | None = None
    frequency: str | None = None
    start_date: datetime
    end_date: datetime | None = None
    is_active: bool = True
    notes: str | None = Field(None, max_length=2000)


class MedicationCreate(MedicationBase):
    baby_id: int


class MedicationResponse(MedicationBase):
    id: int
    baby_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, json_encoders={datetime: serialize_datetime})


class MedicationUpdate(BaseModel):
    medication_name: str | None = None
    dosage: str | None = None
    frequency: str | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    is_active: bool | None = None
    notes: str | None = Field(None, max_length=2000)


class MilestoneBase(BaseModel):
    milestone_type: str = Field(..., max_length=200)
    achieved_date: datetime
    photo_url: str | None = None
    notes: str | None = Field(None, max_length=2000)


class MilestoneCreate(MilestoneBase):
    baby_id: int


class MilestoneResponse(MilestoneBase):
    id: int
    baby_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, json_encoders={datetime: serialize_datetime})


class MilestoneUpdate(BaseModel):
    milestone_type: str | None = None
    achieved_date: datetime | None = None
    photo_url: str | None = None
    notes: str | None = Field(None, max_length=2000)


class GrowthRecordBase(BaseModel):
    recorded_date: datetime
    weight_kg: float | None = None
    height_cm: float | None = None
    head_cm: float | None = None
    notes: str | None = Field(None, max_length=2000)


class GrowthRecordCreate(GrowthRecordBase):
    baby_id: int
    # Input-only sanity bounds (catch unit mix-ups like grams in the kg field)
    weight_kg: float | None = Field(None, gt=0, le=100)
    height_cm: float | None = Field(None, gt=0, le=250)
    head_cm: float | None = Field(None, gt=0, le=100)


class GrowthRecordResponse(GrowthRecordBase):
    id: int
    baby_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, json_encoders={datetime: serialize_datetime})


class GrowthRecordUpdate(BaseModel):
    recorded_date: datetime | None = None
    weight_kg: float | None = Field(None, gt=0, le=100)
    height_cm: float | None = Field(None, gt=0, le=250)
    head_cm: float | None = Field(None, gt=0, le=100)
    notes: str | None = Field(None, max_length=2000)


# ============================================================================
# Activity Tracking Schemas
# ============================================================================

PottyResultEnum = Literal["success", "accident", "attempt"]
PottyTypeEnum = Literal["pee", "poo", "both"]


class PottyBase(BaseModel):
    time: datetime
    result: PottyResultEnum
    potty_type: PottyTypeEnum | None = None
    notes: str | None = Field(None, max_length=2000)


class PottyCreate(PottyBase):
    baby_id: int


class PottyResponse(PottyBase):
    id: int
    baby_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, json_encoders={datetime: serialize_datetime})


class TummyTimeBase(BaseModel):
    start_time: datetime
    duration_minutes: int | None = None
    notes: str | None = Field(None, max_length=2000)


class TummyTimeCreate(TummyTimeBase):
    baby_id: int
    duration_minutes: int | None = Field(None, ge=0, le=24 * 60)


class TummyTimeResponse(TummyTimeBase):
    id: int
    baby_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, json_encoders={datetime: serialize_datetime})


class BathBase(BaseModel):
    time: datetime
    notes: str | None = Field(None, max_length=2000)


class BathCreate(BathBase):
    baby_id: int


class BathResponse(BathBase):
    id: int
    baby_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, json_encoders={datetime: serialize_datetime})


# ============================================================================
# Supplement Schemas (Daily vitamins like Vitamin D, Iron, etc.)
# ============================================================================

# ============================================================================
# Solid Food Schemas
# ============================================================================

SolidReactionEnum = Literal["liked", "disliked", "allergic", "neutral"]
SolidAmountEnum = Literal["taste", "small", "medium", "large"]


class SolidBase(BaseModel):
    time: datetime
    food_name: str = Field(..., max_length=200)
    amount: str | None = None
    reaction: SolidReactionEnum | None = None
    notes: str | None = Field(None, max_length=2000)


class SolidCreate(SolidBase):
    baby_id: int


class SolidUpdate(BaseModel):
    time: datetime | None = None
    food_name: str | None = None
    amount: str | None = None
    reaction: SolidReactionEnum | None = None
    notes: str | None = Field(None, max_length=2000)


class SolidResponse(SolidBase):
    id: int
    baby_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, json_encoders={datetime: serialize_datetime})


SupplementNameEnum = Literal["vitamin_d", "iron", "dha", "probiotic", "multivitamin", "other"]


class SupplementBase(BaseModel):
    time: datetime
    name: SupplementNameEnum
    dosage: str | None = None  # e.g., "400 IU", "1ml"
    notes: str | None = Field(None, max_length=2000)


class SupplementCreate(SupplementBase):
    baby_id: int


class SupplementResponse(SupplementBase):
    id: int
    baby_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, json_encoders={datetime: serialize_datetime})


class SupplementUpdate(BaseModel):
    time: datetime | None = None
    name: SupplementNameEnum | None = None
    dosage: str | None = None
    notes: str | None = Field(None, max_length=2000)


# ============================================================================
# Teeth Schemas
# ============================================================================


class ToothBase(BaseModel):
    position: str  # e.g., "upper_A_left", "lower_E_right"
    emerging_date: datetime | None = None
    emerged_date: datetime | None = None
    notes: str | None = Field(None, max_length=2000)


class ToothCreate(ToothBase):
    baby_id: int


class ToothResponse(ToothBase):
    id: int
    baby_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, json_encoders={datetime: serialize_datetime})


# ============================================================================
# Sick Days Schemas
# ============================================================================


class SickDayBase(BaseModel):
    date: datetime
    symptoms: list[str] | None = []  # ["fever", "cough", "runny_nose"]
    temperature: float | None = None  # e.g., 38.5
    notes: str | None = Field(None, max_length=2000)


class SickDayCreate(SickDayBase):
    baby_id: int


class SickDayResponse(SickDayBase):
    id: int
    baby_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, json_encoders={datetime: serialize_datetime})


# ============================================================================
# Allergy Schemas
# ============================================================================


class AllergyBase(BaseModel):
    allergen: str = Field(..., max_length=200)  # "Dairy", "Peanuts", "Eggs"
    severity: str | None = None  # "mild", "moderate", "severe"
    reaction: str | None = None  # "hives", "vomiting", "swelling"
    discovered_date: datetime | None = None
    notes: str | None = Field(None, max_length=2000)


class AllergyCreate(AllergyBase):
    baby_id: int


class AllergyResponse(AllergyBase):
    id: int
    baby_id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, json_encoders={datetime: serialize_datetime})


# ============================================================================
# Analytics Schemas
# ============================================================================


class AnalyticsEventCreate(BaseModel):
    event_name: str = Field(..., max_length=100)
    event_data: str | None = None  # JSON string
    session_id: str | None = Field(None, max_length=64)


class AnalyticsEventBatch(BaseModel):
    events: list[AnalyticsEventCreate]


class AnalyticsEventResponse(BaseModel):
    id: int
    user_id: str
    event_name: str
    event_data: str | None = None
    session_id: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, json_encoders={datetime: serialize_datetime})


# ============================================================================
# Push Notification Schemas
# ============================================================================


class PushSubscriptionCreate(BaseModel):
    endpoint: str
    p256dh_key: str
    auth_key: str


class PushSubscriptionResponse(BaseModel):
    id: int
    user_id: str
    endpoint: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True, json_encoders={datetime: serialize_datetime})


class PushNotificationSend(BaseModel):
    title: str = Field(..., max_length=200)
    body: str = Field(..., max_length=1000)
    user_ids: list[str] | None = None  # None = broadcast to all


# ============================================================================
# Photo Upload Schemas
# ============================================================================


class PhotoUploadRequest(BaseModel):
    filename: str
    content_type: str = "image/jpeg"
    baby_id: int


class PhotoUploadResponse(BaseModel):
    upload_url: str
    storage_key: str
    public_url: str


# ============================================================================
# Telegram Schemas
# ============================================================================


class TelegramLinkRequest(BaseModel):
    chat_id: str
