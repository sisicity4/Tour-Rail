
export interface Waypoint {
  lat: number;
  lng: number;
}

export interface WalkMeta {
  title: string;
  description: string;
  vibe: string;
}

export interface AnimationConfig {
  duration: number; // in seconds
  isActive: boolean;
}
