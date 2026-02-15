from pydantic import BaseModel, ConfigDict, Field
from datetime import datetime, timezone
from typing import Optional, List, Literal


# Custom datetime serialization to ensure UTC 'Z' suffix
def serialize_datetime(dt: datetime) -> str:
    if dt is None:
        return None
    # Ensure timezone-aware and convert to ISO format with Z suffix
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.strftime('%Y-%m-%dT%H:%M:%SZ')


# ============================================================================
# Baby Schemas
# ============================================================================

GenderEnum = Literal["boy", "girl"]

class BabyBase(BaseModel):
    name: str = Field(..., max_length=200)
    birth_date: Optional[datetime] = None
    gender: Optional[GenderEnum] = None
    profile_photo_url: Optional[str] = None


class BabyCreate(BabyBase):
    pass


class BabyUpdate(BaseModel):
    name: Optional[str] = None
    birth_date: Optional[datetime] = None
    gender: Optional[GenderEnum] = None
    profile_photo_url: Optional[str] = None


CaregiverRole = Literal["viewer", "caregiver"]


class CaregiverEntry(BaseModel):
    email: str
    role: CaregiverRole = "caregiver"


class BabyResponse(BabyBase):
    id: int
    user_id: str
    owner_email: Optional[str] = None
    shared_with: List[CaregiverEntry] = []
    is_owner: bool = True
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={datetime: serialize_datetime}
    )


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
    duration_minutes: Optional[int] = None
    amount_ml: Optional[int] = None
    notes: Optional[str] = Field(None, max_length=2000)


class FeedingCreate(FeedingBase):
    baby_id: int


class FeedingUpdate(BaseModel):
    time: Optional[datetime] = None
    type: Optional[FeedingTypeEnum] = None
    duration_minutes: Optional[int] = None
    amount_ml: Optional[int] = None
    notes: Optional[str] = Field(None, max_length=2000)


class FeedingResponse(FeedingBase):
    id: int
    baby_id: int
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={datetime: serialize_datetime}
    )


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
    poo_color: Optional[PooColorEnum] = None
    poo_consistency: Optional[PooConsistencyEnum] = None
    poo_amount: Optional[PooAmountEnum] = None
    notes: Optional[str] = Field(None, max_length=2000)


class DiaperCreate(DiaperBase):
    baby_id: int


class DiaperUpdate(BaseModel):
    time: Optional[datetime] = None
    type: Optional[DiaperTypeEnum] = None
    poo_color: Optional[PooColorEnum] = None
    poo_consistency: Optional[PooConsistencyEnum] = None
    poo_amount: Optional[PooAmountEnum] = None
    notes: Optional[str] = Field(None, max_length=2000)


class DiaperResponse(DiaperBase):
    id: int
    baby_id: int
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={datetime: serialize_datetime}
    )


# ============================================================================
# Sleep Schemas
# ============================================================================

class SleepBase(BaseModel):
    start_time: datetime
    end_time: Optional[datetime] = None
    notes: Optional[str] = Field(None, max_length=2000)


class SleepCreate(SleepBase):
    baby_id: int


class SleepUpdate(BaseModel):
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    notes: Optional[str] = Field(None, max_length=2000)


class SleepResponse(SleepBase):
    id: int
    baby_id: int
    duration_minutes: Optional[int] = None
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={datetime: serialize_datetime}
    )


# ============================================================================
# Pumping Schemas
# ============================================================================

class PumpingBase(BaseModel):
    time: datetime
    duration_minutes: Optional[int] = None
    amount_ml: Optional[int] = None
    notes: Optional[str] = Field(None, max_length=2000)


class PumpingCreate(PumpingBase):
    baby_id: int


class PumpingUpdate(BaseModel):
    time: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    amount_ml: Optional[int] = None
    notes: Optional[str] = Field(None, max_length=2000)


class PumpingResponse(PumpingBase):
    id: int
    baby_id: int
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={datetime: serialize_datetime}
    )


# ============================================================================
# Timeline / Event Schemas
# ============================================================================

class TimelineEvent(BaseModel):
    id: int
    event_type: str  # "feeding", "diaper", "sleep", "pumping"
    time: datetime
    details: dict

    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={datetime: serialize_datetime}
    )


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


