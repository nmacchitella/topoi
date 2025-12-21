import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Pressable,
  TextInput,
  RefreshControl,
  Linking,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { exploreApi, usersApi, searchApi, listsApi, placesApi, TopPlace, GooglePlaceResult } from '../../src/lib/api';
import type { UserSearchResult, ListWithPlaceCount, Place } from '../../src/types';
import PlaceBottomSheet from '../../src/components/PlaceBottomSheet';

type SearchTabType = 'places' | 'users' | 'collections';

export default function ExploreScreen() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [topUsers, setTopUsers] = useState<UserSearchResult[]>([]);
  const [topPlaces, setTopPlaces] = useState<TopPlace[]>([]);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [activeSearchTab, setActiveSearchTab] = useState<SearchTabType>('users');

  // Search results
  const [placeResults, setPlaceResults] = useState<GooglePlaceResult[]>([]);
  const [userResults, setUserResults] = useState<UserSearchResult[]>([]);
  const [collectionResults, setCollectionResults] = useState<ListWithPlaceCount[]>([]);

  // Follow state
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Location
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Bottom sheet state
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [isLoadingPlace, setIsLoadingPlace] = useState(false);

  const fetchData = async () => {
    try {
      const [users, places] = await Promise.all([
        exploreApi.getTopUsers(10),
        exploreApi.getTopPlaces(userLocation?.lat, userLocation?.lng, 10),
      ]);
      setTopUsers(users);
      setTopPlaces(places);
    } catch (error) {
      console.error('Failed to fetch explore data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    // Get location first
    const getLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          setUserLocation({
            lat: location.coords.latitude,
            lng: location.coords.longitude,
          });
        }
      } catch (error) {
        console.error('Error getting location:', error);
      }
    };

    getLocation();
  }, []);

  useEffect(() => {
    fetchData();
  }, [userLocation]);

  const performSearch = async (query: string) => {
    if (query.trim().length < 2) {
      setHasSearched(false);
      setPlaceResults([]);
      setUserResults([]);
      setCollectionResults([]);
      return;
    }

    setIsSearching(true);
    setHasSearched(true);

    try {
      const [places, users, collections] = await Promise.all([
        searchApi.googlePlaces(query, userLocation?.lat, userLocation?.lng).catch(() => []),
        usersApi.search(query, 20).catch(() => []),
        listsApi.searchPublic(query, 20).catch(() => []),
      ]);

      setPlaceResults(places);
      setUserResults(users);
      setCollectionResults(collections);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);

    // Debounce search
    const timeoutId = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [userLocation]);

  const handleFollow = async (userId: string) => {
    setActionLoading(userId);
    try {
      const response = await usersApi.follow(userId);
      // Update user in results
      const updateUser = (user: UserSearchResult) =>
        user.id === userId
          ? { ...user, is_followed_by_me: true, follow_status: response.status as 'pending' | 'confirmed' }
          : user;

      setUserResults(prev => prev.map(updateUser));
      setTopUsers(prev => prev.map(updateUser));
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to follow user');
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnfollow = async (userId: string) => {
    Alert.alert(
      'Unfollow',
      'Are you sure you want to unfollow this user?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unfollow',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(userId);
            try {
              await usersApi.unfollow(userId);
              const updateUser = (user: UserSearchResult) =>
                user.id === userId
                  ? { ...user, is_followed_by_me: false, follow_status: null }
                  : user;

              setUserResults(prev => prev.map(updateUser));
              setTopUsers(prev => prev.map(updateUser));
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.detail || 'Failed to unfollow user');
            } finally {
              setActionLoading(null);
            }
          },
        },
      ]
    );
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    if (hasSearched) {
      performSearch(searchQuery);
      setIsRefreshing(false);
    } else {
      fetchData();
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setHasSearched(false);
    setPlaceResults([]);
    setUserResults([]);
    setCollectionResults([]);
  };

  const handlePlacePress = async (placeId: string, ownerName?: string) => {
    setIsLoadingPlace(true);
    try {
      const placeData = await placesApi.getById(placeId);
      setSelectedPlace({
        ...placeData,
        ownerName,
      } as Place & { ownerName?: string });
    } catch (error) {
      console.error('Failed to fetch place details:', error);
      // Fallback to navigation if we can't fetch details
      router.push(`/place/${placeId}`);
    } finally {
      setIsLoadingPlace(false);
    }
  };

  const closeBottomSheet = () => {
    setSelectedPlace(null);
  };

  const renderFollowButton = (user: UserSearchResult) => {
    if (user.is_followed_by_me) {
      return (
        <Pressable
          style={styles.followingButton}
          onPress={() => handleUnfollow(user.id)}
          disabled={actionLoading === user.id}
        >
          {actionLoading === user.id ? (
            <ActivityIndicator size="small" color="#a3a3a3" />
          ) : (
            <>
              <Ionicons name="checkmark" size={14} color="#a3a3a3" />
              <Text style={styles.followingButtonText}>Following</Text>
            </>
          )}
        </Pressable>
      );
    }

    if (user.follow_status === 'pending') {
      return (
        <View style={styles.pendingButton}>
          <Text style={styles.pendingButtonText}>Pending</Text>
        </View>
      );
    }

    return (
      <Pressable
        style={styles.followButton}
        onPress={() => handleFollow(user.id)}
        disabled={actionLoading === user.id}
      >
        {actionLoading === user.id ? (
          <ActivityIndicator size="small" color="#faf9f5" />
        ) : (
          <Text style={styles.followButtonText}>Follow</Text>
        )}
      </Pressable>
    );
  };

  const renderUserCard = (user: UserSearchResult, showFollowButton: boolean = true) => (
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
        {user.place_count !== undefined && (
          <Text style={styles.userPlaces}>{user.place_count} places</Text>
        )}
      </View>
      {showFollowButton ? (
        renderFollowButton(user)
      ) : (
        <Ionicons name="chevron-forward" size={20} color="#737373" />
      )}
    </Pressable>
  );

  const renderPlaceCard = (place: TopPlace) => (
    <Pressable
      key={place.id}
      style={styles.placeCard}
      onPress={() => handlePlacePress(place.id, place.owner?.name)}
    >
      <View style={styles.placeInfo}>
        <Text style={styles.placeName}>{place.name}</Text>
        <Text style={styles.placeAddress} numberOfLines={1}>
          {place.address}
        </Text>
        <View style={styles.placeMetaRow}>
          {place.owner && (
            <Text style={styles.placeOwner}>by {place.owner.name}</Text>
          )}
          {place.distance_km !== undefined && (
            <Text style={styles.placeDistance}>
              {place.distance_km < 1 ? `${Math.round(place.distance_km * 1000)}m` : `${place.distance_km.toFixed(1)}km`} away
            </Text>
          )}
        </View>
        {place.tags.length > 0 && (
          <View style={styles.tagRow}>
            {place.tags.slice(0, 3).map((tag) => (
              <View
                key={tag.id}
                style={[styles.tag, { backgroundColor: (tag.color || '#DE7356') + '33' }]}
              >
                <Text style={[styles.tagText, { color: tag.color || '#DE7356' }]}>
                  {tag.name}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
      <View style={styles.placeStats}>
        <Ionicons name="people" size={14} color="#a3a3a3" />
        <Text style={styles.placeCount}>{place.user_count}</Text>
      </View>
    </Pressable>
  );

  const renderGooglePlaceCard = (place: GooglePlaceResult) => (
    <Pressable
      key={place.place_id}
      style={styles.placeCard}
      onPress={() => {
        const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.description)}&query_place_id=${place.place_id}`;
        Linking.openURL(url);
      }}
    >
      <View style={styles.googlePlaceIcon}>
        <Ionicons name="location" size={24} color="#DE7356" />
      </View>
      <View style={styles.placeInfo}>
        <Text style={styles.placeName}>{place.main_text || place.description.split(',')[0]}</Text>
        <Text style={styles.placeAddress} numberOfLines={1}>
          {place.secondary_text || place.description}
        </Text>
        <Text style={styles.googleMapsLink}>Open in Google Maps →</Text>
      </View>
    </Pressable>
  );

  const renderCollectionCard = (collection: ListWithPlaceCount) => (
    <Pressable
      key={collection.id}
      style={styles.collectionCard}
      onPress={() => {
        // Navigate to collection - for now just show in users context
      }}
    >
      <View style={[styles.collectionIcon, { backgroundColor: collection.color + '33' }]}>
        <Text style={styles.collectionEmoji}>{collection.icon || '📂'}</Text>
      </View>
      <View style={styles.collectionInfo}>
        <Text style={styles.collectionName}>{collection.name}</Text>
        <Text style={styles.collectionMeta}>
          by {collection.owner_name || collection.owner_username} • {collection.place_count} places
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#737373" />
    </Pressable>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#DE7356" />
      </View>
    );
  }

  const getTotalResults = () => placeResults.length + userResults.length + collectionResults.length;

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color="#737373" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users, places, collections..."
            placeholderTextColor="#737373"
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={clearSearch}>
              <Ionicons name="close-circle" size={20} color="#737373" />
            </Pressable>
          )}
        </View>
      </View>

      {/* Search Results */}
      {hasSearched ? (
        <View style={styles.searchResults}>
          {isSearching ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#DE7356" />
              <Text style={styles.loadingText}>Searching...</Text>
            </View>
          ) : getTotalResults() === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="search" size={64} color="#737373" />
              <Text style={styles.emptyText}>No results found</Text>
              <Text style={styles.emptySubtext}>Try a different search term</Text>
            </View>
          ) : (
            <>
              {/* Search Tabs */}
              <View style={styles.searchTabContainer}>
                <Pressable
                  style={[styles.searchTab, activeSearchTab === 'users' && styles.searchTabActive]}
                  onPress={() => setActiveSearchTab('users')}
                >
                  <Text style={[styles.searchTabText, activeSearchTab === 'users' && styles.searchTabTextActive]}>
                    Users ({userResults.length})
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.searchTab, activeSearchTab === 'places' && styles.searchTabActive]}
                  onPress={() => setActiveSearchTab('places')}
                >
                  <Text style={[styles.searchTabText, activeSearchTab === 'places' && styles.searchTabTextActive]}>
                    Places ({placeResults.length})
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.searchTab, activeSearchTab === 'collections' && styles.searchTabActive]}
                  onPress={() => setActiveSearchTab('collections')}
                >
                  <Text style={[styles.searchTabText, activeSearchTab === 'collections' && styles.searchTabTextActive]}>
                    Collections ({collectionResults.length})
                  </Text>
                </Pressable>
              </View>

              {/* Tab Content */}
              <FlatList
                data={
                  activeSearchTab === 'users'
                    ? userResults
                    : activeSearchTab === 'places'
                    ? placeResults
                    : collectionResults
                }
                renderItem={({ item }) =>
                  activeSearchTab === 'users'
                    ? renderUserCard(item as UserSearchResult, true)
                    : activeSearchTab === 'places'
                    ? renderGooglePlaceCard(item as GooglePlaceResult)
                    : renderCollectionCard(item as ListWithPlaceCount)
                }
                keyExtractor={(item: any) => item.id || item.place_id}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No {activeSearchTab} found</Text>
                  </View>
                }
              />
            </>
          )}
        </View>
      ) : (
        /* Recommendation Feed */
        <FlatList
          data={[]}
          renderItem={null}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#DE7356"
            />
          }
          ListHeaderComponent={
            <>
              {/* Popular Places Section */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="location" size={20} color="#DE7356" />
                  <Text style={styles.sectionTitle}>Popular Places Near You</Text>
                </View>
                {topPlaces.length > 0 ? (
                  topPlaces.map(renderPlaceCard)
                ) : (
                  <Text style={styles.emptyText}>No popular places found nearby</Text>
                )}
              </View>

              {/* Top Users Section */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="people" size={20} color="#DE7356" />
                  <Text style={styles.sectionTitle}>Discover Accounts</Text>
                </View>
                {topUsers.length > 0 ? (
                  topUsers.map((user) => renderUserCard(user, true))
                ) : (
                  <Text style={styles.emptyText}>No users yet</Text>
                )}
              </View>
            </>
          }
        />
      )}

      {/* Loading Overlay for Place Details */}
      {isLoadingPlace && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color="#DE7356" />
            <Text style={styles.loadingOverlayText}>Loading place...</Text>
          </View>
        </View>
      )}

      {/* Place Bottom Sheet */}
      {selectedPlace && (
        <PlaceBottomSheet
          place={selectedPlace}
          onClose={closeBottomSheet}
          isOtherUserPlace={true}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#252523',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#252523',
  },
  loadingText: {
    color: '#a3a3a3',
    marginTop: 12,
    fontSize: 16,
  },
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a38',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3a3a38',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    color: '#faf9f5',
    fontSize: 16,
    marginLeft: 8,
  },
  searchResults: {
    flex: 1,
  },
  searchTabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a38',
    gap: 8,
  },
  searchTab: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#3a3a38',
  },
  searchTabActive: {
    backgroundColor: '#DE7356',
  },
  searchTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#a3a3a3',
  },
  searchTabTextActive: {
    color: '#faf9f5',
  },
  section: {
    padding: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#faf9f5',
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  userCard: {
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
  },
  userPlaces: {
    fontSize: 12,
    color: '#DE7356',
    marginTop: 2,
  },
  followButton: {
    backgroundColor: '#DE7356',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  followButtonText: {
    color: '#faf9f5',
    fontSize: 14,
    fontWeight: '600',
  },
  followingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#3a3a38',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4a4a48',
  },
  followingButtonText: {
    color: '#a3a3a3',
    fontSize: 14,
    fontWeight: '600',
  },
  pendingButton: {
    backgroundColor: '#3a3a38',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    opacity: 0.6,
  },
  pendingButtonText: {
    color: '#a3a3a3',
    fontSize: 14,
    fontWeight: '600',
  },
  placeCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#3a3a38',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  googlePlaceIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#DE735620',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeInfo: {
    flex: 1,
    marginLeft: 12,
  },
  placeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#faf9f5',
  },
  placeAddress: {
    fontSize: 14,
    color: '#a3a3a3',
    marginTop: 2,
  },
  placeMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  placeOwner: {
    fontSize: 12,
    color: '#DE7356',
  },
  placeDistance: {
    fontSize: 12,
    color: '#737373',
  },
  googleMapsLink: {
    fontSize: 12,
    color: '#3B82F6',
    marginTop: 6,
  },
  tagRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  placeStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  placeCount: {
    fontSize: 12,
    color: '#a3a3a3',
    marginLeft: 4,
  },
  collectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3a3a38',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  collectionIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  collectionEmoji: {
    fontSize: 24,
  },
  collectionInfo: {
    flex: 1,
    marginLeft: 12,
  },
  collectionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#faf9f5',
  },
  collectionMeta: {
    fontSize: 14,
    color: '#a3a3a3',
    marginTop: 2,
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
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#737373',
    marginTop: 8,
    textAlign: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },
  loadingCard: {
    backgroundColor: '#3a3a38',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  loadingOverlayText: {
    color: '#faf9f5',
    fontSize: 14,
    fontWeight: '500',
  },
});
