'use client';

import { useState, useRef } from 'react';
import { tagsApi } from '@/lib/api';
import { useStore } from '@/store/useStore';
import type { Tag } from '@/types';

type TagInputMode = 'immediate' | 'deferred';

interface UnifiedTagInputProps {
  mode?: TagInputMode; // 'immediate' creates tags via API, 'deferred' just collects names
  selectedTagIds?: string[]; // For immediate mode
  selectedTagNames?: string[]; // For deferred mode
  onTagIdsChange?: (tagIds: string[]) => void; // For immediate mode
  onTagNamesChange?: (tagNames: string[]) => void; // For deferred mode
  showLabel?: boolean;
  placeholder?: string;
  className?: string;
}

export default function UnifiedTagInput({
  mode = 'immediate',
  selectedTagIds = [],
  selectedTagNames = [],
  onTagIdsChange,
  onTagNamesChange,
  showLabel = true,
  placeholder = 'Type to search or create tags (press Enter)',
  className = '',
}: UnifiedTagInputProps) {
  const { tags, addTag, fetchTags } = useStore();
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get selected tags based on mode
  const selectedTags = mode === 'immediate'
    ? tags.filter(tag => selectedTagIds.includes(tag.id))
    : selectedTagNames.map(name => ({ id: name, name, usage_count: 0 } as Tag));

  // Get display names based on mode
  const selectedNames = mode === 'immediate'
    ? selectedTags.map(t => t.name)
    : selectedTagNames;

  // Filter suggestions based on input
  const suggestions = tags.filter(tag =>
    !selectedNames.includes(tag.name) &&
    tag.name.toLowerCase().includes(inputValue.toLowerCase())
  );

  const handleAddTag = async (tagName: string) => {
    const trimmedName = tagName.trim();
    if (!trimmedName) return;

    // Check if tag already exists
    const existingTag = tags.find(t => t.name.toLowerCase() === trimmedName.toLowerCase());

    if (mode === 'immediate') {
      // Immediate mode: create tag via API
      if (existingTag) {
        // Add existing tag ID
        if (!selectedTagIds.includes(existingTag.id)) {
          onTagIdsChange?.([...selectedTagIds, existingTag.id]);
        }
      } else {
        // Create new tag
        setCreating(true);
        try {
          const newTag = await tagsApi.create(trimmedName);
          addTag({ ...newTag, usage_count: 0 });
          onTagIdsChange?.([...selectedTagIds, newTag.id]);
          await fetchTags(); // Refresh tags list
        } catch (error) {
          console.error('Failed to create tag:', error);
        } finally {
          setCreating(false);
        }
      }
    } else {
      // Deferred mode: just collect tag names
      const nameToAdd = existingTag ? existingTag.name : trimmedName;
      if (!selectedTagNames.includes(nameToAdd)) {
        onTagNamesChange?.([...selectedTagNames, nameToAdd]);
      }
    }

    setInputValue('');
    setShowSuggestions(false);
  };

  const handleRemoveTag = (tagToRemove: Tag | string) => {
    if (mode === 'immediate') {
      const id = typeof tagToRemove === 'string' ? tagToRemove : tagToRemove.id;
      onTagIdsChange?.(selectedTagIds.filter(tagId => tagId !== id));
    } else {
      const name = typeof tagToRemove === 'string' ? tagToRemove : tagToRemove.name;
      onTagNamesChange?.(selectedTagNames.filter(n => n !== name));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (inputValue.trim()) {
        handleAddTag(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && selectedTags.length > 0) {
      // Remove last tag if backspace on empty input
      handleRemoveTag(selectedTags[selectedTags.length - 1]);
    }
  };

  const handleSuggestionClick = (tag: Tag) => {
    if (mode === 'immediate') {
      onTagIdsChange?.([...selectedTagIds, tag.id]);
    } else {
      onTagNamesChange?.([...selectedTagNames, tag.name]);
    }
    setInputValue('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const isSmall = className.includes('text-xs');

  return (
    <div className={`relative ${className}`}>
      {showLabel && (
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Tags
        </label>
      )}

      {/* Selected tags display */}
      <div className={`flex flex-wrap gap-${isSmall ? '1' : '2'} mb-${isSmall ? '1' : '2'}`}>
        {selectedTags.map((tag) => (
          <span
            key={tag.id}
            className={`inline-flex items-center gap-1 px-2 py-${isSmall ? '0.5' : '1'} bg-blue-900/30 text-blue-300 rounded ${isSmall ? 'text-xs' : 'text-sm'}`}
          >
            {tag.name}
            <button
              type="button"
              onClick={() => handleRemoveTag(tag)}
              className="hover:text-blue-100 transition-colors"
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
          placeholder={placeholder}
          className={isSmall ? 'w-full bg-dark-bg border border-gray-600 rounded px-2 py-1 text-xs' : 'input-field'}
          disabled={creating}
        />

        {/* Suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className={`absolute z-${isSmall ? '30' : '10'} w-full mt-1 bg-dark-card border border-gray-600 rounded shadow-lg max-h-${isSmall ? '32' : '48'} overflow-y-auto`}>
            {suggestions.map(tag => (
              <button
                key={tag.id}
                type="button"
                onClick={() => handleSuggestionClick(tag)}
                className={`w-full text-left px-${isSmall ? '2' : '3'} py-${isSmall ? '1' : '2'} hover:bg-dark-hover transition-colors ${isSmall ? 'text-xs' : ''} flex items-center justify-between`}
              >
                <span>{tag.name}</span>
                <span className="text-xs text-gray-400">
                  {tag.usage_count} {tag.usage_count === 1 ? 'use' : 'uses'}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Create new tag hint */}
        {showSuggestions && inputValue.trim() && suggestions.length === 0 && (
          <div className={`absolute z-${isSmall ? '30' : '10'} w-full mt-1 bg-dark-card border border-gray-600 rounded shadow-lg`}>
            <div className={`px-${isSmall ? '2' : '3'} py-${isSmall ? '1' : '2'} ${isSmall ? 'text-xs' : 'text-sm'} text-gray-400`}>
              Press Enter to create "{inputValue.trim()}"
            </div>
          </div>
        )}
      </div>

      {showLabel && !isSmall && (
        <p className="text-xs text-gray-400 mt-1">
          Type to search existing tags or create new ones
        </p>
      )}
    </div>
  );
}
