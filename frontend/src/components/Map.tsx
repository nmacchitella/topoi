'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Supercluster from 'supercluster';
import { useStore } from '@/store/useStore';
import { DEFAULT_TAG_COLOR, getContrastColor } from '@/lib/tagColors';
import type { Place, Tag, MapBounds } from '@/types';

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
  centerOn?: { lat: number; lng: number } | null; // Center map on these coordinates
}

// Debounce utility
function debounce<T extends (...args: any[]) => void>(fn: T, delay: number): T {
  let timeoutId: NodeJS.Timeout | null = null;
  return ((...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  }) as T;
}

// Generate cluster marker HTML
function generateClusterHtml(count: number): string {
  const size = count >= 100 ? 50 : count >= 10 ? 40 : 34;
  return `
    <div style="
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 600;
      font-size: ${count >= 100 ? 14 : 13}px;
      border: 3px solid white;
      box-shadow: 0 3px 8px rgba(0,0,0,0.3);
    ">${count >= 1000 ? Math.round(count / 1000) + 'k' : count}</div>
  `;
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

export default function Map({ onMapClick, onPlaceClick, places: propPlaces, isPublic, centerOn }: MapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const clusterMarkersRef = useRef<L.Marker[]>([]);
  const initialFitDone = useRef(false);
  const geolocationAttempted = useRef(false);
  const onMapClickRef = useRef(onMapClick);
  const onPlaceClickRef = useRef(onPlaceClick);
  const superclusterRef = useRef<Supercluster | null>(null);
  const [isLoadingBounds, setIsLoadingBounds] = useState(false);
  const lastBoundsRef = useRef<string>('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const userLocationMarkerRef = useRef<L.Marker | null>(null);
  const geolocationWatchIdRef = useRef<number | null>(null);

  const {
    places: storePlaces,
    tags: allTags,
    getFilteredPlaces,
    selectedTagIds,
    tagFilterMode,
    selectedListId,
    searchQuery,
    mapViewMode,
    selectedFollowedUserIds,
    followedUsersPlaces,
    isLargeMapUser,
    fetchFollowedUserPlacesInBounds,
    fetchFollowedUserPlaces
  } = useStore();

  // Get current map bounds
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

  // Fetch places for large map users within current viewport
  const fetchPlacesInViewport = useCallback(async () => {
    if (!mapRef.current || mapViewMode !== 'layers') return;

    const bounds = getMapBounds();
    if (!bounds) return;

    // Check if bounds have changed significantly
    const boundsKey = `${bounds.minLat.toFixed(4)},${bounds.maxLat.toFixed(4)},${bounds.minLng.toFixed(4)},${bounds.maxLng.toFixed(4)}`;
    if (boundsKey === lastBoundsRef.current) return;
    lastBoundsRef.current = boundsKey;

    // Find large map users that are selected
    const largeMapUserIds = selectedFollowedUserIds.filter(id => isLargeMapUser(id));
    if (largeMapUserIds.length === 0) return;

    setIsLoadingBounds(true);
    try {
      await Promise.all(
        largeMapUserIds.map(userId => fetchFollowedUserPlacesInBounds(userId, bounds))
      );
    } catch (error) {
      console.error('Failed to fetch places in viewport:', error);
    } finally {
      setIsLoadingBounds(false);
    }
  }, [mapViewMode, selectedFollowedUserIds, isLargeMapUser, fetchFollowedUserPlacesInBounds, getMapBounds]);

  // Debounced version for viewport changes
  const debouncedFetchPlaces = useCallback(
    debounce(fetchPlacesInViewport, 300),
    [fetchPlacesInViewport]
  );

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
    // Set mobile state
    setIsMobile(isMobile);

    if (isMobile && 'geolocation' in navigator && !geolocationAttempted.current) {
      geolocationAttempted.current = true;

      // Get initial position and center map
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          if (mapRef.current) {
            mapRef.current.setView([latitude, longitude], 14);
          }
        },
        () => {
          console.log('Geolocation denied or failed, using default location');
        },
        {
          timeout: 5000,
          maximumAge: 300000, // 5 minutes
        }
      );

      // Watch position for continuous updates
      geolocationWatchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
        },
        () => {},
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000,
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

    // Listen for map move/zoom to fetch places in viewport
    map.on('moveend', () => {
      debouncedFetchPlaces();
    });

    map.on('zoomend', () => {
      debouncedFetchPlaces();
    });

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
      if (geolocationWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(geolocationWatchIdRef.current);
        geolocationWatchIdRef.current = null;
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [debouncedFetchPlaces]);

  // Trigger initial fetch when large map users are selected
  useEffect(() => {
    if (mapViewMode === 'layers' && selectedFollowedUserIds.length > 0) {
      const hasLargeMapUsers = selectedFollowedUserIds.some(id => isLargeMapUser(id));
      if (hasLargeMapUsers) {
        // Small delay to ensure map is ready
        setTimeout(() => {
          fetchPlacesInViewport();
        }, 100);
      }
    }
  }, [mapViewMode, selectedFollowedUserIds, isLargeMapUser, fetchPlacesInViewport]);

  // Fetch places for selected users that don't have places loaded yet
  useEffect(() => {
    if (mapViewMode === 'layers' && selectedFollowedUserIds.length > 0) {
      selectedFollowedUserIds.forEach(userId => {
        // Only fetch if we don't already have places for this user
        if (!followedUsersPlaces[userId]) {
          fetchFollowedUserPlaces(userId).catch(err => {
            console.error(`Failed to fetch places for user ${userId}:`, err);
          });
        }
      });
    }
  }, [mapViewMode, selectedFollowedUserIds, followedUsersPlaces, fetchFollowedUserPlaces]);

  // Update user location marker
  useEffect(() => {
    if (!mapRef.current || !userLocation || !isMobile) return;

    // Create blue dot icon for user location
    const userLocationIcon = L.divIcon({
      className: 'user-location-marker',
      html: `
        <div style="position: relative; width: 20px; height: 20px;">
          <div style="
            position: absolute;
            width: 20px;
            height: 20px;
            background: rgba(59, 130, 246, 0.3);
            border-radius: 50%;
            animation: pulse 2s ease-out infinite;
          "></div>
          <div style="
            position: absolute;
            top: 5px;
            left: 5px;
            width: 10px;
            height: 10px;
            background: #3B82F6;
            border: 2px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
          "></div>
        </div>
      `,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    if (userLocationMarkerRef.current) {
      // Update existing marker position
      userLocationMarkerRef.current.setLatLng([userLocation.lat, userLocation.lng]);
    } else {
      // Create new marker
      userLocationMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], {
        icon: userLocationIcon,
        zIndexOffset: 1000, // Ensure it's above other markers
      }).addTo(mapRef.current);
    }

    return () => {
      if (userLocationMarkerRef.current) {
        userLocationMarkerRef.current.remove();
        userLocationMarkerRef.current = null;
      }
    };
  }, [userLocation, isMobile]);

  // Center map when centerOn prop changes
  useEffect(() => {
    if (!mapRef.current || !centerOn) return;

    mapRef.current.setView([centerOn.lat, centerOn.lng], 16, {
      animate: true,
      duration: 0.5,
    });
  }, [centerOn]);

  // Center map on user location
  const centerOnUserLocation = useCallback(() => {
    if (mapRef.current && userLocation) {
      mapRef.current.setView([userLocation.lat, userLocation.lng], 16, {
        animate: true,
        duration: 0.5,
      });
    } else if (isMobile && 'geolocation' in navigator) {
      // Try to get location if we don't have it yet
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          if (mapRef.current) {
            mapRef.current.setView([latitude, longitude], 16, {
              animate: true,
              duration: 0.5,
            });
          }
        },
        () => {
          console.log('Could not get location');
        },
        { timeout: 5000 }
      );
    }
  }, [userLocation, isMobile]);

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
  }, [storePlaces, allTags, getFilteredPlaces, propPlaces, selectedTagIds, tagFilterMode, selectedListId, searchQuery, mapViewMode, selectedFollowedUserIds, followedUsersPlaces]);

  return (
    <div className="relative w-full h-full">
      <div id="map" className="w-full h-full bg-dark-bg" />
      {isLoadingBounds && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-dark-card/90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-dark-text-secondary">Loading places...</span>
        </div>
      )}
      {/* GPS Center Button - Mobile only, positioned above MapViewToggle */}
      {isMobile && (
        <button
          onClick={centerOnUserLocation}
          className="absolute bottom-20 right-4 z-[1000] bg-dark-lighter border border-gray-700 rounded-lg shadow-lg p-2.5 text-gray-400 hover:text-white hover:bg-dark-hover transition-colors"
          title="Center on my location"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-5 h-5"
          >
            {/* Crosshair/GPS target icon */}
            <circle cx="12" cy="12" r="3" />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 2v4m0 12v4m10-10h-4M6 12H2"
            />
            <circle cx="12" cy="12" r="8" strokeDasharray="2 2" />
          </svg>
        </button>
      )}
      {/* CSS for pulse animation */}
      <style jsx global>{`
        @keyframes pulse {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          100% {
            transform: scale(2.5);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
