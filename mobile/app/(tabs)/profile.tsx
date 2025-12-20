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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../../src/store/useStore';

export default function ProfileScreen() {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    user,
    places,
    lists,
    tags,
    followers,
    following,
    fetchUserProfile,
    fetchFollowers,
    fetchFollowing,
    fetchPlaces,
  } = useStore();

  useEffect(() => {
    fetchFollowers();
    fetchFollowing();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        fetchUserProfile(),
        fetchFollowers(),
        fetchFollowing(),
        fetchPlaces(),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  };

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#DE7356" />
      </View>
    );
  }

  return (
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
        <Text style={styles.name}>{user.name}</Text>
        {user.username && (
          <Text style={styles.username}>@{user.username}</Text>
        )}
        {user.bio && <Text style={styles.bio}>{user.bio}</Text>}
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.stat}>
          <Text style={styles.statNumber}>{places.length}</Text>
          <Text style={styles.statLabel}>Places</Text>
        </View>
        <View style={styles.statDivider} />
        <Pressable style={styles.stat}>
          <Text style={styles.statNumber}>{followers.length}</Text>
          <Text style={styles.statLabel}>Followers</Text>
        </Pressable>
        <View style={styles.statDivider} />
        <Pressable style={styles.stat}>
          <Text style={styles.statNumber}>{following.length}</Text>
          <Text style={styles.statLabel}>Following</Text>
        </Pressable>
      </View>

      {/* Quick Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Data</Text>
        <View style={styles.dataGrid}>
          <View style={styles.dataCard}>
            <Ionicons name="location" size={24} color="#DE7356" />
            <Text style={styles.dataNumber}>{places.length}</Text>
            <Text style={styles.dataLabel}>Places</Text>
          </View>
          <View style={styles.dataCard}>
            <Ionicons name="folder" size={24} color="#3B82F6" />
            <Text style={styles.dataNumber}>{lists.length}</Text>
            <Text style={styles.dataLabel}>Collections</Text>
          </View>
          <View style={styles.dataCard}>
            <Ionicons name="pricetag" size={24} color="#22C55E" />
            <Text style={styles.dataNumber}>{tags.length}</Text>
            <Text style={styles.dataLabel}>Tags</Text>
          </View>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <Pressable
          style={styles.menuItem}
          onPress={() => router.push('/settings')}
        >
          <View style={styles.menuItemLeft}>
            <Ionicons name="settings-outline" size={22} color="#faf9f5" />
            <Text style={styles.menuItemText}>Settings</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#737373" />
        </Pressable>
        <Pressable style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <Ionicons name="share-outline" size={22} color="#faf9f5" />
            <Text style={styles.menuItemText}>Share Profile</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#737373" />
        </Pressable>
        <Pressable style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <Ionicons name="download-outline" size={22} color="#faf9f5" />
            <Text style={styles.menuItemText}>Export Data</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#737373" />
        </Pressable>
      </View>
    </ScrollView>
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
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 20,
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
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#a3a3a3',
    marginBottom: 12,
  },
  dataGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  dataCard: {
    flex: 1,
    backgroundColor: '#3a3a38',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  dataNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#faf9f5',
    marginTop: 8,
  },
  dataLabel: {
    fontSize: 12,
    color: '#a3a3a3',
    marginTop: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#3a3a38',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemText: {
    fontSize: 16,
    color: '#faf9f5',
  },
});
