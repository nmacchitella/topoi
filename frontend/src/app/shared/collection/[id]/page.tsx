'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { shareApi } from '@/lib/api';
import { CATEGORY_LABELS } from '@/types';
import type { Place } from '@/types';
import dynamic from 'next/dynamic';

const Map = dynamic(() => import('@/components/Map'), { ssr: false });

export default function SharedCollectionPage() {
  const params = useParams();
  const collectionId = params.id as string;

  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);

  useEffect(() => {
    const loadSharedCollection = async () => {
      try {
        const data = await shareApi.getSharedList(collectionId);
        setPlaces(data);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Collection not found or not public');
      } finally {
        setLoading(false);
      }
    };

    loadSharedCollection();
  }, [collectionId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-bg">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-bg">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Collection Not Found</h1>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-dark-bg">
      {/* Header */}
      <nav className="bg-dark-card border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Topoi</h1>
          <span className="text-gray-400">Shared Collection</span>
        </div>
      </nav>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Places List */}
        <div className="w-96 border-r border-gray-700 overflow-y-auto p-4">
          <h2 className="text-xl font-bold mb-4">{places.length} Places</h2>
          <div className="space-y-2">
            {places.map((place) => (
              <button
                key={place.id}
                onClick={() => setSelectedPlace(place)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  selectedPlace?.id === place.id
                    ? 'bg-blue-600'
                    : 'bg-dark-card hover:bg-dark-hover'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">
                    {CATEGORY_LABELS[place.category]?.split(' ')[0] || '📍'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{place.name}</div>
                    <div className="text-sm text-gray-400 truncate">{place.address}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          <Map
            places={places}
            onPlaceClick={(place) => setSelectedPlace(place)}
            isPublic={true}
          />
        </div>
      </div>

      {/* Place Detail Modal */}
      {selectedPlace && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-card rounded-lg max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-dark-card border-b border-gray-700 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">{selectedPlace.name}</h2>
              <button
                onClick={() => setSelectedPlace(null)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <span className="text-2xl mr-2">
                  {CATEGORY_LABELS[selectedPlace.category]?.split(' ')[0] || '📍'}
                </span>
                <span className="text-gray-400">{CATEGORY_LABELS[selectedPlace.category]}</span>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-1">Address</h3>
                <p>{selectedPlace.address}</p>
              </div>

              {selectedPlace.notes && (
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-1">Notes</h3>
                  <p>{selectedPlace.notes}</p>
                </div>
              )}

              {selectedPlace.phone && (
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-1">Phone</h3>
                  <a href={`tel:${selectedPlace.phone}`} className="text-blue-400 hover:underline">
                    {selectedPlace.phone}
                  </a>
                </div>
              )}

              {selectedPlace.website && (
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-1">Website</h3>
                  <a
                    href={selectedPlace.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline"
                  >
                    {selectedPlace.website}
                  </a>
                </div>
              )}

              {selectedPlace.hours && (
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-1">Hours</h3>
                  <p>{selectedPlace.hours}</p>
                </div>
              )}

              <div className="pt-4">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${selectedPlace.latitude},${selectedPlace.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary inline-block"
                >
                  Open in Google Maps
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
