'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { usersApi } from '@/lib/api';
import type { UserSearchResult } from '@/types';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';

export default function DiscoverPage() {
  const router = useRouter();
  const { token } = useStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || searchQuery.length < 2) return;

    setSearching(true);
    setHasSearched(true);
    try {
      const results = await usersApi.search(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  if (!token) {
    router.push('/login');
    return null;
  }

  return (
    <div className="h-screen flex flex-col bg-dark-bg">
      <Navbar />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar />

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto p-4 sm:p-8">
            <h1 className="text-3xl font-bold mb-6">Discover Users</h1>

            {/* Search Form */}
            <form onSubmit={handleSearch} className="mb-8">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or username..."
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

            {/* Search Results */}
            {searching ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <div className="text-gray-400">Searching...</div>
              </div>
            ) : hasSearched ? (
              searchResults.length > 0 ? (
                <div className="space-y-3">
                  {searchResults.map((user) => (
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
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <div className="text-gray-400 mb-2">No users found</div>
                  <div className="text-sm text-gray-500">Try a different search term</div>
                </div>
              )
            ) : (
              <div className="text-center py-12">
                <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <div className="text-gray-400 mb-2">Discover new people</div>
                <div className="text-sm text-gray-500">Search for users by name or username</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <BottomNav showNewButton={false} />
    </div>
  );
}
