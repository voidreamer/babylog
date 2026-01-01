from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List, Literal


# ============================================================================
# Baby Schemas
# ============================================================================

class BabyBase(BaseModel):
    name: str
    birth_date: Optional[datetime] = None


class BabyCreate(BabyBase):
    pass


class BabyUpdate(BaseModel):
    name: Optional[str] = None
    birth_date: Optional[datetime] = None


class BabyResponse(BabyBase):
    id: int
    user_id: str
    owner_email: Optional[str] = None
    shared_with_emails: List[str] = []
    is_owner: bool = True
    created_at: datetime

    class Config:
        from_attributes = True


class BabyShareRequest(BaseModel):
    email: str


# ============================================================================
# Feeding Schemas
# ============================================================================

FeedingTypeEnum = Literal["formula", "breast", "bottle", "solid"]

class FeedingBase(BaseModel):
    time: datetime
    type: FeedingTypeEnum
    duration_minutes: Optional[int] = None
    amount_ml: Optional[int] = None
    notes: Optional[str] = None


class FeedingCreate(FeedingBase):
    baby_id: int


class FeedingUpdate(BaseModel):
    time: Optional[datetime] = None
    type: Optional[FeedingTypeEnum] = None
    duration_minutes: Optional[int] = None
    amount_ml: Optional[int] = None
    notes: Optional[str] = None


class FeedingResponse(FeedingBase):
    id: int
    baby_id: int
    created_at: datetime

    class Config:
        from_attributes = True


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
    notes: Optional[str] = None


class DiaperCreate(DiaperBase):
    baby_id: int


class DiaperUpdate(BaseModel):
    time: Optional[datetime] = None
    type: Optional[DiaperTypeEnum] = None
    poo_color: Optional[PooColorEnum] = None
    poo_consistency: Optional[PooConsistencyEnum] = None
    poo_amount: Optional[PooAmountEnum] = None
    notes: Optional[str] = None


class DiaperResponse(DiaperBase):
    id: int
    baby_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# Sleep Schemas
# ============================================================================

class SleepBase(BaseModel):
    start_time: datetime
    end_time: Optional[datetime] = None
    notes: Optional[str] = None


class SleepCreate(SleepBase):
    baby_id: int


class SleepUpdate(BaseModel):
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    notes: Optional[str] = None


class SleepResponse(SleepBase):
    id: int
    baby_id: int
    duration_minutes: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# Pumping Schemas
# ============================================================================

class PumpingBase(BaseModel):
    time: datetime
    duration_minutes: Optional[int] = None
    amount_ml: Optional[int] = None
    notes: Optional[str] = None


class PumpingCreate(PumpingBase):
    baby_id: int


class PumpingUpdate(BaseModel):
    time: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    amount_ml: Optional[int] = None
    notes: Optional[str] = None


class PumpingResponse(PumpingBase):
    id: int
    baby_id: int
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# Timeline / Event Schemas
# ============================================================================

class TimelineEvent(BaseModel):
    id: int
    event_type: str  # "feeding", "diaper", "sleep", "pumping"
    time: datetime
    details: dict

    class Config:
        from_attributes = True


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


class DashboardStats(BaseModel):
    last_feeding: Optional[FeedingResponse] = None
    last_diaper: Optional[DiaperResponse] = None
    last_sleep: Optional[SleepResponse] = None
    last_pumping: Optional[PumpingResponse] = None
    current_sleep: Optional[SleepResponse] = None
    daily_summary: Optional[DailySummary] = None
