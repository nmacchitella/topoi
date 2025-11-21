'use client';

import { useMemo, useState } from 'react';
import { useStore } from '@/store/useStore';
import { CATEGORY_COLORS, CATEGORY_LABELS } from '@/types';
import type { Place } from '@/types';

interface PlacesListProps {
  onPlaceClick: (place: Place) => void;
  onDeletePlace: (id: string) => void;
  places?: Place[]; // Optional: if provided, use these places instead of filtered places
  showLetterNav?: boolean; // Whether to show letter navigation (default: false)
}

export default function PlacesList({ onPlaceClick, onDeletePlace, places: propPlaces, showLetterNav = false }: PlacesListProps) {
  const { getFilteredPlaces } = useStore();
  const allPlaces = propPlaces || getFilteredPlaces();
  const [activeLetter, setActiveLetter] = useState<string | null>(null);

  // Sort places alphabetically and group by first letter
  const { sortedPlaces, groupedPlaces, letters } = useMemo(() => {
    const sorted = [...allPlaces].sort((a, b) => a.name.localeCompare(b.name));
    const grouped: Record<string, Place[]> = {};
    const letterSet = new Set<string>();

    sorted.forEach(place => {
      const firstLetter = place.name[0].toUpperCase();
      if (!grouped[firstLetter]) {
        grouped[firstLetter] = [];
      }
      grouped[firstLetter].push(place);
      letterSet.add(firstLetter);
    });

    return {
      sortedPlaces: sorted,
      groupedPlaces: grouped,
      letters: Array.from(letterSet).sort()
    };
  }, [allPlaces]);

  const scrollToLetter = (letter: string) => {
    setActiveLetter(letter);
    const element = document.getElementById(`letter-${letter}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  if (allPlaces.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <div className="text-center">
          <p className="text-lg">No places found</p>
          <p className="text-sm mt-2">Click on the map to add a new place</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Letter navigation */}
      {showLetterNav && letters.length > 0 && (
        <div className="bg-dark-card border border-gray-700 rounded-lg p-3">
          <div className="flex flex-wrap gap-1 justify-center">
            {letters.map(letter => (
              <button
                key={letter}
                onClick={() => scrollToLetter(letter)}
                className={`w-8 h-8 rounded flex items-center justify-center text-sm font-medium transition-colors ${
                  activeLetter === letter
                    ? 'bg-blue-600 text-white'
                    : 'bg-dark-bg hover:bg-dark-hover text-gray-300'
                }`}
              >
                {letter}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Places grouped by letter */}
      <div className="space-y-6">
        {letters.map(letter => (
          <div key={letter} id={`letter-${letter}`} className="scroll-mt-4">
            <h3 className="text-2xl font-bold text-gray-400 mb-3 pb-2 border-b border-gray-700">
              {letter}
            </h3>
            <div className="space-y-2">
              {groupedPlaces[letter].map((place) => (
        <div
          key={place.id}
          className="card hover:bg-dark-hover transition-colors cursor-pointer"
          onClick={() => onPlaceClick(place)}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{
                    backgroundColor: CATEGORY_COLORS[place.category as keyof typeof CATEGORY_COLORS] || CATEGORY_COLORS.other
                  }}
                />
                <h3 className="font-semibold text-white">{place.name}</h3>
              </div>

              <p className="text-sm text-gray-400 mb-2">{place.address}</p>

              <div className="flex flex-wrap gap-2">
                <span className="text-xs px-2 py-1 bg-dark-hover rounded">
                  {CATEGORY_LABELS[place.category as keyof typeof CATEGORY_LABELS]}
                </span>
                {place.tags.map((tag) => (
                  <span key={tag.id} className="text-xs px-2 py-1 bg-blue-900/30 text-blue-300 rounded">
                    #{tag.name}
                  </span>
                ))}
              </div>

              {place.lists.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {place.lists.map((list) => (
                    <span
                      key={list.id}
                      className="text-xs px-2 py-1 rounded"
                      style={{
                        backgroundColor: `${list.color}20`,
                        color: list.color
                      }}
                    >
                      {list.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm('Are you sure you want to delete this place?')) {
                  onDeletePlace(place.id);
                }
              }}
              className="text-red-400 hover:text-red-300 ml-2"
            >
              ✕
            </button>
          </div>
        </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
