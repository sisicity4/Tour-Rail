import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import type { VehicleType, Waypoint } from "../types";

interface MapBoardProps {
  routePath: Waypoint[];
  userWaypoints: Waypoint[];
  onAddWaypoint: (point: Waypoint) => void;
  animationProgress: number;
  isAnimating: boolean;
  mapCenter: Waypoint;
  mapZoom: number;
  routeColor: string;
  travelerCount: number;
  vehicleType: VehicleType;
  canAddWaypoint: boolean;
  hintText: string;
}

const vehicleIcons: Record<VehicleType, string> = {
  car: "🚗",
  walk: "🚶",
  bike: "🚲",
};

function buildVehicleMarkup(
  travelerCount: number,
  vehicleType: VehicleType,
  isRolling: boolean,
): string {
  return `
    <div class="vehicle-token vehicle-token--${vehicleType} ${isRolling ? "vehicle-token--rolling" : ""}">
      <div class="vehicle-token__car">${vehicleIcons[vehicleType]}</div>
      <div class="vehicle-token__count">${travelerCount}人</div>
    </div>
  `;
}

function getSegmentDistance(start: Waypoint, end: Waypoint): number {
  const latDistance = end.lat - start.lat;
  const lngDistance = end.lng - start.lng;
  return Math.sqrt(latDistance * latDistance + lngDistance * lngDistance);
}

function getPointAlongPath(path: Waypoint[], progress: number): Waypoint | null {
  if (path.length === 0) {
    return null;
  }

  if (path.length === 1) {
    return path[0];
  }

  const clampedProgress = Math.min(1, Math.max(0, progress));
  const segmentLengths = path.slice(1).map((point, index) => getSegmentDistance(path[index], point));
  const totalLength = segmentLengths.reduce((sum, length) => sum + length, 0);

  if (totalLength === 0) {
    return path[0];
  }

  let remainingDistance = totalLength * clampedProgress;

  for (let index = 0; index < segmentLengths.length; index += 1) {
    const segmentLength = segmentLengths[index];

    if (remainingDistance <= segmentLength || index === segmentLengths.length - 1) {
      const start = path[index];
      const end = path[index + 1];
      const segmentProgress = segmentLength === 0 ? 0 : remainingDistance / segmentLength;

      return {
        lat: start.lat + (end.lat - start.lat) * segmentProgress,
        lng: start.lng + (end.lng - start.lng) * segmentProgress,
      };
    }

    remainingDistance -= segmentLength;
  }

  return path[path.length - 1];
}

function buildStopIcon(label: string, isFinal = false): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<div class="stop-badge ${isFinal ? "stop-badge--final" : ""}">${label}</div>`,
    iconAnchor: [18, 18],
  });
}

export default function MapBoard({
  routePath,
  userWaypoints,
  onAddWaypoint,
  animationProgress,
  isAnimating,
  mapCenter,
  mapZoom,
  routeColor,
  travelerCount,
  vehicleType,
  canAddWaypoint,
  hintText,
}: MapBoardProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const glowLayerRef = useRef<L.Polyline | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const vehicleMarkerRef = useRef<L.Marker | null>(null);
  const onAddWaypointRef = useRef(onAddWaypoint);
  const canAddWaypointRef = useRef(canAddWaypoint);

  onAddWaypointRef.current = onAddWaypoint;
  canAddWaypointRef.current = canAddWaypoint;

  const animatedPoint = useMemo(
    () => getPointAlongPath(routePath, animationProgress),
    [animationProgress, routePath],
  );

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return;
    }

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([mapCenter.lat, mapCenter.lng], mapZoom);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);

    map.on("click", (event: L.LeafletMouseEvent) => {
      if (!canAddWaypointRef.current) {
        return;
      }
      onAddWaypointRef.current({ lat: event.latlng.lat, lng: event.latlng.lng });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [mapCenter.lat, mapCenter.lng, mapZoom]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) {
      return;
    }

    routeLayerRef.current?.remove();
    glowLayerRef.current?.remove();
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    if (routePath.length > 0) {
      const latLngs = routePath.map((point) => [point.lat, point.lng] as [number, number]);
      glowLayerRef.current = L.polyline(latLngs, {
        color: "#fff7d6",
        weight: 16,
        opacity: 0.85,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);

      routeLayerRef.current = L.polyline(latLngs, {
        color: routeColor,
        weight: 8,
        opacity: 1,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);
    }

    userWaypoints.forEach((point, index) => {
      const marker = L.marker([point.lat, point.lng], {
        icon: buildStopIcon(String(index + 1), index === userWaypoints.length - 1 && userWaypoints.length > 1),
      }).addTo(map);
      markersRef.current.push(marker);
    });

    if (userWaypoints.length === 1) {
      map.setView([userWaypoints[0].lat, userWaypoints[0].lng], Math.max(mapZoom, 13), {
        animate: true,
      });
    } else if (routePath.length > 1 && routeLayerRef.current) {
      map.fitBounds(routeLayerRef.current.getBounds(), {
        padding: [60, 60],
        animate: true,
      });
    }
  }, [mapZoom, routeColor, routePath, userWaypoints]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !animatedPoint) {
      vehicleMarkerRef.current?.remove();
      vehicleMarkerRef.current = null;
      return;
    }

    const icon = L.divIcon({
      className: "",
      html: buildVehicleMarkup(travelerCount, vehicleType, isAnimating),
      iconAnchor: [48, 54],
    });

    if (!vehicleMarkerRef.current) {
      vehicleMarkerRef.current = L.marker([animatedPoint.lat, animatedPoint.lng], {
        icon,
        zIndexOffset: 1000,
      }).addTo(map);
    } else {
      vehicleMarkerRef.current.setIcon(icon);
      vehicleMarkerRef.current.setLatLng([animatedPoint.lat, animatedPoint.lng]);
    }
  }, [animatedPoint, isAnimating, travelerCount, vehicleType]);

  return (
    <div className={`map-board ${canAddWaypoint ? "map-board--editable" : "map-board--preview"}`}>
      <div ref={mapContainerRef} className="map-board__canvas" />
      <div className="map-board__hint">{hintText}</div>
    </div>
  );
}
