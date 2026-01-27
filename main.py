from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

import db
from logic import REASONS, select_fix
from schemas import (
    CheckinCreate,
    CheckinResponse,
    FixNextResponse,
    FixRecordResponse,
    FixResponse,
    StatsSummaryResponse,
    StatsTodayResponse,
)

app = FastAPI(title="null-health-demo")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    db.init_db()


@app.get("/health")
def health() -> dict:
    return {"ok": True}


def _today_str() -> str:
    return date.today().isoformat()


def _now_iso() -> str:
    return datetime.utcnow().isoformat()


def _validate_checkin(payload: CheckinCreate) -> Optional[str]:
    if payload.did_move:
        return None
    if not payload.reason:
        raise HTTPException(status_code=400, detail="reason is required when did_move is false")
    if payload.reason not in REASONS:
        raise HTTPException(status_code=400, detail=f"reason must be one of {REASONS}")
    return payload.reason


@app.post("/checkins", response_model=CheckinResponse)
def create_checkin(payload: CheckinCreate) -> dict:
    reason = _validate_checkin(payload)
    record = db.insert_checkin(
        user_id=payload.user_id,
        date=_today_str(),
        did_move=1 if payload.did_move else 0,
        reason=reason,
        hour_bucket=payload.hour_bucket,
        created_at=_now_iso(),
    )
    return record


def _streak_null(checkins: list[dict]) -> int:
    streak = 0
    for item in checkins:
        if item["did_move"] == 0:
            streak += 1
        else:
            break
    return streak


@app.get("/fix/next", response_model=FixNextResponse)
def next_fix(user_id: str = Query(..., min_length=1)) -> dict:
    latest = db.get_latest_checkin(user_id)
    if not latest:
        return {"has_fix": False}
    if latest["did_move"] == 1:
        return {"has_fix": False}
    reason = latest.get("reason")
    if reason not in REASONS:
        raise HTTPException(status_code=400, detail="latest checkin has invalid reason")
    recent = db.get_recent_checkins(user_id, limit=3)
    streak = _streak_null(recent)
    fix = select_fix(reason, streak)
    fix_record = db.insert_fix(
        user_id=user_id,
        checkin_id=latest["id"],
        fix_id=str(fix["fix_id"]),
        fix_title=str(fix["title"]),
        level=int(fix["level"]),
        did_fix=0,
        created_at=_now_iso(),
    )
    return {
        "has_fix": True,
        "checkin_id": latest["id"],
        "reason": reason,
        "streak_null": streak,
        "fix": {"fix_id": fix_record["fix_id"], "title": fix_record["fix_title"], "level": fix_record["level"]},
    }


@app.post("/fixes/{fix_record_id}/done", response_model=FixRecordResponse)
def mark_fix_done(fix_record_id: int) -> dict:
    record = db.mark_fix_done(fix_record_id)
    if not record:
        raise HTTPException(status_code=404, detail="fix record not found")
    return record


@app.get("/stats/today", response_model=StatsTodayResponse)
def stats_today(user_id: str = Query(..., min_length=1)) -> dict:
    today = _today_str()
    stats = db.count_today_stats(user_id, today)
    return {"date": today, **stats}


@app.get("/stats/summary", response_model=StatsSummaryResponse)
def stats_summary(
    user_id: str = Query(..., min_length=1),
    days: int = Query(7, ge=7, le=14),
) -> dict:
    since = date.today() - timedelta(days=days - 1)
    summary = db.summary_stats(user_id, since.isoformat())
    return {"since_date": since.isoformat(), **summary}
