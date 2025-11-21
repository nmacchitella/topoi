'use client';

import { useState, useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { searchApi, GooglePlaceResult } from '@/lib/api';
import { CATEGORY_LABELS } from '@/types';
import type { Place, NominatimResult } from '@/types';

interface SearchBarProps {
  onPlaceClick: (place: Place) => void;
  onNominatimSelect: (result: NominatimResult) => void;
  onAddNew: (name: string) => void;
  mapCenter?: { lat: number; lng: number };
}

export default function SearchBar({ onPlaceClick, onNominatimSelect, onAddNew, mapCenter }: SearchBarProps) {
  const { places } = useStore();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [googleResults, setGoogleResults] = useState<GooglePlaceResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showMoreResults, setShowMoreResults] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Responsive result limits
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  const savedPlacesLimit = 3;
  const googleResultsLimit = showMoreResults ? 10 : (isMobile ? 3 : 5);

  // Filter saved places by query
  const filteredPlaces = query.length >= 2
    ? places.filter(p =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.address.toLowerCase().includes(query.toLowerCase())
      )
    : [];

  // Debounced Google Places search with location bias
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.length < 3) {
      setGoogleResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const results = await searchApi.googlePlaces(
          query,
          mapCenter?.lat,
          mapCenter?.lng
        );
        setGoogleResults(results);
      } catch (error) {
        console.error('Google Places search failed:', error);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, mapCenter?.lat, mapCenter?.lng]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowMoreResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePlaceSelect = (place: Place) => {
    setQuery('');
    setIsOpen(false);
    setShowMoreResults(false);
    onPlaceClick(place);
  };

  const handleGoogleSelect = async (result: GooglePlaceResult) => {
    setQuery('');
    setIsOpen(false);
    setShowMoreResults(false);
    // Get coordinates from Google Place details
    const details = await searchApi.googlePlaceDetails(result.place_id);
    if (details) {
      // Convert to NominatimResult format with Google metadata
      onNominatimSelect({
        place_id: result.place_id,
        display_name: result.description,
        lat: String(details.lat),
        lon: String(details.lng),
        address: { road: '', city: '', country: '' },
        google_metadata: {
          name: details.name,
          website: details.website,
          phone: details.phone,
          hours: details.hours,
          google_maps_uri: details.google_maps_uri,
          types: details.types,
        },
      });
    }
  };

  const handleAddNew = () => {
    const name = query.trim();
    setQuery('');
    setIsOpen(false);
    setShowMoreResults(false);
    onAddNew(name);
  };

  const showDropdown = isOpen && query.length >= 2;
  const displayedSavedPlaces = filteredPlaces.slice(0, savedPlacesLimit);
  const displayedGoogleResults = googleResults.slice(0, googleResultsLimit);
  const hasMoreGoogleResults = googleResults.length > googleResultsLimit;

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        placeholder="Search places or add new..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
          setShowMoreResults(false);
        }}
        onFocus={() => setIsOpen(true)}
        className="input-field w-64"
      />

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-dark-card border border-gray-700 rounded-lg shadow-xl max-h-96 overflow-y-auto z-50">
          {/* Add New Option - always shown when typing */}
          {query.trim().length >= 2 && (
            <button
              onClick={handleAddNew}
              className="w-full text-left px-3 py-3 hover:bg-dark-hover transition-colors flex items-center gap-3 border-b border-gray-700"
            >
              <span className="text-lg text-green-400">+</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white">
                  Create "{query.trim()}"
                </div>
                <div className="text-xs text-gray-400">Add as a new place</div>
              </div>
            </button>
          )}

          {/* Saved Places Section */}
          {displayedSavedPlaces.length > 0 && (
            <div>
              <div className="px-3 py-2 text-xs font-semibold text-gray-400 bg-dark-hover">
                Your Saved Places
              </div>
              {displayedSavedPlaces.map((place) => (
                <button
                  key={place.id}
                  onClick={() => handlePlaceSelect(place)}
                  className="w-full text-left px-3 py-2 hover:bg-dark-hover transition-colors flex items-center gap-3"
                >
                  <span className="text-lg">{CATEGORY_LABELS[place.category as keyof typeof CATEGORY_LABELS]?.split(' ')[0] || '📍'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{place.name}</div>
                    <div className="text-xs text-gray-400 truncate">{place.address}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Google Places Results Section */}
          {(displayedGoogleResults.length > 0 || searchLoading) && (
            <div>
              <div className="px-3 py-2 text-xs font-semibold text-gray-400 bg-dark-hover border-t border-gray-700">
                Search Results
              </div>
              {searchLoading ? (
                <div className="px-3 py-2 text-sm text-gray-400">Searching...</div>
              ) : (
                <>
                  {displayedGoogleResults.map((result) => (
                    <button
                      key={result.place_id}
                      onClick={() => handleGoogleSelect(result)}
                      className="w-full text-left px-3 py-2 hover:bg-dark-hover transition-colors flex items-center gap-3"
                    >
                      <span className="text-lg text-blue-400">📍</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate">
                          {result.main_text || result.description.split(',')[0]}
                        </div>
                        <div className="text-xs text-gray-400 truncate">{result.secondary_text || result.description}</div>
                      </div>
                    </button>
                  ))}
                  {hasMoreGoogleResults && !showMoreResults && (
                    <button
                      onClick={() => setShowMoreResults(true)}
                      className="w-full text-center px-3 py-2 text-sm text-blue-400 hover:bg-dark-hover transition-colors"
                    >
                      Show more results
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {/* No results */}
          {query.length >= 3 && !searchLoading && filteredPlaces.length === 0 && googleResults.length === 0 && (
            <div className="px-3 py-4 text-sm text-gray-400 text-center">
              No results found. Click "Create" above to add a new place.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
