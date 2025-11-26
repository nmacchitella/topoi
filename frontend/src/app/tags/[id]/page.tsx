'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { placesApi, tagsApi } from '@/lib/api';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import PlacesList from '@/components/PlacesList';
import PlaceModal from '@/components/PlaceModal';
import BottomNav from '@/components/BottomNav';
import type { Place, Tag } from '@/types';

export default function TagDetailPage() {
  const router = useRouter();
  const params = useParams();
  const tagId = params.id as string;

  const { token, updatePlace, deletePlace: removePlaceFromStore, setSelectedTagIds, setViewMode } = useStore();
  const [tag, setTag] = useState<Tag | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPlaceModal, setShowPlaceModal] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<Place | undefined>();

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }

    const loadTagData = async () => {
      try {
        // Fetch tag details
        const tagData = await tagsApi.getById(tagId);
        setTag(tagData);

        // Fetch places with this tag
        const allPlaces = await placesApi.getAll();
        const filteredPlaces = allPlaces.filter(place =>
          place.tags.some(t => t.id === tagId)
        );
        setPlaces(filteredPlaces);
      } catch (error) {
        console.error('Failed to load tag:', error);
        router.push('/tags');
      } finally {
        setLoading(false);
      }
    };

    loadTagData();
  }, [token, tagId]);

  const handlePlaceClick = (place: Place) => {
    setSelectedPlace(place);
    setShowPlaceModal(true);
  };

  const handleDeletePlace = async (id: string) => {
    try {
      await placesApi.delete(id);
      removePlaceFromStore(id);
      setPlaces(places.filter(p => p.id !== id));
    } catch (error) {
      alert('Failed to delete place');
    }
  };

  const handleModalClose = () => {
    setShowPlaceModal(false);
    setSelectedPlace(undefined);
  };

  const handleModalSave = async () => {
    // Refresh the places list
    const allPlaces = await placesApi.getAll();
    const filteredPlaces = allPlaces.filter(place =>
      place.tags.some(t => t.id === tagId)
    );
    setPlaces(filteredPlaces);
  };

  const handleViewOnMap = () => {
    // Set this tag as the selected filter
    setSelectedTagIds([tagId]);
    // Switch to map view
    setViewMode('map');
    // Navigate to home
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-bg">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!tag) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col bg-dark-bg">
      <Navbar />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar />

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-6xl mx-auto">
            <div className="mb-6">
              <button
                onClick={() => router.push('/profile?tab=tags')}
                className="text-gray-400 hover:text-white mb-4 flex items-center gap-2"
              >
                ← Back to Tags
              </button>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold">#{tag.name}</h1>
                  <p className="text-gray-400">
                    {places.length} place{places.length !== 1 ? 's' : ''}
                  </p>
                </div>
                <button
                  onClick={handleViewOnMap}
                  className="btn-primary flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                  View on Map
                </button>
              </div>
            </div>

            {places.length === 0 ? (
              <div className="card text-center py-12">
                <p className="text-gray-400">No places with this tag yet.</p>
                <button
                  onClick={() => router.push('/')}
                  className="btn-primary mt-4"
                >
                  Add Places
                </button>
              </div>
            ) : (
              <PlacesList onPlaceClick={handlePlaceClick} onDeletePlace={handleDeletePlace} places={places} showLetterNav={true} navigateToPlace={true} />
            )}
          </div>
        </div>
      </div>

      {showPlaceModal && (
        <PlaceModal
          place={selectedPlace}
          onClose={handleModalClose}
          onSave={handleModalSave}
        />
      )}

      {/* Bottom Navigation - mobile only */}
      <BottomNav showNewButton={false} />
    </div>
  );
}
