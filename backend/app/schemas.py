from pydantic import BaseModel
from datetime import datetime
from typing import Optional
from .models import FeedingType, DiaperType


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
    created_at: datetime

    class Config:
        from_attributes = True


# ============================================================================
# Feeding Schemas
# ============================================================================

class FeedingBase(BaseModel):
    time: datetime
    type: FeedingType
    duration_minutes: Optional[int] = None
    amount_ml: Optional[int] = None
    notes: Optional[str] = None


class FeedingCreate(FeedingBase):
    baby_id: int


class FeedingUpdate(BaseModel):
    time: Optional[datetime] = None
    type: Optional[FeedingType] = None
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
# Diaper Schemas
# ============================================================================

class DiaperBase(BaseModel):
    time: datetime
    type: DiaperType
    notes: Optional[str] = None


class DiaperCreate(DiaperBase):
    baby_id: int


class DiaperUpdate(BaseModel):
    time: Optional[datetime] = None
    type: Optional[DiaperType] = None
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
# Timeline / Event Schemas
# ============================================================================

class TimelineEvent(BaseModel):
    id: int
    event_type: str  # "feeding", "diaper", "sleep"
    time: datetime
    details: dict

    class Config:
        from_attributes = True


class DashboardStats(BaseModel):
    last_feeding: Optional[FeedingResponse] = None
    last_diaper: Optional[DiaperResponse] = None
    last_sleep: Optional[SleepResponse] = None
    current_sleep: Optional[SleepResponse] = None  # If baby is currently sleeping
