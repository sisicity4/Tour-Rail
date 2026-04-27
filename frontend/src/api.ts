import type { AppConfig, RoutePath, Waypoint } from "./types";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") || "http://localhost:8000";

async function handleJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function fetchConfig(): Promise<AppConfig> {
  const response = await fetch(`${API_BASE_URL}/config`);
  return handleJsonResponse<AppConfig>(response);
}

export async function fetchRoute(waypoints: Waypoint[]): Promise<RoutePath> {
  const response = await fetch(`${API_BASE_URL}/route`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ waypoints }),
  });

  return handleJsonResponse<RoutePath>(response);
}

export { API_BASE_URL };
