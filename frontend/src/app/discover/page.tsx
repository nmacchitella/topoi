'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { usersApi, listsApi, searchApi, GooglePlaceResult } from '@/lib/api';
import type { UserSearchResult, ListWithPlaceCount } from '@/types';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';

type TabType = 'places' | 'users' | 'collections';

function DiscoverPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token } = useStore();

  const initialQuery = searchParams?.get('q') || '';
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<TabType>('users');

  // Search results
  const [placeResults, setPlaceResults] = useState<GooglePlaceResult[]>([]);
  const [userResults, setUserResults] = useState<UserSearchResult[]>([]);
  const [collectionResults, setCollectionResults] = useState<ListWithPlaceCount[]>([]);

  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery);
    }
  }, [initialQuery]);

  const performSearch = async (query: string) => {
    if (!query.trim() || query.length < 2) return;

    setSearching(true);
    setHasSearched(true);
    try {
      // Parallel search across all categories
      const [placesRes, usersRes, collectionsRes] = await Promise.all([
        searchApi.googlePlaces(query).catch(() => []),
        usersApi.search(query, 50).catch(() => []),
        listsApi.searchPublic(query, 50).catch(() => []),
      ]);

      setPlaceResults(placesRes);
      setUserResults(usersRes);
      setCollectionResults(collectionsRes);
    } catch (error) {
      console.error('Search failed:', error);
      setPlaceResults([]);
      setUserResults([]);
      setCollectionResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || searchQuery.length < 2) return;

    // Update URL with query param
    router.push(`/discover?q=${encodeURIComponent(searchQuery)}`);
    performSearch(searchQuery);
  };

  if (!token) {
    router.push('/login');
    return null;
  }

  const getTotalResults = () => {
    return placeResults.length + userResults.length + collectionResults.length;
  };

  return (
    <div className="h-screen flex flex-col bg-dark-bg">
      <Navbar />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar />

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-4 sm:p-8">
            <h1 className="text-3xl font-bold mb-6">Discover</h1>

            {/* Search Form */}
            <form onSubmit={handleSearch} className="mb-6">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for places, users, or collections..."
                  className="flex-1 input-field"
                  minLength={2}
                />
                <button
                  type="submit"
                  disabled={searching || searchQuery.length < 2}
                  className="btn-primary"
                >
                  {searching ? 'Searching...' : 'Search'}
                </button>
              </div>
            </form>

            {/* Results */}
            {searching ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <div className="text-gray-400">Searching...</div>
              </div>
            ) : hasSearched ? (
              <>
                {/* Tabs */}
                <div className="flex gap-1 mb-6 border-b border-gray-800">
                  <button
                    onClick={() => setActiveTab('users')}
                    className={`px-4 py-2 font-medium transition-colors ${
                      activeTab === 'users'
                        ? 'text-primary border-b-2 border-primary'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Users ({userResults.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('places')}
                    className={`px-4 py-2 font-medium transition-colors ${
                      activeTab === 'places'
                        ? 'text-primary border-b-2 border-primary'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Places ({placeResults.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('collections')}
                    className={`px-4 py-2 font-medium transition-colors ${
                      activeTab === 'collections'
                        ? 'text-primary border-b-2 border-primary'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Collections ({collectionResults.length})
                  </button>
                </div>

                {getTotalResults() > 0 ? (
                  <>
                    {/* Users Tab */}
                    {activeTab === 'users' && (
                      <div className="space-y-3">
                        {userResults.length > 0 ? (
                          userResults.map((user) => (
                            <button
                              key={user.id}
                              onClick={() => router.push(`/users/${user.id}`)}
                              className="w-full text-left p-4 bg-dark-card border border-gray-800 rounded-lg hover:border-primary/50 transition-all"
                            >
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-primary to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                                  {user.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-white truncate">{user.name}</div>
                                  {user.username && (
                                    <div className="text-sm text-gray-400">@{user.username}</div>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  {user.is_public ? (
                                    <span className="text-xs bg-green-900/30 text-green-400 px-2 py-1 rounded-full">
                                      Public
                                    </span>
                                  ) : (
                                    <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded-full">
                                      Private
                                    </span>
                                  )}
                                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </div>
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="text-center py-12">
                            <div className="text-gray-400">No users found</div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Places Tab */}
                    {activeTab === 'places' && (
                      <div className="space-y-3">
                        {placeResults.length > 0 ? (
                          placeResults.map((place) => (
                            <div
                              key={place.place_id}
                              className="p-4 bg-dark-card border border-gray-800 rounded-lg"
                            >
                              <div className="flex items-start gap-3">
                                <span className="text-2xl">📍</span>
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-white truncate">
                                    {place.main_text || place.description.split(',')[0]}
                                  </div>
                                  <div className="text-sm text-gray-400 mt-1">
                                    {place.secondary_text || place.description}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-2">
                                    Click on the home page search to add this place to your map
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center py-12">
                            <div className="text-gray-400">No places found</div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Collections Tab */}
                    {activeTab === 'collections' && (
                      <div className="space-y-3">
                        {collectionResults.length > 0 ? (
                          collectionResults.map((list) => (
                            <button
                              key={list.id}
                              onClick={() => router.push(`/collections/${list.id}`)}
                              className="w-full text-left p-4 bg-dark-card border border-gray-800 rounded-lg hover:border-primary/50 transition-all"
                            >
                              <div className="flex items-center gap-4">
                                <span className="text-3xl">{list.icon || '📂'}</span>
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-white truncate">{list.name}</div>
                                  <div className="text-sm text-gray-400 mt-1">
                                    by {list.owner_name || list.owner_username} • {list.place_count} {list.place_count === 1 ? 'place' : 'places'}
                                  </div>
                                  {list.is_public && (
                                    <span className="inline-block mt-2 text-xs bg-green-900/30 text-green-400 px-2 py-1 rounded-full">
                                      Public
                                    </span>
                                  )}
                                </div>
                                <svg className="w-5 h-5 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="text-center py-12">
                            <div className="text-gray-400">No collections found</div>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-12">
                    <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <div className="text-gray-400 mb-2">No results found for "{searchQuery}"</div>
                    <div className="text-sm text-gray-500">Try a different search term</div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <div className="text-gray-400 mb-2">Discover everything</div>
                <div className="text-sm text-gray-500">Search for users, places, and collections</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <BottomNav showNewButton={false} />
    </div>
  );
}

export default function DiscoverPage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-dark-bg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <div className="text-white text-lg">Loading...</div>
        </div>
      </div>
    }>
      <DiscoverPageContent />
    </Suspense>
  );
}
