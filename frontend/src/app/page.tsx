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
import MapViewToggle from '@/components/MapViewToggle';
import FollowedUsersSelector from '@/components/FollowedUsersSelector';
import InstallPrompt from '@/components/InstallPrompt';
import PullToRefresh from '@/components/PullToRefresh';
import type { Place, NominatimResult, PreviewPlace } from '@/types';

// Dynamically import Map to avoid SSR issues with Leaflet
const Map = dynamic(() => import('@/components/Map'), { ssr: false });

export default function HomePage() {
  const router = useRouter();
  const {
    user,
    setUser,
    viewMode,
    mapViewMode,
    fetchPlaces,
    fetchLists,
    fetchTags,
    deletePlace: removePlaceFromStore,
    logout,
    initializeAuth,
  } = useStore();

  const [loading, setLoading] = useState(true);
  const [showPlaceModal, setShowPlaceModal] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<Place | undefined>();
  const [clickedCoords, setClickedCoords] = useState<{ lat: number; lng: number } | undefined>();
  const [nominatimData, setNominatimData] = useState<NominatimResult | undefined>();
  const [initialName, setInitialName] = useState<string | undefined>();
  const [showAdoptModal, setShowAdoptModal] = useState(false);
  const [mapCenterOn, setMapCenterOn] = useState<{ lat: number; lng: number } | null>(null);
  const [previewPlace, setPreviewPlace] = useState<PreviewPlace | undefined>();
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    const init = async () => {
      // Initialize auth - proactively refresh token if needed
      const isAuthenticated = await initializeAuth();

      if (!isAuthenticated) {
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
        logout();
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

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

  const handlePlacePreview = (preview: PreviewPlace) => {
    // Center map on the selected location
    setMapCenterOn({ lat: preview.latitude, lng: preview.longitude });
    setPreviewPlace(preview);
    setShowPreview(true);
    // Close any existing modals
    setShowPlaceModal(false);
    setSelectedPlace(undefined);
  };

  const handlePreviewClose = () => {
    setShowPreview(false);
    setPreviewPlace(undefined);
  };

  const handlePreviewSave = () => {
    if (!previewPlace) return;
    // Convert preview to nominatim format for the form
    const nominatimData: NominatimResult = {
      place_id: `preview-${Date.now()}`,
      display_name: previewPlace.address,
      lat: String(previewPlace.latitude),
      lon: String(previewPlace.longitude),
      address: { road: '', city: '', country: '' },
      google_metadata: {
        name: previewPlace.name,
        website: previewPlace.website,
        phone: previewPlace.phone,
        hours: previewPlace.hours,
        google_maps_uri: previewPlace.google_maps_uri,
        types: previewPlace.types,
      },
    };
    setNominatimData(nominatimData);
    setShowPreview(false);
    setPreviewPlace(undefined);
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
    setShowAdoptModal(false);
    setSelectedPlace(undefined);
    setClickedCoords(undefined);
    setNominatimData(undefined);
    setInitialName(undefined);
  };

  // Check if selected place is from another user (in layers mode)
  const isOtherUserPlace = selectedPlace && user && selectedPlace.user_id !== user.id;

  const handleAddToMyMap = () => {
    if (selectedPlace) {
      setShowPlaceModal(false);
      setShowAdoptModal(true);
    }
  };

  const handleModalSave = async () => {
    await fetchPlaces();
  };

  const handleRefresh = async () => {
    await Promise.all([
      fetchPlaces(),
      fetchLists(),
      fetchTags(),
    ]);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-bg">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="mobile-layout bg-dark-bg">
      <Navbar onPlaceClick={handlePlaceClick} onPlacePreview={handlePlacePreview} onAddNew={handleAddNew} />

      <div className="flex-1 flex overflow-hidden mobile-content-area">
        <Sidebar />

        <div className="flex-1 flex overflow-hidden relative">
          {viewMode === 'map' ? (
            <div className="flex-1 relative">
              {/* Floating View Mode Toggle (Map/List) */}
              <ViewModeToggle />

              {/* Followed Users Selector - under Map/List toggle on mobile, under Profile/Layers toggle on desktop */}
              {mapViewMode === 'layers' && (
                <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-30 sm:top-20 sm:left-auto sm:right-8 sm:translate-x-0">
                  <FollowedUsersSelector />
                </div>
              )}

              {/* Map */}
              <Map onMapClick={handleMapClick} onPlaceClick={handlePlaceClick} centerOn={mapCenterOn} previewPin={showPreview && previewPlace ? { lat: previewPlace.latitude, lng: previewPlace.longitude } : null} />

              {/* Map View Toggle (Profile/Layers) - bottom-right on mobile, top-right on desktop */}
              <div className="absolute bottom-4 right-4 z-30 sm:bottom-auto sm:top-8 sm:right-8">
                <MapViewToggle />
              </div>

              {/* Floating Add Button - desktop only (only in profile mode) */}
              {mapViewMode === 'profile' && (
                <button
                  onClick={handleNewPlace}
                  className="hidden sm:flex fixed bottom-8 right-8 bg-primary hover:bg-primary-hover text-white rounded-full w-16 h-16 items-center justify-center shadow-lg hover:shadow-xl transition-all z-30 text-3xl font-light"
                  title="Add Place"
                >
                  +
                </button>
              )}
            </div>
          ) : (
            <div className="flex-1 relative overflow-hidden">
              {/* Floating View Mode Toggle */}
              <ViewModeToggle />

              {/* Followed Users Selector - under Map/List toggle on mobile, under Profile/Layers toggle on desktop */}
              {mapViewMode === 'layers' && (
                <div className="absolute top-16 left-1/2 transform -translate-x-1/2 z-30 sm:top-20 sm:left-auto sm:right-8 sm:translate-x-0">
                  <FollowedUsersSelector />
                </div>
              )}

              {/* Places List with Pull-to-Refresh on mobile */}
              <div className="absolute inset-0 pt-20 sm:hidden">
                <PullToRefresh onRefresh={handleRefresh}>
                  <div className="p-4">
                    <div className="max-w-6xl mx-auto">
                      <PlacesList onPlaceClick={handlePlaceClick} onDeletePlace={handleDeletePlace} showLetterNav={true} navigateToPlace={true} />
                    </div>
                  </div>
                </PullToRefresh>
              </div>
              {/* Places List - desktop (no pull-to-refresh) */}
              <div className="absolute inset-0 overflow-y-auto p-6 pt-20 hidden sm:block">
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

      {/* Preview Mode - for search results before saving */}
      {showPreview && previewPlace && (
        <>
          {/* Desktop: Modal */}
          <div className="hidden sm:block">
            <PlaceModal
              isPreview={true}
              previewPlace={previewPlace}
              onClose={handlePreviewClose}
              onPreviewSave={handlePreviewSave}
              onSave={() => {}}
            />
          </div>
          {/* Mobile: Bottom sheet */}
          <div className="sm:hidden">
            <PlaceBottomSheet
              isPreview={true}
              previewPlace={previewPlace}
              onClose={handlePreviewClose}
              onSave={handlePreviewSave}
            />
          </div>
        </>
      )}

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
              isOtherUserPlace={!!isOtherUserPlace}
              onAddToMyMap={handleAddToMyMap}
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
              isOtherUserPlace={!!isOtherUserPlace}
              onAddToMyMap={handleAddToMyMap}
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

      {/* Add to My Map modal (for copying places from other users) */}
      {showAdoptModal && selectedPlace && (
        <PlaceModal
          initialName={selectedPlace.name}
          initialLat={selectedPlace.latitude}
          initialLng={selectedPlace.longitude}
          initialNotes={selectedPlace.notes || ''}
          initialNominatim={{
            place_id: `adopted-${selectedPlace.id}`,
            display_name: selectedPlace.address,
            lat: String(selectedPlace.latitude),
            lon: String(selectedPlace.longitude),
            address: { road: '', city: '', country: '' },
            google_metadata: {
              name: selectedPlace.name,
              website: selectedPlace.website || undefined,
              phone: selectedPlace.phone || undefined,
              hours: selectedPlace.hours || undefined,
            },
          }}
          onClose={handleModalClose}
          onSave={async () => {
            await fetchPlaces();
            handleModalClose();
          }}
        />
      )}
    </div>
  );
}
