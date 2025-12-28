'use client';

import { useState, useEffect, useRef } from 'react';
import { useStore } from '@/store/useStore';
import { placesApi, searchApi, GooglePlaceResult } from '@/lib/api';
import type { Place, PlaceCreate, NominatimResult, PreviewPlace } from '@/types';
import { useGooglePlacesAutocomplete } from '@/hooks/useGooglePlacesAutocomplete';
import TagInput from './TagInput';
import CollectionInput from './CollectionInput';
import TagIcon from './TagIcon';
import { DEFAULT_TAG_COLOR } from '@/lib/tagColors';

interface PlaceModalProps {
  place?: Place;
  initialLat?: number;
  initialLng?: number;
  initialNominatim?: NominatimResult;
  initialName?: string;
  initialNotes?: string;
  onClose: () => void;
  onSave: () => void;
  viewMode?: boolean; // If true, show view-only mode first
  isOtherUserPlace?: boolean; // If true, show "Add to My Map" instead of "Edit"
  onAddToMyMap?: () => void;
  previewPlace?: PreviewPlace; // Preview mode data
  isPreview?: boolean; // If true, show preview mode
  onPreviewSave?: () => void; // Called when user clicks "Add to My Places" in preview mode
}

export default function PlaceModal({ place, initialLat, initialLng, initialNominatim, initialName, initialNotes, onClose, onSave, viewMode: initialViewMode = false, isOtherUserPlace, onAddToMyMap, previewPlace, isPreview, onPreviewSave }: PlaceModalProps) {
  const { lists, tags, addPlace, updatePlace } = useStore();
  const [isViewMode, setIsViewMode] = useState(initialViewMode && !!place);
  const [loading, setLoading] = useState(false);

  // Name search autocomplete using custom hook
  const nameSearch = useGooglePlacesAutocomplete();

  // Address search autocomplete using custom hook
  const addressSearch = useGooglePlacesAutocomplete();

  const googleMeta = initialNominatim?.google_metadata;
  const [formData, setFormData] = useState({
    name: place?.name || initialName || googleMeta?.name || (initialNominatim ? initialNominatim.display_name.split(',')[0] : ''),
    address: place?.address || (initialNominatim?.display_name || ''),
    latitude: place?.latitude || initialLat || 0,
    longitude: place?.longitude || initialLng || 0,
    notes: place?.notes || initialNotes || '',
    phone: place?.phone || googleMeta?.phone || '',
    website: place?.website || googleMeta?.website || '',
    hours: place?.hours || googleMeta?.hours || '',
    is_public: place?.is_public ?? true,
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

  const handleNameSearch = (query: string) => {
    setFormData({ ...formData, name: query });
    nameSearch.search(query);
  };

  const selectNameSearchResult = async (result: GooglePlaceResult) => {
    try {
      const details = await searchApi.googlePlaceDetails(result.place_id);
      if (details) {
        setFormData(prev => ({
          ...prev,
          name: details.name || result.main_text,
          address: details.address,
          latitude: details.lat,
          longitude: details.lng,
          website: prev.website || details.website,
          phone: prev.phone || details.phone,
          hours: prev.hours || details.hours,
        }));
      }
    } catch (error) {
      console.error('Failed to get place details:', error);
    } finally {
      nameSearch.clear();
    }
  };

  const handleAddressSearch = (query: string) => {
    setFormData({ ...formData, address: query });
    addressSearch.search(query);
  };

  const selectAddressResult = async (result: GooglePlaceResult) => {
    try {
      const details = await searchApi.googlePlaceDetails(result.place_id);
      if (details) {
        setFormData(prev => ({
          ...prev,
          address: details.address,
          latitude: details.lat,
          longitude: details.lng,
          // Auto-fill metadata if not already set
          name: prev.name || details.name || result.main_text,
          website: prev.website || details.website,
          phone: prev.phone || details.phone,
          hours: prev.hours || details.hours,
        }));
      }
    } catch (error) {
      console.error('Failed to get place details:', error);
    } finally {
      addressSearch.clear();
    }
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
      await onSave();
      onClose();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to save place');
    } finally {
      setLoading(false);
    }
  };

  // Preview mode UI (for search results before saving)
  // Desktop: Side panel on the right | Mobile: Full screen (but we use PlaceBottomSheet instead)
  if (isPreview && previewPlace) {
    return (
      <>
        {/* Clickable backdrop - only covers left portion on desktop */}
        <div
          className="fixed inset-0 z-40"
          onClick={onClose}
        />
        {/* Side panel - slides in from right */}
        <div className="fixed top-0 right-0 h-full w-96 bg-dark-card shadow-2xl z-50 flex flex-col border-l border-gray-700">
          {/* Header */}
          <div className="flex-shrink-0 border-b border-gray-700 px-5 py-4 flex justify-between items-start gap-3">
            <h2 className="text-xl font-bold leading-tight">{previewPlace.name}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white p-1 hover:bg-gray-700 rounded transition-colors flex-shrink-0"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content - scrollable */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {/* Address */}
            <div>
              <p className="text-gray-300">{previewPlace.address}</p>
              <a
                href={previewPlace.google_maps_uri || `https://www.google.com/maps/search/?api=1&query=${previewPlace.latitude},${previewPlace.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline text-sm mt-1 inline-flex items-center gap-1"
              >
                Open in Google Maps
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>

            {/* Contact & Details */}
            {(previewPlace.phone || previewPlace.website || previewPlace.hours) && (
              <div className="space-y-3 pt-3 border-t border-gray-700">
                {previewPlace.phone && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-1">Phone</h3>
                    <a href={`tel:${previewPlace.phone}`} className="text-blue-400 hover:underline">{previewPlace.phone}</a>
                  </div>
                )}
                {previewPlace.website && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-1">Website</h3>
                    <a href={previewPlace.website} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline break-all">{previewPlace.website}</a>
                  </div>
                )}
                {previewPlace.hours && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-1">Hours</h3>
                    <p className="text-sm whitespace-pre-wrap">{previewPlace.hours}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions - fixed at bottom */}
          <div className="flex-shrink-0 border-t border-gray-700 px-5 py-4">
            <button
              type="button"
              onClick={onPreviewSave}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add to My Places
            </button>
          </div>
        </div>
      </>
    );
  }

  // View mode UI
  if (isViewMode && place) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-0 sm:p-4">
        <div className="bg-dark-card sm:rounded-lg max-w-2xl w-full h-full sm:h-auto sm:max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-dark-card border-b border-gray-700 px-4 sm:px-6 py-4 flex justify-between items-center">
            <h2 className="text-xl sm:text-2xl font-bold">{place.name}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl p-2 -mr-2">
              ✕
            </button>
          </div>

          <div className="p-4 sm:p-6 space-y-4">
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
                  {place.tags.map((tag) => {
                    const tagColor = tag.color || DEFAULT_TAG_COLOR;
                    return (
                      <span
                        key={tag.id}
                        className="px-3 py-1 rounded-full text-sm flex items-center gap-1.5"
                        style={{
                          backgroundColor: `${tagColor}40`,
                          color: tagColor,
                          border: `1px solid ${tagColor}60`,
                        }}
                      >
                        {tag.icon && <TagIcon icon={tag.icon} size="xs" />}
                        {tag.name}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
              <button type="button" onClick={onClose} className="btn-secondary">
                Close
              </button>
              {isOtherUserPlace ? (
                <button type="button" onClick={onAddToMyMap} className="btn-primary flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add to My Map
                </button>
              ) : (
                <button type="button" onClick={() => setIsViewMode(false)} className="btn-primary">
                  Edit
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-dark-card sm:rounded-lg max-w-2xl w-full h-full sm:h-auto sm:max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-dark-card border-b border-gray-700 px-4 sm:px-6 py-4 flex justify-between items-center">
          <h2 className="text-xl sm:text-2xl font-bold">{place ? 'Edit Place' : 'Add Place'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl p-2 -mr-2">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
          <div className="relative">
            <label className="block text-sm font-medium text-gray-300 mb-1">Name *</label>
            <input
              type="text"
              required
              value={nameSearch.showDropdown ? nameSearch.query : formData.name}
              onChange={(e) => handleNameSearch(e.target.value)}
              onFocus={() => {
                nameSearch.search(formData.name);
              }}
              onBlur={() => setTimeout(() => nameSearch.setShowDropdown(false), 200)}
              className="input-field"
              placeholder="Search for a place or type name..."
            />
            {nameSearch.loading && <p className="text-sm text-gray-400 mt-1">Searching...</p>}
            {nameSearch.showDropdown && nameSearch.results.length > 0 && (
              <div className="absolute z-10 left-0 right-0 mt-1 bg-dark-card border border-gray-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                {nameSearch.results.map((result) => (
                  <button
                    key={result.place_id}
                    type="button"
                    onClick={() => selectNameSearchResult(result)}
                    className="w-full text-left px-3 py-2 hover:bg-dark-hover transition-colors"
                  >
                    <div className="text-sm font-medium text-white">{result.main_text || result.description.split(',')[0]}</div>
                    <div className="text-xs text-gray-400">{result.secondary_text || result.description}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative">
            <label className="block text-sm font-medium text-gray-300 mb-1">Address *</label>
            <input
              type="text"
              required
              value={addressSearch.showDropdown ? addressSearch.query : formData.address}
              onChange={(e) => handleAddressSearch(e.target.value)}
              onFocus={() => {
                addressSearch.search(formData.address);
              }}
              onBlur={() => setTimeout(() => addressSearch.setShowDropdown(false), 200)}
              className="input-field"
              placeholder="Search for an address..."
            />
            {addressSearch.loading && <p className="text-sm text-gray-400 mt-1">Searching...</p>}
            {addressSearch.showDropdown && addressSearch.results.length > 0 && (
              <div className="absolute z-10 left-0 right-0 mt-1 bg-dark-card border border-gray-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                {addressSearch.results.map((result) => (
                  <button
                    key={result.place_id}
                    type="button"
                    onClick={() => selectAddressResult(result)}
                    className="w-full text-left px-3 py-2 hover:bg-dark-hover transition-colors"
                  >
                    <div className="text-sm font-medium text-white">{result.main_text || result.description.split(',')[0]}</div>
                    <div className="text-xs text-gray-400">{result.secondary_text || result.description}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Hidden coordinate fields - auto-populated from address selection */}
          <input type="hidden" value={formData.latitude} />
          <input type="hidden" value={formData.longitude} />

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="input-field"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
