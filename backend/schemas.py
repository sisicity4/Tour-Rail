from __future__ import annotations

from pydantic import BaseModel, Field, field_validator


class Waypoint(BaseModel):
    lat: float = Field(..., ge=-90, le=90)
    lng: float = Field(..., ge=-180, le=180)


class RouteRequest(BaseModel):
    waypoints: list[Waypoint] = Field(..., min_length=1, max_length=32)


class RouteResponse(BaseModel):
    waypoints: list[Waypoint]
    path: list[Waypoint]
    distance_m: float
    duration_s: float
    segment_count: int


class ConfigResponse(BaseModel):
    app_name: str
    default_animation_seconds: float
    route_color: str
    board_color: str
    map_center: Waypoint
    map_zoom: int


class HealthResponse(BaseModel):
    ok: bool
    service: str


class OsrmRoute(BaseModel):
    code: str
    routes: list[dict]

    @field_validator("routes")
    @classmethod
    def validate_routes(cls, value: list[dict]) -> list[dict]:
        if not value:
            raise ValueError("OSRM response did not contain any routes")
        return value
