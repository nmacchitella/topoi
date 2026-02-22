'use client';

import type { Place } from '@/types';

interface PublicPlaceDetailModalProps {
  place: Place;
  onClose: () => void;
}

export default function PublicPlaceDetailModal({ place, onClose }: PublicPlaceDetailModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-dark-card sm:rounded-lg max-w-lg w-full h-full sm:h-auto max-h-[100vh] sm:max-h-[80vh] overflow-y-auto">
        <div className="sticky top-0 bg-dark-card border-b border-gray-700 px-4 sm:px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">{place.name}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl p-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-1">Address</h3>
            <p className="text-white">{place.address}</p>
          </div>

          {place.notes && (
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-1">Notes</h3>
              <p className="text-white whitespace-pre-wrap">{place.notes}</p>
            </div>
          )}

          {place.phone && (
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-1">Phone</h3>
              <a href={`tel:${place.phone}`} className="text-blue-400 hover:underline">
                {place.phone}
              </a>
            </div>
          )}

          {place.website && (
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-1">Website</h3>
              <a
                href={place.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline break-all"
              >
                {place.website}
              </a>
            </div>
          )}

          {place.hours && (
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-1">Hours</h3>
              <p className="text-white whitespace-pre-wrap">{place.hours}</p>
            </div>
          )}

          {place.tags.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {place.tags.map(tag => (
                  <span
                    key={tag.id}
                    className="px-2 py-1 rounded-full text-sm"
                    style={{
                      backgroundColor: `${tag.color}40`,
                      color: tag.color,
                      border: `1px solid ${tag.color}60`,
                    }}
                  >
                    #{tag.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {place.lists.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-2">Collections</h3>
              <div className="flex flex-wrap gap-2">
                {place.lists.map(list => (
                  <span
                    key={list.id}
                    className="px-2 py-1 rounded-full text-sm flex items-center gap-1"
                    style={{
                      backgroundColor: `${list.color}20`,
                      color: list.color,
                    }}
                  >
                    {list.icon && <span>{list.icon}</span>}
                    {list.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="pt-4">
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary inline-block w-full text-center"
            >
              Open in Google Maps
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
