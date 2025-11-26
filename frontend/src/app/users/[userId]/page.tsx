'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { usersApi } from '@/lib/api';
import type { UserProfilePublic, SharedMapData, Place } from '@/types';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';
import AdoptPlaceModal from '@/components/AdoptPlaceModal';
import dynamic from 'next/dynamic';

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false });

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.userId as string;
  const { token, user: currentUser } = useStore();

  const [profile, setProfile] = useState<UserProfilePublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Phase 5: Map data
  const [mapData, setMapData] = useState<SharedMapData | null>(null);
  const [mapLoading, setMapLoading] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [showAdoptModal, setShowAdoptModal] = useState(false);

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }

    loadProfile();
  }, [userId, token]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await usersApi.getProfile(userId);
      setProfile(data);

      // Phase 5: Load map if user can view it
      // Can view if: user is public OR current user is a confirmed follower
      if (data.is_public || (data.is_followed_by_me && data.follow_status === 'confirmed')) {
        loadMap();
      }
    } catch (err: any) {
      console.error('Failed to load profile:', err);
      setError(err.response?.data?.detail || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const loadMap = async () => {
    try {
      setMapLoading(true);
      setMapError(null);
      const data = await usersApi.getUserMap(userId);
      setMapData(data);
    } catch (err: any) {
      console.error('Failed to load map:', err);
      setMapError(err.response?.data?.detail || 'Failed to load map');
    } finally {
      setMapLoading(false);
    }
  };

  const handleFollow = async () => {
    if (!profile) return;

    setActionLoading(true);
    try {
      const response = await usersApi.follow(userId);
      alert(response.message);
      // Refresh profile to get updated follow status
      await loadProfile();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to follow user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnfollow = async () => {
    if (!profile || !confirm('Are you sure you want to unfollow this user?')) return;

    setActionLoading(true);
    try {
      await usersApi.unfollow(userId);
      // Refresh profile to get updated follow status
      await loadProfile();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to unfollow user');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-dark-bg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <div className="text-white text-lg">Loading profile...</div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="h-screen flex items-center justify-center bg-dark-bg p-4">
        <div className="max-w-md w-full bg-dark-card border border-red-500/30 rounded-xl p-6 text-center">
          <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h1 className="text-2xl font-bold text-white mb-2">Profile Not Found</h1>
          <p className="text-gray-400 mb-4">{error || 'User not found'}</p>
          <button onClick={() => router.push('/explore')} className="btn-primary">
            Back to Explore
          </button>
        </div>
      </div>
    );
  }

  // Check if viewing own profile
  const isOwnProfile = currentUser?.id === userId;

  return (
    <div className="h-screen flex flex-col bg-dark-bg">
      <Navbar />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar />

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto p-4 sm:p-8">
            {/* Profile Header */}
            <div className="card mb-6">
              <div className="flex items-start gap-6">
                <div className="w-24 h-24 bg-gradient-to-br from-primary to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-4xl flex-shrink-0">
                  {profile.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1 min-w-0">
                      <h1 className="text-2xl font-bold text-white truncate">{profile.name}</h1>
                      {profile.username && (
                        <p className="text-gray-400">@{profile.username}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {profile.is_public ? (
                        <span className="text-xs bg-green-900/30 text-green-400 px-3 py-1 rounded-full">
                          Public
                        </span>
                      ) : (
                        <span className="text-xs bg-gray-700 text-gray-300 px-3 py-1 rounded-full">
                          Private
                        </span>
                      )}
                    </div>
                  </div>

                  {profile.bio && (
                    <p className="text-gray-300 mb-4">{profile.bio}</p>
                  )}

                  {/* Stats */}
                  <div className="flex gap-6 mb-4">
                    <div className="text-center">
                      <div className="text-xl font-bold text-white">{profile.follower_count}</div>
                      <div className="text-sm text-gray-400">Followers</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xl font-bold text-white">{profile.following_count}</div>
                      <div className="text-sm text-gray-400">Following</div>
                    </div>
                  </div>

                  {/* Actions */}
                  {!isOwnProfile && (
                    <div>
                      {profile.is_followed_by_me ? (
                        <button
                          onClick={handleUnfollow}
                          disabled={actionLoading}
                          className="btn-secondary flex items-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          {actionLoading ? 'Updating...' : 'Following'}
                        </button>
                      ) : profile.follow_status === 'pending' ? (
                        <button
                          disabled
                          className="btn-secondary opacity-50 cursor-not-allowed flex items-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Request Pending
                        </button>
                      ) : (
                        <button
                          onClick={handleFollow}
                          disabled={actionLoading}
                          className="btn-primary flex items-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          {actionLoading ? 'Processing...' : 'Follow'}
                        </button>
                      )}
                    </div>
                  )}

                  {isOwnProfile && (
                    <button
                      onClick={() => router.push('/settings')}
                      className="btn-secondary flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Edit Profile
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Privacy Notice for Private Profiles */}
            {!isOwnProfile && !profile.is_public && !profile.is_followed_by_me && (
              <div className="card bg-gray-800/50 border-gray-700">
                <div className="flex items-start gap-3">
                  <svg className="w-6 h-6 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <div>
                    <h3 className="font-semibold text-white mb-1">Private Profile</h3>
                    <p className="text-sm text-gray-400">
                      This user's profile is private. Follow them to see their map and places.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Phase 5: Map View */}
            {(profile.is_public || profile.is_followed_by_me) && (
              <div className="card">
                <h2 className="text-xl font-semibold mb-4">
                  {isOwnProfile ? 'Your Map' : `${profile.name}'s Map`}
                </h2>

                {mapLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <div className="text-gray-400">Loading map...</div>
                  </div>
                ) : mapError ? (
                  <div className="text-center py-12">
                    <div className="text-red-400 mb-2">Failed to load map</div>
                    <div className="text-sm text-gray-500">{mapError}</div>
                  </div>
                ) : mapData && mapData.places.length > 0 ? (
                  <div className="space-y-4">
                    <div className="h-96 rounded-lg overflow-hidden border border-gray-700">
                      <MapView
                        places={mapData.places}
                        selectedPlaceId={selectedPlace?.id || null}
                        onPlaceSelect={(place) => setSelectedPlace(place)}
                      />
                    </div>

                    {/* Place count */}
                    <div className="text-sm text-gray-400">
                      Showing {mapData.places.length} public {mapData.places.length === 1 ? 'place' : 'places'}
                    </div>

                    {/* Selected place details */}
                    {selectedPlace && (
                      <div className="card bg-gray-800/50 border-gray-700">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-white mb-1">{selectedPlace.name}</h3>
                            <p className="text-sm text-gray-400 mb-2">{selectedPlace.address}</p>
                            {selectedPlace.notes && (
                              <p className="text-sm text-gray-300 mb-3">{selectedPlace.notes}</p>
                            )}
                            {selectedPlace.tags && selectedPlace.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {selectedPlace.tags.map((tag) => (
                                  <span
                                    key={tag.id}
                                    className="text-xs px-2 py-1 rounded-full bg-gray-700 text-gray-300 border border-gray-600"
                                  >
                                    #{tag.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          {!isOwnProfile && (
                            <button
                              onClick={() => setShowAdoptModal(true)}
                              className="btn-primary text-sm whitespace-nowrap"
                            >
                              Add to My Map
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                    <div className="text-gray-400">No public places yet</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <BottomNav showNewButton={false} />

      {/* Phase 5: Adopt Place Modal */}
      {showAdoptModal && selectedPlace && (
        <AdoptPlaceModal
          place={selectedPlace}
          onClose={() => setShowAdoptModal(false)}
          onSuccess={() => {
            setShowAdoptModal(false);
            // Show success message
            alert(`Successfully added "${selectedPlace.name}" to your map!`);
          }}
        />
      )}
    </div>
  );
}
