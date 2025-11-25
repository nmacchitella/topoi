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
import PlaceBottomSheet from '@/components/PlaceBottomSheet';
import BottomNav from '@/components/BottomNav';
import ViewModeToggle from '@/components/ViewModeToggle';
import InstallPrompt from '@/components/InstallPrompt';
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
  const [initialName, setInitialName] = useState<string | undefined>();

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
    setInitialName(undefined);
    setShowPlaceModal(true);
  };

  const handleAddNew = (name: string) => {
    setInitialName(name);
    setSelectedPlace(undefined);
    setClickedCoords(undefined);
    setNominatimData(undefined);
    setShowPlaceModal(true);
  };

  const handleNewPlace = () => {
    setSelectedPlace(undefined);
    setClickedCoords(undefined);
    setNominatimData(undefined);
    setInitialName(undefined);
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
    setInitialName(undefined);
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
      <Navbar onPlaceClick={handlePlaceClick} onNominatimSelect={handleNominatimSelect} onAddNew={handleAddNew} />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar />

        <div className="flex-1 flex overflow-hidden relative">
          {viewMode === 'map' ? (
            <div className="flex-1 relative">
              {/* Floating View Mode Toggle */}
              <ViewModeToggle />

              {/* Map */}
              <Map onMapClick={handleMapClick} onPlaceClick={handlePlaceClick} />

              {/* Floating Add Button - desktop only */}
              <button
                onClick={handleNewPlace}
                className="hidden sm:flex fixed bottom-8 right-8 bg-primary hover:bg-primary-hover text-white rounded-full w-16 h-16 items-center justify-center shadow-lg hover:shadow-xl transition-all z-40 text-3xl font-light"
                title="Add Place"
              >
                +
              </button>
            </div>
          ) : (
            <div className="flex-1 relative overflow-hidden">
              {/* Floating View Mode Toggle */}
              <ViewModeToggle />

              {/* Places List */}
              <div className="absolute inset-0 overflow-y-auto p-4 sm:p-6 pt-20">
                <div className="max-w-6xl mx-auto">
                  <PlacesList onPlaceClick={handlePlaceClick} onDeletePlace={handleDeletePlace} showLetterNav={true} navigateToPlace={true} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Navigation - mobile only */}
      <BottomNav onNewPlace={handleNewPlace} />

      {/* PWA Install Prompt */}
      <InstallPrompt />

      {/* Mobile: Bottom Sheet for viewing existing place */}
      {showPlaceModal && selectedPlace && !clickedCoords && !nominatimData && !initialName && (
        <>
          {/* Desktop: Full modal */}
          <div className="hidden sm:block">
            <PlaceModal
              place={selectedPlace}
              viewMode={true}
              onClose={handleModalClose}
              onSave={handleModalSave}
            />
          </div>
          {/* Mobile: Bottom sheet */}
          <div className="sm:hidden">
            <PlaceBottomSheet
              place={selectedPlace}
              onClose={handleModalClose}
              onEdit={() => {
                // Trigger edit mode by setting initialName (which switches to full modal)
                setInitialName('__edit__');
              }}
            />
          </div>
        </>
      )}

      {/* Full modal for add/edit (all screen sizes) */}
      {showPlaceModal && (clickedCoords || nominatimData || initialName || !selectedPlace) && (
        <PlaceModal
          place={selectedPlace}
          initialLat={clickedCoords?.lat || (nominatimData ? parseFloat(nominatimData.lat) : undefined)}
          initialLng={clickedCoords?.lng || (nominatimData ? parseFloat(nominatimData.lon) : undefined)}
          viewMode={false}
          initialNominatim={nominatimData}
          initialName={initialName}
          onClose={handleModalClose}
          onSave={handleModalSave}
        />
      )}
    </div>
  );
}
