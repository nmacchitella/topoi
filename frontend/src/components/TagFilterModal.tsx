'use client';

import { useState, useEffect } from 'react';
import { useStore } from '@/store/useStore';

interface TagFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TagFilterModal({ isOpen, onClose }: TagFilterModalProps) {
  const { tags, selectedTagIds, setSelectedTagIds } = useStore();
  const [localSelectedIds, setLocalSelectedIds] = useState<string[]>(selectedTagIds);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setLocalSelectedIds(selectedTagIds);
  }, [selectedTagIds, isOpen]);

  if (!isOpen) return null;

  // Sort tags by usage count (most used first)
  const sortedTags = [...tags].sort((a, b) => b.usage_count - a.usage_count);

  // Filter tags by search query
  const filteredTags = searchQuery.trim()
    ? sortedTags.filter(tag => tag.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : sortedTags;

  const handleToggleTag = (tagId: string) => {
    if (localSelectedIds.includes(tagId)) {
      setLocalSelectedIds(localSelectedIds.filter(id => id !== tagId));
    } else {
      setLocalSelectedIds([...localSelectedIds, tagId]);
    }
  };

  const handleApply = () => {
    setSelectedTagIds(localSelectedIds);
    onClose();
  };

  const handleClear = () => {
    setLocalSelectedIds([]);
    setSelectedTagIds([]);
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />

      {/* Modal - Desktop: dropdown, Mobile: bottom sheet */}
      <div className="fixed sm:absolute sm:top-full sm:right-0 sm:mt-2 inset-x-0 bottom-0 sm:bottom-auto sm:inset-x-auto sm:w-96 bg-dark-card border border-gray-600 rounded-t-2xl sm:rounded-lg shadow-xl z-50 max-h-[70vh] sm:max-h-96 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-600">
          <h3 className="text-lg font-semibold">Filter by Tags</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-600">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tags..."
            className="w-full bg-dark-bg border border-gray-600 rounded px-3 py-2 text-sm"
          />
        </div>

        {/* Tag list */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredTags.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              {searchQuery ? 'No tags found' : 'No tags yet'}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredTags.map(tag => (
                <button
                  key={tag.id}
                  onClick={() => handleToggleTag(tag.id)}
                  className={`w-full text-left px-3 py-2.5 rounded transition-colors flex items-center justify-between ${
                    localSelectedIds.includes(tag.id)
                      ? 'bg-blue-900/30 text-blue-300'
                      : 'hover:bg-dark-hover'
                  }`}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                        localSelectedIds.includes(tag.id)
                          ? 'bg-blue-600 border-blue-600'
                          : 'border-gray-500'
                      }`}
                    >
                      {localSelectedIds.includes(tag.id) && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span className="truncate">{tag.name}</span>
                  </div>
                  <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                    {tag.usage_count}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-gray-600 flex gap-2">
          <button
            onClick={handleClear}
            className="flex-1 btn-secondary"
            disabled={localSelectedIds.length === 0}
          >
            Clear
          </button>
          <button
            onClick={handleApply}
            className="flex-1 btn-primary"
          >
            Apply {localSelectedIds.length > 0 && `(${localSelectedIds.length})`}
          </button>
        </div>
      </div>
    </>
  );
}
