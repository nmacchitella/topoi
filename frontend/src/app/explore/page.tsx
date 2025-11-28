'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { usersApi, listsApi, searchApi, exploreApi, GooglePlaceResult, TopPlace } from '@/lib/api';
import type { UserSearchResult, ListWithPlaceCount } from '@/types';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';
import PullToRefresh from '@/components/PullToRefresh';

type TabType = 'places' | 'users' | 'collections';

function ExplorePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token } = useStore();

  const initialQuery = searchParams?.get('q') || '';
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<TabType>('places');

  // Search results
  const [placeResults, setPlaceResults] = useState<GooglePlaceResult[]>([]);
  const [userResults, setUserResults] = useState<UserSearchResult[]>([]);
  const [collectionResults, setCollectionResults] = useState<ListWithPlaceCount[]>([]);

  // Recommendation feed
  const [topPlaces, setTopPlaces] = useState<TopPlace[]>([]);
  const [topUsers, setTopUsers] = useState<UserSearchResult[]>([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Autocomplete
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [autocompleteResults, setAutocompleteResults] = useState<{
    places: GooglePlaceResult[];
    users: UserSearchResult[];
    collections: ListWithPlaceCount[];
  }>({ places: [], users: [], collections: [] });
  const autocompleteRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Get user location on mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        () => {
          // Geolocation denied or unavailable - will use Manhattan default
          setUserLocation(null);
        },
        { timeout: 5000 }
      );
    }
  }, []);

  // Load recommendation feed on mount
  useEffect(() => {
    if (!token) return;

    const loadFeed = async () => {
      setFeedLoading(true);
      try {
        const [places, users] = await Promise.all([
          exploreApi.getTopPlaces(userLocation?.lat, userLocation?.lng, 10).catch(() => []),
          exploreApi.getTopUsers(5).catch(() => [])
        ]);
        setTopPlaces(places);
        setTopUsers(users);
      } catch (error) {
        console.error('Failed to load feed:', error);
      } finally {
        setFeedLoading(false);
      }
    };

    loadFeed();
  }, [token, userLocation]);

  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery);
    }
  }, [initialQuery]);

  // Debounced autocomplete
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (searchQuery.length < 2) {
      setAutocompleteResults({ places: [], users: [], collections: [] });
      setShowAutocomplete(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const [placesRes, usersRes, collectionsRes] = await Promise.all([
          searchApi.googlePlaces(searchQuery).catch(() => []),
          usersApi.search(searchQuery, 5).catch(() => []),
          listsApi.searchPublic(searchQuery, 5).catch(() => []),
        ]);

        setAutocompleteResults({
          places: placesRes.slice(0, 3),
          users: usersRes.slice(0, 3),
          collections: collectionsRes.slice(0, 3),
        });
      } catch (error) {
        console.error('Autocomplete failed:', error);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery]);

  // Close autocomplete on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(e.target as Node)) {
        setShowAutocomplete(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const performSearch = async (query: string) => {
    if (!query.trim() || query.length < 2) return;

    setSearching(true);
    setHasSearched(true);
    try {
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

    router.push(`/explore?q=${encodeURIComponent(searchQuery)}`);
    performSearch(searchQuery);
  };

  const handleFollow = async (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActionLoading(userId);
    try {
      const response = await usersApi.follow(userId);
      // Update results
      const updateUser = (user: UserSearchResult) =>
        user.id === userId
          ? { ...user, is_followed_by_me: true, follow_status: response.status as 'pending' | 'confirmed' }
          : user;

      setUserResults(prev => prev.map(updateUser));
      setTopUsers(prev => prev.map(updateUser));
      setAutocompleteResults(prev => ({
        ...prev,
        users: prev.users.map(updateUser)
      }));
    } catch (error: any) {
      console.error('Failed to follow user:', error);
      alert(error.response?.data?.detail || 'Failed to follow user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnfollow = async (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to unfollow this user?')) return;

    setActionLoading(userId);
    try {
      await usersApi.unfollow(userId);
      const updateUser = (user: UserSearchResult) =>
        user.id === userId
          ? { ...user, is_followed_by_me: false, follow_status: null }
          : user;

      setUserResults(prev => prev.map(updateUser));
      setTopUsers(prev => prev.map(updateUser));
      setAutocompleteResults(prev => ({
        ...prev,
        users: prev.users.map(updateUser)
      }));
    } catch (error: any) {
      console.error('Failed to unfollow user:', error);
      alert(error.response?.data?.detail || 'Failed to unfollow user');
    } finally {
      setActionLoading(null);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setHasSearched(false);
    setPlaceResults([]);
    setUserResults([]);
    setCollectionResults([]);
    router.push('/explore');
  };

  if (!token) {
    router.push('/login');
    return null;
  }

  const getTotalResults = () => {
    return placeResults.length + userResults.length + collectionResults.length;
  };

  // User card component for reuse
  const UserCard = ({ user, compact = false }: { user: UserSearchResult; compact?: boolean }) => (
    <div
      className={`${compact ? 'p-3' : 'p-4'} bg-dark-card border border-gray-800 rounded-lg hover:border-primary/50 transition-all`}
    >
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push(`/users/${user.id}`)}
          className="flex items-center gap-3 flex-1 min-w-0 text-left"
        >
          <div className={`${compact ? 'w-10 h-10 text-sm' : 'w-12 h-12 text-lg'} bg-gradient-to-br from-primary to-blue-600 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`}>
            {user.name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-white truncate">{user.name}</div>
            {user.username && (
              <div className="text-sm text-gray-400">@{user.username}</div>
            )}
            {user.place_count !== undefined && (
              <div className="text-xs text-gray-500 mt-0.5">{user.place_count} places</div>
            )}
          </div>
        </button>
        <div className="flex-shrink-0">
          {user.is_followed_by_me ? (
            <button
              onClick={(e) => handleUnfollow(user.id, e)}
              disabled={actionLoading === user.id}
              className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {actionLoading === user.id ? '...' : 'Following'}
            </button>
          ) : user.follow_status === 'pending' ? (
            <button disabled className="btn-secondary text-xs px-3 py-1.5 opacity-50 cursor-not-allowed">
              Pending
            </button>
          ) : (
            <button
              onClick={(e) => handleFollow(user.id, e)}
              disabled={actionLoading === user.id}
              className="btn-primary text-xs px-3 py-1.5"
            >
              {actionLoading === user.id ? '...' : 'Follow'}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="mobile-layout bg-dark-bg">
      <Navbar />

      <div className="flex-1 flex overflow-hidden mobile-content-area">
        <Sidebar />

        <div className="flex-1 overflow-hidden">
          <PullToRefresh onRefresh={async () => {
            if (hasSearched && searchQuery) {
              await performSearch(searchQuery);
            } else {
              const [places, users] = await Promise.all([
                exploreApi.getTopPlaces(userLocation?.lat, userLocation?.lng, 10).catch(() => []),
                exploreApi.getTopUsers(5).catch(() => [])
              ]);
              setTopPlaces(places);
              setTopUsers(users);
            }
          }}>
            <div className="max-w-4xl mx-auto p-4 sm:p-8">
              <h1 className="text-3xl font-bold mb-6">Explore</h1>

              {/* Search Form */}
              <div className="mb-6 relative" ref={autocompleteRef}>
                <form onSubmit={handleSearch}>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setShowAutocomplete(true);
                        }}
                        onFocus={() => setShowAutocomplete(true)}
                        placeholder="Search for places, users, or collections..."
                        className="w-full input-field pr-10"
                        minLength={2}
                      />
                      {searchQuery && (
                        <button
                          type="button"
                          onClick={clearSearch}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}

                      {/* Autocomplete Dropdown */}
                      {showAutocomplete && searchQuery.length >= 2 && (autocompleteResults.users.length > 0 || autocompleteResults.places.length > 0 || autocompleteResults.collections.length > 0) && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-dark-card border border-gray-700 rounded-lg shadow-xl max-h-96 overflow-y-auto z-50">
                          {/* Places first */}
                          {autocompleteResults.places.length > 0 && (
                            <div>
                              <div className="px-3 py-2 text-xs font-semibold text-gray-400 bg-dark-hover">Places</div>
                              {autocompleteResults.places.map((place) => (
                                <div
                                  key={place.place_id}
                                  className="px-3 py-2 hover:bg-dark-hover transition-colors cursor-pointer"
                                  onClick={() => {
                                    setSearchQuery(place.main_text || place.description.split(',')[0]);
                                    setShowAutocomplete(false);
                                  }}
                                >
                                  <div className="text-sm font-medium text-white truncate">
                                    {place.main_text || place.description.split(',')[0]}
                                  </div>
                                  <div className="text-xs text-gray-400 truncate">
                                    {place.secondary_text || place.description}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Users */}
                          {autocompleteResults.users.length > 0 && (
                            <div className={autocompleteResults.places.length > 0 ? 'border-t border-gray-700' : ''}>
                              <div className="px-3 py-2 text-xs font-semibold text-gray-400 bg-dark-hover">Users</div>
                              {autocompleteResults.users.map((user) => (
                                <button
                                  key={user.id}
                                  type="button"
                                  onClick={() => {
                                    router.push(`/users/${user.id}`);
                                    setShowAutocomplete(false);
                                  }}
                                  className="w-full text-left px-3 py-2 hover:bg-dark-hover transition-colors flex items-center gap-3"
                                >
                                  <div className="w-8 h-8 bg-gradient-to-br from-primary to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
                                    {user.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-white truncate">{user.name}</div>
                                    {user.username && <div className="text-xs text-gray-400">@{user.username}</div>}
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Collections */}
                          {autocompleteResults.collections.length > 0 && (
                            <div className={(autocompleteResults.places.length > 0 || autocompleteResults.users.length > 0) ? 'border-t border-gray-700' : ''}>
                              <div className="px-3 py-2 text-xs font-semibold text-gray-400 bg-dark-hover">Collections</div>
                              {autocompleteResults.collections.map((list) => (
                                <button
                                  key={list.id}
                                  type="button"
                                  onClick={() => {
                                    router.push(`/collections/${list.id}`);
                                    setShowAutocomplete(false);
                                  }}
                                  className="w-full text-left px-3 py-2 hover:bg-dark-hover transition-colors flex items-center gap-3"
                                >
                                  <span className="text-lg">{list.icon || '📂'}</span>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-white truncate">{list.name}</div>
                                    <div className="text-xs text-gray-400">by {list.owner_name || list.owner_username}</div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={searching || searchQuery.length < 2}
                      className="btn-primary"
                    >
                      {searching ? 'Searching...' : 'Search'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Results */}
              {searching ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <div className="text-gray-400">Searching...</div>
                </div>
              ) : hasSearched ? (
                <>
                  {/* Tabs - Reordered: Places, Users, Collections */}
                  <div className="flex gap-1 mb-6 border-b border-gray-800">
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
                      {/* Places Tab */}
                      {activeTab === 'places' && (
                        <div className="space-y-3">
                          {placeResults.length > 0 ? (
                            placeResults.map((place) => (
                              <a
                                key={place.place_id}
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.description)}&query_place_id=${place.place_id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block p-4 bg-dark-card border border-gray-800 rounded-lg hover:border-primary/50 transition-all"
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
                                    <div className="text-xs text-primary mt-2 flex items-center gap-1">
                                      <span>View on Google Maps</span>
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                      </svg>
                                    </div>
                                  </div>
                                </div>
                              </a>
                            ))
                          ) : (
                            <div className="text-center py-12">
                              <div className="text-gray-400">No places found</div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Users Tab */}
                      {activeTab === 'users' && (
                        <div className="space-y-3">
                          {userResults.length > 0 ? (
                            userResults.map((user) => (
                              <UserCard key={user.id} user={user} />
                            ))
                          ) : (
                            <div className="text-center py-12">
                              <div className="text-gray-400">No users found</div>
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
                      <div className="text-gray-400 mb-2">No results found for &quot;{searchQuery}&quot;</div>
                      <div className="text-sm text-gray-500">Try a different search term</div>
                    </div>
                  )}
                </>
              ) : (
                /* Recommendation Feed */
                <div className="space-y-8">
                  {feedLoading ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                      <div className="text-gray-400">Loading recommendations...</div>
                    </div>
                  ) : (
                    <>
                      {/* Popular Places Near You */}
                      <section>
                        <div className="flex items-center gap-2 mb-4">
                          <span className="text-xl">📍</span>
                          <h2 className="text-xl font-semibold">Popular Places Near You</h2>
                        </div>
                        {topPlaces.length > 0 ? (
                          <div className="space-y-3">
                            {topPlaces.map((place) => (
                              <button
                                key={place.id}
                                onClick={() => place.owner && router.push(`/users/${place.owner.id}`)}
                                className="w-full text-left p-4 bg-dark-card border border-gray-800 rounded-lg hover:border-primary/50 transition-all"
                              >
                                <div className="flex items-start gap-3">
                                  <div className="flex-shrink-0 w-10 h-10 bg-primary/20 rounded-lg flex items-center justify-center">
                                    <span className="text-lg">📍</span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                      <div className="font-semibold text-white truncate">{place.name}</div>
                                      {place.user_count > 1 && (
                                        <span className="flex-shrink-0 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                                          {place.user_count} users
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-sm text-gray-400 mt-0.5 truncate">{place.address}</div>
                                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                                      {place.owner && (
                                        <span>by {place.owner.name}</span>
                                      )}
                                      <span>{place.distance_km} km away</span>
                                    </div>
                                    {place.tags.length > 0 && (
                                      <div className="flex flex-wrap gap-1 mt-2">
                                        {place.tags.map((tag) => (
                                          <span
                                            key={tag.id}
                                            className="text-xs px-2 py-0.5 rounded-full"
                                            style={{
                                              backgroundColor: `${tag.color}20`,
                                              color: tag.color
                                            }}
                                          >
                                            {tag.icon && <span className="mr-1">{tag.icon}</span>}
                                            {tag.name}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            <p>No popular places found nearby</p>
                            <p className="text-sm mt-1">Try searching for places above</p>
                          </div>
                        )}
                      </section>

                      {/* Discover Accounts */}
                      <section>
                        <div className="flex items-center gap-2 mb-4">
                          <span className="text-xl">👥</span>
                          <h2 className="text-xl font-semibold">Discover Accounts</h2>
                        </div>
                        {topUsers.length > 0 ? (
                          <div className="space-y-2">
                            {topUsers.map((user) => (
                              <UserCard key={user.id} user={user} compact />
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-gray-500">
                            <p>No accounts to discover yet</p>
                          </div>
                        )}
                      </section>
                    </>
                  )}
                </div>
              )}
            </div>
          </PullToRefresh>
        </div>
      </div>

      <BottomNav showNewButton={false} />
    </div>
  );
}

export default function ExplorePage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-dark-bg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <div className="text-white text-lg">Loading...</div>
        </div>
      </div>
    }>
      <ExplorePageContent />
    </Suspense>
  );
}
