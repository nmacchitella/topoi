'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { placesApi, listsApi } from '@/lib/api';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import PlacesList from '@/components/PlacesList';
import PlaceModal from '@/components/PlaceModal';
import type { Place, List } from '@/types';

export default function CollectionDetailPage() {
  const router = useRouter();
  const params = useParams();
  const collectionId = params.id as string;

  const { token, updatePlace, deletePlace: removePlaceFromStore } = useStore();
  const [collection, setCollection] = useState<List | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPlaceModal, setShowPlaceModal] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<Place | undefined>();
  const [shareUrl, setShareUrl] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }

    const loadCollectionData = async () => {
      try {
        // Fetch collection details
        const collectionData = await listsApi.getById(collectionId);
        setCollection(collectionData);

        // Fetch places in this collection
        const allPlaces = await placesApi.getAll();
        const filteredPlaces = allPlaces.filter(place =>
          place.lists.some(list => list.id === collectionId)
        );
        setPlaces(filteredPlaces);
      } catch (error) {
        console.error('Failed to load collection:', error);
        router.push('/collections');
      } finally {
        setLoading(false);
      }
    };

    loadCollectionData();
  }, [token, collectionId]);

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
      place.lists.some(list => list.id === collectionId)
    );
    setPlaces(filteredPlaces);
  };

  const handleGenerateShareLink = async () => {
    if (!collection) return;

    if (!collection.is_public) {
      if (!confirm('This collection is private. Do you want to make it public to generate a share link?')) {
        return;
      }

      try {
        // Update collection to be public
        await listsApi.update(collection.id, { ...collection, is_public: true });
        setCollection({ ...collection, is_public: true });
      } catch (error) {
        alert('Failed to make collection public');
        return;
      }
    }

    // Generate share link (public URL)
    const baseUrl = window.location.origin;
    const shareLink = `${baseUrl}/shared/collection/${collection.id}`;
    setShareUrl(shareLink);
    setShowShareModal(true);
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareUrl);
    alert('Link copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-bg">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!collection) {
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
                onClick={() => router.push('/collections')}
                className="text-gray-400 hover:text-white mb-4 flex items-center gap-2"
              >
                ← Back to Collections
              </button>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded"
                    style={{ backgroundColor: collection.color }}
                  />
                  <div>
                    <h1 className="text-3xl font-bold">{collection.name}</h1>
                    <p className="text-gray-400">
                      {places.length} place{places.length !== 1 ? 's' : ''}
                      {collection.is_public && ' • Public'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleGenerateShareLink}
                  className="btn-primary flex items-center gap-2"
                >
                  🔗 Share Collection
                </button>
              </div>
            </div>

            {places.length === 0 ? (
              <div className="card text-center py-12">
                <p className="text-gray-400">No places in this collection yet.</p>
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

      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-card rounded-lg max-w-md w-full">
            <div className="border-b border-gray-700 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">Share Collection</h2>
              <button onClick={() => setShowShareModal(false)} className="text-gray-400 hover:text-white text-2xl">
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-gray-300">
                Share this link with others to let them view your collection:
              </p>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="input-field flex-1"
                />
                <button onClick={copyShareLink} className="btn-primary">
                  Copy
                </button>
              </div>

              <p className="text-sm text-gray-400">
                Anyone with this link can view the places in this collection.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
