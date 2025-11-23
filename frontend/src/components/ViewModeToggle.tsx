'use client';

import { useStore } from '@/store/useStore';

export default function ViewModeToggle() {
  const { viewMode, setViewMode } = useStore();

  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-30 bg-dark-card border border-gray-600 rounded-lg shadow-lg overflow-hidden">
      <div className="flex">
        <button
          onClick={() => setViewMode('map')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            viewMode === 'map'
              ? 'bg-blue-600 text-white'
              : 'bg-dark-card text-gray-300 hover:text-white hover:bg-dark-hover'
          }`}
        >
          Map
        </button>
        <button
          onClick={() => setViewMode('list')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            viewMode === 'list'
              ? 'bg-blue-600 text-white'
              : 'bg-dark-card text-gray-300 hover:text-white hover:bg-dark-hover'
          }`}
        >
          List
        </button>
      </div>
    </div>
  );
}
