'use client';

import { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useStore } from '@/store/useStore';
import { CATEGORY_COLORS } from '@/types';
import type { Place } from '@/types';

// Fix for default marker icons in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface MapProps {
  onMapClick?: (lat: number, lng: number) => void;
  onPlaceClick?: (place: Place) => void;
  places?: Place[]; // Optional - if provided, use these instead of store
  isPublic?: boolean; // For shared/public views
}

export default function Map({ onMapClick, onPlaceClick, places: propPlaces, isPublic }: MapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const initialFitDone = useRef(false);
  const onMapClickRef = useRef(onMapClick);
  const onPlaceClickRef = useRef(onPlaceClick);
  const { getFilteredPlaces } = useStore();

  // Keep refs updated
  onMapClickRef.current = onMapClick;
  onPlaceClickRef.current = onPlaceClick;

  useEffect(() => {
    // Initialize map only once
    if (mapRef.current) return;

    const map = L.map('map', {
      center: [40.7128, -74.0060], // New York as default
      zoom: 13,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    // Handle map clicks via ref
    map.on('click', (e) => {
      onMapClickRef.current?.(e.latlng.lat, e.latlng.lng);
    });

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    const places = propPlaces || getFilteredPlaces();

    // Add markers for filtered places
    places.forEach((place) => {
      const color = CATEGORY_COLORS[place.category as keyof typeof CATEGORY_COLORS] || CATEGORY_COLORS.other;

      // Create custom colored icon
      const icon = L.divIcon({
        className: 'custom-marker',
        html: `
          <div style="
            background-color: ${color};
            width: 25px;
            height: 25px;
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 2px solid white;
            box-shadow: 0 2px 5px rgba(0,0,0,0.3);
          "></div>
        `,
        iconSize: [25, 25],
        iconAnchor: [12, 24],
      });

      const tagsHtml = place.tags.slice(0, 3).map(t => `<span style="background: #374151; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem;">#${t.name}</span>`).join(' ');

      const marker = L.marker([place.latitude, place.longitude], { icon })
        .bindTooltip(`
          <div style="color: #F9FAFB; padding: 4px;">
            <strong>${place.name}</strong>
            ${tagsHtml ? `<div style="margin-top: 4px;">${tagsHtml}</div>` : ''}
          </div>
        `, { direction: 'top', offset: [0, -20], className: 'dark-tooltip' });

      marker.on('click', () => {
        onPlaceClickRef.current?.(place);
      });

      marker.addTo(mapRef.current!);
      markersRef.current.push(marker);
    });

    // Fit bounds only on initial load
    if (places.length > 0 && !initialFitDone.current) {
      const bounds = L.latLngBounds(places.map(p => [p.latitude, p.longitude]));
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
      initialFitDone.current = true;
    }
  }, [getFilteredPlaces, propPlaces]);

  return <div id="map" className="w-full h-full" />;
}
