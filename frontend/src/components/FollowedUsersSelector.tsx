'use client';

import { useState, useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';

export default function FollowedUsersSelector() {
  const {
    following,
    selectedFollowedUserIds,
    toggleFollowedUser,
    fetchFollowing,
    fetchFollowedUserPlaces
  } = useStore();

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch following list on mount
  useEffect(() => {
    if (following.length === 0) {
      fetchFollowing();
    }
  }, [following.length, fetchFollowing]);

  // Fetch places when a user is selected
  useEffect(() => {
    selectedFollowedUserIds.forEach(userId => {
      fetchFollowedUserPlaces(userId).catch(err => {
        console.error(`Failed to fetch places for user ${userId}:`, err);
      });
    });
  }, [selectedFollowedUserIds, fetchFollowedUserPlaces]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Filter followed users based on search query
  const filteredFollowing = following.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.username && user.username.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const selectedCount = selectedFollowedUserIds.length;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Selector Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 bg-dark-lighter border border-gray-700 rounded-lg text-sm font-medium text-gray-300 hover:bg-dark-hover hover:text-white transition-colors flex items-center gap-2 shadow-lg"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-5 h-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
          />
        </svg>
        Select Users
        {selectedCount > 0 && (
          <span className="ml-1 px-2 py-0.5 bg-primary text-white text-xs rounded-full">
            {selectedCount}
          </span>
        )}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-dark-card border border-gray-700 rounded-lg shadow-xl z-40 max-h-96 flex flex-col">
          {/* Search Input */}
          <div className="p-3 border-b border-gray-700">
            <div className="relative">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-dark-lighter border border-gray-600 rounded text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>

          {/* User List */}
          <div className="overflow-y-auto flex-1">
            {filteredFollowing.length === 0 ? (
              <div className="p-4 text-center text-gray-400 text-sm">
                {searchQuery ? 'No users found' : 'You are not following anyone yet'}
              </div>
            ) : (
              <div className="p-2">
                {filteredFollowing.map((user) => (
                  <label
                    key={user.id}
                    className="flex items-center gap-3 p-2 rounded hover:bg-dark-hover cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedFollowedUserIds.includes(user.id)}
                      onChange={() => toggleFollowedUser(user.id)}
                      className="w-4 h-4 rounded border-gray-600 text-primary focus:ring-primary focus:ring-offset-0 bg-dark-lighter cursor-pointer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">
                        {user.name}
                      </div>
                      {user.username && (
                        <div className="text-xs text-gray-400 truncate">
                          @{user.username}
                        </div>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {selectedCount > 0 && (
            <div className="p-3 border-t border-gray-700 bg-dark-lighter">
              <div className="text-xs text-gray-400">
                {selectedCount} user{selectedCount === 1 ? '' : 's'} selected
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
