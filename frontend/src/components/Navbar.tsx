'use client';

import { useStore } from '@/store/useStore';
import { useRouter, usePathname } from 'next/navigation';
import { CATEGORIES, CATEGORY_LABELS } from '@/types';
import type { Place, NominatimResult } from '@/types';
import SearchBar from './SearchBar';

interface NavbarProps {
  onPlaceClick?: (place: Place) => void;
  onNominatimSelect?: (result: NominatimResult) => void;
  onAddNew?: (name: string) => void;
}

export default function Navbar({ onPlaceClick, onNominatimSelect, onAddNew }: NavbarProps) {
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
    sidebarOpen,
    setSidebarOpen,
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
        <div className="flex items-center gap-4 sm:gap-6">
          {/* Hamburger menu button - mobile only */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="sm:hidden text-gray-300 hover:text-white p-2 -ml-2"
            aria-label="Toggle menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {sidebarOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
          <h1 className="text-xl sm:text-2xl font-bold text-white cursor-pointer" onClick={() => router.push('/')}>
            Topoi
          </h1>

          {isHomePage && onPlaceClick && onNominatimSelect && (
            <div className="hidden sm:block">
              <SearchBar
                onPlaceClick={onPlaceClick}
                onNominatimSelect={onNominatimSelect}
                onAddNew={onAddNew || (() => {})}
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {isHomePage && (
            <>
              <div className="flex gap-1 sm:gap-2">
                <button
                  onClick={() => setViewMode('map')}
                  className={`px-3 py-2 sm:px-4 rounded transition-colors text-sm sm:text-base ${
                    viewMode === 'map'
                      ? 'bg-blue-600 text-white'
                      : 'bg-dark-hover text-gray-300 hover:text-white'
                  }`}
                >
                  Map
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-2 sm:px-4 rounded transition-colors text-sm sm:text-base ${
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
                className="hidden sm:block input-field w-40"
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
                className="hidden sm:block input-field w-40"
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

          <div className="hidden sm:block text-white px-4 py-2">
            {user?.name || 'User'}
          </div>
        </div>
      </div>
    </nav>
  );
}
