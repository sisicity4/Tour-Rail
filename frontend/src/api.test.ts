import { afterEach, describe, expect, it, vi } from "vitest";
import { API_BASE_URL, fetchConfig, fetchRoute } from "./api";
import type { AppConfig, RoutePath, Waypoint } from "./types";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("API_BASE_URL", () => {
  it("テスト環境では既定のローカルバックエンドを指す", () => {
    // VITE_API_BASE_URL 未設定時は localhost:8000 にフォールバックする
    expect(API_BASE_URL).toBe("http://localhost:8000");
  });
});

describe("fetchConfig", () => {
  it("/config を取得して JSON を返す", async () => {
    const config: AppConfig = {
      app_name: "Tour-Rail",
      default_animation_seconds: 6,
      route_color: "#ff0000",
      board_color: "#00ff00",
      map_center: { lat: 35.68, lng: 139.76 },
      map_zoom: 12,
    };
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify(config), { status: 200 }));

    await expect(fetchConfig()).resolves.toEqual(config);
    expect(fetchMock).toHaveBeenCalledWith(`${API_BASE_URL}/config`);
  });
});

describe("fetchRoute", () => {
  const waypoints: Waypoint[] = [
    { lat: 35.6812, lng: 139.7671 },
    { lat: 35.6895, lng: 139.6917 },
  ];

  it("/route へ waypoints を POST し、整形済みルートを返す", async () => {
    const route: RoutePath = {
      waypoints,
      path: waypoints,
      distance_m: 1234,
      duration_s: 567,
      segment_count: 1,
    };
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(JSON.stringify(route), { status: 200 }));

    await expect(fetchRoute(waypoints)).resolves.toEqual(route);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${API_BASE_URL}/route`);
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({ waypoints });
  });

  it("バックエンドが異常系を返したら例外を投げる", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("bad request", { status: 422 }),
    );

    await expect(fetchRoute(waypoints)).rejects.toThrow("status 422");
  });
});
