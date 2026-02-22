'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { shareApi } from '@/lib/api';
import type { Place } from '@/types';
import dynamic from 'next/dynamic';
import PublicSignupCTA from '@/components/PublicSignupCTA';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

export default function SharedPlacePage() {
  const params = useParams();
  const placeId = params.id as string;

  const [place, setPlace] = useState<Place | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadPlace = async () => {
      try {
        const data = await shareApi.getSharedPlace(placeId);
        setPlace(data);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Place not found or not public');
      } finally {
        setLoading(false);
      }
    };

    loadPlace();
  }, [placeId]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-dark-bg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <div className="text-white text-lg">Loading place...</div>
        </div>
      </div>
    );
  }

  if (error || !place) {
    return (
      <div className="h-screen flex items-center justify-center bg-dark-bg p-4">
        <div className="max-w-md w-full bg-dark-card border border-red-500/30 rounded-xl p-6 text-center">
          <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h1 className="text-2xl font-bold text-white mb-2">Place Not Found</h1>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-dark-bg">
      {/* Header */}
      <header className="bg-dark-lighter border-b border-gray-800/50 px-4 py-3.5 z-50">
        <div className="flex items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-semibold text-text-primary">Topoi</h1>
          <span className="hidden sm:inline text-gray-500">&bull;</span>
          <span className="hidden sm:inline text-gray-400">Shared Place</span>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">
        {/* Place Details */}
        <div className="flex-1 sm:w-1/2 border-b sm:border-b-0 sm:border-r border-gray-800/50 overflow-y-auto p-4 sm:p-6">
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">{place.name}</h1>
            </div>

            {/* Address */}
            <div className="p-4 bg-dark-card rounded-lg border border-gray-800">
              <h3 className="text-sm font-medium text-gray-400 mb-2">Address</h3>
              <p className="text-lg text-white">{place.address}</p>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline text-sm mt-2 inline-block"
              >
                Open in Google Maps
              </a>
            </div>

            {/* Notes */}
            {place.notes && (
              <div className="p-4 bg-dark-card rounded-lg border border-gray-800">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Notes</h3>
                <p className="whitespace-pre-wrap text-white">{place.notes}</p>
              </div>
            )}

            {/* Contact Info */}
            {(place.phone || place.website || place.hours) && (
              <div className="p-4 bg-dark-card rounded-lg border border-gray-800 space-y-3">
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
              </div>
            )}

            {/* Tags */}
            {place.tags.length > 0 && (
              <div className="p-4 bg-dark-card rounded-lg border border-gray-800">
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

            {/* Collections */}
            {place.lists.length > 0 && (
              <div className="p-4 bg-dark-card rounded-lg border border-gray-800">
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

            {/* Google Maps CTA - mobile only (map hidden on mobile) */}
            <div className="sm:hidden">
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

        {/* Map - hidden on mobile */}
        <div className="hidden sm:block sm:w-1/2 relative">
          <MapView places={[place]} selectedPlaceId={place.id} />
        </div>
      </div>
      <PublicSignupCTA />
    </div>
  );
}
