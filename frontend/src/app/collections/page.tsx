'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { listsApi } from '@/lib/api';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';
import type { List, ListWithPlaceCount } from '@/types';

const PRESET_COLORS = [
  '#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#6B7280'
];

export default function CollectionsPage() {
  const router = useRouter();
  const { token, lists, addList, updateList, deleteList: removeListFromStore, fetchLists } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [editingList, setEditingList] = useState<ListWithPlaceCount | undefined>();
  const [formData, setFormData] = useState({
    name: '',
    color: '#3B82F6',
    icon: '',
    is_public: false,
  });

  useEffect(() => {
    if (!token) {
      router.push('/login');
    }
  }, [token]);

  const handleOpenModal = (list?: ListWithPlaceCount) => {
    if (list) {
      setEditingList(list);
      setFormData({
        name: list.name,
        color: list.color,
        icon: list.icon || '',
        is_public: list.is_public,
      });
    } else {
      setEditingList(undefined);
      setFormData({
        name: '',
        color: '#3B82F6',
        icon: '',
        is_public: false,
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingList) {
        const updated = await listsApi.update(editingList.id, formData);
        updateList({ ...updated, place_count: editingList.place_count });
      } else {
        const created = await listsApi.create(formData);
        addList({ ...created, place_count: 0 } as ListWithPlaceCount);
      }
      setShowModal(false);
      await fetchLists();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to save collection');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure? Places in this collection will not be deleted.')) return;

    try {
      await listsApi.delete(id);
      removeListFromStore(id);
    } catch (error) {
      alert('Failed to delete collection');
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
          <h1 className="text-2xl sm:text-3xl font-bold">Manage Collections</h1>
          <button onClick={() => handleOpenModal()} className="btn-primary w-full sm:w-auto">
            Create New Collection
          </button>
            </div>

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
                  onClick={() => handleOpenModal(list)}
                  className="btn-secondary text-xs flex-1 sm:flex-none"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(list.id)}
                  className="btn-danger text-xs flex-1 sm:flex-none"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}

          {lists.length === 0 && (
            <div className="card text-center py-12">
              <p className="text-gray-400">No collections yet. Create your first collection!</p>
            </div>
          )}
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-dark-card sm:rounded-lg max-w-md w-full h-full sm:h-auto">
            <div className="border-b border-gray-700 px-4 sm:px-6 py-4 flex justify-between items-center">
              <h2 className="text-xl font-bold">{editingList ? 'Edit Collection' : 'Create Collection'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white text-2xl p-2 -mr-2">
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                  placeholder="Favorites, Want to Try..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Color
                </label>
                <div className="flex gap-2">
                  {PRESET_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData({ ...formData, color })}
                      className={`w-10 h-10 rounded ${formData.color === color ? 'ring-2 ring-white' : ''}`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Icon (emoji)
                </label>
                <input
                  type="text"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  className="input-field"
                  placeholder="⭐ 🍕 ☕"
                  maxLength={2}
                />
              </div>

              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_public}
                    onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium text-gray-300">Make this collection public (shareable)</span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingList ? 'Update' : 'Create'}
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
