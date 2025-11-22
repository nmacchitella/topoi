'use client';

import { useState, useRef } from 'react';
import { useStore } from '@/store/useStore';

interface SimpleTagInputProps {
  selectedTags: string[];
  onTagsChange: (tags: string[]) => void;
}

export default function SimpleTagInput({ selectedTags, onTagsChange }: SimpleTagInputProps) {
  const { tags } = useStore();
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter suggestions based on input
  const suggestions = tags.filter(tag =>
    !selectedTags.includes(tag.name) &&
    tag.name.toLowerCase().includes(inputValue.toLowerCase())
  );

  const handleAddTag = (tagName: string) => {
    const trimmedName = tagName.trim();
    if (!trimmedName) return;

    // Check if tag already exists
    const existingTag = tags.find(t => t.name.toLowerCase() === trimmedName.toLowerCase());

    if (existingTag) {
      // Add existing tag name
      if (!selectedTags.includes(existingTag.name)) {
        onTagsChange([...selectedTags, existingTag.name]);
      }
    } else {
      // Add new tag name (will be created on import)
      if (!selectedTags.includes(trimmedName)) {
        onTagsChange([...selectedTags, trimmedName]);
      }
    }

    setInputValue('');
    setShowSuggestions(false);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onTagsChange(selectedTags.filter(tag => tag !== tagToRemove));
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

  const handleSuggestionClick = (tagName: string) => {
    onTagsChange([...selectedTags, tagName]);
    setInputValue('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  return (
    <div className="relative">
      {/* Selected tags display */}
      <div className="flex flex-wrap gap-1 mb-1">
        {selectedTags.map((tag, idx) => (
          <span
            key={idx}
            className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-900/30 text-blue-300 rounded text-xs"
          >
            {tag}
            <button
              type="button"
              onClick={() => handleRemoveTag(tag)}
              className="hover:text-blue-100 transition-colors text-xs"
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
          placeholder="Type to add tags"
          className="w-full bg-dark-bg border border-gray-600 rounded px-2 py-1 text-xs"
        />

        {/* Suggestions dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-30 w-full mt-1 bg-dark-card border border-gray-600 rounded shadow-lg max-h-32 overflow-y-auto">
            {suggestions.map(tag => (
              <button
                key={tag.id}
                type="button"
                onClick={() => handleSuggestionClick(tag.name)}
                className="w-full text-left px-2 py-1 hover:bg-dark-hover transition-colors text-xs flex items-center justify-between"
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
          <div className="absolute z-30 w-full mt-1 bg-dark-card border border-gray-600 rounded shadow-lg">
            <div className="px-2 py-1 text-xs text-gray-400">
              Press Enter to create "{inputValue.trim()}"
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
