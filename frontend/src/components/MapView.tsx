'use client';

import { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Place, MapBounds } from '@/types';

// Fix for default marker icons in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Debounce utility
function debounce<T extends (...args: any[]) => void>(fn: T, delay: number): T {
  let timeoutId: NodeJS.Timeout | null = null;
  return ((...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  }) as T;
}

interface MapViewProps {
  places: Place[];
  selectedPlaceId: string | null;
  onPlaceSelect?: (place: Place) => void;
  onBoundsChange?: (bounds: MapBounds) => void; // For viewport-based loading
  isLoading?: boolean; // Show loading indicator
}

export default function MapView({ places, selectedPlaceId, onPlaceSelect, onBoundsChange, isLoading }: MapViewProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const onPlaceSelectRef = useRef(onPlaceSelect);
  const onBoundsChangeRef = useRef(onBoundsChange);
  const lastBoundsRef = useRef<string>('');
  const initialFitDoneRef = useRef(false);

  // Keep refs updated
  onPlaceSelectRef.current = onPlaceSelect;
  onBoundsChangeRef.current = onBoundsChange;

  // Get map bounds helper
  const getMapBounds = useCallback((): MapBounds | null => {
    if (!mapRef.current) return null;
    const bounds = mapRef.current.getBounds();
    return {
      minLat: bounds.getSouth(),
      maxLat: bounds.getNorth(),
      minLng: bounds.getWest(),
      maxLng: bounds.getEast()
    };
  }, []);

  // Notify parent of bounds change (debounced)
  const notifyBoundsChange = useCallback(() => {
    if (!onBoundsChangeRef.current) return;

    const bounds = getMapBounds();
    if (!bounds) return;

    // Check if bounds changed significantly
    const boundsKey = `${bounds.minLat.toFixed(4)},${bounds.maxLat.toFixed(4)},${bounds.minLng.toFixed(4)},${bounds.maxLng.toFixed(4)}`;
    if (boundsKey === lastBoundsRef.current) return;
    lastBoundsRef.current = boundsKey;

    onBoundsChangeRef.current(bounds);
  }, [getMapBounds]);

  const debouncedNotifyBounds = useCallback(
    debounce(notifyBoundsChange, 300),
    [notifyBoundsChange]
  );

  // Initialize map
  useEffect(() => {
    if (mapRef.current) return;

    const isMobile = window.innerWidth < 640;
    const map = L.map('map-view', {
      center: [40.7580, -73.9855], // Manhattan - fallback
      zoom: 14,
      zoomControl: !isMobile,
    });

    // Use CartoDB Positron - clean, minimal map
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(map);

    mapRef.current = map;

    // Listen for bounds changes
    map.on('moveend', () => {
      debouncedNotifyBounds();
    });

    map.on('zoomend', () => {
      debouncedNotifyBounds();
    });

    // Trigger initial bounds notification after map is ready
    setTimeout(() => {
      notifyBoundsChange();
    }, 100);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [debouncedNotifyBounds, notifyBoundsChange]);

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

    // Fit bounds to show all places only on initial load
    // Skip if onBoundsChange is provided (viewport-based loading) and we've already fit once
    if (!initialFitDoneRef.current) {
      const bounds = L.latLngBounds(places.map(p => [p.latitude, p.longitude]));
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
      initialFitDoneRef.current = true;
    }
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

  return (
    <div className="relative w-full h-full">
      <div id="map-view" className="w-full h-full" />
      {isLoading && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-[1000] bg-dark-card/90 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-lg flex items-center gap-2">
          <div className="w-3 h-3 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-dark-text-secondary">Loading...</span>
        </div>
      )}
    </div>
  );
}
