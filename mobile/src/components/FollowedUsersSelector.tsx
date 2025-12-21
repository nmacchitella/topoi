import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store/useStore';
import { usersApi } from '../lib/api';
import type { UserSearchResult } from '../types';

interface FollowedUsersSelectorProps {
  visible: boolean;
  onClose: () => void;
}

export default function FollowedUsersSelector({
  visible,
  onClose,
}: FollowedUsersSelectorProps) {
  const {
    following,
    selectedFollowedUserIds,
    toggleFollowedUser,
    setSelectedFollowedUserIds,
    fetchFollowedUserPlaces,
  } = useStore();

  const [localFollowing, setLocalFollowing] = useState<UserSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingUsers, setLoadingUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (visible) {
      loadFollowing();
    }
  }, [visible]);

  const loadFollowing = async () => {
    setIsLoading(true);
    try {
      const data = await usersApi.getFollowing();
      setLocalFollowing(data);
    } catch (error) {
      console.error('Failed to load following:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleUser = async (userId: string) => {
    const isCurrentlySelected = selectedFollowedUserIds.includes(userId);

    if (!isCurrentlySelected) {
      // Loading places for newly selected user
      setLoadingUsers((prev) => new Set(prev).add(userId));
      try {
        await fetchFollowedUserPlaces(userId);
      } catch (error) {
        console.error('Failed to load user places:', error);
      } finally {
        setLoadingUsers((prev) => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
      }
    }

    toggleFollowedUser(userId);
  };

  const handleSelectAll = async () => {
    const allUserIds = localFollowing.map((u) => u.id);
    setSelectedFollowedUserIds(allUserIds);

    // Load places for all users
    for (const userId of allUserIds) {
      if (!selectedFollowedUserIds.includes(userId)) {
        try {
          await fetchFollowedUserPlaces(userId);
        } catch (error) {
          console.error(`Failed to load places for user ${userId}:`, error);
        }
      }
    }
  };

  const handleDeselectAll = () => {
    setSelectedFollowedUserIds([]);
  };

  const filteredUsers = localFollowing.filter((user) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.name.toLowerCase().includes(query) ||
      (user.username && user.username.toLowerCase().includes(query))
    );
  });

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={onClose}>
            <Text style={styles.doneText}>Done</Text>
          </Pressable>
          <Text style={styles.title}>Select Users</Text>
          <View style={{ width: 50 }} />
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable style={styles.actionButton} onPress={handleSelectAll}>
            <Text style={styles.actionText}>Select All</Text>
          </Pressable>
          <Pressable style={styles.actionButton} onPress={handleDeselectAll}>
            <Text style={styles.actionText}>Deselect All</Text>
          </Pressable>
        </View>

        {/* Search */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#737373" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
            placeholderTextColor="#737373"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />
        </View>

        {/* Selected count */}
        <View style={styles.selectedInfo}>
          <Text style={styles.selectedText}>
            {selectedFollowedUserIds.length} user{selectedFollowedUserIds.length !== 1 ? 's' : ''} selected
          </Text>
        </View>

        {/* User List */}
        <ScrollView style={styles.userList} contentContainerStyle={styles.userListContent}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#DE7356" />
            </View>
          ) : filteredUsers.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={64} color="#737373" />
              <Text style={styles.emptyText}>
                {searchQuery ? 'No users found' : 'No followed users'}
              </Text>
              {!searchQuery && (
                <Text style={styles.emptySubtext}>
                  Follow users to see their places on your map
                </Text>
              )}
            </View>
          ) : (
            filteredUsers.map((user) => {
              const isSelected = selectedFollowedUserIds.includes(user.id);
              const isUserLoading = loadingUsers.has(user.id);

              return (
                <Pressable
                  key={user.id}
                  style={[styles.userItem, isSelected && styles.userItemSelected]}
                  onPress={() => handleToggleUser(user.id)}
                  disabled={isUserLoading}
                >
                  <View style={styles.userAvatar}>
                    <Text style={styles.userAvatarText}>
                      {user.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{user.name}</Text>
                    {user.username && (
                      <Text style={styles.userUsername}>@{user.username}</Text>
                    )}
                    {user.place_count !== undefined && (
                      <Text style={styles.placeCount}>
                        {user.place_count} {user.place_count === 1 ? 'place' : 'places'}
                      </Text>
                    )}
                  </View>
                  {isUserLoading ? (
                    <ActivityIndicator size="small" color="#DE7356" />
                  ) : (
                    <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                      {isSelected && <Ionicons name="checkmark" size={16} color="#faf9f5" />}
                    </View>
                  )}
                </Pressable>
              );
            })
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#252523',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a38',
  },
  doneText: {
    color: '#DE7356',
    fontSize: 16,
    fontWeight: '600',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#faf9f5',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a38',
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#3a3a38',
  },
  actionText: {
    color: '#DE7356',
    fontSize: 14,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3a3a38',
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#faf9f5',
  },
  selectedInfo: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  selectedText: {
    color: '#a3a3a3',
    fontSize: 13,
  },
  userList: {
    flex: 1,
  },
  userListContent: {
    padding: 16,
    paddingTop: 0,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#faf9f5',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    color: '#737373',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3a3a38',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  userItemSelected: {
    borderWidth: 2,
    borderColor: '#DE7356',
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#DE7356',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#faf9f5',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#faf9f5',
  },
  userUsername: {
    fontSize: 14,
    color: '#a3a3a3',
    marginTop: 2,
  },
  placeCount: {
    fontSize: 12,
    color: '#737373',
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4a4a48',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#DE7356',
    borderColor: '#DE7356',
  },
});
