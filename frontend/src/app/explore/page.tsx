'use client';

import { useState, useEffect, Suspense, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { usersApi, listsApi, searchApi, GooglePlaceResult } from '@/lib/api';
import type { UserSearchResult, ListWithPlaceCount } from '@/types';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';

type TabType = 'places' | 'users' | 'collections' | 'tags';

function ExplorePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, tags, setSelectedTagIds } = useStore();

  const initialQuery = searchParams?.get('q') || '';
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<TabType>('users');

  // Search results
  const [placeResults, setPlaceResults] = useState<GooglePlaceResult[]>([]);
  const [userResults, setUserResults] = useState<UserSearchResult[]>([]);
  const [collectionResults, setCollectionResults] = useState<ListWithPlaceCount[]>([]);

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
  const [actionLoading, setActionLoading] = useState<string | null>(null); // Track which user action is loading

  // Filter tags by search query (local filtering)
  const filteredTags = searchQuery.length >= 2
    ? tags.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 5)
    : [];

  const handleTagClick = (tagId: string) => {
    setSelectedTagIds([tagId]);
    router.push('/');
  };

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
    router.push(`/explore?q=${encodeURIComponent(searchQuery)}`);
    performSearch(searchQuery);
  };

  const handleFollow = async (userId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation to user profile
    setActionLoading(userId);
    try {
      const response = await usersApi.follow(userId);
      // Optimistically update the user in the results
      setUserResults(prev => prev.map(user =>
        user.id === userId
          ? { ...user, is_followed_by_me: true, follow_status: response.status as 'pending' | 'confirmed' }
          : user
      ));
      // Also update autocomplete results if present
      setAutocompleteResults(prev => ({
        ...prev,
        users: prev.users.map(user =>
          user.id === userId
            ? { ...user, is_followed_by_me: true, follow_status: response.status as 'pending' | 'confirmed' }
            : user
        )
      }));
    } catch (error: any) {
      console.error('Failed to follow user:', error);
      alert(error.response?.data?.detail || 'Failed to follow user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnfollow = async (userId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation to user profile
    if (!confirm('Are you sure you want to unfollow this user?')) return;

    setActionLoading(userId);
    try {
      await usersApi.unfollow(userId);
      // Optimistically update the user in the results
      setUserResults(prev => prev.map(user =>
        user.id === userId
          ? { ...user, is_followed_by_me: false, follow_status: null }
          : user
      ));
      // Also update autocomplete results if present
      setAutocompleteResults(prev => ({
        ...prev,
        users: prev.users.map(user =>
          user.id === userId
            ? { ...user, is_followed_by_me: false, follow_status: null }
            : user
        )
      }));
    } catch (error: any) {
      console.error('Failed to unfollow user:', error);
      alert(error.response?.data?.detail || 'Failed to unfollow user');
    } finally {
      setActionLoading(null);
    }
  };

  if (!token) {
    router.push('/login');
    return null;
  }

  const getTotalResults = () => {
    return placeResults.length + userResults.length + collectionResults.length + filteredTags.length;
  };

  return (
    <div className="h-screen flex flex-col bg-dark-bg">
      <Navbar />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar />

        <div className="flex-1 overflow-y-auto">
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
                      className="w-full input-field"
                      minLength={2}
                    />

                  {/* Autocomplete Dropdown */}
                  {showAutocomplete && searchQuery.length >= 2 && (autocompleteResults.users.length > 0 || autocompleteResults.places.length > 0 || autocompleteResults.collections.length > 0 || filteredTags.length > 0) && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-dark-card border border-gray-700 rounded-lg shadow-xl max-h-96 overflow-y-auto z-50">
                      {/* Users */}
                      {autocompleteResults.users.length > 0 && (
                        <div>
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

                      {/* Places */}
                      {autocompleteResults.places.length > 0 && (
                        <div className={autocompleteResults.users.length > 0 ? 'border-t border-gray-700' : ''}>
                          <div className="px-3 py-2 text-xs font-semibold text-gray-400 bg-dark-hover">Places</div>
                          {autocompleteResults.places.map((place) => (
                            <div
                              key={place.place_id}
                              className="px-3 py-2 hover:bg-dark-hover transition-colors"
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

                      {/* Collections */}
                      {autocompleteResults.collections.length > 0 && (
                        <div className={(autocompleteResults.users.length > 0 || autocompleteResults.places.length > 0) ? 'border-t border-gray-700' : ''}>
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

                      {/* Tags */}
                      {filteredTags.length > 0 && (
                        <div className={(autocompleteResults.users.length > 0 || autocompleteResults.places.length > 0 || autocompleteResults.collections.length > 0) ? 'border-t border-gray-700' : ''}>
                          <div className="px-3 py-2 text-xs font-semibold text-gray-400 bg-dark-hover">Tags</div>
                          {filteredTags.map((tag) => (
                            <button
                              key={tag.id}
                              type="button"
                              onClick={() => {
                                handleTagClick(tag.id);
                                setShowAutocomplete(false);
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-dark-hover transition-colors flex items-center gap-3"
                            >
                              <span className="text-lg text-primary">#</span>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-white truncate">{tag.name}</div>
                                <div className="text-xs text-gray-400">{tag.usage_count} {tag.usage_count === 1 ? 'place' : 'places'}</div>
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
                  <button
                    onClick={() => setActiveTab('tags')}
                    className={`px-4 py-2 font-medium transition-colors ${
                      activeTab === 'tags'
                        ? 'text-primary border-b-2 border-primary'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Tags ({filteredTags.length})
                  </button>
                </div>

                {getTotalResults() > 0 ? (
                  <>
                    {/* Users Tab */}
                    {activeTab === 'users' && (
                      <div className="space-y-3">
                        {userResults.length > 0 ? (
                          userResults.map((user) => (
                            <div
                              key={user.id}
                              className="p-4 bg-dark-card border border-gray-800 rounded-lg hover:border-primary/50 transition-all"
                            >
                              <div className="flex items-center gap-4">
                                <button
                                  onClick={() => router.push(`/users/${user.id}`)}
                                  className="flex items-center gap-4 flex-1 min-w-0 text-left"
                                >
                                  <div className="w-12 h-12 bg-gradient-to-br from-primary to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                                    {user.name.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-white truncate">{user.name}</div>
                                    {user.username && (
                                      <div className="text-sm text-gray-400">@{user.username}</div>
                                    )}
                                    {user.is_public ? (
                                      <span className="inline-block mt-1 text-xs bg-green-900/30 text-green-400 px-2 py-1 rounded-full">
                                        Public
                                      </span>
                                    ) : (
                                      <span className="inline-block mt-1 text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded-full">
                                        Private
                                      </span>
                                    )}
                                  </div>
                                </button>
                                <div className="flex-shrink-0">
                                  {user.is_followed_by_me ? (
                                    <button
                                      onClick={(e) => handleUnfollow(user.id, e)}
                                      disabled={actionLoading === user.id}
                                      className="btn-secondary text-sm flex items-center gap-1"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                      </svg>
                                      {actionLoading === user.id ? 'Updating...' : 'Following'}
                                    </button>
                                  ) : user.follow_status === 'pending' ? (
                                    <button
                                      disabled
                                      className="btn-secondary text-sm opacity-50 cursor-not-allowed flex items-center gap-1"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                      </svg>
                                      Pending
                                    </button>
                                  ) : (
                                    <button
                                      onClick={(e) => handleFollow(user.id, e)}
                                      disabled={actionLoading === user.id}
                                      className="btn-primary text-sm flex items-center gap-1"
                                    >
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                      </svg>
                                      {actionLoading === user.id ? 'Processing...' : 'Follow'}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
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

                    {/* Tags Tab */}
                    {activeTab === 'tags' && (
                      <div className="space-y-3">
                        {filteredTags.length > 0 ? (
                          filteredTags.map((tag) => (
                            <button
                              key={tag.id}
                              onClick={() => handleTagClick(tag.id)}
                              className="w-full text-left p-4 bg-dark-card border border-gray-800 rounded-lg hover:border-primary/50 transition-all"
                            >
                              <div className="flex items-center gap-4">
                                <span className="text-3xl text-primary">#</span>
                                <div className="flex-1 min-w-0">
                                  <div className="font-semibold text-white truncate">{tag.name}</div>
                                  <div className="text-sm text-gray-400 mt-1">
                                    {tag.usage_count} {tag.usage_count === 1 ? 'place' : 'places'}
                                  </div>
                                </div>
                                <svg className="w-5 h-5 text-gray-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="text-center py-12">
                            <div className="text-gray-400">No matching tags found</div>
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
                <div className="text-gray-400 mb-2">Explore everything</div>
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
