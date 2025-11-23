'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import type { Place } from '@/types';

interface PlacesListProps {
  onPlaceClick: (place: Place) => void;
  onDeletePlace: (id: string) => void;
  places?: Place[]; // Optional: if provided, use these places instead of filtered places
  showLetterNav?: boolean; // Whether to show letter navigation (default: false)
  navigateToPlace?: boolean; // If true, navigate to /places/[id] instead of calling onPlaceClick
}

export default function PlacesList({ onPlaceClick, onDeletePlace, places: propPlaces, showLetterNav = false, navigateToPlace = false }: PlacesListProps) {
  const router = useRouter();
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
    <div className="relative">
      {/* Places grouped by letter */}
      <div className="space-y-6">
        {letters.map(letter => (
          <div key={letter} id={`letter-${letter}`} className="scroll-mt-4">
            {/* Letter headers only on desktop */}
            <h3 className="hidden sm:block text-2xl font-bold text-gray-400 mb-3 pb-2 border-b border-gray-700">
              {letter}
            </h3>
            <div className="space-y-2">
              {groupedPlaces[letter].map((place) => (
        <div
          key={place.id}
          className="card hover:bg-dark-hover transition-colors cursor-pointer"
          onClick={() => navigateToPlace ? router.push(`/places/${place.id}`) : onPlaceClick(place)}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-white mb-2">{place.name}</h3>

              <p className="text-sm text-gray-400 mb-2">{place.address}</p>

              {place.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {place.tags.map((tag) => (
                    <span key={tag.id} className="text-xs px-2 py-1 bg-blue-900/30 text-blue-300 rounded">
                      #{tag.name}
                    </span>
                  ))}
                </div>
              )}

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
