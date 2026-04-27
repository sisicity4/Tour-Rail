import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import type { CategoryColorMap, TravelerCounts, Waypoint } from "../types";

interface MapBoardProps {
  routePath: Waypoint[];
  userWaypoints: Waypoint[];
  onAddWaypoint: (point: Waypoint) => void;
  animationProgress: number;
  isAnimating: boolean;
  mapCenter: Waypoint;
  mapZoom: number;
  routeColor: string;
  categoryColors: CategoryColorMap;
  travelerCounts: TravelerCounts;
}

function buildVehicleMarkup(colors: CategoryColorMap, travelers: TravelerCounts): string {
  const groups = [
    { key: "male", label: "M", count: travelers.male, color: colors.male },
    { key: "female", label: "F", count: travelers.female, color: colors.female },
    { key: "other", label: "O", count: travelers.other, color: colors.other },
  ];

  const chips = groups
    .map(
      (group) =>
        `<span class="vehicle-chip" style="background:${group.color}">${group.label}:${group.count}</span>`,
    )
    .join("");

  return `
    <div class="vehicle-token">
      <div class="vehicle-token__car">🚗</div>
      <div class="vehicle-token__chips">${chips}</div>
    </div>
  `;
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
  categoryColors,
  travelerCounts,
}: MapBoardProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const glowLayerRef = useRef<L.Polyline | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const vehicleMarkerRef = useRef<L.Marker | null>(null);
  const onAddWaypointRef = useRef(onAddWaypoint);

  onAddWaypointRef.current = onAddWaypoint;

  const animatedPoint = useMemo(() => {
    if (routePath.length === 0) {
      return null;
    }

    if (routePath.length === 1) {
      return routePath[0];
    }

    const rawIndex = Math.round(animationProgress * (routePath.length - 1));
    return routePath[Math.min(routePath.length - 1, Math.max(0, rawIndex))];
  }, [animationProgress, routePath]);

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
      html: buildVehicleMarkup(categoryColors, travelerCounts),
      iconAnchor: [45, 42],
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

    if (isAnimating) {
      map.panTo([animatedPoint.lat, animatedPoint.lng], {
        animate: true,
        duration: 0.25,
      });
    }
  }, [animatedPoint, categoryColors, isAnimating, travelerCounts]);

  return (
    <div className="map-board">
      <div ref={mapContainerRef} className="map-board__canvas" />
      <div className="map-board__hint">地図をクリックして旅の停車駅を追加</div>
    </div>
  );
}
