'use client';

import { useStore } from '@/store/useStore';

export default function ViewModeToggle() {
  const { viewMode, setViewMode } = useStore();

  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-30 bg-dark-lighter border border-gray-700 rounded-lg shadow-lg overflow-hidden">
      <div className="flex">
        <button
          onClick={() => setViewMode('map')}
          className={`px-4 py-2 text-sm font-medium transition-all ${
            viewMode === 'map'
              ? 'bg-primary text-white'
              : 'bg-dark-lighter text-gray-400 hover:text-text-primary hover:bg-dark-hover'
          }`}
        >
          Map
        </button>
        <button
          onClick={() => setViewMode('list')}
          className={`px-4 py-2 text-sm font-medium transition-all ${
            viewMode === 'list'
              ? 'bg-primary text-white'
              : 'bg-dark-lighter text-gray-400 hover:text-text-primary hover:bg-dark-hover'
          }`}
        >
          List
        </button>
      </div>
    </div>
  );
}
