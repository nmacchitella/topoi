'use client';

import { useState, useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { searchApi } from '@/lib/api';
import { CATEGORY_LABELS } from '@/types';
import type { Place, NominatimResult } from '@/types';

interface SearchBarProps {
  onPlaceClick: (place: Place) => void;
  onNominatimSelect: (result: NominatimResult) => void;
}

export default function SearchBar({ onPlaceClick, onNominatimSelect }: SearchBarProps) {
  const { places } = useStore();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [nominatimResults, setNominatimResults] = useState<NominatimResult[]>([]);
  const [nominatimLoading, setNominatimLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Filter saved places by query
  const filteredPlaces = query.length >= 2
    ? places.filter(p =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.address.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 5)
    : [];

  // Debounced Nominatim search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.length < 3) {
      setNominatimResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setNominatimLoading(true);
      try {
        const results = await searchApi.nominatim(query, 5);
        setNominatimResults(results);
      } catch (error) {
        console.error('Nominatim search failed:', error);
      } finally {
        setNominatimLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePlaceSelect = (place: Place) => {
    setQuery('');
    setIsOpen(false);
    onPlaceClick(place);
  };

  const handleNominatimSelect = (result: NominatimResult) => {
    setQuery('');
    setIsOpen(false);
    onNominatimSelect(result);
  };

  const showDropdown = isOpen && query.length >= 2 && (filteredPlaces.length > 0 || nominatimResults.length > 0 || nominatimLoading);

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        placeholder="Search places or add new..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        className="input-field w-64"
      />

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-dark-card border border-gray-700 rounded-lg shadow-xl max-h-96 overflow-y-auto z-50">
          {/* Saved Places Section */}
          {filteredPlaces.length > 0 && (
            <div>
              <div className="px-3 py-2 text-xs font-semibold text-gray-400 bg-dark-hover">
                Your Saved Places
              </div>
              {filteredPlaces.map((place) => (
                <button
                  key={place.id}
                  onClick={() => handlePlaceSelect(place)}
                  className="w-full text-left px-3 py-2 hover:bg-dark-hover transition-colors flex items-center gap-3"
                >
                  <span className="text-lg">{CATEGORY_LABELS[place.category]?.split(' ')[0] || '📍'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-white truncate">{place.name}</div>
                    <div className="text-xs text-gray-400 truncate">{place.address}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Nominatim Results Section */}
          {(nominatimResults.length > 0 || nominatimLoading) && (
            <div>
              <div className="px-3 py-2 text-xs font-semibold text-gray-400 bg-dark-hover border-t border-gray-700">
                Add New Place
              </div>
              {nominatimLoading ? (
                <div className="px-3 py-2 text-sm text-gray-400">Searching...</div>
              ) : (
                nominatimResults.map((result) => (
                  <button
                    key={result.place_id}
                    onClick={() => handleNominatimSelect(result)}
                    className="w-full text-left px-3 py-2 hover:bg-dark-hover transition-colors flex items-center gap-3"
                  >
                    <span className="text-lg text-blue-400">+</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">
                        {result.display_name.split(',')[0]}
                      </div>
                      <div className="text-xs text-gray-400 truncate">{result.display_name}</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {/* No results */}
          {query.length >= 3 && !nominatimLoading && filteredPlaces.length === 0 && nominatimResults.length === 0 && (
            <div className="px-3 py-4 text-sm text-gray-400 text-center">
              No results found
            </div>
          )}
        </div>
      )}
    </div>
  );
}
