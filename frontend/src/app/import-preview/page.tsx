'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { dataApi } from '@/lib/api';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import SimpleTagInput from '@/components/SimpleTagInput';
import type { ImportPreviewResponse, ImportPlacePreview } from '@/types';

export default function ImportPreviewPage() {
  const router = useRouter();
  const { token, fetchTags } = useStore();
  const [previewData, setPreviewData] = useState<ImportPreviewResponse | null>(null);
  const [editedPlaces, setEditedPlaces] = useState<ImportPlacePreview[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }

    // Fetch existing tags
    fetchTags();

    // Load preview data from sessionStorage
    const storedData = sessionStorage.getItem('import_preview');
    if (!storedData) {
      router.push('/settings');
      return;
    }

    try {
      const data = JSON.parse(storedData) as ImportPreviewResponse;
      setPreviewData(data);
      // Sort places alphabetically by name
      const sortedPlaces = [...data.places].sort((a, b) =>
        a.name.localeCompare(b.name)
      );
      setEditedPlaces(sortedPlaces);
    } catch (error) {
      console.error('Failed to parse preview data:', error);
      router.push('/settings');
    }
  }, [token, router, fetchTags]);

  const handleFieldChange = (index: number, field: keyof ImportPlacePreview, value: any) => {
    const updated = [...editedPlaces];
    updated[index] = { ...updated[index], [field]: value };
    setEditedPlaces(updated);
  };

  const handleDelete = (index: number) => {
    const updated = editedPlaces.filter((_, i) => i !== index);
    setEditedPlaces(updated);
  };

  const handleConfirm = async () => {
    if (editedPlaces.length === 0) {
      alert('No places to import');
      return;
    }

    setLoading(true);

    try {
      const result = await dataApi.confirmImport(editedPlaces);

      // Clear sessionStorage
      sessionStorage.removeItem('import_preview');

      const { summary } = result;
      const message = `Import successful!\n\n` +
        `✓ Imported: ${summary.places_imported} places\n` +
        `⊘ Skipped: ${summary.places_skipped} duplicates\n` +
        `✓ Created: ${summary.tags_created} new tags\n` +
        `✓ Matched: ${summary.tags_matched} existing tags\n\n` +
        (summary.errors && summary.errors.length > 0 ? `Errors:\n${summary.errors.slice(0, 5).join('\n')}` : '');

      alert(message);
      router.push('/');
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to confirm import');
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (confirm('Are you sure you want to cancel this import? All preview data will be lost.')) {
      sessionStorage.removeItem('import_preview');
      router.push('/settings');
    }
  };

  if (!previewData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-bg">
        <div className="text-white">Loading preview...</div>
      </div>
    );
  }

  const { summary } = previewData;

  return (
    <div className="h-screen flex flex-col bg-dark-bg">
      <Navbar />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar />

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 sm:p-6 border-b border-gray-700">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Import Preview</h1>

            <div className="flex flex-wrap gap-4 text-sm">
              <div>
                <span className="text-gray-400">Total:</span>{' '}
                <span className="font-semibold">{summary.total}</span>
              </div>
              <div>
                <span className="text-gray-400">Successful:</span>{' '}
                <span className="font-semibold text-green-400">{summary.successful}</span>
              </div>
              <div>
                <span className="text-gray-400">Duplicates:</span>{' '}
                <span className="font-semibold text-yellow-400">{summary.duplicates}</span>
              </div>
              <div>
                <span className="text-gray-400">Failed:</span>{' '}
                <span className="font-semibold text-red-400">{summary.failed}</span>
              </div>
              <div>
                <span className="text-gray-400">To Import:</span>{' '}
                <span className="font-semibold text-blue-400">{editedPlaces.length}</span>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={handleConfirm}
                disabled={loading || editedPlaces.length === 0}
                className="btn-primary"
              >
                {loading ? 'Importing...' : `Confirm Import (${editedPlaces.length})`}
              </button>
              <button
                onClick={handleCancel}
                disabled={loading}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4 sm:p-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="sticky top-0 bg-dark-card border-b-2 border-gray-600">
                  <tr>
                    <th className="p-2 min-w-[150px]">Name</th>
                    <th className="p-2 min-w-[200px]">Address</th>
                    <th className="p-2 min-w-[150px]">Tags</th>
                    <th className="p-2 min-w-[200px]">Notes</th>
                    <th className="p-2 min-w-[100px]">Phone</th>
                    <th className="p-2 min-w-[150px]">Website</th>
                    <th className="p-2 min-w-[80px]">Status</th>
                    <th className="p-2 min-w-[80px]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {editedPlaces.map((place, index) => (
                    <tr
                      key={index}
                      className={`border-b border-gray-700 ${
                        place.is_duplicate ? 'bg-yellow-900/20' : ''
                      } ${place.error ? 'bg-red-900/20' : ''}`}
                    >
                      <td className="p-2">
                        <input
                          type="text"
                          value={place.name}
                          onChange={(e) => handleFieldChange(index, 'name', e.target.value)}
                          className="w-full bg-dark-bg border border-gray-600 rounded px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={place.address}
                          onChange={(e) => handleFieldChange(index, 'address', e.target.value)}
                          className="w-full bg-dark-bg border border-gray-600 rounded px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="p-2">
                        <SimpleTagInput
                          selectedTags={place.tags}
                          onTagsChange={(tags) => handleFieldChange(index, 'tags', tags)}
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={place.notes}
                          onChange={(e) => handleFieldChange(index, 'notes', e.target.value)}
                          className="w-full bg-dark-bg border border-gray-600 rounded px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={place.phone}
                          onChange={(e) => handleFieldChange(index, 'phone', e.target.value)}
                          className="w-full bg-dark-bg border border-gray-600 rounded px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={place.website}
                          onChange={(e) => handleFieldChange(index, 'website', e.target.value)}
                          className="w-full bg-dark-bg border border-gray-600 rounded px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="p-2">
                        {place.error ? (
                          <span className="text-red-400 text-xs" title={place.error}>
                            Error
                          </span>
                        ) : place.is_duplicate ? (
                          <span className="text-yellow-400 text-xs">Duplicate</span>
                        ) : (
                          <span className="text-green-400 text-xs">OK</span>
                        )}
                      </td>
                      <td className="p-2">
                        <button
                          onClick={() => handleDelete(index)}
                          className="text-red-400 hover:text-red-300 text-xs px-2 py-1 border border-red-400 rounded"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {editedPlaces.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  No places to import
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
