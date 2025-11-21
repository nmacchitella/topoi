'use client';

import { useStore } from '@/store/useStore';
import { useRouter, usePathname } from 'next/navigation';
import { CATEGORIES, CATEGORY_LABELS } from '@/types';
import type { Place, NominatimResult } from '@/types';
import SearchBar from './SearchBar';

interface NavbarProps {
  onPlaceClick?: (place: Place) => void;
  onNominatimSelect?: (result: NominatimResult) => void;
}

export default function Navbar({ onPlaceClick, onNominatimSelect }: NavbarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    user,
    logout,
    viewMode,
    setViewMode,
    selectedListId,
    setSelectedListId,
    selectedCategory,
    setSelectedCategory,
    lists,
  } = useStore();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // Only show Map/List toggle and filters on the home page
  const isHomePage = pathname === '/';

  return (
    <nav className="bg-dark-card border-b border-gray-700 px-4 py-3 relative z-10">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <h1 className="text-2xl font-bold text-white cursor-pointer" onClick={() => router.push('/')}>
            Topoi
          </h1>

          {isHomePage && onPlaceClick && onNominatimSelect && (
            <SearchBar
              onPlaceClick={onPlaceClick}
              onNominatimSelect={onNominatimSelect}
            />
          )}
        </div>

        <div className="flex items-center gap-4">
          {isHomePage && (
            <>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('map')}
                  className={`px-4 py-2 rounded transition-colors ${
                    viewMode === 'map'
                      ? 'bg-blue-600 text-white'
                      : 'bg-dark-hover text-gray-300 hover:text-white'
                  }`}
                >
                  Map
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-2 rounded transition-colors ${
                    viewMode === 'list'
                      ? 'bg-blue-600 text-white'
                      : 'bg-dark-hover text-gray-300 hover:text-white'
                  }`}
                >
                  List
                </button>
              </div>

              <select
                value={selectedListId || ''}
                onChange={(e) => setSelectedListId(e.target.value || null)}
                className="input-field w-40"
              >
                <option value="">All Collections</option>
                {lists.map((list) => (
                  <option key={list.id} value={list.id}>
                    {list.name} ({list.place_count})
                  </option>
                ))}
              </select>

              <select
                value={selectedCategory || ''}
                onChange={(e) => setSelectedCategory(e.target.value || null)}
                className="input-field w-40"
              >
                <option value="">All Categories</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {CATEGORY_LABELS[cat]}
                  </option>
                ))}
              </select>
            </>
          )}

          <div className="text-white px-4 py-2">
            {user?.name || 'User'}
          </div>
        </div>
      </div>
    </nav>
  );
}
