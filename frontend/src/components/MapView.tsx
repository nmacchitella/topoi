'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Place } from '@/types';

// Fix for default marker icons in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface MapViewProps {
  places: Place[];
  selectedPlaceId: string | null;
  onPlaceSelect?: (place: Place) => void;
}

export default function MapView({ places, selectedPlaceId, onPlaceSelect }: MapViewProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const onPlaceSelectRef = useRef(onPlaceSelect);

  // Keep ref updated
  onPlaceSelectRef.current = onPlaceSelect;

  // Initialize map
  useEffect(() => {
    if (mapRef.current) return;

    const map = L.map('map-view', {
      center: [40.7580, -73.9855], // Manhattan - fallback
      zoom: 14,
    });

    // Use CartoDB Positron - clean, minimal map
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update markers when places change
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current.clear();

    if (places.length === 0) return;

    // Add markers for each place
    places.forEach((place) => {
      const isSelected = selectedPlaceId === place.id;
      const color = isSelected ? '#F59E0B' : '#3B82F6'; // Amber for selected, blue for normal

      // Create custom colored icon
      const icon = L.divIcon({
        className: 'custom-marker',
        html: `
          <div style="
            background-color: ${color};
            width: ${isSelected ? '30px' : '25px'};
            height: ${isSelected ? '30px' : '25px'};
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 2px solid white;
            box-shadow: 0 ${isSelected ? '3px 8px' : '2px 5px'} rgba(0,0,0,0.3);
            transition: all 0.2s ease;
          "></div>
        `,
        iconSize: [isSelected ? 30 : 25, isSelected ? 30 : 25],
        iconAnchor: [isSelected ? 15 : 12, isSelected ? 30 : 24],
      });

      const tagsHtml = place.tags?.slice(0, 3).map(t => `<span style="background: #374151; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem;">#${t.name}</span>`).join(' ') || '';

      const marker = L.marker([place.latitude, place.longitude], { icon })
        .bindTooltip(`
          <div style="color: #F9FAFB; padding: 4px;">
            <strong>${place.name}</strong>
            ${tagsHtml ? `<div style="margin-top: 4px;">${tagsHtml}</div>` : ''}
          </div>
        `, { direction: 'top', offset: [0, -20], className: 'dark-tooltip' });

      marker.on('click', () => {
        onPlaceSelectRef.current?.(place);
      });

      marker.addTo(mapRef.current!);
      markersRef.current.set(place.id, marker);
    });

    // Fit bounds to show all places
    const bounds = L.latLngBounds(places.map(p => [p.latitude, p.longitude]));
    mapRef.current.fitBounds(bounds, { padding: [50, 50] });
  }, [places]);

  // Update marker appearance when selection changes
  useEffect(() => {
    if (!mapRef.current) return;

    markersRef.current.forEach((marker, placeId) => {
      const place = places.find(p => p.id === placeId);
      if (!place) return;

      const isSelected = selectedPlaceId === placeId;
      const color = isSelected ? '#F59E0B' : '#3B82F6';

      // Update marker icon
      const icon = L.divIcon({
        className: 'custom-marker',
        html: `
          <div style="
            background-color: ${color};
            width: ${isSelected ? '30px' : '25px'};
            height: ${isSelected ? '30px' : '25px'};
            border-radius: 50% 50% 50% 0;
            transform: rotate(-45deg);
            border: 2px solid white;
            box-shadow: 0 ${isSelected ? '3px 8px' : '2px 5px'} rgba(0,0,0,0.3);
            transition: all 0.2s ease;
          "></div>
        `,
        iconSize: [isSelected ? 30 : 25, isSelected ? 30 : 25],
        iconAnchor: [isSelected ? 15 : 12, isSelected ? 30 : 24],
      });

      marker.setIcon(icon);
    });
  }, [selectedPlaceId, places]);

  return <div id="map-view" className="w-full h-full" />;
}
