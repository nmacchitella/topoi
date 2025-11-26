'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { searchApi, listsApi, usersApi, GooglePlaceResult } from '@/lib/api';
import type { Place, NominatimResult, ListWithPlaceCount, UserSearchResult } from '@/types';

interface UnifiedSearchBarProps {
  onPlaceClick: (place: Place) => void;
  onNominatimSelect: (result: NominatimResult) => void;
  onAddNew: (name: string) => void;
  mapCenter?: { lat: number; lng: number };
}

export default function UnifiedSearchBar({ onPlaceClick, onNominatimSelect, onAddNew, mapCenter }: UnifiedSearchBarProps) {
  const router = useRouter();
  const { places, lists } = useStore();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // Search results
  const [googleResults, setGoogleResults] = useState<GooglePlaceResult[]>([]);
  const [userResults, setUserResults] = useState<UserSearchResult[]>([]);
  const [publicLists, setPublicLists] = useState<ListWithPlaceCount[]>([]);
  const [followingUsers, setFollowingUsers] = useState<UserSearchResult[]>([]);

  const [searchLoading, setSearchLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Responsive result limits
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  const LIMIT_SMALL = isMobile ? 2 : 3;
  const LIMIT_LARGE = isMobile ? 3 : 5;

  // Filter saved places by query
  const filteredPlaces = query.length >= 2
    ? places.filter(p =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.address.toLowerCase().includes(query.toLowerCase())
      ).slice(0, LIMIT_SMALL)
    : [];

  // Filter my collections by query
  const filteredMyLists = query.length >= 2
    ? lists.filter(l =>
        l.name.toLowerCase().includes(query.toLowerCase())
      ).slice(0, LIMIT_SMALL)
    : [];

  // Debounced search for all external results
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.length < 2) {
      setGoogleResults([]);
      setUserResults([]);
      setPublicLists([]);
      setFollowingUsers([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        // Parallel search across all categories
        const [googleRes, usersRes, publicListsRes, followingRes] = await Promise.all([
          // Google Places
          searchApi.googlePlaces(query, mapCenter?.lat, mapCenter?.lng).catch(() => []),
          // All users
          usersApi.search(query, 10).catch(() => []),
          // Public collections
          listsApi.searchPublic(query, 10).catch(() => []),
          // Following users
          usersApi.getFollowing().catch(() => []),
        ]);

        setGoogleResults(googleRes);
        setUserResults(usersRes);
        setPublicLists(publicListsRes);

        // Filter following users by query
        const filteredFollowing = followingRes.filter(u =>
          u.name.toLowerCase().includes(query.toLowerCase()) ||
          (u.username && u.username.toLowerCase().includes(query.toLowerCase()))
        );
        setFollowingUsers(filteredFollowing);
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, mapCenter?.lat, mapCenter?.lng]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePlaceSelect = (place: Place) => {
    setQuery('');
    setIsOpen(false);
    onPlaceClick(place);
  };

  const handleGoogleSelect = async (result: GooglePlaceResult) => {
    setQuery('');
    setIsOpen(false);
    const details = await searchApi.googlePlaceDetails(result.place_id);
    if (details) {
      onNominatimSelect({
        place_id: result.place_id,
        display_name: result.description,
        lat: String(details.lat),
        lon: String(details.lng),
        address: { road: '', city: '', country: '' },
        google_metadata: {
          name: details.name,
          website: details.website,
          phone: details.phone,
          hours: details.hours,
          google_maps_uri: details.google_maps_uri,
          types: details.types,
        },
      });
    }
  };

  const handleAddNew = () => {
    const name = query.trim();
    setQuery('');
    setIsOpen(false);
    onAddNew(name);
  };

  const handleUserClick = (userId: string) => {
    setQuery('');
    setIsOpen(false);
    router.push(`/users/${userId}`);
  };

  const handleListClick = (listId: string) => {
    setQuery('');
    setIsOpen(false);
    router.push(`/collections/${listId}`);
  };

  const handleViewMore = () => {
    const encodedQuery = encodeURIComponent(query);
    setIsOpen(false);
    router.push(`/discover?q=${encodedQuery}`);
  };

  const showDropdown = isOpen && query.length >= 2;
  const hasResults = filteredPlaces.length > 0 ||
                    googleResults.length > 0 ||
                    userResults.length > 0 ||
                    publicLists.length > 0 ||
                    followingUsers.length > 0 ||
                    filteredMyLists.length > 0;

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        placeholder="Search places, users, collections..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        className="input-field w-full sm:w-64"
      />

      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-dark-card border border-gray-700 rounded-lg shadow-xl max-h-[32rem] overflow-y-auto z-[60]">
          {/* Create New Option */}
          {query.trim().length >= 2 && (
            <button
              onClick={handleAddNew}
              className="w-full text-left px-3 py-3 hover:bg-dark-hover transition-colors flex items-center gap-3 border-b border-gray-700"
            >
              <span className="text-lg text-green-400">+</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-white">Create "{query.trim()}"</div>
                <div className="text-xs text-gray-400">Add as a new place</div>
              </div>
            </button>
          )}

          {searchLoading ? (
            <div className="px-3 py-4 text-sm text-gray-400 text-center">Searching...</div>
          ) : hasResults ? (
            <>
              {/* My Places */}
              {filteredPlaces.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-semibold text-gray-400 bg-dark-hover">
                    My Places
                  </div>
                  {filteredPlaces.map((place) => (
                    <button
                      key={place.id}
                      onClick={() => handlePlaceSelect(place)}
                      className="w-full text-left px-3 py-2 hover:bg-dark-hover transition-colors flex items-center gap-3"
                    >
                      <span className="text-lg">📍</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate">{place.name}</div>
                        <div className="text-xs text-gray-400 truncate">{place.address}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* New Places (Google) */}
              {googleResults.length > 0 && (
                <div className={filteredPlaces.length > 0 ? 'border-t border-gray-700' : ''}>
                  <div className="px-3 py-2 text-xs font-semibold text-gray-400 bg-dark-hover">
                    New Places
                  </div>
                  {googleResults.slice(0, LIMIT_LARGE).map((result) => (
                    <button
                      key={result.place_id}
                      onClick={() => handleGoogleSelect(result)}
                      className="w-full text-left px-3 py-2 hover:bg-dark-hover transition-colors flex items-center gap-3"
                    >
                      <span className="text-lg text-blue-400">📍</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate">
                          {result.main_text || result.description.split(',')[0]}
                        </div>
                        <div className="text-xs text-gray-400 truncate">{result.secondary_text || result.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Users I'm Following */}
              {followingUsers.length > 0 && (
                <div className="border-t border-gray-700">
                  <div className="px-3 py-2 text-xs font-semibold text-gray-400 bg-dark-hover">
                    Following
                  </div>
                  {followingUsers.slice(0, LIMIT_SMALL).map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleUserClick(user.id)}
                      className="w-full text-left px-3 py-2 hover:bg-dark-hover transition-colors flex items-center gap-3"
                    >
                      <div className="w-8 h-8 bg-gradient-to-br from-primary to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
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

              {/* Discover Users */}
              {userResults.length > 0 && (
                <div className="border-t border-gray-700">
                  <div className="px-3 py-2 text-xs font-semibold text-gray-400 bg-dark-hover">
                    Discover Users
                  </div>
                  {userResults.slice(0, LIMIT_SMALL).map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleUserClick(user.id)}
                      className="w-full text-left px-3 py-2 hover:bg-dark-hover transition-colors flex items-center gap-3"
                    >
                      <div className="w-8 h-8 bg-gradient-to-br from-primary to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate">{user.name}</div>
                        {user.username && <div className="text-xs text-gray-400">@{user.username}</div>}
                      </div>
                      {user.is_public && (
                        <span className="text-xs bg-green-900/30 text-green-400 px-2 py-0.5 rounded-full">Public</span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* My Collections */}
              {filteredMyLists.length > 0 && (
                <div className="border-t border-gray-700">
                  <div className="px-3 py-2 text-xs font-semibold text-gray-400 bg-dark-hover">
                    My Collections
                  </div>
                  {filteredMyLists.map((list) => (
                    <button
                      key={list.id}
                      onClick={() => handleListClick(list.id)}
                      className="w-full text-left px-3 py-2 hover:bg-dark-hover transition-colors flex items-center gap-3"
                    >
                      <span className="text-lg">{list.icon || '📂'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate">{list.name}</div>
                        <div className="text-xs text-gray-400">{list.place_count} places</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Public Collections */}
              {publicLists.length > 0 && (
                <div className="border-t border-gray-700">
                  <div className="px-3 py-2 text-xs font-semibold text-gray-400 bg-dark-hover">
                    Explore Collections
                  </div>
                  {publicLists.slice(0, LIMIT_SMALL).map((list) => (
                    <button
                      key={list.id}
                      onClick={() => handleListClick(list.id)}
                      className="w-full text-left px-3 py-2 hover:bg-dark-hover transition-colors flex items-center gap-3"
                    >
                      <span className="text-lg">{list.icon || '📂'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate">{list.name}</div>
                        <div className="text-xs text-gray-400">
                          by {list.owner_name || list.owner_username} • {list.place_count} places
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* View More */}
              <button
                onClick={handleViewMore}
                className="w-full text-center px-3 py-3 text-sm font-medium text-primary hover:bg-dark-hover transition-colors border-t border-gray-700"
              >
                View all results in Discover →
              </button>
            </>
          ) : (
            <div className="px-3 py-4 text-sm text-gray-400 text-center">
              No results found. Click "Create" above to add a new place.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
