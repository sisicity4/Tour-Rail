from __future__ import annotations

REASONS: list[str] = ["busy", "tired", "no_motivation", "public_eye", "forgot"]

FIX_MENU: dict[str, list[dict[str, object]]] = {
    "busy": [
        {"fix_id": "busy_detour", "title": "1分だけ遠回り", "level": 0},
        {"fix_id": "busy_stand", "title": "立ち上がる10秒", "level": 1},
        {"fix_id": "busy_breath", "title": "深呼吸3回", "level": 2},
    ],
    "tired": [
        {"fix_id": "tired_shoulder", "title": "肩回し20秒", "level": 0},
        {"fix_id": "tired_ankle", "title": "足首回し10秒", "level": 1},
        {"fix_id": "tired_breath", "title": "目を閉じて呼吸10秒", "level": 2},
    ],
    "no_motivation": [
        {"fix_id": "nomot_squat", "title": "スクワット3回", "level": 0},
        {"fix_id": "nomot_calf", "title": "かかと上げ5回", "level": 1},
        {"fix_id": "nomot_hand", "title": "指をグーパー10秒", "level": 2},
    ],
    "public_eye": [
        {"fix_id": "public_stairs", "title": "階段1フロア", "level": 0},
        {"fix_id": "public_toilet", "title": "トイレで肩回し10秒", "level": 1},
        {"fix_id": "public_posture", "title": "姿勢を正す10秒", "level": 2},
    ],
    "forgot": [
        {"fix_id": "forgot_home", "title": "帰宅後に1分ストレッチ", "level": 0},
        {"fix_id": "forgot_shrug", "title": "今その場で肩を上げ下げ5回", "level": 1},
        {"fix_id": "forgot_water", "title": "水を一口飲む", "level": 2},
    ],
}


def clamp_level(streak_null: int) -> int:
    if streak_null >= 3:
        return 2
    if streak_null == 2:
        return 1
    return 0


def select_fix(reason: str, streak_null: int) -> dict[str, object]:
    level = clamp_level(streak_null)
    options = FIX_MENU.get(reason, [])
    for item in options:
        if item["level"] == level:
            return item
    return options[-1]
