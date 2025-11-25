'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { authApi, dataApi } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';

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

  // Telegram linking
  const [telegramLinked, setTelegramLinked] = useState(false);
  const [telegramUsername, setTelegramUsername] = useState('');
  const [linkCode, setLinkCode] = useState('');
  const [telegramLoading, setTelegramLoading] = useState(false);

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

    // Check Telegram link status
    checkTelegramStatus();
  }, [token, user]);

  const checkTelegramStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/telegram/link-status`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      setTelegramLinked(data.linked);
      if (data.linked) {
        setTelegramUsername(data.telegram_username || 'Unknown');
      }
    } catch (error) {
      console.error('Failed to check Telegram status:', error);
    }
  };

  const handleGenerateCode = async () => {
    if (!token) {
      alert('You must be logged in to link Telegram');
      return;
    }

    setTelegramLoading(true);
    try {
      console.log('Generating link code with API URL:', API_URL);
      console.log('Token present:', !!token);

      const response = await fetch(`${API_URL}/telegram/generate-link-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        if (response.status === 401) {
          alert('Your session has expired. Please log in again.');
          logout();
          router.push('/login');
          return;
        }
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `HTTP ${response.status}`);
      }

      const data = await response.json();
      setLinkCode(data.code);
    } catch (error: any) {
      console.error('Failed to generate link code:', error);
      alert(`Failed to generate link code: ${error.message}`);
    } finally {
      setTelegramLoading(false);
    }
  };

  const handleUnlinkTelegram = async () => {
    if (!confirm('Are you sure you want to unlink your Telegram account?')) {
      return;
    }

    setTelegramLoading(true);
    try {
      await fetch(`${API_URL}/telegram/unlink`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      setTelegramLinked(false);
      setTelegramUsername('');
      setLinkCode('');
      alert('Telegram account unlinked successfully');
    } catch (error: any) {
      alert('Failed to unlink Telegram account');
    } finally {
      setTelegramLoading(false);
    }
  };

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
      // Get preview data
      const previewData = await dataApi.previewImport(selectedFile);

      // Store preview data in sessionStorage and navigate to preview page
      sessionStorage.setItem('import_preview', JSON.stringify(previewData));
      router.push('/import-preview');
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to preview import');
      setImportLoading(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-dark-bg relative pb-16 sm:pb-0">
      {importLoading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-card p-6 rounded-lg shadow-xl">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <div className="text-white text-lg">Loading preview...</div>
            </div>
          </div>
        </div>
      )}
      <Navbar />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar />

        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-2xl mx-auto space-y-4">
            <h1 className="text-2xl sm:text-3xl font-bold mb-6">Settings</h1>

            {/* Profile Settings */}
            <div className="card">
              <h2 className="text-lg font-semibold mb-3">Profile Information</h2>
              <form onSubmit={handleProfileSubmit} className="space-y-3">
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
              <h2 className="text-lg font-semibold mb-3">Change Password</h2>
              <form onSubmit={handlePasswordSubmit} className="space-y-3">
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

            {/* Telegram Integration */}
            <div className="card">
              <h2 className="text-lg font-semibold mb-2">Telegram Integration</h2>
              <p className="text-sm text-gray-400 mb-3">
                Link your Telegram account to save places by sending Google Maps links to our bot.
              </p>

              {telegramLinked ? (
                <div className="space-y-3">
                  <div className="p-4 bg-green-900/20 border border-green-600/50 rounded-lg">
                    <div className="flex items-center gap-2 text-green-400 mb-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="font-medium">Connected</span>
                    </div>
                    <p className="text-sm text-gray-300">
                      Linked to: @{telegramUsername}
                    </p>
                  </div>

                  <div className="p-4 bg-blue-900/20 border border-blue-600/50 rounded-lg">
                    <h3 className="font-medium mb-2">How to use:</h3>
                    <ol className="text-sm text-gray-300 space-y-1 list-decimal list-inside">
                      <li>Find a place on Google Maps</li>
                      <li>Share the link → Copy link</li>
                      <li>Send it to @TopoiAppBot on Telegram</li>
                      <li>The place will be automatically saved!</li>
                    </ol>
                  </div>

                  <button
                    onClick={handleUnlinkTelegram}
                    disabled={telegramLoading}
                    className="btn-secondary text-red-400 hover:text-red-300 hover:bg-red-900/20"
                  >
                    {telegramLoading ? 'Unlinking...' : 'Unlink Telegram'}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {!linkCode ? (
                    <button
                      onClick={handleGenerateCode}
                      disabled={telegramLoading}
                      className="btn-primary"
                    >
                      {telegramLoading ? 'Generating...' : 'Link Telegram Account'}
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div className="p-4 bg-blue-900/20 border border-blue-600/50 rounded-lg">
                        <h3 className="font-medium mb-3">Follow these steps:</h3>
                        <ol className="text-sm text-gray-300 space-y-2 list-decimal list-inside">
                          <li>Open Telegram and search for <span className="font-mono text-blue-400">@TopoiAppBot</span></li>
                          <li>Send this command:
                            <div className="mt-2 p-3 bg-dark-bg rounded font-mono text-lg text-center select-all">
                              /start {linkCode}
                            </div>
                          </li>
                          <li>Wait for confirmation</li>
                        </ol>
                        <p className="text-xs text-gray-400 mt-3">
                          ⏱️ This code expires in 10 minutes
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`/start ${linkCode}`);
                            alert('Copied to clipboard!');
                          }}
                          className="btn-secondary flex-1"
                        >
                          📋 Copy Command
                        </button>
                        <a
                          href="https://t.me/TopoiAppBot"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-primary flex-1 text-center"
                        >
                          Open Bot
                        </a>
                      </div>

                      <button
                        onClick={() => setLinkCode('')}
                        className="btn-secondary w-full"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Data Management */}
            <div className="card">
              <h2 className="text-lg font-semibold mb-3">Data Management</h2>

              <div className="space-y-3">
                <div>
                  <h3 className="font-medium mb-2">Import Data</h3>
                  <p className="text-sm text-gray-400 mb-3">
                    Import places from Google Maps (CSV format) or Mapstr (GeoJSON format)
                  </p>

                  <input
                    type="file"
                    accept=".csv,.json,.geojson"
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
                        {importLoading ? 'Loading preview...' : 'Preview Import'}
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

            {/* Logout */}
            <div className="card">
              <h2 className="text-lg font-semibold mb-3">Session</h2>
              <button
                onClick={() => {
                  logout();
                  router.push('/login');
                }}
                className="btn-secondary text-red-400 hover:text-red-300 hover:bg-red-900/20 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Log Out
              </button>
            </div>

            {/* Danger Zone */}
            <div className="card border-2 border-red-600/50">
              <h2 className="text-lg font-semibold mb-2 text-red-400">Danger Zone</h2>
              <p className="text-sm text-gray-300 mb-3">
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

      {/* Bottom Navigation - mobile only */}
      <BottomNav showNewButton={false} />
    </div>
  );
}
