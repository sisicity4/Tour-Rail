from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class CheckinCreate(BaseModel):
    user_id: str = Field(..., min_length=1)
    did_move: bool
    reason: Optional[str] = None
    hour_bucket: Optional[str] = None


class CheckinResponse(BaseModel):
    id: int
    user_id: str
    date: str
    did_move: int
    reason: Optional[str]
    hour_bucket: Optional[str]
    created_at: str


class FixResponse(BaseModel):
    fix_id: str
    title: str
    level: int


class FixNextResponse(BaseModel):
    has_fix: bool
    checkin_id: Optional[int] = None
    reason: Optional[str] = None
    streak_null: Optional[int] = None
    fix: Optional[FixResponse] = None


class FixRecordResponse(BaseModel):
    id: int
    user_id: str
    checkin_id: int
    fix_id: str
    fix_title: str
    level: int
    did_fix: int
    created_at: str


class StatsTodayResponse(BaseModel):
    date: str
    moved: int
    nulls: int
    filled: int


class SummaryReason(BaseModel):
    reason: str
    count: int


class SummaryHourBucket(BaseModel):
    hour_bucket: str
    count: int


class StatsSummaryResponse(BaseModel):
    since_date: str
    reasons: list[SummaryReason]
    hour_buckets: list[SummaryHourBucket]
