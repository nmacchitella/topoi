'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { DEFAULT_TAG_COLOR } from '@/lib/tagColors';
import TagIcon from '@/components/TagIcon';
import type { TagWithUsage } from '@/types';

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const {
    tags,
    selectedTagIds,
    setSelectedTagIds,
    tagFilterMode,
    setTagFilterMode,
    sidebarOpen,
    setSidebarOpen,
    mapViewMode,
    selectedFollowedUserIds,
    followedUsersMetadata
  } = useStore();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [sortMode, setSortMode] = useState<'usage' | 'alpha'>('usage');

  // Only show sidebar on places-related pages
  const shouldShowSidebar = pathname === '/' || pathname?.startsWith('/places/');

  // Close sidebar when navigating away from places pages
  useEffect(() => {
    if (!shouldShowSidebar && sidebarOpen) {
      setSidebarOpen(false);
    }
  }, [pathname, shouldShowSidebar, sidebarOpen, setSidebarOpen]);

  // Hide sidebar completely on non-place pages
  if (!shouldShowSidebar) {
    return null;
  }

  // On mobile, always show expanded sidebar when open
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
  const effectiveCollapsed = isMobile ? false : isCollapsed;

  // Get tags based on map view mode
  // In layers mode with selected users, show those users' tags
  // Otherwise show the current user's tags
  const displayTags = useMemo(() => {
    if (mapViewMode === 'layers' && selectedFollowedUserIds.length > 0) {
      // Aggregate tags from all selected users
      const tagMap = new Map<string, TagWithUsage>();

      selectedFollowedUserIds.forEach(userId => {
        const metadata = followedUsersMetadata[userId];
        if (metadata?.tags) {
          metadata.tags.forEach(tag => {
            const existing = tagMap.get(tag.name.toLowerCase());
            if (existing) {
              // Aggregate usage counts for same tag name
              existing.usage_count += tag.usage_count;
            } else {
              tagMap.set(tag.name.toLowerCase(), { ...tag });
            }
          });
        }
      });

      return Array.from(tagMap.values());
    }
    return tags;
  }, [mapViewMode, selectedFollowedUserIds, followedUsersMetadata, tags]);

  // Sort tags based on sort mode
  const sortedTags = useMemo(() => {
    const tagsCopy = [...displayTags];
    if (sortMode === 'alpha') {
      return tagsCopy.sort((a, b) => a.name.localeCompare(b.name));
    }
    return tagsCopy.sort((a, b) => b.usage_count - a.usage_count);
  }, [displayTags, sortMode]);

  const handleTagClick = (tagId: string) => {
    // Toggle tag selection
    if (selectedTagIds.includes(tagId)) {
      setSelectedTagIds(selectedTagIds.filter(id => id !== tagId));
    } else {
      setSelectedTagIds([...selectedTagIds, tagId]);
    }
    // Close sidebar on mobile
    if (isMobile) {
      setSidebarOpen(false);
    }
    // Navigate to home to show filtered map
    router.push('/');
  };

  const clearAllTags = () => {
    setSelectedTagIds([]);
  };

  return (
    <>
      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 sm:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <div
        className={`bg-dark-card border-r border-gray-700 flex flex-col transition-all duration-300
          fixed sm:relative z-50
          top-0 sm:top-auto bottom-0 sm:bottom-auto h-screen sm:h-full
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} sm:translate-x-0
          ${effectiveCollapsed ? 'w-16' : 'w-64'}
        `}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between">
            {!effectiveCollapsed && (
              <div className="flex items-center justify-between flex-1">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    {mapViewMode === 'layers' && selectedFollowedUserIds.length > 0 ? 'Tags' : 'Topoi'}
                  </h2>
                  {mapViewMode === 'layers' && selectedFollowedUserIds.length > 0 && (
                    <p className="text-xs text-gray-400">
                      From {selectedFollowedUserIds.length} selected user{selectedFollowedUserIds.length > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
                {selectedTagIds.length > 0 && (
                  <button
                    onClick={clearAllTags}
                    className="text-xs text-primary hover:text-primary-hover transition-colors"
                  >
                    Clear ({selectedTagIds.length})
                  </button>
                )}
              </div>
            )}

            {/* Close button - mobile only */}
            <button
              onClick={() => setSidebarOpen(false)}
              className="sm:hidden text-gray-400 hover:text-white transition-colors ml-2"
              aria-label="Close menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Collapse button - desktop only */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden sm:block text-gray-400 hover:text-white transition-colors ml-2"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? '→' : '←'}
            </button>
          </div>
        </div>

        {/* Controls - only show when expanded and there are tags */}
        {!effectiveCollapsed && sortedTags.length > 0 && (
          <div className="px-4 py-3 border-b border-gray-700 space-y-3">
            {/* Sort toggle */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Sort by</span>
              <div className="flex bg-dark-bg rounded-lg p-0.5">
                <button
                  onClick={() => setSortMode('usage')}
                  className={`px-2 py-1 text-xs rounded-md transition-colors ${
                    sortMode === 'usage'
                      ? 'bg-dark-hover text-white'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                  title="Sort by usage count"
                >
                  Popular
                </button>
                <button
                  onClick={() => setSortMode('alpha')}
                  className={`px-2 py-1 text-xs rounded-md transition-colors ${
                    sortMode === 'alpha'
                      ? 'bg-dark-hover text-white'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                  title="Sort alphabetically"
                >
                  A-Z
                </button>
              </div>
            </div>

            {/* Filter mode toggle - only show when tags are selected */}
            {selectedTagIds.length > 1 && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">Show places with</span>
                <div className="flex bg-dark-bg rounded-lg p-0.5">
                  <button
                    onClick={() => setTagFilterMode('any')}
                    className={`px-2 py-1 text-xs rounded-md transition-colors ${
                      tagFilterMode === 'any'
                        ? 'bg-dark-hover text-white'
                        : 'text-gray-400 hover:text-gray-300'
                    }`}
                    title="Show places that have any of the selected tags"
                  >
                    Any tag
                  </button>
                  <button
                    onClick={() => setTagFilterMode('all')}
                    className={`px-2 py-1 text-xs rounded-md transition-colors ${
                      tagFilterMode === 'all'
                        ? 'bg-dark-hover text-white'
                        : 'text-gray-400 hover:text-gray-300'
                    }`}
                    title="Show places that have all selected tags"
                  >
                    All tags
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tags list */}
        <nav className="flex-1 py-2 overflow-y-auto">
          {sortedTags.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-400 text-sm">
              {!effectiveCollapsed && 'No tags yet'}
            </div>
          ) : (
            sortedTags.map((tag) => {
              const isSelected = selectedTagIds.includes(tag.id);
              const tagColor = tag.color || DEFAULT_TAG_COLOR;
              return (
                <button
                  key={tag.id}
                  onClick={() => handleTagClick(tag.id)}
                  className={`w-full flex items-center gap-2 px-4 py-2.5 transition-colors ${
                    isSelected
                      ? 'text-text-primary border-l-4'
                      : 'text-gray-400 hover:bg-dark-hover hover:text-text-primary border-l-4 border-transparent'
                  }`}
                  style={isSelected ? {
                    backgroundColor: `${tagColor}40`,
                    borderLeftColor: tagColor,
                  } : undefined}
                  title={effectiveCollapsed ? `${tag.name} (${tag.usage_count})` : undefined}
                >
                  <div
                    className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center"
                    style={{ backgroundColor: tagColor }}
                  >
                    {tag.icon && <TagIcon icon={tag.icon} size="xs" />}
                  </div>
                  {!effectiveCollapsed && (
                    <>
                      <span className="flex-1 text-left truncate">{tag.name}</span>
                      <span className="text-xs text-gray-400 flex-shrink-0">{tag.usage_count}</span>
                    </>
                  )}
                </button>
              );
            })
          )}
        </nav>
      </div>
    </>
  );
}
