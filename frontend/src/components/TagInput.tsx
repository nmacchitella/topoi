'use client';

import { useState, useRef, useEffect } from 'react';
import { tagsApi } from '@/lib/api';
import { useStore } from '@/store/useStore';
import type { Tag, TagWithUsage } from '@/types';

interface TagInputProps {
  selectedTagIds: string[];
  onTagsChange: (tagIds: string[]) => void;
}

export default function TagInput({ selectedTagIds, onTagsChange }: TagInputProps) {
  const { tags, addTag, fetchTags } = useStore();
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get selected tags
  const selectedTags = tags.filter(tag => selectedTagIds.includes(tag.id));

  // Filter suggestions based on input
  const suggestions = tags.filter(tag =>
    !selectedTagIds.includes(tag.id) &&
    tag.name.toLowerCase().includes(inputValue.toLowerCase())
  );

  const handleAddTag = async (tagName: string) => {
    const trimmedName = tagName.trim();
    if (!trimmedName) return;

    // Check if tag already exists
    const existingTag = tags.find(t => t.name.toLowerCase() === trimmedName.toLowerCase());

    if (existingTag) {
      // Add existing tag
      if (!selectedTagIds.includes(existingTag.id)) {
        onTagsChange([...selectedTagIds, existingTag.id]);
      }
    } else {
      // Create new tag
      setCreating(true);
      try {
        const newTag = await tagsApi.create(trimmedName);
        addTag({ ...newTag, usage_count: 0 });
        onTagsChange([...selectedTagIds, newTag.id]);
        await fetchTags(); // Refresh tags list
      } catch (error) {
        console.error('Failed to create tag:', error);
      } finally {
        setCreating(false);
      }
    }

    setInputValue('');
    setShowSuggestions(false);
  };

  const handleRemoveTag = (tagId: string) => {
    onTagsChange(selectedTagIds.filter(id => id !== tagId));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (inputValue.trim()) {
        handleAddTag(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && selectedTags.length > 0) {
      // Remove last tag if backspace on empty input
      handleRemoveTag(selectedTags[selectedTags.length - 1].id);
    }
  };

  const handleSuggestionClick = (tag: Tag) => {
    onTagsChange([...selectedTagIds, tag.id]);
    setInputValue('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-300 mb-1">
        Tags
      </label>

      {/* Selected tags display */}
      <div className="flex flex-wrap gap-2 mb-2">
        {selectedTags.map(tag => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-900/30 text-blue-300 rounded text-sm"
          >
            {tag.name}
            <button
              type="button"
              onClick={() => handleRemoveTag(tag.id)}
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
          placeholder="Type to search or create tags (press Enter)"
          className="input-field"
          disabled={creating}
        />

        {/* Suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-dark-card border border-gray-600 rounded shadow-lg max-h-48 overflow-y-auto">
            {suggestions.map(tag => (
              <button
                key={tag.id}
                type="button"
                onClick={() => handleSuggestionClick(tag)}
                className="w-full text-left px-3 py-2 hover:bg-dark-hover transition-colors flex items-center justify-between"
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
          <div className="absolute z-10 w-full mt-1 bg-dark-card border border-gray-600 rounded shadow-lg">
            <div className="px-3 py-2 text-sm text-gray-400">
              Press Enter to create tag "{inputValue.trim()}"
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400 mt-1">
        Type to search existing tags or create new ones
      </p>
    </div>
  );
}
