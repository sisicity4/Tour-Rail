from __future__ import annotations

import unittest
from unittest.mock import AsyncMock, patch

from fastapi.testclient import TestClient

from main import app
from schemas import Waypoint


class TourRailApiTests(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(app)

    def test_health_returns_ok(self) -> None:
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["ok"], True)

    def test_config_returns_expected_categories(self) -> None:
        response = self.client.get("/config")
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertIn("male", body["category_colors"])
        self.assertIn("female", body["category_colors"])
        self.assertIn("other", body["category_colors"])

    def test_route_validates_missing_waypoints(self) -> None:
        response = self.client.post("/route", json={})
        self.assertEqual(response.status_code, 422)

    def test_route_returns_single_point_without_provider_call(self) -> None:
        response = self.client.post(
            "/route",
            json={"waypoints": [{"lat": 35.0, "lng": 139.0}]},
        )
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["segment_count"], 0)
        self.assertEqual(len(body["path"]), 1)

    def test_route_aggregates_provider_segments(self) -> None:
        with patch("main.fetch_osrm_segment", new=AsyncMock()) as mocked_fetch:
            mocked_fetch.side_effect = [
                (
                    [
                        Waypoint(lat=35.0, lng=139.0),
                        Waypoint(lat=35.1, lng=139.1),
                    ],
                    1000.0,
                    120.0,
                ),
                (
                    [
                        Waypoint(lat=35.1, lng=139.1),
                        Waypoint(lat=35.2, lng=139.2),
                    ],
                    2000.0,
                    240.0,
                ),
            ]

            response = self.client.post(
                "/route",
                json={
                    "waypoints": [
                        {"lat": 35.0, "lng": 139.0},
                        {"lat": 35.1, "lng": 139.1},
                        {"lat": 35.2, "lng": 139.2},
                    ]
                },
            )

        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertEqual(body["segment_count"], 2)
        self.assertEqual(body["distance_m"], 3000.0)
        self.assertEqual(body["duration_s"], 360.0)
        self.assertEqual(len(body["path"]), 3)

    def test_cors_allows_local_frontend_origin(self) -> None:
        response = self.client.options(
            "/route",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "POST",
            },
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.headers.get("access-control-allow-origin"),
            "http://localhost:5173",
        )

    def test_cors_allows_render_static_site_origin(self) -> None:
        response = self.client.options(
            "/route",
            headers={
                "Origin": "https://tour-rail-web.onrender.com",
                "Access-Control-Request-Method": "POST",
            },
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.headers.get("access-control-allow-origin"),
            "https://tour-rail-web.onrender.com",
        )


if __name__ == "__main__":
    unittest.main()
