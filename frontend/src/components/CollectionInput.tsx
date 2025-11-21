'use client';

import { useState, useRef } from 'react';
import { listsApi } from '@/lib/api';
import { useStore } from '@/store/useStore';
import type { List } from '@/types';

interface CollectionInputProps {
  selectedCollectionIds: string[];
  onCollectionsChange: (collectionIds: string[]) => void;
}

export default function CollectionInput({ selectedCollectionIds, onCollectionsChange }: CollectionInputProps) {
  const { lists, addList, fetchLists } = useStore();
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get selected collections
  const selectedCollections = lists.filter(list => selectedCollectionIds.includes(list.id));

  // Filter suggestions based on input
  const suggestions = lists.filter(list =>
    !selectedCollectionIds.includes(list.id) &&
    list.name.toLowerCase().includes(inputValue.toLowerCase())
  );

  const handleAddCollection = async (collectionName: string) => {
    const trimmedName = collectionName.trim();
    if (!trimmedName) return;

    // Check if collection already exists
    const existingCollection = lists.find(l => l.name.toLowerCase() === trimmedName.toLowerCase());

    if (existingCollection) {
      // Add existing collection
      if (!selectedCollectionIds.includes(existingCollection.id)) {
        onCollectionsChange([...selectedCollectionIds, existingCollection.id]);
      }
    } else {
      // Create new collection with default color
      setCreating(true);
      try {
        const newCollection = await listsApi.create({
          name: trimmedName,
          color: '#3B82F6', // Default blue
          is_public: false,
        });
        addList({ ...newCollection, place_count: 0 });
        onCollectionsChange([...selectedCollectionIds, newCollection.id]);
        await fetchLists(); // Refresh collections list
      } catch (error) {
        console.error('Failed to create collection:', error);
      } finally {
        setCreating(false);
      }
    }

    setInputValue('');
    setShowSuggestions(false);
  };

  const handleRemoveCollection = (collectionId: string) => {
    onCollectionsChange(selectedCollectionIds.filter(id => id !== collectionId));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (inputValue.trim()) {
        handleAddCollection(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && selectedCollections.length > 0) {
      // Remove last collection if backspace on empty input
      handleRemoveCollection(selectedCollections[selectedCollections.length - 1].id);
    }
  };

  const handleSuggestionClick = (collection: List) => {
    onCollectionsChange([...selectedCollectionIds, collection.id]);
    setInputValue('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-300 mb-1">
        Collections
      </label>

      {/* Selected collections display */}
      <div className="flex flex-wrap gap-2 mb-2">
        {selectedCollections.map(collection => (
          <span
            key={collection.id}
            className="inline-flex items-center gap-1 px-2 py-1 rounded text-sm"
            style={{
              backgroundColor: `${collection.color}20`,
              color: collection.color,
              border: `1px solid ${collection.color}40`
            }}
          >
            {collection.icon && <span>{collection.icon}</span>}
            {collection.name}
            <button
              type="button"
              onClick={() => handleRemoveCollection(collection.id)}
              className="hover:opacity-70 transition-opacity"
            >
              ✕
            </button>
          </span>
        ))}
      </div>

      {/* Input field */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setShowSuggestions(e.target.value.length > 0);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => inputValue && setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder="Type to search or create collections (press Enter)"
          className="input-field"
          disabled={creating}
        />

        {/* Suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-dark-card border border-gray-600 rounded shadow-lg max-h-48 overflow-y-auto">
            {suggestions.map(collection => (
              <button
                key={collection.id}
                type="button"
                onClick={() => handleSuggestionClick(collection)}
                className="w-full text-left px-3 py-2 hover:bg-dark-hover transition-colors flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  {collection.icon && <span>{collection.icon}</span>}
                  <span style={{ color: collection.color }}>{collection.name}</span>
                </span>
                <span className="text-xs text-gray-400">
                  {collection.place_count} {collection.place_count === 1 ? 'place' : 'places'}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Create new collection hint */}
        {showSuggestions && inputValue.trim() && suggestions.length === 0 && (
          <div className="absolute z-10 w-full mt-1 bg-dark-card border border-gray-600 rounded shadow-lg">
            <div className="px-3 py-2 text-sm text-gray-400">
              Press Enter to create collection "{inputValue.trim()}"
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 mt-1">
        Type to search existing collections or create new ones
      </p>
    </div>
  );
}
