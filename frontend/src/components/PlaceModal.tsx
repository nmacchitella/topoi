'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';
import { placesApi, searchApi } from '@/lib/api';
import { CATEGORIES, CATEGORY_LABELS } from '@/types';
import type { Place, PlaceCreate, NominatimResult } from '@/types';
import TagInput from './TagInput';
import CollectionInput from './CollectionInput';

interface PlaceModalProps {
  place?: Place;
  initialLat?: number;
  initialLng?: number;
  initialNominatim?: NominatimResult;
  onClose: () => void;
  onSave: () => void;
  viewMode?: boolean; // If true, show view-only mode first
}

export default function PlaceModal({ place, initialLat, initialLng, initialNominatim, onClose, onSave, viewMode: initialViewMode = false }: PlaceModalProps) {
  const { lists, tags, addPlace, updatePlace } = useStore();
  const [isViewMode, setIsViewMode] = useState(initialViewMode && !!place);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<NominatimResult[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const getCategoryFromNominatim = (result?: NominatimResult) => {
    if (!result) return 'other';
    const type = result.type?.toLowerCase();
    if (type === 'restaurant') return 'restaurant';
    if (type === 'cafe') return 'cafe';
    if (type === 'bar' || type === 'pub') return 'bar';
    if (type === 'park') return 'park';
    return 'other';
  };

  const [formData, setFormData] = useState({
    name: place?.name || (initialNominatim ? initialNominatim.display_name.split(',')[0] : ''),
    address: place?.address || (initialNominatim?.display_name || ''),
    latitude: place?.latitude || initialLat || 0,
    longitude: place?.longitude || initialLng || 0,
    category: place?.category || getCategoryFromNominatim(initialNominatim),
    notes: place?.notes || '',
    phone: place?.phone || '',
    website: place?.website || '',
    hours: place?.hours || '',
    is_public: place?.is_public || false,
    list_ids: place?.lists.map(l => l.id) || [],
    tag_ids: place?.tags.map(t => t.id) || [],
  });

  useEffect(() => {
    // If we have initial coordinates but no address, do reverse geocoding
    if (!place && initialLat && initialLng && !formData.address) {
      reverseGeocode(initialLat, initialLng);
    }
  }, []);

  const reverseGeocode = async (lat: number, lng: number) => {
    try {
      const result = await searchApi.reverse(lat, lng);
      setFormData(prev => ({
        ...prev,
        address: result.display_name,
        name: result.address?.road || result.display_name.split(',')[0],
      }));
    } catch (error) {
      console.error('Reverse geocoding failed:', error);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const results = await searchApi.nominatim(query);
      setSearchResults(results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const selectSearchResult = (result: NominatimResult) => {
    setFormData(prev => ({
      ...prev,
      name: result.display_name.split(',')[0],
      address: result.display_name,
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      category: result.type === 'restaurant' ? 'restaurant' :
                result.type === 'cafe' ? 'cafe' :
                result.type === 'bar' ? 'bar' :
                result.type === 'park' ? 'park' : 'other',
    }));
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (place) {
        // Update existing place
        const updated = await placesApi.update(place.id, formData);
        updatePlace(updated);
      } else {
        // Create new place
        const created = await placesApi.create(formData as PlaceCreate);
        addPlace(created);
      }
      onSave();
      onClose();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to save place');
    } finally {
      setLoading(false);
    }
  };

  // View mode UI
  if (isViewMode && place) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-dark-card rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-dark-card border-b border-gray-700 px-6 py-4 flex justify-between items-center">
            <h2 className="text-2xl font-bold">{place.name}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">
              ✕
            </button>
          </div>

          <div className="p-6 space-y-4">
            {/* Category */}
            <div className="flex items-center gap-3">
              <span className="text-2xl">{CATEGORY_LABELS[place.category as keyof typeof CATEGORY_LABELS]?.split(' ')[0] || '📍'}</span>
              <span className="text-gray-400">{CATEGORY_LABELS[place.category as keyof typeof CATEGORY_LABELS]}</span>
            </div>

            {/* Address */}
            <div>
              <h3 className="text-sm font-medium text-gray-400 mb-1">Address</h3>
              <p>{place.address}</p>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline text-sm mt-1 inline-block"
              >
                Open in Google Maps →
              </a>
            </div>

            {/* Notes */}
            {place.notes && (
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-1">Notes</h3>
                <p className="whitespace-pre-wrap">{place.notes}</p>
              </div>
            )}

            {/* Contact */}
            {(place.phone || place.website || place.hours) && (
              <div className="space-y-2">
                {place.phone && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-1">Phone</h3>
                    <a href={`tel:${place.phone}`} className="text-blue-400 hover:underline">{place.phone}</a>
                  </div>
                )}
                {place.website && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-1">Website</h3>
                    <a href={place.website} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline break-all">{place.website}</a>
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
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2">Collections</h3>
                <div className="flex flex-wrap gap-2">
                  {place.lists.map((list) => (
                    <span key={list.id} className="px-3 py-1 rounded-full text-sm" style={{ backgroundColor: list.color + '33', color: list.color }}>
                      {list.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {place.tags.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-400 mb-2">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {place.tags.map((tag) => (
                    <span key={tag.id} className="px-3 py-1 rounded-full text-sm bg-gray-700">
                      {tag.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
              <button type="button" onClick={onClose} className="btn-secondary">
                Close
              </button>
              <button type="button" onClick={() => setIsViewMode(false)} className="btn-primary">
                Edit
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-card rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-dark-card border-b border-gray-700 px-6 py-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold">{place ? 'Edit Place' : 'Add Place'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {!place && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Search for a place
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="input-field"
                placeholder="Search address or place name..."
              />
              {searchLoading && <p className="text-sm text-gray-400 mt-1">Searching...</p>}
              {searchResults.length > 0 && (
                <div className="mt-2 bg-dark-hover rounded max-h-48 overflow-y-auto">
                  {searchResults.map((result) => (
                    <button
                      key={result.place_id}
                      type="button"
                      onClick={() => selectSearchResult(result)}
                      className="w-full text-left px-3 py-2 hover:bg-dark-bg transition-colors text-sm"
                    >
                      {result.display_name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Category *</label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="input-field"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {CATEGORY_LABELS[cat]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Address *</label>
            <input
              type="text"
              required
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="input-field"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Latitude</label>
              <input
                type="number"
                step="any"
                required
                value={formData.latitude}
                onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) })}
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Longitude</label>
              <input
                type="number"
                step="any"
                required
                value={formData.longitude}
                onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) })}
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="input-field"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Website</label>
              <input
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Hours</label>
            <input
              type="text"
              value={formData.hours}
              onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
              className="input-field"
              placeholder="e.g., Mon-Fri 9am-5pm"
            />
          </div>

          <CollectionInput
            selectedCollectionIds={formData.list_ids}
            onCollectionsChange={(collectionIds) => setFormData({ ...formData, list_ids: collectionIds })}
          />

          <TagInput
            selectedTagIds={formData.tag_ids}
            onTagsChange={(tagIds) => setFormData({ ...formData, tag_ids: tagIds })}
          />

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.is_public}
                onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium text-gray-300">Make this place public (shareable)</span>
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Saving...' : 'Save Place'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
