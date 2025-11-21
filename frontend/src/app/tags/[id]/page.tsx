'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { placesApi, tagsApi } from '@/lib/api';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import PlacesList from '@/components/PlacesList';
import PlaceModal from '@/components/PlaceModal';
import type { Place, Tag } from '@/types';

export default function TagDetailPage() {
  const router = useRouter();
  const params = useParams();
  const tagId = params.id as string;

  const { token, updatePlace, deletePlace: removePlaceFromStore } = useStore();
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

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-6xl mx-auto">
            <div className="mb-6">
              <button
                onClick={() => router.push('/tags')}
                className="text-gray-400 hover:text-white mb-4 flex items-center gap-2"
              >
                ← Back to Tags
              </button>

              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold">#{tag.name}</h1>
                  <p className="text-gray-400">
                    {places.length} place{places.length !== 1 ? 's' : ''}
                  </p>
                </div>
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
              <PlacesList onPlaceClick={handlePlaceClick} onDeletePlace={handleDeletePlace} places={places} showLetterNav={true} />
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
    </div>
  );
}
