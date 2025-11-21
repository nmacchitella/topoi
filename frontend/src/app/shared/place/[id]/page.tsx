'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { shareApi } from '@/lib/api';
import { CATEGORY_LABELS } from '@/types';
import type { Place } from '@/types';
import dynamic from 'next/dynamic';

const Map = dynamic(() => import('@/components/Map'), { ssr: false });

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
      <div className="min-h-screen flex items-center justify-center bg-dark-bg">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (error || !place) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-bg">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Place Not Found</h1>
          <p className="text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-dark-bg">
      {/* Header */}
      <nav className="bg-dark-card border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Topoi</h1>
          <span className="text-gray-400">Shared Place</span>
        </div>
      </nav>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Place Details */}
        <div className="w-1/2 border-r border-gray-700 overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
              <div className="text-4xl">
                {CATEGORY_LABELS[place.category]?.split(' ')[0] || '📍'}
              </div>
              <div>
                <h1 className="text-3xl font-bold">{place.name}</h1>
                <p className="text-gray-400">{CATEGORY_LABELS[place.category]}</p>
              </div>
            </div>

            {/* Address */}
            <div className="card">
              <h3 className="text-sm font-medium text-gray-400 mb-2">Address</h3>
              <p className="text-lg">{place.address}</p>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline text-sm mt-2 inline-block"
              >
                Open in Google Maps →
              </a>
            </div>

            {/* Notes */}
            {place.notes && (
              <div className="card">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Notes</h3>
                <p className="whitespace-pre-wrap">{place.notes}</p>
              </div>
            )}

            {/* Contact Info */}
            {(place.phone || place.website || place.hours) && (
              <div className="card space-y-3">
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
                    <p>{place.hours}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Map */}
        <div className="w-1/2 relative">
          <Map places={[place]} onPlaceClick={() => {}} isPublic={true} />
        </div>
      </div>
    </div>
  );
}
