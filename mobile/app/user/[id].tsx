import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usersApi } from '../../src/lib/api';
import { useStore } from '../../src/store/useStore';
import type { UserProfilePublic } from '../../src/types';

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfilePublic | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { user, followUser, unfollowUser } = useStore();

  const fetchProfile = async () => {
    if (!id) return;

    try {
      const data = await usersApi.getProfile(id);
      setProfile(data);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [id]);

  const handleFollow = async () => {
    if (!profile) return;

    setIsFollowing(true);
    try {
      if (profile.is_followed_by_me) {
        await unfollowUser(profile.id);
        setProfile(prev => prev ? {
          ...prev,
          is_followed_by_me: false,
          follow_status: null,
          follower_count: prev.follower_count - 1,
        } : null);
      } else {
        await followUser(profile.id);
        setProfile(prev => prev ? {
          ...prev,
          is_followed_by_me: true,
          follow_status: profile.is_public ? 'confirmed' : 'pending',
          follower_count: profile.is_public ? prev.follower_count + 1 : prev.follower_count,
        } : null);
      }
    } catch (error) {
      console.error('Follow action failed:', error);
    } finally {
      setIsFollowing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchProfile();
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#DE7356" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="person-circle-outline" size={64} color="#737373" />
        <Text style={styles.errorText}>User not found</Text>
      </View>
    );
  }

  const isOwnProfile = user?.id === profile.id;

  return (
    <>
      <Stack.Screen
        options={{
          title: profile.name,
        }}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#DE7356"
          />
        }
      >
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={48} color="#a3a3a3" />
          </View>
          <Text style={styles.name}>{profile.name}</Text>
          {profile.username && (
            <Text style={styles.username}>@{profile.username}</Text>
          )}
          {profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}

          {/* Follow Button */}
          {!isOwnProfile && (
            <Pressable
              style={[
                styles.followButton,
                profile.is_followed_by_me && styles.followingButton,
                isFollowing && styles.buttonDisabled,
              ]}
              onPress={handleFollow}
              disabled={isFollowing}
            >
              {isFollowing ? (
                <ActivityIndicator size="small" color="#faf9f5" />
              ) : (
                <Text
                  style={[
                    styles.followButtonText,
                    profile.is_followed_by_me && styles.followingButtonText,
                  ]}
                >
                  {profile.follow_status === 'pending'
                    ? 'Requested'
                    : profile.is_followed_by_me
                    ? 'Following'
                    : 'Follow'}
                </Text>
              )}
            </Pressable>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{profile.place_count}</Text>
            <Text style={styles.statLabel}>Places</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{profile.follower_count}</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statNumber}>{profile.following_count}</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
        </View>

        {/* Privacy Notice */}
        {!profile.is_public && !profile.is_followed_by_me && !isOwnProfile && (
          <View style={styles.privateNotice}>
            <Ionicons name="lock-closed" size={24} color="#737373" />
            <Text style={styles.privateText}>
              This account is private. Follow to see their places.
            </Text>
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#252523',
  },
  content: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#252523',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#252523',
  },
  errorText: {
    fontSize: 18,
    color: '#737373',
    marginTop: 16,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#3a3a38',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#faf9f5',
  },
  username: {
    fontSize: 16,
    color: '#a3a3a3',
    marginTop: 4,
  },
  bio: {
    fontSize: 14,
    color: '#a3a3a3',
    marginTop: 12,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 20,
  },
  followButton: {
    backgroundColor: '#DE7356',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 24,
    marginTop: 16,
    minWidth: 120,
    alignItems: 'center',
  },
  followingButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#737373',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  followButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#faf9f5',
  },
  followingButtonText: {
    color: '#a3a3a3',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#3a3a38',
    marginHorizontal: 16,
    borderRadius: 12,
    paddingVertical: 16,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#faf9f5',
  },
  statLabel: {
    fontSize: 12,
    color: '#a3a3a3',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#4a4a48',
  },
  privateNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3a3a38',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  privateText: {
    flex: 1,
    fontSize: 14,
    color: '#737373',
    lineHeight: 20,
  },
});
