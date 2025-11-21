'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { authApi, dataApi } from '@/lib/api';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';

export default function SettingsPage() {
  const router = useRouter();
  const { token, user, setUser, logout } = useStore();

  // Profile form
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
  });
  const [profileLoading, setProfileLoading] = useState(false);

  // Password form
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Delete account
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Import data
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importLoading, setImportLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }

    if (user) {
      setProfileData({
        name: user.name,
        email: user.email,
      });
    }
  }, [token, user]);

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);

    try {
      const updated = await authApi.updateProfile(profileData);
      setUser(updated);
      alert('Profile updated successfully');
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.new_password !== passwordData.confirm_password) {
      alert('New passwords do not match');
      return;
    }

    if (passwordData.new_password.length < 6) {
      alert('New password must be at least 6 characters');
      return;
    }

    setPasswordLoading(true);

    try {
      await authApi.changePassword({
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
      });
      alert('Password changed successfully');
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone and will delete all your places, collections, and tags.')) {
      return;
    }

    if (!confirm('This is your final warning. Your account and all data will be permanently deleted. Continue?')) {
      return;
    }

    setDeleteLoading(true);

    try {
      await authApi.deleteAccount();
      logout();
      router.push('/login');
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to delete account');
      setDeleteLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) return;

    setImportLoading(true);

    try {
      const result = await dataApi.importData(selectedFile);

      if (result.success) {
        const { summary } = result;
        const message = `Import successful!\n\n` +
          `✓ Imported: ${summary.places_imported} places\n` +
          `⊘ Skipped: ${summary.places_skipped} duplicates\n` +
          `✓ Created: ${summary.tags_created} new tags\n` +
          `✓ Matched: ${summary.tags_matched} existing tags\n\n` +
          (summary.errors.length > 0 ? `Errors:\n${summary.errors.slice(0, 5).join('\n')}` : '');

        alert(message);
        setSelectedFile(null);

        // Refresh the page to show new places
        window.location.reload();
      }
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to import data');
    } finally {
      setImportLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-dark-bg">
      <Navbar />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar />

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto space-y-8">
            <h1 className="text-3xl font-bold">Settings</h1>

            {/* Profile Settings */}
            <div className="card">
              <h2 className="text-xl font-semibold mb-4">Profile Information</h2>
              <form onSubmit={handleProfileSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    required
                    value={profileData.name}
                    onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    className="input-field"
                  />
                </div>

                <button type="submit" disabled={profileLoading} className="btn-primary">
                  {profileLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            </div>

            {/* Password Settings */}
            <div className="card">
              <h2 className="text-xl font-semibold mb-4">Change Password</h2>
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    required
                    value={passwordData.current_password}
                    onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={passwordData.new_password}
                    onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={passwordData.confirm_password}
                    onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                    className="input-field"
                  />
                </div>

                <button type="submit" disabled={passwordLoading} className="btn-primary">
                  {passwordLoading ? 'Changing...' : 'Change Password'}
                </button>
              </form>
            </div>

            {/* Data Management */}
            <div className="card">
              <h2 className="text-xl font-semibold mb-4">Data Management</h2>

              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Import Data</h3>
                  <p className="text-sm text-gray-400 mb-3">
                    Import places from Mapstr (GeoJSON format)
                  </p>

                  <input
                    type="file"
                    accept=".json,.geojson"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="import-file"
                  />
                  <label htmlFor="import-file" className="btn-secondary cursor-pointer inline-block">
                    Choose File
                  </label>

                  {selectedFile && (
                    <div className="mt-3">
                      <p className="text-sm">Selected: {selectedFile.name}</p>
                      <button onClick={handleImport} disabled={importLoading} className="btn-primary mt-2">
                        {importLoading ? 'Importing...' : 'Import'}
                      </button>
                    </div>
                  )}
                </div>

                <div className="opacity-50">
                  <h3 className="font-medium mb-2">Export Data</h3>
                  <p className="text-sm text-gray-400 mb-3">
                    Coming soon
                  </p>
                  <button disabled className="btn-secondary opacity-50 cursor-not-allowed">
                    Export All Data
                  </button>
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="card border-2 border-red-600/50">
              <h2 className="text-xl font-semibold mb-4 text-red-400">Danger Zone</h2>
              <p className="text-gray-300 mb-4">
                Once you delete your account, there is no going back. All your places, collections, and tags will be permanently deleted.
              </p>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteLoading}
                className="btn-danger"
              >
                {deleteLoading ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
