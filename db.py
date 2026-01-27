from __future__ import annotations

import sqlite3
from pathlib import Path
from typing import Optional

DB_PATH = Path(__file__).with_name("null_health_demo.db")


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with _connect() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS checkins (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                date TEXT NOT NULL,
                did_move INTEGER NOT NULL,
                reason TEXT,
                hour_bucket TEXT,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.execute("CREATE INDEX IF NOT EXISTS idx_checkins_user ON checkins(user_id)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_checkins_date ON checkins(date)")
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS fixes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                checkin_id INTEGER NOT NULL,
                fix_id TEXT NOT NULL,
                fix_title TEXT NOT NULL,
                level INTEGER NOT NULL,
                did_fix INTEGER NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.execute("CREATE INDEX IF NOT EXISTS idx_fixes_user ON fixes(user_id)")


def insert_checkin(
    *,
    user_id: str,
    date: str,
    did_move: int,
    reason: Optional[str],
    hour_bucket: Optional[str],
    created_at: str,
) -> dict:
    with _connect() as conn:
        cursor = conn.execute(
            """
            INSERT INTO checkins (user_id, date, did_move, reason, hour_bucket, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (user_id, date, did_move, reason, hour_bucket, created_at),
        )
        conn.commit()
        checkin_id = cursor.lastrowid
        row = conn.execute("SELECT * FROM checkins WHERE id = ?", (checkin_id,)).fetchone()
    return dict(row)


def get_latest_checkin(user_id: str) -> Optional[dict]:
    with _connect() as conn:
        row = conn.execute(
            "SELECT * FROM checkins WHERE user_id = ? ORDER BY id DESC LIMIT 1",
            (user_id,),
        ).fetchone()
    return dict(row) if row else None


def get_recent_checkins(user_id: str, limit: int = 3) -> list[dict]:
    with _connect() as conn:
        rows = conn.execute(
            "SELECT * FROM checkins WHERE user_id = ? ORDER BY id DESC LIMIT ?",
            (user_id, limit),
        ).fetchall()
    return [dict(row) for row in rows]


def insert_fix(
    *,
    user_id: str,
    checkin_id: int,
    fix_id: str,
    fix_title: str,
    level: int,
    did_fix: int,
    created_at: str,
) -> dict:
    with _connect() as conn:
        cursor = conn.execute(
            """
            INSERT INTO fixes (user_id, checkin_id, fix_id, fix_title, level, did_fix, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (user_id, checkin_id, fix_id, fix_title, level, did_fix, created_at),
        )
        conn.commit()
        fix_record_id = cursor.lastrowid
        row = conn.execute("SELECT * FROM fixes WHERE id = ?", (fix_record_id,)).fetchone()
    return dict(row)


def mark_fix_done(fix_record_id: int) -> Optional[dict]:
    with _connect() as conn:
        cursor = conn.execute(
            "UPDATE fixes SET did_fix = 1 WHERE id = ?",
            (fix_record_id,),
        )
        if cursor.rowcount == 0:
            return None
        conn.commit()
        row = conn.execute("SELECT * FROM fixes WHERE id = ?", (fix_record_id,)).fetchone()
    return dict(row) if row else None


def count_today_stats(user_id: str, date: str) -> dict:
    with _connect() as conn:
        moved = conn.execute(
            """
            SELECT COUNT(*) AS count FROM checkins
            WHERE user_id = ? AND date = ? AND did_move = 1
            """,
            (user_id, date),
        ).fetchone()["count"]
        nulls = conn.execute(
            """
            SELECT COUNT(*) AS count FROM checkins
            WHERE user_id = ? AND date = ? AND did_move = 0
            """,
            (user_id, date),
        ).fetchone()["count"]
        filled = conn.execute(
            """
            SELECT COUNT(*) AS count FROM fixes
            WHERE user_id = ? AND did_fix = 1 AND created_at LIKE ?
            """,
            (user_id, f"{date}%"),
        ).fetchone()["count"]
    return {"moved": moved, "nulls": nulls, "filled": filled}


def summary_stats(user_id: str, since_date: str) -> dict:
    with _connect() as conn:
        reason_rows = conn.execute(
            """
            SELECT reason, COUNT(*) AS count
            FROM checkins
            WHERE user_id = ? AND did_move = 0 AND date >= ? AND reason IS NOT NULL
            GROUP BY reason
            ORDER BY count DESC
            """,
            (user_id, since_date),
        ).fetchall()
        bucket_rows = conn.execute(
            """
            SELECT hour_bucket, COUNT(*) AS count
            FROM checkins
            WHERE user_id = ? AND did_move = 0 AND date >= ? AND hour_bucket IS NOT NULL
            GROUP BY hour_bucket
            ORDER BY count DESC
            """,
            (user_id, since_date),
        ).fetchall()

    return {
        "reasons": [{"reason": row["reason"], "count": row["count"]} for row in reason_rows],
        "hour_buckets": [
            {"hour_bucket": row["hour_bucket"], "count": row["count"]}
            for row in bucket_rows
        ],
    }
