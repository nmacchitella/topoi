import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  RefreshControl,
  Dimensions,
  Alert,
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { usersApi, placesAdoptApi } from '../../src/lib/api';
import { useStore } from '../../src/store/useStore';
import type { UserProfilePublic, Place, SharedMapData, UserMapMetadata, MapBounds } from '../../src/types';
import { DEFAULT_TAG_COLOR } from '../../src/lib/tagColors';
import PlaceBottomSheet from '../../src/components/PlaceBottomSheet';
import TagIcon from '../../src/components/TagIcon';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAP_HEIGHT = 300;
const LARGE_MAP_THRESHOLD = 1000;

// Dark map style
const darkMapStyle = [
  { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
];

export default function UserProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfilePublic | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Map state
  const [mapData, setMapData] = useState<SharedMapData | null>(null);
  const [mapPlaces, setMapPlaces] = useState<Place[]>([]);
  const [mapMetadata, setMapMetadata] = useState<UserMapMetadata | null>(null);
  const [isLargeMap, setIsLargeMap] = useState(false);
  const [mapLoading, setMapLoading] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<(Place & { ownerName?: string; ownerId?: string }) | null>(null);

  const { user, followUser, unfollowUser, fetchPlaces } = useStore();

  const fetchProfile = async () => {
    if (!id) return;

    try {
      const data = await usersApi.getProfile(id);
      setProfile(data);

      // Load map if user can view it (public OR followed)
      if (data.is_public || data.is_followed_by_me) {
        loadMap();
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const loadMap = async () => {
    if (!id) return;

    try {
      setMapLoading(true);

      // First, fetch metadata to check map size
      const metadata = await usersApi.getUserMapMetadata(id);
      setMapMetadata(metadata);

      if (metadata.total_places >= LARGE_MAP_THRESHOLD) {
        // Large map - just show metadata info
        setIsLargeMap(true);
        setMapData({
          user: metadata.user,
          places: [],
          lists: metadata.lists,
          tags: metadata.tags,
        });
      } else {
        // Small map - load all places
        setIsLargeMap(false);
        const data = await usersApi.getUserMap(id);
        setMapData(data);
        setMapPlaces(data.places);
      }
    } catch (error) {
      console.error('Failed to load map:', error);
    } finally {
      setMapLoading(false);
    }
  };

  // Handle viewport-based loading for large maps
  const handleBoundsChange = useCallback(async (bounds: MapBounds) => {
    if (!isLargeMap || !id) return;

    try {
      const response = await usersApi.getUserMapPlacesInBounds(id, bounds, 500);
      setMapPlaces(response.places);
    } catch (error) {
      console.error('Failed to load places in viewport:', error);
    }
  }, [id, isLargeMap]);

  const handlePlaceSelect = useCallback((place: Place) => {
    setSelectedPlace({
      ...place,
      ownerName: profile?.name,
      ownerId: id,
    });
  }, [profile, id]);

  const handleAddToMyMap = useCallback(async () => {
    if (!selectedPlace) return;

    try {
      await placesAdoptApi.adoptPlace({ place_id: selectedPlace.id });
      Alert.alert(
        'Added to Your Map',
        `"${selectedPlace.name}" has been added to your map.`,
        [{ text: 'OK', onPress: () => setSelectedPlace(null) }]
      );
      fetchPlaces();
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Failed to add place to your map';
      Alert.alert('Error', message);
    }
  }, [selectedPlace, fetchPlaces]);

  const closeBottomSheet = useCallback(() => {
    setSelectedPlace(null);
  }, []);

  // Get map region from places
  const getMapRegion = () => {
    if (mapPlaces.length === 0) {
      return {
        latitude: 40.7128,
        longitude: -74.006,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      };
    }

    const lats = mapPlaces.map(p => p.latitude);
    const lngs = mapPlaces.map(p => p.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(0.02, (maxLat - minLat) * 1.5),
      longitudeDelta: Math.max(0.02, (maxLng - minLng) * 1.5),
    };
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

        {/* Map Section - show if public or followed */}
        {(profile.is_public || profile.is_followed_by_me) && (
          <View style={styles.mapSection}>
            <Text style={styles.mapSectionTitle}>
              {isOwnProfile ? 'Your Map' : `${profile.name}'s Map`}
            </Text>

            {mapLoading ? (
              <View style={styles.mapLoadingContainer}>
                <ActivityIndicator size="large" color="#DE7356" />
                <Text style={styles.mapLoadingText}>Loading map...</Text>
              </View>
            ) : mapPlaces.length > 0 || isLargeMap ? (
              <>
                {/* Large map info */}
                {isLargeMap && mapMetadata && (
                  <View style={styles.largeMapInfo}>
                    <Text style={styles.largeMapInfoText}>
                      <Text style={styles.largeMapInfoBold}>
                        {mapMetadata.total_places.toLocaleString()}
                      </Text>{' '}
                      places total. Pan and zoom to explore.
                    </Text>
                  </View>
                )}

                {/* Map */}
                <View style={styles.mapContainer}>
                  <MapView
                    style={styles.map}
                    provider={PROVIDER_DEFAULT}
                    initialRegion={getMapRegion()}
                    customMapStyle={darkMapStyle}
                    onRegionChangeComplete={(region) => {
                      if (isLargeMap) {
                        handleBoundsChange({
                          minLat: region.latitude - region.latitudeDelta / 2,
                          maxLat: region.latitude + region.latitudeDelta / 2,
                          minLng: region.longitude - region.longitudeDelta / 2,
                          maxLng: region.longitude + region.longitudeDelta / 2,
                        });
                      }
                    }}
                  >
                    {mapPlaces.map((place) => {
                      const markerColor = place.tags[0]?.color || DEFAULT_TAG_COLOR;
                      const isSelected = selectedPlace?.id === place.id;

                      return (
                        <Marker
                          key={place.id}
                          coordinate={{
                            latitude: place.latitude,
                            longitude: place.longitude,
                          }}
                          pinColor={isSelected ? '#3B82F6' : markerColor}
                          onPress={() => handlePlaceSelect(place)}
                        />
                      );
                    })}
                  </MapView>
                </View>

                {/* Place count */}
                <View style={styles.placeCountContainer}>
                  <Text style={styles.placeCountText}>
                    {isLargeMap
                      ? `Showing ${mapPlaces.length.toLocaleString()} places in view`
                      : `${mapPlaces.length} public ${mapPlaces.length === 1 ? 'place' : 'places'}`}
                  </Text>
                </View>
              </>
            ) : (
              <View style={styles.noPlacesContainer}>
                <Ionicons name="location-outline" size={48} color="#737373" />
                <Text style={styles.noPlacesText}>No public places yet</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Bottom Sheet for selected place */}
      {selectedPlace && (
        <PlaceBottomSheet
          place={selectedPlace}
          onClose={closeBottomSheet}
          isOtherUserPlace={!isOwnProfile}
          onAddToMyMap={handleAddToMyMap}
        />
      )}
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
  // Map section styles
  mapSection: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#3a3a38',
    borderRadius: 12,
    padding: 16,
  },
  mapSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#faf9f5',
    marginBottom: 12,
  },
  mapLoadingContainer: {
    height: MAP_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapLoadingText: {
    color: '#a3a3a3',
    marginTop: 12,
    fontSize: 14,
  },
  largeMapInfo: {
    backgroundColor: '#1e3a5f',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  largeMapInfoText: {
    fontSize: 13,
    color: '#93c5fd',
  },
  largeMapInfoBold: {
    fontWeight: '700',
  },
  mapContainer: {
    height: MAP_HEIGHT,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#4a4a48',
  },
  map: {
    flex: 1,
  },
  placeCountContainer: {
    marginTop: 12,
  },
  placeCountText: {
    fontSize: 13,
    color: '#a3a3a3',
  },
  noPlacesContainer: {
    height: MAP_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noPlacesText: {
    fontSize: 14,
    color: '#737373',
    marginTop: 12,
  },
});
