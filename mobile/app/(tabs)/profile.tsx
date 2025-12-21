import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  RefreshControl,
  FlatList,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../../src/store/useStore';
import { usersApi } from '../../src/lib/api';
import type { ListWithPlaceCount, TagWithUsage, UserSearchResult } from '../../src/types';

type TabType = 'collections' | 'tags' | 'following' | 'followers';

export default function ProfileScreen() {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('collections');

  // Social data
  const [following, setFollowing] = useState<UserSearchResult[]>([]);
  const [followers, setFollowers] = useState<UserSearchResult[]>([]);
  const [pendingFollowers, setPendingFollowers] = useState<UserSearchResult[]>([]);
  const [socialLoading, setSocialLoading] = useState(false);
  const [processingRequest, setProcessingRequest] = useState<string | null>(null);

  const {
    user,
    places,
    lists,
    tags,
    fetchUserProfile,
    fetchFollowers: storeFetchFollowers,
    fetchFollowing: storeFetchFollowing,
    fetchPlaces,
    fetchLists,
    fetchTags,
  } = useStore();

  useEffect(() => {
    loadFollowData();
  }, []);

  useEffect(() => {
    if (activeTab === 'following' && following.length === 0) {
      loadFollowing();
    }
    if (activeTab === 'followers' && followers.length === 0 && pendingFollowers.length === 0) {
      loadFollowers();
    }
  }, [activeTab]);

  const loadFollowData = async () => {
    try {
      const pending = await usersApi.getFollowers('pending');
      setPendingFollowers(pending);
    } catch (error) {
      console.error('Failed to load pending followers:', error);
    }
  };

  const loadFollowing = async () => {
    setSocialLoading(true);
    try {
      const data = await usersApi.getFollowing();
      setFollowing(data);
    } catch (error) {
      console.error('Failed to load following:', error);
    } finally {
      setSocialLoading(false);
    }
  };

  const loadFollowers = async () => {
    setSocialLoading(true);
    try {
      const [confirmed, pending] = await Promise.all([
        usersApi.getFollowers('confirmed'),
        usersApi.getFollowers('pending'),
      ]);
      setFollowers(confirmed);
      setPendingFollowers(pending);
    } catch (error) {
      console.error('Failed to load followers:', error);
    } finally {
      setSocialLoading(false);
    }
  };

  const handleAcceptFollower = async (followerId: string) => {
    setProcessingRequest(followerId);
    try {
      await usersApi.approveFollower(followerId);
      await loadFollowers();
    } catch (error) {
      console.error('Failed to accept follower:', error);
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleDeclineFollower = async (followerId: string) => {
    setProcessingRequest(followerId);
    try {
      await usersApi.declineFollower(followerId);
      await loadFollowers();
    } catch (error) {
      console.error('Failed to decline follower:', error);
    } finally {
      setProcessingRequest(null);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([
        fetchUserProfile(),
        fetchPlaces(),
        fetchLists(),
        fetchTags(),
        loadFollowData(),
      ]);
      if (activeTab === 'following') await loadFollowing();
      if (activeTab === 'followers') await loadFollowers();
    } finally {
      setIsRefreshing(false);
    }
  };

  const renderCollectionItem = ({ item }: { item: ListWithPlaceCount }) => (
    <Pressable style={styles.itemCard} onPress={() => {}}>
      <View style={[styles.itemIcon, { backgroundColor: item.color + '33' }]}>
        <Ionicons name="folder" size={24} color={item.color} />
      </View>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemCount}>
          {item.place_count} {item.place_count === 1 ? 'place' : 'places'}
          {item.is_public && ' • Public'}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#737373" />
    </Pressable>
  );

  const renderTagItem = ({ item }: { item: TagWithUsage }) => (
    <Pressable style={styles.itemCard} onPress={() => {}}>
      <View style={[styles.itemIcon, { backgroundColor: (item.color || '#DE7356') + '33' }]}>
        {item.icon ? (
          <Text style={[styles.materialIcon, { color: item.color || '#DE7356' }]}>
            {item.icon}
          </Text>
        ) : (
          <Ionicons name="pricetag" size={20} color={item.color || '#DE7356'} />
        )}
      </View>
      <View style={styles.itemInfo}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemCount}>
          {item.usage_count} {item.usage_count === 1 ? 'place' : 'places'}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#737373" />
    </Pressable>
  );

  const renderUserItem = ({ item }: { item: UserSearchResult }) => (
    <Pressable
      style={styles.userCard}
      onPress={() => router.push(`/user/${item.id}`)}
    >
      <View style={styles.userAvatar}>
        <Text style={styles.userAvatarText}>
          {item.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.name}</Text>
        {item.username && (
          <Text style={styles.userUsername}>@{item.username}</Text>
        )}
      </View>
      <Ionicons name="chevron-forward" size={20} color="#737373" />
    </Pressable>
  );

  const renderPendingFollower = (user: UserSearchResult) => (
    <View key={user.id} style={styles.pendingCard}>
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
      </View>
      <View style={styles.pendingActions}>
        <Pressable
          style={styles.acceptButton}
          onPress={() => handleAcceptFollower(user.id)}
          disabled={processingRequest === user.id}
        >
          {processingRequest === user.id ? (
            <ActivityIndicator size="small" color="#faf9f5" />
          ) : (
            <Text style={styles.acceptButtonText}>Accept</Text>
          )}
        </Pressable>
        <Pressable
          style={styles.declineButton}
          onPress={() => handleDeclineFollower(user.id)}
          disabled={processingRequest === user.id}
        >
          <Text style={styles.declineButtonText}>Decline</Text>
        </Pressable>
      </View>
    </View>
  );

  if (!user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#DE7356" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor="#DE7356"
          />
        }
        stickyHeaderIndices={[1]}
      >
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarLargeText}>
              {user.name?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <Text style={styles.name}>{user.name}</Text>
          {user.username && (
            <Text style={styles.username}>@{user.username}</Text>
          )}
          {user.bio && <Text style={styles.bio}>{user.bio}</Text>}

          {/* Quick Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{places.length}</Text>
              <Text style={styles.statLabel}>Places</Text>
            </View>
            <View style={styles.statDivider} />
            <Pressable style={styles.statItem} onPress={() => setActiveTab('followers')}>
              <Text style={styles.statNumber}>
                {followers.length + pendingFollowers.length}
              </Text>
              <Text style={styles.statLabel}>Followers</Text>
            </Pressable>
            <View style={styles.statDivider} />
            <Pressable style={styles.statItem} onPress={() => setActiveTab('following')}>
              <Text style={styles.statNumber}>{following.length}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </Pressable>
          </View>
        </View>

        {/* Tab Selector */}
        <View style={styles.tabWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tabContainer}
          >
            <Pressable
              style={[styles.tab, activeTab === 'collections' && styles.activeTab]}
              onPress={() => setActiveTab('collections')}
            >
              <Text style={[styles.tabText, activeTab === 'collections' && styles.activeTabText]}>
                Collections
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tab, activeTab === 'tags' && styles.activeTab]}
              onPress={() => setActiveTab('tags')}
            >
              <Text style={[styles.tabText, activeTab === 'tags' && styles.activeTabText]}>
                Tags
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tab, activeTab === 'following' && styles.activeTab]}
              onPress={() => setActiveTab('following')}
            >
              <Text style={[styles.tabText, activeTab === 'following' && styles.activeTabText]}>
                Following
              </Text>
            </Pressable>
            <Pressable
              style={[styles.tab, activeTab === 'followers' && styles.activeTab]}
              onPress={() => setActiveTab('followers')}
            >
              <Text style={[styles.tabText, activeTab === 'followers' && styles.activeTabText]}>
                Followers {pendingFollowers.length > 0 && `(${pendingFollowers.length})`}
              </Text>
            </Pressable>
          </ScrollView>
        </View>

        {/* Tab Content */}
        <View style={styles.tabContent}>
          {/* Collections Tab */}
          {activeTab === 'collections' && (
            <View>
              {lists.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="folder-open-outline" size={64} color="#737373" />
                  <Text style={styles.emptyText}>No collections yet</Text>
                  <Text style={styles.emptySubtext}>
                    Create a collection to organize your places
                  </Text>
                </View>
              ) : (
                lists.map((list) => (
                  <Pressable key={list.id} style={styles.itemCard} onPress={() => router.push(`/collection/${list.id}`)}>
                    <View style={[styles.itemIcon, { backgroundColor: list.color + '33' }]}>
                      <Ionicons name="folder" size={24} color={list.color} />
                    </View>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{list.name}</Text>
                      <Text style={styles.itemCount}>
                        {list.place_count} {list.place_count === 1 ? 'place' : 'places'}
                        {list.is_public && ' • Public'}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#737373" />
                  </Pressable>
                ))
              )}
            </View>
          )}

          {/* Tags Tab */}
          {activeTab === 'tags' && (
            <View>
              {tags.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="pricetags-outline" size={64} color="#737373" />
                  <Text style={styles.emptyText}>No tags yet</Text>
                  <Text style={styles.emptySubtext}>
                    Add tags to your places to categorize them
                  </Text>
                </View>
              ) : (
                tags.map((tag) => (
                  <Pressable key={tag.id} style={styles.itemCard} onPress={() => router.push(`/tag/${tag.id}`)}>
                    <View style={[styles.itemIcon, { backgroundColor: (tag.color || '#DE7356') + '33' }]}>
                      {tag.icon ? (
                        <Text style={[styles.materialIcon, { color: tag.color || '#DE7356' }]}>
                          {tag.icon}
                        </Text>
                      ) : (
                        <Ionicons name="pricetag" size={20} color={tag.color || '#DE7356'} />
                      )}
                    </View>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{tag.name}</Text>
                      <Text style={styles.itemCount}>
                        {tag.usage_count} {tag.usage_count === 1 ? 'place' : 'places'}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#737373" />
                  </Pressable>
                ))
              )}
            </View>
          )}

          {/* Following Tab */}
          {activeTab === 'following' && (
            <View>
              {socialLoading ? (
                <View style={styles.emptyContainer}>
                  <ActivityIndicator size="large" color="#DE7356" />
                </View>
              ) : following.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Ionicons name="people-outline" size={64} color="#737373" />
                  <Text style={styles.emptyText}>Not following anyone yet</Text>
                  <Text style={styles.emptySubtext}>
                    Explore users to find people to follow
                  </Text>
                  <Pressable
                    style={styles.exploreButton}
                    onPress={() => router.push('/(tabs)/explore')}
                  >
                    <Text style={styles.exploreButtonText}>Explore Users</Text>
                  </Pressable>
                </View>
              ) : (
                following.map((user) => (
                  <Pressable
                    key={user.id}
                    style={styles.userCard}
                    onPress={() => router.push(`/user/${user.id}`)}
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
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#737373" />
                  </Pressable>
                ))
              )}
            </View>
          )}

          {/* Followers Tab */}
          {activeTab === 'followers' && (
            <View>
              {socialLoading ? (
                <View style={styles.emptyContainer}>
                  <ActivityIndicator size="large" color="#DE7356" />
                </View>
              ) : (
                <>
                  {/* Pending Requests */}
                  {pendingFollowers.length > 0 && (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>
                        Pending Requests ({pendingFollowers.length})
                      </Text>
                      {pendingFollowers.map(renderPendingFollower)}
                    </View>
                  )}

                  {/* Confirmed Followers */}
                  {followers.length > 0 && (
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>
                        Followers ({followers.length})
                      </Text>
                      {followers.map((user) => (
                        <Pressable
                          key={user.id}
                          style={styles.userCard}
                          onPress={() => router.push(`/user/${user.id}`)}
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
                          </View>
                          <Ionicons name="chevron-forward" size={20} color="#737373" />
                        </Pressable>
                      ))}
                    </View>
                  )}

                  {/* Empty State */}
                  {pendingFollowers.length === 0 && followers.length === 0 && (
                    <View style={styles.emptyContainer}>
                      <Ionicons name="people-outline" size={64} color="#737373" />
                      <Text style={styles.emptyText}>No followers yet</Text>
                      <Text style={styles.emptySubtext}>
                        Share your profile to get followers
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#252523',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
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
  avatarLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#DE7356',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarLargeText: {
    fontSize: 40,
    fontWeight: '700',
    color: '#faf9f5',
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
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#3a3a38',
    marginTop: 20,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  statItem: {
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
  tabWrapper: {
    backgroundColor: '#252523',
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a38',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#3a3a38',
  },
  activeTab: {
    backgroundColor: '#DE7356',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#a3a3a3',
  },
  activeTabText: {
    color: '#faf9f5',
  },
  tabContent: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#faf9f5',
    marginBottom: 12,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3a3a38',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  itemIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  materialIcon: {
    fontSize: 20,
    fontFamily: 'System',
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#faf9f5',
  },
  itemCount: {
    fontSize: 14,
    color: '#a3a3a3',
    marginTop: 2,
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3a3a38',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  pendingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3a3a38',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
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
    fontSize: 18,
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
  pendingActions: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptButton: {
    backgroundColor: '#DE7356',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  acceptButtonText: {
    color: '#faf9f5',
    fontSize: 14,
    fontWeight: '600',
  },
  declineButton: {
    backgroundColor: '#3a3a38',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4a4a48',
  },
  declineButtonText: {
    color: '#a3a3a3',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#faf9f5',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#737373',
    marginTop: 8,
    textAlign: 'center',
  },
  exploreButton: {
    backgroundColor: '#DE7356',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  exploreButtonText: {
    color: '#faf9f5',
    fontSize: 16,
    fontWeight: '600',
  },
});
