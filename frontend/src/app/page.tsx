'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { authApi, placesApi } from '@/lib/api';
import dynamic from 'next/dynamic';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import PlacesList from '@/components/PlacesList';
import PlaceModal from '@/components/PlaceModal';
import type { Place, NominatimResult } from '@/types';

// Dynamically import Map to avoid SSR issues with Leaflet
const Map = dynamic(() => import('@/components/Map'), { ssr: false });

export default function HomePage() {
  const router = useRouter();
  const {
    token,
    user,
    setUser,
    viewMode,
    fetchPlaces,
    fetchLists,
    fetchTags,
    deletePlace: removePlaceFromStore,
  } = useStore();

  const [loading, setLoading] = useState(true);
  const [showPlaceModal, setShowPlaceModal] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<Place | undefined>();
  const [clickedCoords, setClickedCoords] = useState<{ lat: number; lng: number } | undefined>();
  const [nominatimData, setNominatimData] = useState<NominatimResult | undefined>();

  useEffect(() => {
    const init = async () => {
      if (!token) {
        router.push('/login');
        return;
      }

      try {
        // Get user info
        if (!user) {
          const userData = await authApi.getCurrentUser();
          setUser(userData);
        }

        // Fetch all data
        await Promise.all([
          fetchPlaces(),
          fetchLists(),
          fetchTags(),
        ]);
      } catch (error) {
        console.error('Initialization failed:', error);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [token]);

  const handleMapClick = (lat: number, lng: number) => {
    setClickedCoords({ lat, lng });
    setSelectedPlace(undefined);
    setShowPlaceModal(true);
  };

  const handlePlaceClick = (place: Place) => {
    setSelectedPlace(place);
    setClickedCoords(undefined);
    setNominatimData(undefined);
    setShowPlaceModal(true);
  };

  const handleNominatimSelect = (result: NominatimResult) => {
    setNominatimData(result);
    setSelectedPlace(undefined);
    setClickedCoords(undefined);
    setShowPlaceModal(true);
  };

  const handleDeletePlace = async (id: string) => {
    try {
      await placesApi.delete(id);
      removePlaceFromStore(id);
    } catch (error) {
      alert('Failed to delete place');
    }
  };

  const handleModalClose = () => {
    setShowPlaceModal(false);
    setSelectedPlace(undefined);
    setClickedCoords(undefined);
    setNominatimData(undefined);
  };

  const handleModalSave = async () => {
    await fetchPlaces();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-bg">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-dark-bg">
      <Navbar onPlaceClick={handlePlaceClick} onNominatimSelect={handleNominatimSelect} />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar />

        <div className="flex-1 flex overflow-hidden relative">
          {viewMode === 'map' ? (
            <>
              <div className="w-80 border-r border-gray-700 overflow-y-auto p-4">
                <PlacesList onPlaceClick={handlePlaceClick} onDeletePlace={handleDeletePlace} navigateToPlace={true} />
              </div>
              <div className="flex-1 relative">
                <Map onMapClick={handleMapClick} onPlaceClick={handlePlaceClick} />
                {/* Floating Add Button */}
                <button
                  onClick={() => {
                    setSelectedPlace(undefined);
                    setClickedCoords(undefined);
                    setShowPlaceModal(true);
                  }}
                  className="fixed bottom-8 right-8 bg-blue-600 hover:bg-blue-700 text-white rounded-full w-16 h-16 flex items-center justify-center shadow-lg transition-colors z-40 text-3xl"
                  title="Add Place"
                >
                  +
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-6xl mx-auto">
                <h2 className="text-2xl font-bold mb-4">All Places</h2>
                <PlacesList onPlaceClick={handlePlaceClick} onDeletePlace={handleDeletePlace} showLetterNav={true} navigateToPlace={true} />
              </div>
            </div>
          )}
        </div>
      </div>

      {showPlaceModal && (
        <PlaceModal
          place={selectedPlace}
          initialLat={clickedCoords?.lat || (nominatimData ? parseFloat(nominatimData.lat) : undefined)}
          initialLng={clickedCoords?.lng || (nominatimData ? parseFloat(nominatimData.lon) : undefined)}
          viewMode={!!selectedPlace && !clickedCoords && !nominatimData}
          initialNominatim={nominatimData}
          onClose={handleModalClose}
          onSave={handleModalSave}
        />
      )}
    </div>
  );
}
