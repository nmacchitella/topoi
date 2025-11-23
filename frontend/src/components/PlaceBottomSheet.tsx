'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import type { Place } from '@/types';

interface PlaceBottomSheetProps {
  place: Place;
  onClose: () => void;
}

export default function PlaceBottomSheet({ place, onClose }: PlaceBottomSheetProps) {
  const router = useRouter();
  const [dragStartY, setDragStartY] = useState<number | null>(null);
  const [currentY, setCurrentY] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Prevent body scroll when sheet is open
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    setDragStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (dragStartY === null) return;
    const deltaY = e.touches[0].clientY - dragStartY;
    if (deltaY > 0) {
      setCurrentY(deltaY);
    }
  };

  const handleTouchEnd = () => {
    if (currentY > 100) {
      onClose();
    } else {
      setCurrentY(0);
    }
    setDragStartY(null);
  };

  const handleViewFull = () => {
    router.push(`/places/${place.id}`);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="sm:hidden fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
        style={{ opacity: Math.max(0, 1 - currentY / 300) }}
      />

      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        className="sm:hidden fixed bottom-0 left-0 right-0 bg-dark-card rounded-t-2xl shadow-2xl z-50 transition-transform"
        style={{
          transform: `translateY(${currentY}px)`,
          maxHeight: isExpanded ? '80vh' : '40vh',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1 bg-gray-600 rounded-full" />
        </div>

        {/* Content */}
        <div className="px-4 pb-6 overflow-y-auto" style={{ maxHeight: isExpanded ? 'calc(80vh - 60px)' : 'calc(40vh - 60px)' }}>
          {/* Header */}
          <div className="flex items-start gap-3 mb-4">
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-1">{place.name}</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white p-1"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tags */}
          {place.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {place.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="px-2 py-1 rounded-full text-xs bg-gray-700"
                >
                  #{tag.name}
                </span>
              ))}
            </div>
          )}

          {/* Address */}
          <div className="mb-4">
            <p className="text-gray-300 text-sm mb-2">{place.address}</p>
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline text-xs inline-flex items-center gap-1"
            >
              Open in Google Maps
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>

          {/* Expand/View Full Button */}
          <button
            onClick={handleViewFull}
            className="w-full btn-primary text-center py-3"
          >
            View Full Details
          </button>

          {/* Additional info shown when expanded */}
          {isExpanded && (
            <div className="mt-4 space-y-3 pt-3 border-t border-gray-700">
              {place.notes && (
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-1">Notes</h3>
                  <p className="text-sm whitespace-pre-wrap">{place.notes}</p>
                </div>
              )}

              {place.phone && (
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-1">Phone</h3>
                  <a href={`tel:${place.phone}`} className="text-blue-400 hover:underline text-sm">
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
                    className="text-blue-400 hover:underline text-sm break-all"
                  >
                    {place.website}
                  </a>
                </div>
              )}

              {place.hours && (
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-1">Hours</h3>
                  <p className="text-sm">{place.hours}</p>
                </div>
              )}

              {place.lists.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-1">Collections</h3>
                  <div className="flex flex-wrap gap-2">
                    {place.lists.map((list) => (
                      <span
                        key={list.id}
                        className="px-2 py-1 rounded-full text-xs"
                        style={{ backgroundColor: list.color + '33', color: list.color }}
                      >
                        {list.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Expand toggle at bottom */}
        {!isExpanded && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-dark-card to-transparent pt-8 pb-2">
            <button
              onClick={() => setIsExpanded(true)}
              className="w-full text-center text-sm text-gray-400 hover:text-white"
            >
              Pull up for more details
            </button>
          </div>
        )}
      </div>
    </>
  );
}
