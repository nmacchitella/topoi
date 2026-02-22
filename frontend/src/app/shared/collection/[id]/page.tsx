'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { shareApi } from '@/lib/api';
import type { Place, Tag, SharedListData } from '@/types';
import dynamic from 'next/dynamic';
import PlacesList from '@/components/PlacesList';
import PublicSignupCTA from '@/components/PublicSignupCTA';
import PublicPlaceDetailModal from '@/components/PublicPlaceDetailModal';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

type ViewMode = 'map' | 'list';

export default function SharedCollectionPage() {
  const params = useParams();
  const collectionId = params.id as string;

  const [data, setData] = useState<SharedListData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('map');
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  // Extract unique tags from places
  const tags = useMemo(() => {
    if (!data) return [];
    const tagMap = new Map<string, Tag & { usage_count: number }>();

    data.places.forEach(place => {
      place.tags.forEach(tag => {
        if (tagMap.has(tag.id)) {
          const existing = tagMap.get(tag.id)!;
          existing.usage_count++;
        } else {
          tagMap.set(tag.id, { ...tag, usage_count: 1 });
        }
      });
    });

    return Array.from(tagMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [data]);

  useEffect(() => {
    const loadSharedCollection = async () => {
      try {
        const result = await shareApi.getSharedList(collectionId);
        setData(result);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Collection not found or not public');
      } finally {
        setLoading(false);
      }
    };

    loadSharedCollection();
  }, [collectionId]);

  const filteredPlaces = useMemo(() => {
    if (!data) return [];
    if (selectedTagIds.length === 0) return data.places;

    return data.places.filter(place =>
      place.tags.some(tag => selectedTagIds.includes(tag.id))
    );
  }, [data, selectedTagIds]);

  const handleTagClick = (tagId: string) => {
    setSelectedTagIds(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-dark-bg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <div className="text-white text-lg">Loading collection...</div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="h-screen flex items-center justify-center bg-dark-bg p-4">
        <div className="max-w-md w-full bg-dark-card border border-red-500/30 rounded-xl p-6 text-center">
          <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h1 className="text-2xl font-bold text-white mb-2">Collection Not Found</h1>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-dark-bg">
      {/* Header */}
      <header className="bg-dark-lighter border-b border-gray-800/50 px-4 py-3.5 z-50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">Topoi</h1>
            <span className="hidden sm:inline text-gray-500">&bull;</span>
            <div className="hidden sm:flex items-center gap-2">
              {data.list.icon && <span className="text-xl">{data.list.icon}</span>}
              <span className="font-medium text-white">{data.list.name}</span>
              <span className="text-gray-500">&bull;</span>
              <span className="text-gray-400">
                by {data.owner.username ? `@${data.owner.username}` : data.owner.name}
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

        {/* Mobile collection name */}
        <div className="sm:hidden mt-2 flex items-center gap-2">
          {data.list.icon && <span className="text-lg">{data.list.icon}</span>}
          <span className="font-medium text-white text-sm">{data.list.name}</span>
          <span className="text-gray-500 text-sm">&bull;</span>
          <span className="text-gray-400 text-sm">
            by {data.owner.username ? `@${data.owner.username}` : data.owner.name}
          </span>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden sm:flex sm:w-80 bg-dark-lighter border-r border-gray-800/50 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* Collection Info */}
            <div className="p-4 bg-dark-card rounded-lg border border-gray-800">
              <div className="flex items-center gap-3 mb-3">
                {data.list.icon && <span className="text-2xl">{data.list.icon}</span>}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white truncate">{data.list.name}</h3>
                  <p className="text-sm text-gray-400">
                    by {data.owner.username ? `@${data.owner.username}` : data.owner.name}
                  </p>
                </div>
              </div>
            </div>

            {/* Places Count */}
            <div className="p-4 bg-dark-card rounded-lg border border-gray-800">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">{filteredPlaces.length}</div>
                <div className="text-sm text-gray-400 mt-1">
                  {filteredPlaces.length === 1 ? 'Place' : 'Places'}
                  {selectedTagIds.length > 0 && ' (filtered)'}
                </div>
              </div>
            </div>

            {/* Tags */}
            {tags.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">
                  Tags ({tags.length})
                </h3>
                <div className="flex flex-wrap gap-2">
                  {tags.map(tag => (
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
                {selectedTagIds.length > 0 && (
                  <button
                    onClick={() => setSelectedTagIds([])}
                    className="mt-3 w-full px-3 py-2 rounded-lg text-sm bg-red-900/30 text-red-400 hover:bg-red-900/50"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}
          </div>
        </aside>

        {/* Mobile Filters Overlay */}
        {showMobileFilters && (
          <div className="sm:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setShowMobileFilters(false)}>
            <div className="absolute bottom-0 left-0 right-0 bg-dark-card rounded-t-2xl p-4 max-h-[70vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
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

              {/* Places count */}
              <div className="mb-6 p-4 bg-dark-lighter rounded-lg border border-gray-700">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{filteredPlaces.length}</div>
                  <div className="text-sm text-gray-400 mt-1">
                    {filteredPlaces.length === 1 ? 'Place' : 'Places'}
                    {selectedTagIds.length > 0 && ' (filtered)'}
                  </div>
                </div>
              </div>

              {/* Tags */}
              {tags.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">
                    Tags ({tags.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {tags.map(tag => (
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
                  {selectedTagIds.length > 0 && (
                    <button
                      onClick={() => {
                        setSelectedTagIds([]);
                        setShowMobileFilters(false);
                      }}
                      className="mt-4 w-full px-3 py-2 rounded-lg text-sm bg-red-900/30 text-red-400 hover:bg-red-900/50"
                    >
                      Clear filters
                    </button>
                  )}
                </div>
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
                  readOnly={true}
                />
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Place Detail Modal */}
      {selectedPlace && (
        <PublicPlaceDetailModal
          place={selectedPlace}
          onClose={() => setSelectedPlace(null)}
        />
      )}

      <PublicSignupCTA />
    </div>
  );
}
