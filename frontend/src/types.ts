export interface Waypoint {
  lat: number;
  lng: number;
}

export interface RoutePath {
  waypoints: Waypoint[];
  path: Waypoint[];
  distance_m: number;
  duration_s: number;
  segment_count: number;
}

export interface AppConfig {
  app_name: string;
  default_animation_seconds: number;
  route_color: string;
  board_color: string;
  map_center: Waypoint;
  map_zoom: number;
}

export interface VehicleAnimationState {
  isAnimating: boolean;
  progress: number;
  duration: number;
}

export type VehicleType = "car" | "walk" | "bike";
