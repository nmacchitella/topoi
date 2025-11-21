'use client';

import { useEffect, useRef } from 'react';
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
}

export default function Map({ onMapClick, onPlaceClick }: MapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const { getFilteredPlaces } = useStore();

  useEffect(() => {
    // Initialize map
    if (!mapRef.current) {
      const map = L.map('map', {
        center: [40.7128, -74.0060], // New York as default
        zoom: 13,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      // Handle map clicks
      if (onMapClick) {
        map.on('click', (e) => {
          onMapClick(e.latlng.lat, e.latlng.lng);
        });
      }

      mapRef.current = map;
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [onMapClick]);

  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    const places = getFilteredPlaces();

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

      const marker = L.marker([place.latitude, place.longitude], { icon })
        .bindPopup(`
          <div style="color: #F9FAFB;">
            <h3 style="font-weight: bold; margin-bottom: 4px;">${place.name}</h3>
            <p style="font-size: 0.875rem; color: #D1D5DB;">${place.category}</p>
            <p style="font-size: 0.875rem; margin-top: 4px;">${place.address}</p>
          </div>
        `);

      marker.on('click', () => {
        if (onPlaceClick) {
          onPlaceClick(place);
        }
      });

      marker.addTo(mapRef.current!);
      markersRef.current.push(marker);
    });

    // Fit bounds if there are places
    if (places.length > 0) {
      const bounds = L.latLngBounds(places.map(p => [p.latitude, p.longitude]));
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [getFilteredPlaces, onPlaceClick]);

  return <div id="map" className="w-full h-full" />;
}
