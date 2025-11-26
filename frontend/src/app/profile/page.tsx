'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { listsApi, tagsApi, usersApi } from '@/lib/api';
import type { ListWithPlaceCount, TagWithUsage, UserSearchResult } from '@/types';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';

type Tab = 'collections' | 'tags' | 'following';

const PRESET_COLORS = [
  '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#6B7280'
];

export default function ProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { token, user, logout, lists, tags, addList, updateList, deleteList: removeListFromStore, addTag, updateTag, deleteTag: removeTagFromStore, fetchLists, fetchTags } = useStore();

  // Get tab from URL parameter or default to collections
  const tabParam = searchParams.get('tab') as Tab | null;
  const [activeTab, setActiveTab] = useState<Tab>(tabParam || 'collections');

  // Data states
  const [following, setFollowing] = useState<UserSearchResult[]>([]);
  const [followingLoading, setFollowingLoading] = useState(false);

  // Modals
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [editingCollection, setEditingCollection] = useState<ListWithPlaceCount | undefined>();
  const [editingTag, setEditingTag] = useState<TagWithUsage | undefined>();

  // Form data
  const [collectionFormData, setCollectionFormData] = useState({
    name: '',
    color: '#3B82F6',
    icon: '',
    is_public: false,
  });
  const [tagName, setTagName] = useState('');

  // Tags grouped by letter
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

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }

    // Update tab from URL parameter
    if (tabParam && tabParam !== activeTab) {
      setActiveTab(tabParam);
    }
  }, [token, tabParam]);

  useEffect(() => {
    // Load data for active tab
    if (activeTab === 'following' && following.length === 0) {
      loadFollowing();
    }
  }, [activeTab]);

  const loadFollowing = async () => {
    try {
      setFollowingLoading(true);
      const data = await usersApi.getFollowing();
      setFollowing(data);
    } catch (error) {
      console.error('Failed to load following:', error);
    } finally {
      setFollowingLoading(false);
    }
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    router.push(`/profile?tab=${tab}`, { scroll: false });
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // Collection handlers
  const handleOpenCollectionModal = (list?: ListWithPlaceCount) => {
    if (list) {
      setEditingCollection(list);
      setCollectionFormData({
        name: list.name,
        color: list.color,
        icon: list.icon || '',
        is_public: list.is_public,
      });
    } else {
      setEditingCollection(undefined);
      setCollectionFormData({
        name: '',
        color: '#3B82F6',
        icon: '',
        is_public: false,
      });
    }
    setShowCollectionModal(true);
  };

  const handleSubmitCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCollection) {
        const updated = await listsApi.update(editingCollection.id, collectionFormData);
        updateList({ ...updated, place_count: editingCollection.place_count });
      } else {
        const created = await listsApi.create(collectionFormData);
        addList({ ...created, place_count: 0 } as ListWithPlaceCount);
      }
      setShowCollectionModal(false);
      await fetchLists();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to save collection');
    }
  };

  const handleDeleteCollection = async (id: string) => {
    if (!confirm('Are you sure? Places in this collection will not be deleted.')) return;
    try {
      await listsApi.delete(id);
      removeListFromStore(id);
    } catch (error) {
      alert('Failed to delete collection');
    }
  };

  // Tag handlers
  const handleOpenTagModal = (tag?: TagWithUsage) => {
    if (tag) {
      setEditingTag(tag);
      setTagName(tag.name);
    } else {
      setEditingTag(undefined);
      setTagName('');
    }
    setShowTagModal(true);
  };

  const handleSubmitTag = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTag) {
        const updated = await tagsApi.update(editingTag.id, tagName);
        updateTag({ ...updated, usage_count: editingTag.usage_count });
      } else {
        const created = await tagsApi.create(tagName);
        addTag({ ...created, usage_count: 0 });
      }
      setShowTagModal(false);
      await fetchTags();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to save tag');
    }
  };

  const handleDeleteTag = async (id: string, usageCount: number) => {
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
    <div className="h-screen flex flex-col bg-dark-bg">
      <Navbar />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar />

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto p-4 sm:p-8">
            {/* Header */}
            <div className="card mb-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-primary to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-2xl sm:text-3xl flex-shrink-0">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-white">{user?.name || 'User'}</h1>
                    {user?.username && (
                      <p className="text-gray-400 mt-1">@{user.username}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => router.push('/settings')}
                    className="p-2 text-gray-400 hover:text-white hover:bg-dark-hover rounded-lg transition-colors"
                    aria-label="Settings"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                  <button
                    onClick={handleLogout}
                    className="btn-secondary text-sm flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Log Out
                  </button>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="card">
              <div className="border-b border-gray-700 flex items-center justify-between px-4 sm:px-6">
                <div className="flex gap-1">
                  <button
                    onClick={() => handleTabChange('collections')}
                    className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                      activeTab === 'collections'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-400 hover:text-white'
                    }`}
                  >
                    Collections
                  </button>
                  <button
                    onClick={() => handleTabChange('tags')}
                    className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                      activeTab === 'tags'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-400 hover:text-white'
                    }`}
                  >
                    Tags
                  </button>
                  <button
                    onClick={() => handleTabChange('following')}
                    className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                      activeTab === 'following'
                        ? 'border-primary text-primary'
                        : 'border-transparent text-gray-400 hover:text-white'
                    }`}
                  >
                    Following
                  </button>
                </div>
                {/* Create button */}
                {activeTab === 'collections' && (
                  <button onClick={() => handleOpenCollectionModal()} className="btn-primary text-sm my-2">
                    Create
                  </button>
                )}
                {activeTab === 'tags' && (
                  <button onClick={() => handleOpenTagModal()} className="btn-primary text-sm my-2">
                    Create
                  </button>
                )}
              </div>

              {/* Tab Content */}
              <div className="p-4 sm:p-6">
                {/* Collections Tab */}
                {activeTab === 'collections' && (
                  <div className="space-y-3">
                    {[...lists].sort((a, b) => a.name.localeCompare(b.name)).map((list) => (
                      <div key={list.id} className="card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div
                          className="flex items-center gap-4 flex-1 cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => router.push(`/collections/${list.id}`)}
                        >
                          <div
                            className="w-6 h-6 rounded flex-shrink-0"
                            style={{ backgroundColor: list.color }}
                          />
                          <div>
                            <h3 className="font-semibold text-lg">{list.name}</h3>
                            <p className="text-sm text-gray-400">
                              {list.place_count} place{list.place_count !== 1 ? 's' : ''}
                              {list.is_public && ' • Public'}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-10 sm:ml-0">
                          <button
                            onClick={() => handleOpenCollectionModal(list)}
                            className="btn-secondary text-xs flex-1 sm:flex-none"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteCollection(list.id)}
                            className="btn-danger text-xs flex-1 sm:flex-none"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                    {lists.length === 0 && (
                      <div className="text-center py-12">
                        <p className="text-gray-400">No collections yet. Create your first collection!</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Tags Tab */}
                {activeTab === 'tags' && (
                  <div>
                    {tags.length === 0 ? (
                      <div className="text-center py-12">
                        <p className="text-gray-400">No tags yet. Create your first tag!</p>
                      </div>
                    ) : (
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
                                        handleOpenTagModal(tag);
                                      }}
                                      className="btn-secondary text-xs flex-1 sm:flex-none"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteTag(tag.id, tag.usage_count);
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
                    )}
                  </div>
                )}

                {/* Following Tab */}
                {activeTab === 'following' && (
                  <div>
                    {followingLoading ? (
                      <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                        <div className="text-gray-400">Loading following...</div>
                      </div>
                    ) : following.length === 0 ? (
                      <div className="text-center py-12">
                        <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <p className="text-gray-400 mb-4">Not following anyone yet</p>
                        <button onClick={() => router.push('/explore')} className="btn-primary">
                          Explore Users
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {following.map((user) => (
                          <button
                            key={user.id}
                            onClick={() => router.push(`/users/${user.id}`)}
                            className="text-left p-4 bg-dark-hover border border-gray-700 rounded-lg hover:border-primary/50 transition-all flex items-center gap-4"
                          >
                            <div className="w-12 h-12 bg-gradient-to-br from-primary to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                              {user.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-white truncate">{user.name}</h3>
                              {user.username && (
                                <p className="text-sm text-gray-400">@{user.username}</p>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Collection Modal */}
      {showCollectionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-dark-card sm:rounded-lg max-w-md w-full h-full sm:h-auto">
            <div className="border-b border-gray-700 px-4 sm:px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">{editingCollection ? 'Edit Collection' : 'Create Collection'}</h2>
              <button onClick={() => setShowCollectionModal(false)} className="text-gray-400 hover:text-white text-2xl p-2 -mr-2">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitCollection} className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={collectionFormData.name}
                  onChange={(e) => setCollectionFormData({ ...collectionFormData, name: e.target.value })}
                  className="input-field"
                  placeholder="My favorite restaurants"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Icon (emoji)</label>
                <input
                  type="text"
                  value={collectionFormData.icon}
                  onChange={(e) => setCollectionFormData({ ...collectionFormData, icon: e.target.value })}
                  className="input-field"
                  placeholder="🍕"
                  maxLength={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Color</label>
                <div className="flex gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setCollectionFormData({ ...collectionFormData, color })}
                      className={`w-8 h-8 rounded ${collectionFormData.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-dark-card' : ''}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_public"
                  checked={collectionFormData.is_public}
                  onChange={(e) => setCollectionFormData({ ...collectionFormData, is_public: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="is_public" className="text-sm text-gray-300">
                  Make this collection public
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowCollectionModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingCollection ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tag Modal */}
      {showTagModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-dark-card sm:rounded-lg max-w-md w-full h-full sm:h-auto">
            <div className="border-b border-gray-700 px-4 sm:px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">{editingTag ? 'Edit Tag' : 'Create Tag'}</h2>
              <button onClick={() => setShowTagModal(false)} className="text-gray-400 hover:text-white text-2xl p-2 -mr-2">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitTag} className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Tag Name *</label>
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
                <button type="button" onClick={() => setShowTagModal(false)} className="btn-secondary">
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

      <BottomNav showNewButton={false} />
    </div>
  );
}
