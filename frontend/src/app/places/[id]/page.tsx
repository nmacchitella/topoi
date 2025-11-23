'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { placesApi } from '@/lib/api';
import { CATEGORY_LABELS } from '@/types';
import type { Place } from '@/types';
import dynamic from 'next/dynamic';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import PlaceModal from '@/components/PlaceModal';
import BottomNav from '@/components/BottomNav';

const Map = dynamic(() => import('@/components/Map'), { ssr: false });

export default function PlaceDetailPage() {
  const router = useRouter();
  const params = useParams();
  const placeId = params.id as string;

  const { token, deletePlace: removePlaceFromStore } = useStore();
  const [place, setPlace] = useState<Place | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }

    const loadPlace = async () => {
      try {
        const data = await placesApi.getById(placeId);
        setPlace(data);
      } catch (error) {
        console.error('Failed to load place:', error);
        router.push('/');
      } finally {
        setLoading(false);
      }
    };

    loadPlace();
  }, [token, placeId, router]);

  const handleDelete = async () => {
    if (!place || !confirm('Are you sure you want to delete this place?')) return;

    try {
      await placesApi.delete(place.id);
      removePlaceFromStore(place.id);
      router.push('/');
    } catch (error) {
      alert('Failed to delete place');
    }
  };

  const handleShare = async () => {
    if (!place) return;

    if (!place.is_public) {
      if (!confirm('This place is private. Make it public to share?')) return;
      try {
        const updated = await placesApi.togglePublic(place.id);
        setPlace(updated);
      } catch (error) {
        alert('Failed to make place public');
        return;
      }
    }

    const baseUrl = window.location.origin;
    setShareUrl(`${baseUrl}/shared/place/${place.id}`);
    setShowShareModal(true);
  };

  const handleModalSave = async () => {
    const data = await placesApi.getById(placeId);
    setPlace(data);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-bg">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!place) return null;

  return (
    <div className="h-screen flex flex-col bg-dark-bg pb-16 sm:pb-0">
      <Navbar />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar />

        <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">
          {/* Place Details */}
          <div className="flex-1 sm:w-1/2 border-b sm:border-b-0 sm:border-r border-gray-700 overflow-y-auto p-4 sm:p-6">
            <button
              onClick={() => router.back()}
              className="text-gray-400 hover:text-white mb-4 sm:mb-6 flex items-center gap-2"
            >
              ← Back
            </button>

            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="text-3xl sm:text-4xl">
                    {CATEGORY_LABELS[place.category as keyof typeof CATEGORY_LABELS]?.split(' ')[0] || '📍'}
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold">{place.name}</h1>
                    <p className="text-gray-400 text-sm sm:text-base">{CATEGORY_LABELS[place.category as keyof typeof CATEGORY_LABELS]}</p>
                  </div>
                </div>
                {place.is_public && (
                  <span className="bg-green-600 text-white text-xs px-2 py-1 rounded">Public</span>
                )}
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

              {/* Collections */}
              {place.lists.length > 0 && (
                <div className="card">
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Collections</h3>
                  <div className="flex flex-wrap gap-2">
                    {place.lists.map((list) => (
                      <span
                        key={list.id}
                        className="px-3 py-1 rounded-full text-sm"
                        style={{ backgroundColor: list.color + '33', color: list.color }}
                      >
                        {list.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {place.tags.length > 0 && (
                <div className="card">
                  <h3 className="text-sm font-medium text-gray-400 mb-2">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {place.tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="px-3 py-1 rounded-full text-sm bg-gray-700"
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button onClick={() => setShowEditModal(true)} className="btn-primary flex-1">
                  Edit
                </button>
                <button onClick={handleShare} className="btn-secondary flex-1">
                  Share
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>

          {/* Map - hidden on mobile, shown on desktop */}
          <div className="hidden sm:block sm:w-1/2 relative">
            <Map places={[place]} onPlaceClick={() => {}} />
          </div>
        </div>
      </div>

      {showEditModal && (
        <PlaceModal
          place={place}
          onClose={() => setShowEditModal(false)}
          onSave={handleModalSave}
        />
      )}

      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-card rounded-lg max-w-md w-full">
            <div className="border-b border-gray-700 px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">Share Place</h2>
              <button onClick={() => setShowShareModal(false)} className="text-gray-400 hover:text-white text-2xl">
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-gray-300">Share this link with others:</p>
              <div className="flex gap-2">
                <input type="text" value={shareUrl} readOnly className="input-field flex-1" />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(shareUrl);
                    alert('Link copied!');
                  }}
                  className="btn-primary"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation - mobile only */}
      <BottomNav showNewButton={false} />
    </div>
  );
}
