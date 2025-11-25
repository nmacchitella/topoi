'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { authApi, dataApi } from '@/lib/api';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';

type SectionId = 'profile' | 'password' | null;

export default function SettingsPage() {
  const router = useRouter();
  const { token, user, setUser, logout } = useStore();

  const [editingSection, setEditingSection] = useState<SectionId>(null);

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
      const response = await fetch(`${API_URL}/telegram/generate-link-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setLinkCode(data.link_code);
    } catch (error: any) {
      alert('Failed to generate link code. Please try again.');
      console.error('Error:', error);
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
      const response = await fetch(`${API_URL}/telegram/unlink`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to unlink');
      }

      setTelegramLinked(false);
      setTelegramUsername('');
      alert('Telegram account unlinked successfully');
    } catch (error) {
      alert('Failed to unlink Telegram. Please try again.');
    } finally {
      setTelegramLoading(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);

    try {
      const updatedUser = await authApi.updateProfile(profileData);
      setUser(updatedUser);
      setEditingSection(null);
      alert('Profile updated successfully');
    } catch (error) {
      alert('Failed to update profile');
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

    setPasswordLoading(true);

    try {
      await authApi.changePassword({
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
      });
      setPasswordData({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
      setEditingSection(null);
      alert('Password changed successfully');
    } catch (error) {
      alert('Failed to change password. Check your current password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = prompt(
      'This action cannot be undone. Type "DELETE" to confirm account deletion:'
    );

    if (confirmed !== 'DELETE') {
      return;
    }

    setDeleteLoading(true);

    try {
      await authApi.deleteAccount();
      logout();
      router.push('/login');
    } catch (error) {
      alert('Failed to delete account');
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
    <div className="h-screen flex flex-col bg-dark-bg relative">
      {importLoading && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-card p-6 rounded-lg shadow-xl">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <div className="text-white text-lg">Loading preview...</div>
            </div>
          </div>
        </div>
      )}
      <Navbar />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar />

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto p-4 sm:p-8 space-y-6">
            <h1 className="text-3xl font-bold mb-8">Settings</h1>

            {/* Profile Section */}
            <section className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Profile</h2>
                {editingSection !== 'profile' && (
                  <button
                    onClick={() => setEditingSection('profile')}
                    className="text-sm text-primary hover:text-primary-hover transition-colors"
                  >
                    Edit
                  </button>
                )}
              </div>

              {editingSection === 'profile' ? (
                <form onSubmit={handleProfileSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">
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
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">
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

                  <div className="flex gap-2 pt-2">
                    <button type="submit" disabled={profileLoading} className="btn-primary">
                      {profileLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingSection(null);
                        if (user) {
                          setProfileData({ name: user.name, email: user.email });
                        }
                      }}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-3">
                  <div>
                    <div className="text-sm text-gray-400">Name</div>
                    <div className="text-base mt-1">{user?.name}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-400">Email</div>
                    <div className="text-base mt-1">{user?.email}</div>
                  </div>
                </div>
              )}
            </section>

            {/* Password Section */}
            <section className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Password</h2>
                {editingSection !== 'password' && (
                  <button
                    onClick={() => setEditingSection('password')}
                    className="text-sm text-primary hover:text-primary-hover transition-colors"
                  >
                    Change
                  </button>
                )}
              </div>

              {editingSection === 'password' ? (
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">
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
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">
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
                    <label className="block text-sm font-medium text-gray-400 mb-1.5">
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

                  <div className="flex gap-2 pt-2">
                    <button type="submit" disabled={passwordLoading} className="btn-primary">
                      {passwordLoading ? 'Changing...' : 'Change Password'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingSection(null);
                        setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
                      }}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="text-gray-400 text-sm">
                  ••••••••
                </div>
              )}
            </section>

            {/* Connected Services */}
            <section className="card">
              <h2 className="text-xl font-semibold mb-4">Connected Services</h2>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121L7.78 13.73l-2.96-.924c-.64-.203-.658-.64.135-.954l11.566-4.458c.538-.196 1.006.128.832.827z"/>
                        </svg>
                      </div>
                      <div>
                        <div className="font-medium">Telegram</div>
                        <div className="text-sm text-gray-400">
                          {telegramLinked ? `Connected as @${telegramUsername}` : 'Not connected'}
                        </div>
                      </div>
                    </div>
                    {telegramLinked && (
                      <span className="text-xs text-green-400 flex items-center gap-1">
                        <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                        Active
                      </span>
                    )}
                  </div>

                  {telegramLinked ? (
                    <div className="space-y-3">
                      <div className="p-3 bg-blue-900/10 border border-blue-600/30 rounded-lg text-sm text-gray-300">
                        <div className="font-medium mb-1">Quick save from Telegram</div>
                        <div className="text-xs text-gray-400">
                          Send Google Maps links to @TopoiAppBot
                        </div>
                      </div>

                      <button
                        onClick={handleUnlinkTelegram}
                        disabled={telegramLoading}
                        className="text-sm text-red-400 hover:text-red-300 transition-colors"
                      >
                        {telegramLoading ? 'Unlinking...' : 'Disconnect'}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {!linkCode ? (
                        <button
                          onClick={handleGenerateCode}
                          disabled={telegramLoading}
                          className="btn-secondary"
                        >
                          {telegramLoading ? 'Loading...' : 'Connect Telegram'}
                        </button>
                      ) : (
                        <div className="space-y-3">
                          <div className="p-4 bg-blue-900/10 border border-blue-600/30 rounded-lg">
                            <div className="text-sm mb-3 text-gray-300">
                              1. Open <a href="https://t.me/TopoiAppBot" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">@TopoiAppBot</a> on Telegram
                            </div>
                            <div className="text-sm mb-2 text-gray-300">2. Send this command:</div>
                            <div className="p-3 bg-dark-bg rounded font-mono text-sm text-center select-all">
                              /start {linkCode}
                            </div>
                            <div className="text-xs text-gray-400 mt-2">
                              Expires in 10 minutes
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(`/start ${linkCode}`);
                                alert('Copied!');
                              }}
                              className="btn-secondary flex-1"
                            >
                              Copy Command
                            </button>
                            <button
                              onClick={() => setLinkCode('')}
                              className="btn-secondary"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Data Management */}
            <section className="card">
              <h2 className="text-xl font-semibold mb-4">Data Management</h2>

              <div className="space-y-6">
                <div>
                  <h3 className="font-medium mb-2">Import Places</h3>
                  <p className="text-sm text-gray-400 mb-3">
                    Import from Google Maps (CSV) or Mapstr (GeoJSON)
                  </p>

                  <input
                    type="file"
                    accept=".csv,.json,.geojson"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="import-file"
                  />

                  {selectedFile ? (
                    <div className="space-y-2">
                      <div className="text-sm text-gray-400">
                        Selected: <span className="text-white">{selectedFile.name}</span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={handleImport} disabled={importLoading} className="btn-primary">
                          {importLoading ? 'Loading...' : 'Preview Import'}
                        </button>
                        <button
                          onClick={() => setSelectedFile(null)}
                          className="btn-secondary"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  ) : (
                    <label htmlFor="import-file" className="btn-secondary cursor-pointer inline-block">
                      Choose File
                    </label>
                  )}
                </div>

                <div className="opacity-40">
                  <h3 className="font-medium mb-2">Export Places</h3>
                  <p className="text-sm text-gray-400 mb-3">
                    Coming soon
                  </p>
                  <button disabled className="btn-secondary opacity-50 cursor-not-allowed">
                    Export All Data
                  </button>
                </div>
              </div>
            </section>

            {/* Account Actions */}
            <section className="card">
              <h2 className="text-xl font-semibold mb-4">Account</h2>

              <div className="space-y-3">
                <button
                  onClick={() => {
                    logout();
                    router.push('/login');
                  }}
                  className="btn-secondary flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Log Out
                </button>

                <div className="pt-4 border-t border-gray-700">
                  <div className="text-red-400 font-medium mb-2">Danger Zone</div>
                  <p className="text-sm text-gray-400 mb-3">
                    Permanently delete your account and all data. This cannot be undone.
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
            </section>
          </div>
        </div>
      </div>

      {/* Bottom Navigation - mobile only */}
      <BottomNav showNewButton={false} />
    </div>
  );
}