class DashboardStats(BaseModel):
    last_feeding: Optional[FeedingResponse] = None
    last_diaper: Optional[DiaperResponse] = None
    last_sleep: Optional[SleepResponse] = None
    last_pumping: Optional[PumpingResponse] = None
    last_potty: Optional['PottyResponse'] = None
    last_tummy: Optional['TummyTimeResponse'] = None
    last_bath: Optional['BathResponse'] = None
    last_supplement: Optional['SupplementResponse'] = None
    current_sleep: Optional[SleepResponse] = None
    daily_summary: Optional[DailySummary] = None


# ============================================================================
# Health Integration Schemas
# ============================================================================

VisitTypeEnum = Literal["checkup", "sick", "emergency", "specialist", "vaccination"]

class DoctorVisitBase(BaseModel):
    visit_date: datetime
    doctor_name: Optional[str] = None
    visit_type: Optional[VisitTypeEnum] = None
    weight_kg: Optional[float] = None
    height_cm: Optional[float] = None
    head_cm: Optional[float] = None
    next_visit_date: Optional[datetime] = None
    notes: Optional[str] = Field(None, max_length=2000)


class DoctorVisitCreate(DoctorVisitBase):
    baby_id: int


class DoctorVisitResponse(DoctorVisitBase):
    id: int
    baby_id: int
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={datetime: serialize_datetime}
    )


class DoctorVisitUpdate(BaseModel):
    visit_date: Optional[datetime] = None
    doctor_name: Optional[str] = None
    visit_type: Optional[VisitTypeEnum] = None
    weight_kg: Optional[float] = None
    height_cm: Optional[float] = None
    head_cm: Optional[float] = None
    next_visit_date: Optional[datetime] = None
    notes: Optional[str] = Field(None, max_length=2000)


class VaccinationBase(BaseModel):
    vaccine_name: str = Field(..., max_length=200)
    dose_number: int = 1
    given_date: datetime
    next_due_date: Optional[datetime] = None
    administered_by: Optional[str] = None
    notes: Optional[str] = Field(None, max_length=2000)


class VaccinationCreate(VaccinationBase):
    baby_id: int


class VaccinationResponse(VaccinationBase):
    id: int
    baby_id: int
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={datetime: serialize_datetime}
    )


class VaccinationUpdate(BaseModel):
    vaccine_name: Optional[str] = None
    dose_number: Optional[int] = None
    given_date: Optional[datetime] = None
    next_due_date: Optional[datetime] = None
    administered_by: Optional[str] = None
    notes: Optional[str] = Field(None, max_length=2000)


class MedicationBase(BaseModel):
    medication_name: str = Field(..., max_length=200)
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    start_date: datetime
    end_date: Optional[datetime] = None
    is_active: bool = True
    notes: Optional[str] = Field(None, max_length=2000)


class MedicationCreate(MedicationBase):
    baby_id: int


class MedicationResponse(MedicationBase):
    id: int
    baby_id: int
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={datetime: serialize_datetime}
    )


class MedicationUpdate(BaseModel):
    medication_name: Optional[str] = None
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = Field(None, max_length=2000)


class MilestoneBase(BaseModel):
    milestone_type: str = Field(..., max_length=200)
    achieved_date: datetime
    photo_url: Optional[str] = None
    notes: Optional[str] = Field(None, max_length=2000)


class MilestoneCreate(MilestoneBase):
    baby_id: int


class MilestoneResponse(MilestoneBase):
    id: int
    baby_id: int
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={datetime: serialize_datetime}
    )


class MilestoneUpdate(BaseModel):
    milestone_type: Optional[str] = None
    achieved_date: Optional[datetime] = None
    photo_url: Optional[str] = None
    notes: Optional[str] = Field(None, max_length=2000)


class GrowthRecordBase(BaseModel):
    recorded_date: datetime
    weight_kg: Optional[float] = None
    height_cm: Optional[float] = None
    head_cm: Optional[float] = None
    notes: Optional[str] = Field(None, max_length=2000)


class GrowthRecordCreate(GrowthRecordBase):
    baby_id: int


class GrowthRecordResponse(GrowthRecordBase):
    id: int
    baby_id: int
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={datetime: serialize_datetime}
    )


class GrowthRecordUpdate(BaseModel):
    recorded_date: Optional[datetime] = None
    weight_kg: Optional[float] = None
    height_cm: Optional[float] = None
    head_cm: Optional[float] = None
    notes: Optional[str] = Field(None, max_length=2000)


# ============================================================================
# Activity Tracking Schemas
# ============================================================================

PottyResultEnum = Literal["success", "accident", "attempt"]
PottyTypeEnum = Literal["pee", "poo", "both"]

