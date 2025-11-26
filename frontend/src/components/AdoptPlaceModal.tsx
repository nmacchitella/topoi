'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { placesAdoptApi } from '@/lib/api';
import type { Place } from '@/types';

interface AdoptPlaceModalProps {
  place: Place;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AdoptPlaceModal({ place, onClose, onSuccess }: AdoptPlaceModalProps) {
  const { lists, fetchLists } = useStore();
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load lists if not already loaded
    if (lists.length === 0) {
      fetchLists();
    }
  }, []);

  const handleAdopt = async () => {
    try {
      setLoading(true);
      setError(null);

      await placesAdoptApi.adoptPlace({
        place_id: place.id,
        list_id: selectedListId || undefined,
      });

      onSuccess();
    } catch (err: any) {
      console.error('Failed to adopt place:', err);
      setError(err.response?.data?.detail || 'Failed to add place to your map');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-card border border-gray-700 rounded-xl max-w-lg w-full p-6">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Add to Your Map</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Place preview */}
        <div className="mb-6 p-4 bg-gray-800 rounded-lg">
          <h3 className="font-semibold text-white mb-1">{place.name}</h3>
          <p className="text-sm text-gray-400">{place.address}</p>
        </div>

        {/* List selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Add to List (optional)
          </label>
          <select
            value={selectedListId}
            onChange={(e) => setSelectedListId(e.target.value)}
            className="input-field"
          >
            <option value="">No list</option>
            {lists.map((list) => (
              <option key={list.id} value={list.id}>
                {list.icon} {list.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">
            The place will be added to your map as a private place. You can edit it later.
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-500/30 rounded-lg text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleAdopt}
            disabled={loading}
            className="flex-1 btn-primary"
          >
            {loading ? 'Adding...' : 'Add to My Map'}
          </button>
        </div>
      </div>
    </div>
  );
}
