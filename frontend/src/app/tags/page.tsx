'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { tagsApi } from '@/lib/api';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';
import type { Tag, TagWithUsage } from '@/types';

export default function TagsPage() {
  const router = useRouter();
  const { token, tags, addTag, updateTag, deleteTag: removeTagFromStore, fetchTags } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [editingTag, setEditingTag] = useState<TagWithUsage | undefined>();
  const [tagName, setTagName] = useState('');
  const [activeLetter, setActiveLetter] = useState<string | null>(null);

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
    } else {
      setEditingTag(undefined);
      setTagName('');
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingTag) {
        const updated = await tagsApi.update(editingTag.id, tagName);
        updateTag({ ...updated, usage_count: editingTag.usage_count });
      } else {
        const created = await tagsApi.create(tagName);
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
    <div className="h-screen flex flex-col bg-dark-bg pb-16 sm:pb-0">
      <Navbar />

      <div className="flex-1 flex overflow-hidden">
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
                              className="flex-1 cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => router.push(`/tags/${tag.id}`)}
                            >
                              <h3 className="font-semibold text-lg">#{tag.name}</h3>
                              <p className="text-sm text-gray-400">
                                Used by {tag.usage_count} place{tag.usage_count !== 1 ? 's' : ''}
                              </p>
                            </div>

                            <div className="flex gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenModal(tag);
                                }}
                                className="btn-secondary text-sm flex-1 sm:flex-none"
                              >
                                Edit
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(tag.id, tag.usage_count);
                                }}
                                className="btn-danger text-sm flex-1 sm:flex-none"
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

            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Tag Name *
                </label>
                <input
                  type="text"
                  required
                  value={tagName}
                  onChange={(e) => setTagName(e.target.value)}
                  className="input-field"
                  placeholder="romantic, kid-friendly, outdoor-seating..."
                />
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
