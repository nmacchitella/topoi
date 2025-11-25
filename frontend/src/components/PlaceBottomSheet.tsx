'use client';

import { useState, useEffect, useRef } from 'react';
import type { Place } from '@/types';

interface PlaceBottomSheetProps {
  place: Place;
  onClose: () => void;
}

export default function PlaceBottomSheet({ place, onClose }: PlaceBottomSheetProps) {
  const [dragStartY, setDragStartY] = useState<number | null>(null);
  const [startHeight, setStartHeight] = useState(0);
  const [currentHeight, setCurrentHeight] = useState(60); // Start at 60vh
  const sheetRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Prevent body scroll when sheet is open
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    setDragStartY(e.touches[0].clientY);
    setStartHeight(currentHeight);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (dragStartY === null || !sheetRef.current) return;

    const deltaY = e.touches[0].clientY - dragStartY;
    const viewportHeight = window.innerHeight;
    const deltaVh = -(deltaY / viewportHeight) * 100; // Negative because dragging up should increase height

    const newHeight = Math.max(30, Math.min(85, startHeight + deltaVh)); // Between 30vh and 85vh
    setCurrentHeight(newHeight);
  };

  const handleTouchEnd = () => {
    if (dragStartY === null) return;

    // If dragged down significantly (below 25vh), close
    if (currentHeight < 25) {
      onClose();
    } else if (currentHeight < 45) {
      // Snap to 40vh if between 25-45
      setCurrentHeight(40);
    } else if (currentHeight < 65) {
      // Snap to 60vh if between 45-65
      setCurrentHeight(60);
    } else {
      // Snap to 80vh if above 65
      setCurrentHeight(80);
    }

    setDragStartY(null);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="sm:hidden fixed inset-0 bg-black/30 z-40"
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        className="sm:hidden fixed bottom-0 left-0 right-0 bg-dark-card rounded-t-2xl shadow-2xl z-50 transition-all duration-200"
        style={{
          height: `${currentHeight}vh`,
        }}
      >
        {/* Draggable Handle */}
        <div
          ref={handleRef}
          className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="w-12 h-1 bg-gray-600 rounded-full" />
        </div>

        {/* Content - Scrollable */}
        <div className="px-4 pb-6 overflow-y-auto h-[calc(100%-28px)]">
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

          {/* All Details */}
          <div className="space-y-3 pt-3 border-t border-gray-700">
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
                <p className="text-sm whitespace-pre-wrap">{place.hours}</p>
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
        </div>
      </div>
    </>
  );
}
