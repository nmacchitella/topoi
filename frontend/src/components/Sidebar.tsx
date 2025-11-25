'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useStore } from '@/store/useStore';

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { tags, selectedTagIds, setSelectedTagIds, sidebarOpen, setSidebarOpen } = useStore();
  const [isCollapsed, setIsCollapsed] = useState(false);

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

  // Sort tags by usage count (most used first)
  const sortedTags = [...tags].sort((a, b) => b.usage_count - a.usage_count);

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
                <h2 className="text-lg font-semibold text-white">Tags</h2>
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

        {/* Tags list */}
        <nav className="flex-1 py-2 overflow-y-auto">
          {sortedTags.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-400 text-sm">
              {!effectiveCollapsed && 'No tags yet'}
            </div>
          ) : (
            sortedTags.map((tag) => {
              const isSelected = selectedTagIds.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  onClick={() => handleTagClick(tag.id)}
                  className={`w-full flex items-center gap-2 px-4 py-2.5 transition-colors ${
                    isSelected
                      ? 'bg-primary/20 text-text-primary border-l-4 border-primary'
                      : 'text-gray-400 hover:bg-dark-hover hover:text-text-primary border-l-4 border-transparent'
                  }`}
                  title={effectiveCollapsed ? `${tag.name} (${tag.usage_count})` : undefined}
                >
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isSelected ? 'bg-primary' : 'bg-gray-500'}`} />
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
