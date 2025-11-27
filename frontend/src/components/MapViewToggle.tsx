'use client';

import { useStore } from '@/store/useStore';

export default function MapViewToggle() {
  const { mapViewMode, setMapViewMode } = useStore();

  return (
    <div className="bg-dark-lighter border border-gray-700 rounded-lg shadow-lg overflow-hidden">
      <div className="flex">
        {/* Profile/My Places Mode */}
        <button
          onClick={() => setMapViewMode('profile')}
          className={`p-2.5 transition-all flex items-center justify-center ${
            mapViewMode === 'profile'
              ? 'bg-primary text-white'
              : 'bg-dark-lighter text-gray-400 hover:text-text-primary hover:bg-dark-hover'
          }`}
          title="My Places"
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
              d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
            />
          </svg>
        </button>

        {/* Layers/Followed Users Mode */}
        <button
          onClick={() => setMapViewMode('layers')}
          className={`p-2.5 transition-all flex items-center justify-center ${
            mapViewMode === 'layers'
              ? 'bg-primary text-white'
              : 'bg-dark-lighter text-gray-400 hover:text-text-primary hover:bg-dark-hover'
          }`}
          title="Followed Users' Places"
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
              d="M6.429 9.75L2.25 12l4.179 2.25m0-4.5l5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0l4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0l-5.571 3-5.571-3"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
