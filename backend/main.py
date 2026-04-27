from __future__ import annotations

import os
from collections.abc import Iterable

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from schemas import ConfigResponse, HealthResponse, OsrmRoute, RouteRequest, RouteResponse, Waypoint

APP_NAME = "Tour-Rail API"
DEFAULT_MAP_CENTER = Waypoint(lat=35.6812, lng=139.7671)
DEFAULT_MAP_ZOOM = 12
DEFAULT_ANIMATION_SECONDS = 8.0
CATEGORY_COLORS = {
    "male": "#2f7af8",
    "female": "#ff5c8a",
    "other": "#ffb703",
}
ROUTE_COLOR = "#26547c"
BOARD_COLOR = "#f4d35e"
OSRM_BASE_URL = os.getenv("OSRM_BASE_URL", "https://router.project-osrm.org").rstrip("/")
ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:5173,http://localhost:4173,http://127.0.0.1:5173,http://127.0.0.1:4173",
    ).split(",")
    if origin.strip()
]

app = FastAPI(title=APP_NAME)
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(ok=True, service=APP_NAME)


@app.get("/config", response_model=ConfigResponse)
async def config() -> ConfigResponse:
    return ConfigResponse(
        app_name="Tour-Rail",
        default_animation_seconds=DEFAULT_ANIMATION_SECONDS,
        category_colors=CATEGORY_COLORS,
        route_color=ROUTE_COLOR,
        board_color=BOARD_COLOR,
        map_center=DEFAULT_MAP_CENTER,
        map_zoom=DEFAULT_MAP_ZOOM,
    )


def dedupe_points(points: Iterable[Waypoint]) -> list[Waypoint]:
    normalized: list[Waypoint] = []
    for point in points:
        if not normalized or normalized[-1].lat != point.lat or normalized[-1].lng != point.lng:
            normalized.append(point)
    return normalized


async def fetch_osrm_segment(start: Waypoint, end: Waypoint) -> tuple[list[Waypoint], float, float]:
    url = (
        f"{OSRM_BASE_URL}/route/v1/driving/"
        f"{start.lng},{start.lat};{end.lng},{end.lat}"
        "?overview=full&geometries=geojson"
    )

    async with httpx.AsyncClient(timeout=15.0) as client:
        response = await client.get(url)

    if response.status_code != 200:
        raise HTTPException(status_code=502, detail="Routing provider returned an error")

    try:
        payload = OsrmRoute.model_validate(response.json())
    except Exception as exc:  # pragma: no cover - defensive mapping for upstream payloads
        raise HTTPException(status_code=502, detail="Routing provider returned invalid data") from exc

    route = payload.routes[0]
    geometry = route.get("geometry", {})
    coordinates = geometry.get("coordinates", [])
    if not coordinates:
        raise HTTPException(status_code=502, detail="Routing provider returned an empty route")

    path = [Waypoint(lat=coord[1], lng=coord[0]) for coord in coordinates]
    return path, float(route.get("distance", 0.0)), float(route.get("duration", 0.0))


@app.post("/route", response_model=RouteResponse)
async def build_route(payload: RouteRequest) -> RouteResponse:
    if len(payload.waypoints) == 1:
        point = payload.waypoints[0]
        return RouteResponse(
            waypoints=payload.waypoints,
            path=[point],
            distance_m=0.0,
            duration_s=0.0,
            segment_count=0,
        )

    full_path: list[Waypoint] = []
    total_distance = 0.0
    total_duration = 0.0

    for start, end in zip(payload.waypoints, payload.waypoints[1:]):
        segment_path, distance_m, duration_s = await fetch_osrm_segment(start, end)
        if full_path:
            full_path.extend(segment_path[1:])
        else:
            full_path.extend(segment_path)
        total_distance += distance_m
        total_duration += duration_s

    return RouteResponse(
        waypoints=payload.waypoints,
        path=dedupe_points(full_path),
        distance_m=round(total_distance, 1),
        duration_s=round(total_duration, 1),
        segment_count=max(len(payload.waypoints) - 1, 0),
    )
