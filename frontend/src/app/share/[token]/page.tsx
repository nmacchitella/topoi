'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { shareApi } from '@/lib/api';
import type { SharedMapData, Place } from '@/types';

// Dynamically import Map component (client-side only)
const Map = dynamic(() => import('@/components/Map'), { ssr: false });

export default function SharedMapPage() {
  const params = useParams();
  const token = params.token as string;

  const [data, setData] = useState<SharedMapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

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
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">
                Topoi
              </h1>
              <span className="text-gray-500">•</span>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Shared by</span>
                <span className="font-medium text-white">
                  {data.user.username ? `@${data.user.username}` : data.user.name}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="hidden sm:flex sm:w-80 bg-dark-lighter border-r border-gray-800/50 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* User Profile */}
            <div className="p-4 bg-dark-card rounded-lg border border-gray-800">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-primary to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
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
          </div>
        </aside>

        {/* Map */}
        <main className="flex-1 relative">
          <Map
            places={filteredPlaces}
            selectedPlace={selectedPlace}
            onPlaceClick={setSelectedPlace}
            center={
              filteredPlaces.length > 0
                ? { lat: filteredPlaces[0].latitude, lng: filteredPlaces[0].longitude }
                : { lat: 40.7128, lng: -74.0060 }
            }
            zoom={filteredPlaces.length > 0 ? 12 : 4}
            readOnly={true}
          />
        </main>
      </div>
    </div>
  );
}