class PottyBase(BaseModel):
    time: datetime
    result: PottyResultEnum
    potty_type: Optional[PottyTypeEnum] = None
    notes: Optional[str] = Field(None, max_length=2000)


class PottyCreate(PottyBase):
    baby_id: int


class PottyResponse(PottyBase):
    id: int
    baby_id: int
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={datetime: serialize_datetime}
    )


class TummyTimeBase(BaseModel):
    start_time: datetime
    duration_minutes: Optional[int] = None
    notes: Optional[str] = Field(None, max_length=2000)


class TummyTimeCreate(TummyTimeBase):
    baby_id: int


class TummyTimeResponse(TummyTimeBase):
    id: int
    baby_id: int
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={datetime: serialize_datetime}
    )


class BathBase(BaseModel):
    time: datetime
    notes: Optional[str] = Field(None, max_length=2000)


class BathCreate(BathBase):
    baby_id: int


class BathResponse(BathBase):
    id: int
    baby_id: int
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={datetime: serialize_datetime}
    )


# ============================================================================
# Supplement Schemas (Daily vitamins like Vitamin D, Iron, etc.)
# ============================================================================

SupplementNameEnum = Literal["vitamin_d", "iron", "dha", "probiotic", "multivitamin", "other"]

class SupplementBase(BaseModel):
    time: datetime
    name: SupplementNameEnum
    dosage: Optional[str] = None  # e.g., "400 IU", "1ml"
    notes: Optional[str] = Field(None, max_length=2000)


class SupplementCreate(SupplementBase):
    baby_id: int


class SupplementResponse(SupplementBase):
    id: int
    baby_id: int
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={datetime: serialize_datetime}
    )


class SupplementUpdate(BaseModel):
    time: Optional[datetime] = None
    name: Optional[SupplementNameEnum] = None
    dosage: Optional[str] = None
    notes: Optional[str] = Field(None, max_length=2000)


# ============================================================================
# Teeth Schemas
# ============================================================================

class ToothBase(BaseModel):
    position: str  # e.g., "upper_A_left", "lower_E_right"
    emerged_date: datetime
    notes: Optional[str] = Field(None, max_length=2000)


class ToothCreate(ToothBase):
    baby_id: int


class ToothResponse(ToothBase):
    id: int
    baby_id: int
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={datetime: serialize_datetime}
    )


# ============================================================================
# Sick Days Schemas
# ============================================================================

class SickDayBase(BaseModel):
    date: datetime
    symptoms: Optional[List[str]] = []  # ["fever", "cough", "runny_nose"]
    temperature: Optional[float] = None  # e.g., 38.5
    notes: Optional[str] = Field(None, max_length=2000)


class SickDayCreate(SickDayBase):
    baby_id: int


class SickDayResponse(SickDayBase):
    id: int
    baby_id: int
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={datetime: serialize_datetime}
    )


# ============================================================================
# Allergy Schemas
# ============================================================================

class AllergyBase(BaseModel):
    allergen: str = Field(..., max_length=200)  # "Dairy", "Peanuts", "Eggs"
    severity: Optional[str] = None  # "mild", "moderate", "severe"
    reaction: Optional[str] = None  # "hives", "vomiting", "swelling"
    discovered_date: Optional[datetime] = None
    notes: Optional[str] = Field(None, max_length=2000)


class AllergyCreate(AllergyBase):
    baby_id: int


class AllergyResponse(AllergyBase):
    id: int
    baby_id: int
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={datetime: serialize_datetime}
    )


# ============================================================================
# Analytics Schemas
# ============================================================================

class AnalyticsEventCreate(BaseModel):
    event_name: str = Field(..., max_length=100)
    event_data: Optional[str] = None  # JSON string
    session_id: Optional[str] = Field(None, max_length=64)


class AnalyticsEventBatch(BaseModel):
    events: List[AnalyticsEventCreate]


class AnalyticsEventResponse(BaseModel):
    id: int
    user_id: str
    event_name: str
    event_data: Optional[str] = None
    session_id: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={datetime: serialize_datetime}
    )


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

    model_config = ConfigDict(
        from_attributes=True,
        json_encoders={datetime: serialize_datetime}
    )


class PushNotificationSend(BaseModel):
    title: str = Field(..., max_length=200)
    body: str = Field(..., max_length=1000)
    user_ids: Optional[List[str]] = None  # None = broadcast to all


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
