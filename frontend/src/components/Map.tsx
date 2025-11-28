'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useStore } from '@/store/useStore';
import { DEFAULT_TAG_COLOR, getContrastColor } from '@/lib/tagColors';
import type { Place, Tag } from '@/types';

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

// Get the top tags by usage count for a place (max 3)
function getTopTags(tags: Tag[], allTags: Tag[], maxCount: number = 3): Tag[] {
  if (tags.length === 0) return [];

  // Create a map of tag id to usage count from allTags
  const usageMap: Record<string, number> = {};
  allTags.forEach(t => {
    if ('usage_count' in t) {
      usageMap[t.id] = (t as any).usage_count || 0;
    }
  });

  // Sort by usage count (descending), then by name (alphabetically)
  const sorted = [...tags].sort((a, b) => {
    const usageA = usageMap[a.id] || 0;
    const usageB = usageMap[b.id] || 0;
    if (usageB !== usageA) return usageB - usageA;
    return a.name.localeCompare(b.name);
  });

  return sorted.slice(0, maxCount);
}

// Generate pin HTML with up to 3 colors
function generatePinHtml(tags: Tag[], allTags: Tag[]): { html: string; icon: string } {
  const topTags = getTopTags(tags, allTags, 3);
  const colors = topTags.map(t => t.color || DEFAULT_TAG_COLOR);

  // Get icon from the tag with highest usage
  const topTag = topTags[0];
  const icon = topTag?.icon || '';
  const iconColor = topTag ? getContrastColor(topTag.color || DEFAULT_TAG_COLOR) : '#FFFFFF';

  // Default color if no tags
  if (colors.length === 0) {
    colors.push(DEFAULT_TAG_COLOR);
  }

  let pinHtml = '';

  if (colors.length === 1) {
    // Single color pin
    pinHtml = `
      <div style="
        position: relative;
        width: 28px;
        height: 28px;
      ">
        <div style="
          background-color: ${colors[0]};
          width: 28px;
          height: 28px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 2px solid white;
          box-shadow: 0 2px 5px rgba(0,0,0,0.3);
        "></div>
        ${icon ? `<div class="material-symbols-rounded" style="
          position: absolute;
          top: 2px;
          left: 0;
          right: 0;
          text-align: center;
          font-size: 12px;
          line-height: 24px;
          color: ${iconColor};
        ">${icon}</div>` : ''}
      </div>
    `;
  } else if (colors.length === 2) {
    // Two-color split pin (vertical split)
    pinHtml = `
      <div style="
        position: relative;
        width: 28px;
        height: 28px;
      ">
        <div style="
          position: absolute;
          width: 28px;
          height: 28px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 2px solid white;
          box-shadow: 0 2px 5px rgba(0,0,0,0.3);
          overflow: hidden;
          background: linear-gradient(to right, ${colors[0]} 50%, ${colors[1]} 50%);
        "></div>
        ${icon ? `<div class="material-symbols-rounded" style="
          position: absolute;
          top: 2px;
          left: 0;
          right: 0;
          text-align: center;
          font-size: 12px;
          line-height: 24px;
          color: ${iconColor};
          text-shadow: 0 0 2px rgba(0,0,0,0.5);
        ">${icon}</div>` : ''}
      </div>
    `;
  } else {
    // Three-color split pin (thirds)
    pinHtml = `
      <div style="
        position: relative;
        width: 28px;
        height: 28px;
      ">
        <div style="
          position: absolute;
          width: 28px;
          height: 28px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 2px solid white;
          box-shadow: 0 2px 5px rgba(0,0,0,0.3);
          overflow: hidden;
          background: linear-gradient(to right, ${colors[0]} 33.33%, ${colors[1]} 33.33%, ${colors[1]} 66.66%, ${colors[2]} 66.66%);
        "></div>
        ${icon ? `<div class="material-symbols-rounded" style="
          position: absolute;
          top: 2px;
          left: 0;
          right: 0;
          text-align: center;
          font-size: 12px;
          line-height: 24px;
          color: ${iconColor};
          text-shadow: 0 0 2px rgba(0,0,0,0.5);
        ">${icon}</div>` : ''}
      </div>
    `;
  }

  return { html: pinHtml, icon };
}

export default function Map({ onMapClick, onPlaceClick, places: propPlaces, isPublic }: MapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const initialFitDone = useRef(false);
  const geolocationAttempted = useRef(false);
  const onMapClickRef = useRef(onMapClick);
  const onPlaceClickRef = useRef(onPlaceClick);
  const { places: storePlaces, tags: allTags, getFilteredPlaces, selectedTagIds, selectedListId, searchQuery, mapViewMode, selectedFollowedUserIds, followedUsersPlaces } = useStore();

  // Keep refs updated
  onMapClickRef.current = onMapClick;
  onPlaceClickRef.current = onPlaceClick;

  useEffect(() => {
    // Initialize map only once
    if (mapRef.current) return;

    // Try to get user's location on mobile
    const isMobile = window.innerWidth < 640; // sm breakpoint

    const map = L.map('map', {
      center: [40.7580, -73.9855], // Manhattan (Times Square area) - fallback
      zoom: 14,
      zoomControl: !isMobile,
    });

    // Use CartoDB Positron - full map with labels and POIs
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(map);
    if (isMobile && 'geolocation' in navigator && !geolocationAttempted.current) {
      geolocationAttempted.current = true;
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          if (mapRef.current) {
            mapRef.current.setView([latitude, longitude], 14);
          }
        },
        (error) => {
          console.log('Geolocation denied or failed, using default location');
        },
        {
          timeout: 5000,
          maximumAge: 300000, // 5 minutes
        }
      );
    }

    // Right-click (desktop) to add place
    map.on('contextmenu', (e) => {
      e.originalEvent.preventDefault();
      onMapClickRef.current?.(e.latlng.lat, e.latlng.lng);
    });

    // Long-press (mobile) to add place
    let longPressTimer: NodeJS.Timeout | null = null;
    let longPressCoords: { lat: number; lng: number } | null = null;

    map.on('mousedown', (e) => {
      longPressCoords = { lat: e.latlng.lat, lng: e.latlng.lng };
      longPressTimer = setTimeout(() => {
        if (longPressCoords) {
          onMapClickRef.current?.(longPressCoords.lat, longPressCoords.lng);
        }
      }, 500);
    });

    map.on('mouseup', () => {
      if (longPressTimer) clearTimeout(longPressTimer);
      longPressTimer = null;
    });

    map.on('mousemove', () => {
      if (longPressTimer) clearTimeout(longPressTimer);
      longPressTimer = null;
    });

    mapRef.current = map;

    // Handle map resize when sidebar collapses/expands
    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current) {
        // Small delay to ensure the transition is complete
        setTimeout(() => {
          mapRef.current?.invalidateSize();
        }, 100);
      }
    });

    const mapContainer = document.getElementById('map');
    if (mapContainer) {
      resizeObserver.observe(mapContainer);
    }

    return () => {
      resizeObserver.disconnect();
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
      // Generate pin with tag colors and icon
      const { html: pinHtml } = generatePinHtml(place.tags, allTags);

      // Create custom colored icon
      const icon = L.divIcon({
        className: 'custom-marker',
        html: pinHtml,
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      });

      // Generate tag chips for tooltip with colors
      const tagsHtml = place.tags.slice(0, 3).map(t => {
        const tagColor = t.color || DEFAULT_TAG_COLOR;
        const iconHtml = t.icon ? `<span class="material-symbols-rounded" style="font-size: 12px; vertical-align: middle; margin-right: 2px;">${t.icon}</span>` : '';
        return `<span style="background: ${tagColor}50; color: ${tagColor}; padding: 2px 6px; border-radius: 4px; font-size: 0.75rem; border: 1px solid ${tagColor}70; display: inline-flex; align-items: center;">${iconHtml}${t.name}</span>`;
      }).join(' ');

      const marker = L.marker([place.latitude, place.longitude], { icon })
        .bindTooltip(`
          <div style="color: #F9FAFB; padding: 4px;">
            <strong>${place.name}</strong>
            ${tagsHtml ? `<div style="margin-top: 4px; display: flex; flex-wrap: wrap; gap: 4px;">${tagsHtml}</div>` : ''}
          </div>
        `, { direction: 'top', offset: [0, -24], className: 'dark-tooltip' });

      marker.on('click', () => {
        onPlaceClickRef.current?.(place);
      });

      marker.addTo(mapRef.current!);
      markersRef.current.push(marker);
    });

    // Fit bounds: always when propPlaces is provided, otherwise only on initial load
    if (places.length > 0) {
      if (propPlaces) {
        // When specific places are passed (e.g., place detail page), always center on them
        const bounds = L.latLngBounds(places.map(p => [p.latitude, p.longitude]));
        if (places.length === 1) {
          // Single place - center and zoom
          mapRef.current.setView([places[0].latitude, places[0].longitude], 16);
        } else {
          mapRef.current.fitBounds(bounds, { padding: [50, 50] });
        }
      } else if (!initialFitDone.current) {
        // Store places - only fit on initial load
        const bounds = L.latLngBounds(places.map(p => [p.latitude, p.longitude]));
        mapRef.current.fitBounds(bounds, { padding: [50, 50] });
        initialFitDone.current = true;
      }
    }
  }, [storePlaces, allTags, getFilteredPlaces, propPlaces, selectedTagIds, selectedListId, searchQuery, mapViewMode, selectedFollowedUserIds, followedUsersPlaces]);

  return <div id="map" className="w-full h-full bg-dark-bg" />;
}
