
import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Waypoint } from '../types';

interface MapComponentProps {
  waypoints: Waypoint[];
  onAddWaypoint: (point: Waypoint) => void;
  isAnimating: boolean;
  animationDuration: number;
}

const MapComponent: React.FC<MapComponentProps> = ({ 
  waypoints, 
  onAddWaypoint, 
  isAnimating, 
  animationDuration 
}) => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const polylineRef = useRef<L.Polyline | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  
  // Use a ref for the callback to prevent stale closures in Leaflet's event system
  const onAddWaypointRef = useRef(onAddWaypoint);
  useEffect(() => {
    onAddWaypointRef.current = onAddWaypoint;
  }, [onAddWaypoint]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapRef.current = L.map(containerRef.current, {
      zoomControl: false,
    }).setView([35.6812, 139.7671], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(mapRef.current);

    L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current);

    // Attach click event using the ref to call the latest function version
    mapRef.current.on('click', (e: L.LeafletMouseEvent) => {
      onAddWaypointRef.current({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;

    if (polylineRef.current) {
      mapRef.current.removeLayer(polylineRef.current);
    }

    markersRef.current.forEach(m => mapRef.current?.removeLayer(m));
    markersRef.current = [];

    if (waypoints.length > 0) {
      const latlngs = waypoints.map(p => [p.lat, p.lng] as [number, number]);
      
      const polyline = L.polyline(latlngs, {
        color: '#6366f1',
        weight: 6,
        opacity: 0.8,
        lineJoin: 'round',
        lineCap: 'round',
        className: isAnimating ? 'animated-polyline' : ''
      }).addTo(mapRef.current);

      polylineRef.current = polyline;

      const startIcon = L.divIcon({
        className: 'bg-green-500 w-3 h-3 rounded-full border-2 border-white shadow-sm',
        iconSize: [12, 12]
      });
      const startMarker = L.marker(latlngs[0], { icon: startIcon }).addTo(mapRef.current);
      markersRef.current.push(startMarker);

      if (waypoints.length > 1) {
        const endIcon = L.divIcon({
          className: 'bg-indigo-600 w-4 h-4 rounded-full border-2 border-white shadow-lg',
          iconSize: [16, 16]
        });
        const endMarker = L.marker(latlngs[latlngs.length - 1], { icon: endIcon }).addTo(mapRef.current);
        markersRef.current.push(endMarker);
      }

      // Smoothly pan or fit bounds
      if (waypoints.length === 1 && !isAnimating) {
        mapRef.current.panTo(latlngs[0]);
      } else if (waypoints.length >= 2 && !isAnimating) {
        mapRef.current.fitBounds(polyline.getBounds(), { padding: [50, 50] });
      }
    }
  }, [waypoints, isAnimating]);

  useEffect(() => {
    const styleId = 'map-animation-styles';
    let style = document.getElementById(styleId);
    if (!style) {
      style = document.createElement('style');
      style.id = styleId;
      document.head.appendChild(style);
    }

    if (isAnimating && polylineRef.current) {
      const path = polylineRef.current.getElement();
      if (path) {
        const length = (path as SVGPathElement).getTotalLength();
        style.innerHTML = `
          .animated-polyline {
            stroke-dasharray: ${length};
            stroke-dashoffset: ${length};
            animation: dash ${animationDuration}s linear forwards;
          }
          @keyframes dash {
            to {
              stroke-dashoffset: 0;
            }
          }
        `;
      }
    } else {
      style.innerHTML = '';
    }
  }, [isAnimating, animationDuration]);

  return <div ref={containerRef} className="h-full w-full relative" />;
};

export default MapComponent;
