'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { tagsApi } from '@/lib/api';
import { TAG_COLORS, PRESET_TAG_ICONS, DEFAULT_TAG_COLOR, getRandomTagColor, suggestIconForTag } from '@/lib/tagColors';
import TagIcon from '@/components/TagIcon';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';
import type { TagWithUsage } from '@/types';

export default function TagsPage() {
  const router = useRouter();
  const { token, tags, addTag, updateTag, deleteTag: removeTagFromStore, fetchTags } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [editingTag, setEditingTag] = useState<TagWithUsage | undefined>();
  const [tagName, setTagName] = useState('');
  const [tagColor, setTagColor] = useState(DEFAULT_TAG_COLOR);
  const [tagIcon, setTagIcon] = useState('');
  const [showCustomColor, setShowCustomColor] = useState(false);
  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  const [iconSearch, setIconSearch] = useState('');
  const [suggestedIcon, setSuggestedIcon] = useState<string | null>(null);

  // Filter icons based on search
  const filteredIcons = iconSearch.trim()
    ? PRESET_TAG_ICONS.filter(icon =>
        icon.toLowerCase().includes(iconSearch.toLowerCase().replace(/ /g, '_'))
      )
    : PRESET_TAG_ICONS;

  // Auto-suggest icon when tag name changes
  const handleTagNameChange = (name: string) => {
    setTagName(name);
    if (!editingTag && name.length >= 2) {
      const suggested = suggestIconForTag(name);
      if (suggested && !tagIcon) {
        setSuggestedIcon(suggested);
      }
    }
  };

  const acceptSuggestedIcon = () => {
    if (suggestedIcon) {
      setTagIcon(suggestedIcon);
      setSuggestedIcon(null);
    }
  };

  // Sort tags alphabetically and group by first letter
  const { groupedTags, letters } = useMemo(() => {
    const sorted = [...tags].sort((a, b) => a.name.localeCompare(b.name));
    const grouped: Record<string, TagWithUsage[]> = {};
    const letterSet = new Set<string>();

    sorted.forEach(tag => {
      const firstLetter = tag.name[0].toUpperCase();
      if (!grouped[firstLetter]) {
        grouped[firstLetter] = [];
      }
      grouped[firstLetter].push(tag);
      letterSet.add(firstLetter);
    });

    return {
      groupedTags: grouped,
      letters: Array.from(letterSet).sort()
    };
  }, [tags]);

  const scrollToLetter = (letter: string) => {
    setActiveLetter(letter);
    const element = document.getElementById(`tag-letter-${letter}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  useEffect(() => {
    if (!token) {
      router.push('/login');
    }
  }, [token]);

  const handleOpenModal = (tag?: TagWithUsage) => {
    if (tag) {
      setEditingTag(tag);
      setTagName(tag.name);
      setTagColor(tag.color || DEFAULT_TAG_COLOR);
      setTagIcon(tag.icon || '');
    } else {
      setEditingTag(undefined);
      setTagName('');
      setTagColor(getRandomTagColor()); // Random color for new tags
      setTagIcon('');
    }
    setShowCustomColor(false);
    setIconSearch('');
    setSuggestedIcon(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingTag) {
        const updated = await tagsApi.update(editingTag.id, {
          name: tagName,
          color: tagColor,
          icon: tagIcon || undefined,
        });
        updateTag({ ...updated, usage_count: editingTag.usage_count });
      } else {
        const created = await tagsApi.create(tagName, tagColor, tagIcon || undefined);
        addTag({ ...created, usage_count: 0 });
      }
      setShowModal(false);
      await fetchTags();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to save tag');
    }
  };

  const handleDelete = async (id: string, usageCount: number) => {
    if (usageCount > 0) {
      if (!confirm(`This tag is used by ${usageCount} place(s). Are you sure you want to delete it?`)) {
        return;
      }
    }

    try {
      await tagsApi.delete(id);
      removeTagFromStore(id);
    } catch (error) {
      alert('Failed to delete tag');
    }
  };

  return (
    <div className="mobile-layout bg-dark-bg">
      <Navbar />

      <div className="flex-1 flex overflow-hidden mobile-content-area">
        <Sidebar />

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <h1 className="text-2xl sm:text-3xl font-bold">Manage Tags</h1>
              <button onClick={() => handleOpenModal()} className="btn-primary w-full sm:w-auto">
                Create New Tag
              </button>
            </div>

            {tags.length === 0 ? (
              <div className="card text-center py-12">
                <p className="text-gray-400">No tags yet. Create your first tag!</p>
              </div>
            ) : (
              <div className="relative space-y-4">
                {/* Tags grouped by letter */}
                <div className="space-y-6">
                  {letters.map(letter => (
                    <div key={letter} id={`tag-letter-${letter}`} className="scroll-mt-4">
                      <h3 className="text-2xl font-bold text-gray-400 mb-3 pb-2 border-b border-gray-700">
                        {letter}
                      </h3>
                      <div className="space-y-3">
                        {groupedTags[letter].map((tag) => (
                          <div key={tag.id} className="card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div
                              className="flex-1 cursor-pointer hover:opacity-80 transition-opacity flex items-center gap-3"
                              onClick={() => router.push(`/tags/${tag.id}`)}
                            >
                              <div
                                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                                style={{ backgroundColor: tag.color || DEFAULT_TAG_COLOR }}
                              >
                                {tag.icon ? (
                                  <TagIcon icon={tag.icon} size="md" />
                                ) : (
                                  <span className="text-lg">#</span>
                                )}
                              </div>
                              <div>
                                <h3 className="font-semibold text-lg">{tag.name}</h3>
                                <p className="text-sm text-gray-400">
                                  Used by {tag.usage_count} place{tag.usage_count !== 1 ? 's' : ''}
                                </p>
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenModal(tag);
                                }}
                                className="btn-secondary text-xs flex-1 sm:flex-none"
                              >
                                Edit
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(tag.id, tag.usage_count);
                                }}
                                className="btn-danger text-xs flex-1 sm:flex-none"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-dark-card sm:rounded-lg max-w-md w-full h-full sm:h-auto">
            <div className="border-b border-gray-700 px-4 sm:px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">{editingTag ? 'Edit Tag' : 'Create Tag'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white text-2xl p-2 -mr-2">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto max-h-[calc(100vh-120px)] sm:max-h-none">
              {/* Preview */}
              <div className="flex items-center gap-3 p-3 bg-dark-bg rounded-lg">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: tagColor }}
                >
                  {tagIcon ? (
                    <TagIcon icon={tagIcon} size="lg" />
                  ) : (
                    <span className="text-xl">#</span>
                  )}
                </div>
                <div>
                  <div className="font-semibold">{tagName || 'Tag preview'}</div>
                  <div className="text-sm text-gray-400">Preview</div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Tag Name *
                </label>
                <input
                  type="text"
                  required
                  value={tagName}
                  onChange={(e) => handleTagNameChange(e.target.value)}
                  className="input-field"
                  placeholder="romantic, kid-friendly, outdoor-seating..."
                />
                {suggestedIcon && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-gray-400">
                    <span>Suggested icon:</span>
                    <button
                      type="button"
                      onClick={acceptSuggestedIcon}
                      className="flex items-center gap-1 px-2 py-1 bg-primary/20 rounded hover:bg-primary/30 transition-colors"
                    >
                      <TagIcon icon={suggestedIcon} size="sm" className="text-primary" />
                      <span className="text-primary">{suggestedIcon.replace(/_/g, ' ')}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Color Picker */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Color
                </label>
                <div className="grid grid-cols-8 gap-2 mb-2">
                  {TAG_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => {
                        setTagColor(color);
                        setShowCustomColor(false);
                      }}
                      className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${
                        tagColor === color && !showCustomColor ? 'ring-2 ring-white ring-offset-2 ring-offset-dark-card' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setShowCustomColor(!showCustomColor)}
                  className="text-sm text-primary hover:underline"
                >
                  {showCustomColor ? 'Hide custom color' : 'Custom color...'}
                </button>
                {showCustomColor && (
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="color"
                      value={tagColor}
                      onChange={(e) => setTagColor(e.target.value)}
                      className="w-10 h-10 rounded cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={tagColor}
                      onChange={(e) => setTagColor(e.target.value)}
                      className="input-field flex-1"
                      placeholder="#3B82F6"
                      pattern="^#[0-9A-Fa-f]{6}$"
                    />
                  </div>
                )}
              </div>

              {/* Icon Picker */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Icon (Material Icon)
                </label>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={iconSearch}
                    onChange={(e) => setIconSearch(e.target.value)}
                    className="input-field flex-1"
                    placeholder="Search icons..."
                  />
                  {tagIcon && (
                    <button
                      type="button"
                      onClick={() => {
                        setTagIcon('');
                        setSuggestedIcon(null);
                      }}
                      className="text-gray-400 hover:text-white px-2"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="max-h-40 overflow-y-auto bg-dark-bg rounded-lg p-2">
                  <div className="grid grid-cols-8 gap-1">
                    {filteredIcons.slice(0, 64).map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        onClick={() => {
                          setTagIcon(tagIcon === icon ? '' : icon);
                          setSuggestedIcon(null);
                        }}
                        className={`w-9 h-9 rounded flex items-center justify-center hover:bg-dark-hover transition-colors ${
                          tagIcon === icon ? 'bg-primary/20 ring-1 ring-primary' : ''
                        }`}
                        title={icon.replace(/_/g, ' ')}
                      >
                        <TagIcon icon={icon} size="md" />
                      </button>
                    ))}
                  </div>
                  {filteredIcons.length === 0 && (
                    <div className="text-center text-gray-400 py-4 text-sm">
                      No icons found
                    </div>
                  )}
                  {filteredIcons.length > 64 && (
                    <div className="text-center text-gray-400 py-2 text-xs">
                      Showing 64 of {filteredIcons.length} icons. Type to search for more.
                    </div>
                  )}
                </div>
                {tagIcon && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-gray-400">
                    <span>Selected:</span>
                    <TagIcon icon={tagIcon} size="sm" />
                    <span>{tagIcon.replace(/_/g, ' ')}</span>
                  </div>
                )}
              </div>

              {editingTag && editingTag.usage_count > 0 && (
                <div className="bg-blue-900/20 border border-blue-700 text-blue-200 px-4 py-3 rounded text-sm">
                  Updating this tag will change it across all {editingTag.usage_count} place{editingTag.usage_count !== 1 ? 's' : ''}.
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingTag ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bottom Navigation - mobile only */}
      <BottomNav showNewButton={false} />
    </div>
  );
}
