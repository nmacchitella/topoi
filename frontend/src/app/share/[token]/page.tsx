'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { shareApi } from '@/lib/api';
import type { SharedMapData, Place } from '@/types';
import PlacesList from '@/components/PlacesList';
import PublicSignupCTA from '@/components/PublicSignupCTA';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

type ViewMode = 'map' | 'list';

export default function SharedMapPage() {
  const params = useParams();
  const token = params.token as string;

  const [data, setData] = useState<SharedMapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('map');
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  useEffect(() => {
    if (token) {
      loadSharedMap();
    }
  }, [token]);

  const loadSharedMap = async () => {
    try {
      setLoading(true);
      setError(null);
      const sharedData = await shareApi.getSharedMapByToken(token);
      setData(sharedData);
    } catch (err: any) {
      console.error('Failed to load shared map:', err);
      const errorMessage = err.response?.data?.detail || 'Failed to load shared map';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredPlaces = (): Place[] => {
    if (!data) return [];

    let filtered = [...data.places];

    // Filter by list
    if (selectedListId) {
      filtered = filtered.filter(p =>
        p.lists.some(l => l.id === selectedListId)
      );
    }

    // Filter by tags
    if (selectedTagIds.length > 0) {
      filtered = filtered.filter(p =>
        p.tags.some(t => selectedTagIds.includes(t.id))
      );
    }

    return filtered;
  };

  const handleListClick = (listId: string) => {
    setSelectedListId(selectedListId === listId ? null : listId);
  };

  const handleTagClick = (tagId: string) => {
    setSelectedTagIds(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const clearFilters = () => {
    setSelectedListId(null);
    setSelectedTagIds([]);
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-dark-bg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <div className="text-white text-lg">Loading shared map...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-dark-bg p-4">
        <div className="max-w-md w-full bg-dark-card border border-red-500/30 rounded-xl p-6 text-center">
          <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h1 className="text-2xl font-bold text-white mb-2">Map Not Available</h1>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const filteredPlaces = getFilteredPlaces();

  return (
    <div className="h-screen flex flex-col bg-dark-bg">
      {/* Header */}
      <header className="bg-dark-lighter border-b border-gray-800/50 px-4 py-3.5 z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">Topoi</h1>
            <span className="hidden sm:inline text-gray-500">•</span>
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-gray-400">Shared by</span>
              <span className="font-medium text-white">
                {data.user.username ? `@${data.user.username}` : data.user.name}
              </span>
            </div>
          </div>

          {/* View toggle - Desktop */}
          <div className="hidden sm:flex items-center gap-2 bg-dark-card rounded-lg p-1">
            <button
              onClick={() => setViewMode('map')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'map'
                  ? 'bg-primary text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Map
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-primary text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              List
            </button>
          </div>

          {/* Mobile filter toggle */}
          <button
            onClick={() => setShowMobileFilters(!showMobileFilters)}
            className="sm:hidden p-2 text-gray-400 hover:text-white rounded-lg hover:bg-dark-hover"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </button>
        </div>

        {/* Mobile view toggle */}
        <div className="sm:hidden mt-3 flex items-center gap-2 bg-dark-card rounded-lg p-1">
          <button
            onClick={() => setViewMode('map')}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'map'
                ? 'bg-primary text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Map
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'list'
                ? 'bg-primary text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            List
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden sm:flex sm:w-80 bg-dark-lighter border-r border-gray-800/50 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* User Profile */}
            <div className="p-4 bg-dark-card rounded-lg border border-gray-800">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-primary to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                  {data.user.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white truncate">{data.user.name}</h3>
                  {data.user.username && (
                    <p className="text-sm text-gray-400">@{data.user.username}</p>
                  )}
                  {data.user.bio && (
                    <p className="text-sm text-gray-400 mt-2">{data.user.bio}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Places Count */}
            <div className="p-4 bg-dark-card rounded-lg border border-gray-800">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">{filteredPlaces.length}</div>
                <div className="text-sm text-gray-400 mt-1">
                  {filteredPlaces.length === 1 ? 'Place' : 'Places'}
                  {(selectedListId || selectedTagIds.length > 0) && ' (filtered)'}
                </div>
              </div>
            </div>

            {/* Lists */}
            {data.lists.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">
                  Collections ({data.lists.length})
                </h3>
                <div className="space-y-2">
                  {data.lists.map(list => (
                    <button
                      key={list.id}
                      onClick={() => handleListClick(list.id)}
                      className={`w-full text-left p-3 rounded-lg transition-all ${
                        selectedListId === list.id
                          ? 'bg-primary/20 border border-primary/50'
                          : 'bg-dark-card border border-gray-800 hover:border-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {list.icon && <span className="text-xl">{list.icon}</span>}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-white truncate">{list.name}</div>
                          <div className="text-sm text-gray-400">{list.place_count} places</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {data.tags.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">
                  Tags ({data.tags.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {data.tags.map(tag => (
                    <button
                      key={tag.id}
                      onClick={() => handleTagClick(tag.id)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                        selectedTagIds.includes(tag.id)
                          ? 'bg-primary text-white'
                          : 'bg-dark-card text-gray-300 hover:bg-gray-700 border border-gray-700'
                      }`}
                    >
                      #{tag.name} ({tag.usage_count})
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Clear filters */}
            {(selectedListId || selectedTagIds.length > 0) && (
              <button
                onClick={clearFilters}
                className="w-full px-3 py-2 rounded-lg text-sm bg-red-900/30 text-red-400 hover:bg-red-900/50"
              >
                Clear all filters
              </button>
            )}
          </div>
        </aside>

        {/* Mobile Filters Overlay */}
        {showMobileFilters && (
          <div className="sm:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setShowMobileFilters(false)}>
            <div className="absolute bottom-0 left-0 right-0 bg-dark-card rounded-t-2xl p-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Filters</h3>
                <button
                  onClick={() => setShowMobileFilters(false)}
                  className="p-2 text-gray-400 hover:text-white"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* User Profile */}
              <div className="mb-6 p-4 bg-dark-lighter rounded-lg border border-gray-700">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                    {data.user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white truncate">{data.user.name}</h3>
                    {data.user.username && (
                      <p className="text-sm text-gray-400">@{data.user.username}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Places count */}
              <div className="mb-6 p-4 bg-dark-lighter rounded-lg border border-gray-700">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{filteredPlaces.length}</div>
                  <div className="text-sm text-gray-400 mt-1">
                    {filteredPlaces.length === 1 ? 'Place' : 'Places'}
                    {(selectedListId || selectedTagIds.length > 0) && ' (filtered)'}
                  </div>
                </div>
              </div>

              {/* Lists */}
              {data.lists.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">
                    Collections ({data.lists.length})
                  </h4>
                  <div className="space-y-2">
                    {data.lists.map(list => (
                      <button
                        key={list.id}
                        onClick={() => handleListClick(list.id)}
                        className={`w-full text-left p-3 rounded-lg transition-all ${
                          selectedListId === list.id
                            ? 'bg-primary/20 border border-primary/50'
                            : 'bg-dark-lighter border border-gray-700 hover:border-gray-600'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {list.icon && <span className="text-xl">{list.icon}</span>}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-white truncate">{list.name}</div>
                            <div className="text-sm text-gray-400">{list.place_count} places</div>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {data.tags.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">
                    Tags ({data.tags.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {data.tags.map(tag => (
                      <button
                        key={tag.id}
                        onClick={() => handleTagClick(tag.id)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                          selectedTagIds.includes(tag.id)
                            ? 'bg-primary text-white'
                            : 'bg-dark-lighter text-gray-300 hover:bg-gray-700 border border-gray-700'
                        }`}
                      >
                        #{tag.name} ({tag.usage_count})
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Clear filters */}
              {(selectedListId || selectedTagIds.length > 0) && (
                <button
                  onClick={() => {
                    clearFilters();
                    setShowMobileFilters(false);
                  }}
                  className="w-full px-3 py-2 rounded-lg text-sm bg-red-900/30 text-red-400 hover:bg-red-900/50"
                >
                  Clear all filters
                </button>
              )}
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 relative overflow-hidden">
          {viewMode === 'map' ? (
            <MapView
              places={filteredPlaces}
              selectedPlaceId={selectedPlace?.id || null}
              onPlaceSelect={setSelectedPlace}
            />
          ) : (
            <div className="h-full overflow-y-auto p-4">
              <div className="max-w-4xl mx-auto">
                <PlacesList
                  places={filteredPlaces}
                  onPlaceClick={setSelectedPlace}
                  showLetterNav={true}
                  navigateToPlace={false}
                />
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Place Detail Modal */}
      {selectedPlace && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-dark-card sm:rounded-lg max-w-lg w-full h-full sm:h-auto max-h-[100vh] sm:max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-dark-card border-b border-gray-700 px-4 sm:px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">{selectedPlace.name}</h2>
              <button
                onClick={() => setSelectedPlace(null)}
                className="text-gray-400 hover:text-white text-2xl p-2"
              >
                ✕
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4">
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-1">Address</h3>
                <p className="text-white">{selectedPlace.address}</p>
              </div>

              {selectedPlace.notes && (
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-1">Notes</h3>
                  <p className="text-white">{selectedPlace.notes}</p>
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
                    className="text-blue-400 hover:underline break-all"
                  >
                    {selectedPlace.website}
                  </a>
                </div>
              )}

              {selectedPlace.hours && (
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-1">Hours</h3>
                  <p className="text-white">{selectedPlace.hours}</p>
                </div>
              )}

              {selectedPlace.tags.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedPlace.tags.map(tag => (
                      <span
                        key={tag.id}
                        className="px-2 py-1 bg-dark-lighter text-gray-300 rounded-full text-sm"
                      >
                        #{tag.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {selectedPlace.lists.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Collections</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedPlace.lists.map(list => (
                      <span
                        key={list.id}
                        className="px-2 py-1 bg-dark-lighter text-gray-300 rounded-full text-sm flex items-center gap-1"
                      >
                        {list.icon && <span>{list.icon}</span>}
                        {list.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-4">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${selectedPlace.latitude},${selectedPlace.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary inline-block w-full text-center"
                >
                  Open in Google Maps
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      <PublicSignupCTA />
    </div>
  );
}
