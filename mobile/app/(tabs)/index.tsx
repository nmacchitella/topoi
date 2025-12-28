import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  Pressable,
  ScrollView,
  RefreshControl,
  Animated,
  Dimensions,
  TextInput,
  Alert,
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, Region } from 'react-native-maps';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../../src/store/useStore';
import { authApi, usersApi, searchApi, placesAdoptApi, GooglePlaceResult } from '../../src/lib/api';
import type { Place, UserSearchResult, Tag, TagWithUsage, MapBounds, PreviewPlace } from '../../src/types';
import { DEFAULT_TAG_COLOR } from '../../src/lib/tagColors';
import PlaceBottomSheet from '../../src/components/PlaceBottomSheet';
import NotificationBell from '../../src/components/NotificationBell';
import TagIcon from '../../src/components/TagIcon';

// Threshold for smart loading - if user has more places than this, use viewport-based loading
const LARGE_MAP_THRESHOLD = 1000;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SIDEBAR_WIDTH = Math.min(SCREEN_WIDTH * 0.85, 320);

type ViewMode = 'map' | 'list';
type MapMode = 'profile' | 'layers';

interface FollowedUserPlace extends Place {
  ownerName?: string;
  ownerId?: string;
}

function MapScreen() {
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const sidebarAnim = useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [tagFilterMode, setTagFilterMode] = useState<'any' | 'all'>('any');
  const [tagSortMode, setTagSortMode] = useState<'usage' | 'alpha'>('usage');
  const [viewMode, setViewMode] = useState<ViewMode>('map');
  const [mapMode, setMapMode] = useState<MapMode>('profile');
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [userSelectorOpen, setUserSelectorOpen] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // Layers mode state
  const [followedUsers, setFollowedUsers] = useState<UserSearchResult[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [layerPlaces, setLayerPlaces] = useState<FollowedUserPlace[]>([]);
  const [loadingLayers, setLoadingLayers] = useState(false);
  const [largeMapUsers, setLargeMapUsers] = useState<Set<string>>(new Set());
  const [currentMapBounds, setCurrentMapBounds] = useState<MapBounds | null>(null);
  const lastBoundsRef = useRef<MapBounds | null>(null);

  // Bottom sheet state
  const [bottomSheetPlace, setBottomSheetPlace] = useState<(Place & { ownerName?: string; ownerId?: string }) | null>(null);

  // Preview state (for search results before saving)
  const [previewPlace, setPreviewPlace] = useState<PreviewPlace | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [googleResults, setGoogleResults] = useState<GooglePlaceResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    user,
    setUser,
    fetchPlaces,
    fetchLists,
    fetchTags,
    places,
    tags,
  } = useStore();

  // Initialize data
  const initData = async () => {
    try {
      // Fetch user if not loaded
      if (!user) {
        const userData = await authApi.getCurrentUser();
        setUser(userData);
      }

      // Fetch all data in parallel
      await Promise.all([
        fetchPlaces(),
        fetchLists(),
        fetchTags(),
        loadFollowedUsers(),
      ]);
    } catch (error) {
      console.error('Failed to initialize:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const loadFollowedUsers = async () => {
    try {
      const users = await usersApi.getFollowing();
      setFollowedUsers(users);
    } catch (error) {
      console.error('Failed to load followed users:', error);
    }
  };

  // Check if a user has a large map and should use viewport-based loading
  const checkAndLoadUserPlaces = async (userId: string): Promise<FollowedUserPlace[]> => {
    const user = followedUsers.find(u => u.id === userId);

    try {
      // First, get metadata to check if this is a large map
      const metadata = await usersApi.getUserMapMetadata(userId);

      if (metadata.total_places >= LARGE_MAP_THRESHOLD) {
        // Mark as large map user for viewport-based loading
        setLargeMapUsers(prev => new Set([...prev, userId]));

        // If we have current bounds, load places in viewport
        if (currentMapBounds) {
          const response = await usersApi.getUserMapPlacesInBounds(userId, currentMapBounds, 500);
          return response.places.map(place => ({
            ...place,
            ownerName: user?.name,
            ownerId: userId,
          }));
        }
        return [];
      } else {
        // Small map - load all places at once
        setLargeMapUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });

        const userData = await usersApi.getUserMap(userId);
        return userData.places.map(place => ({
          ...place,
          ownerName: user?.name,
          ownerId: userId,
        }));
      }
    } catch (error) {
      console.error(`Failed to load places for user ${userId}:`, error);
      return [];
    }
  };

  const loadLayerPlaces = async () => {
    if (selectedUserIds.length === 0) {
      setLayerPlaces([]);
      return;
    }

    setLoadingLayers(true);
    try {
      const allPlaces: FollowedUserPlace[] = [];

      // Load places for each selected user
      for (const userId of selectedUserIds) {
        const userPlaces = await checkAndLoadUserPlaces(userId);
        allPlaces.push(...userPlaces);
      }

      setLayerPlaces(allPlaces);
    } catch (error) {
      console.error('Failed to load layer places:', error);
    } finally {
      setLoadingLayers(false);
    }
  };

  // Reload places for large map users when viewport changes
  const loadPlacesInViewport = async (bounds: MapBounds) => {
    if (largeMapUsers.size === 0) return;

    // Check if bounds changed significantly (avoid reloading for tiny movements)
    if (lastBoundsRef.current) {
      const last = lastBoundsRef.current;
      const threshold = 0.0001; // ~10m precision
      if (
        Math.abs(bounds.minLat - last.minLat) < threshold &&
        Math.abs(bounds.maxLat - last.maxLat) < threshold &&
        Math.abs(bounds.minLng - last.minLng) < threshold &&
        Math.abs(bounds.maxLng - last.maxLng) < threshold
      ) {
        return; // Bounds haven't changed significantly
      }
    }

    lastBoundsRef.current = bounds;
    setCurrentMapBounds(bounds);

    // Only reload for large map users that are selected
    const largeMapSelectedUsers = selectedUserIds.filter(id => largeMapUsers.has(id));
    if (largeMapSelectedUsers.length === 0) return;

    setLoadingLayers(true);
    try {
      const newPlaces: FollowedUserPlace[] = [];

      // Keep places from non-large-map users
      const smallMapPlaces = layerPlaces.filter(p => p.ownerId && !largeMapUsers.has(p.ownerId));
      newPlaces.push(...smallMapPlaces);

      // Load places in viewport for large map users
      for (const userId of largeMapSelectedUsers) {
        const user = followedUsers.find(u => u.id === userId);
        const response = await usersApi.getUserMapPlacesInBounds(userId, bounds, 500);
        response.places.forEach(place => {
          newPlaces.push({
            ...place,
            ownerName: user?.name,
            ownerId: userId,
          });
        });
      }

      setLayerPlaces(newPlaces);
    } catch (error) {
      console.error('Failed to load places in viewport:', error);
    } finally {
      setLoadingLayers(false);
    }
  };

  // Debounced handler for map region changes
  const handleRegionChange = useCallback((region: Region) => {
    if (mapMode !== 'layers') return;

    const bounds: MapBounds = {
      minLat: region.latitude - region.latitudeDelta / 2,
      maxLat: region.latitude + region.latitudeDelta / 2,
      minLng: region.longitude - region.longitudeDelta / 2,
      maxLng: region.longitude + region.longitudeDelta / 2,
    };

    // Debounce the viewport loading
    const timeoutId = setTimeout(() => {
      loadPlacesInViewport(bounds);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [mapMode, largeMapUsers, selectedUserIds, followedUsers]);

  useEffect(() => {
    initData();
  }, []);

  useEffect(() => {
    if (mapMode === 'layers') {
      // Reload followed users when entering layers mode
      loadFollowedUsers();
      loadLayerPlaces();
    }
  }, [selectedUserIds, mapMode]);

  // Get location permission
  useEffect(() => {
    const getLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const currentLocation = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          setLocation(currentLocation);
        }
      } catch (error) {
        console.error('Error getting location:', error);
      }
    };

    getLocation();
  }, []);

  const handlePlacePress = useCallback((place: Place | FollowedUserPlace) => {
    // Show bottom sheet instead of navigating
    setBottomSheetPlace(place as (Place & { ownerName?: string; ownerId?: string }));
    setSelectedPlaceId(place.id);
  }, []);

  const closeBottomSheet = useCallback(() => {
    setBottomSheetPlace(null);
    setSelectedPlaceId(null);
  }, []);

  const handleAddToMyMap = useCallback(async () => {
    if (!bottomSheetPlace) return;

    try {
      await placesAdoptApi.adoptPlace({
        place_id: bottomSheetPlace.id,
      });

      Alert.alert(
        'Added to Your Map',
        `"${bottomSheetPlace.name}" has been added to your map.`,
        [{ text: 'OK', onPress: () => closeBottomSheet() }]
      );

      // Refresh places to show the new place
      fetchPlaces();
    } catch (error: any) {
      const message = error.response?.data?.detail || 'Failed to add place to your map';
      Alert.alert('Error', message);
    }
  }, [bottomSheetPlace, closeBottomSheet, fetchPlaces]);

  const handleMarkerPress = useCallback((place: Place | FollowedUserPlace) => {
    // Single click opens the bottom sheet with place details
    setSelectedPlaceId(place.id);
    setBottomSheetPlace(place as (Place & { ownerName?: string; ownerId?: string }));
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    initData();
  };

  const toggleTagFilter = (tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

  const clearTagFilters = () => {
    setSelectedTagIds([]);
  };

  const toggleViewMode = () => {
    setViewMode((prev) => (prev === 'map' ? 'list' : 'map'));
  };

  const toggleMapMode = () => {
    setMapMode((prev) => {
      const newMode = prev === 'profile' ? 'layers' : 'profile';
      // Clear selected users and layer places when switching back to profile
      if (newMode === 'profile') {
        setSelectedUserIds([]);
        setLayerPlaces([]);
      }
      return newMode;
    });
    setSelectedPlaceId(null);
    setUserSelectorOpen(false);
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const centerOnLocation = () => {
    if (location && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      }, 500);
    }
  };

  // Search functions
  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);

    // Clear previous timeout
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    if (text.length < 3) {
      setGoogleResults([]);
      return;
    }

    // Debounce Google Places search
    searchDebounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const lat = location?.coords.latitude;
        const lng = location?.coords.longitude;
        const results = await searchApi.googlePlaces(text, lat, lng);
        setGoogleResults(results);
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  }, [location]);

  // Filter saved places by search query
  const filteredSavedPlaces = searchQuery.length >= 2
    ? places.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.address.toLowerCase().includes(searchQuery.toLowerCase())
      ).slice(0, 3)
    : [];

  const handleSavedPlaceSelect = (place: Place) => {
    setSearchQuery('');
    setSearchFocused(false);
    setGoogleResults([]);
    setSelectedPlaceId(place.id);

    // Switch to map view to show the place
    setViewMode('map');

    // Center map on the place
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: place.latitude,
        longitude: place.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 500);
    }

    // Show bottom sheet
    setBottomSheetPlace(place);
  };

  const handleGooglePlaceSelect = async (result: GooglePlaceResult) => {
    setSearchQuery('');
    setSearchFocused(false);
    setGoogleResults([]);

    // Switch to map view
    setViewMode('map');

    try {
      const details = await searchApi.googlePlaceDetails(result.place_id);
      if (details && mapRef.current) {
        // Center map on the location
        mapRef.current.animateToRegion({
          latitude: details.lat,
          longitude: details.lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }, 500);

        // Show preview with place details
        setPreviewPlace({
          name: details.name || result.main_text,
          address: details.address || result.description,
          latitude: details.lat,
          longitude: details.lng,
          phone: details.phone,
          website: details.website,
          hours: details.hours,
          google_maps_uri: details.google_maps_uri,
          types: details.types,
        });
      }
    } catch (error) {
      console.error('Failed to get place details:', error);
    }
  };

  const handlePreviewClose = useCallback(() => {
    setPreviewPlace(null);
  }, []);

  const handlePreviewAddToMyPlaces = useCallback(() => {
    if (!previewPlace) return;

    // Navigate to add new place with pre-filled data
    router.push({
      pathname: '/place/new',
      params: {
        lat: previewPlace.latitude.toString(),
        lng: previewPlace.longitude.toString(),
        name: previewPlace.name,
        address: previewPlace.address,
        phone: previewPlace.phone || '',
        website: previewPlace.website || '',
        hours: previewPlace.hours || '',
      },
    });

    // Close preview
    setPreviewPlace(null);
  }, [previewPlace, router]);

  const handleAddNewPlace = () => {
    const name = searchQuery.trim();
    setSearchQuery('');
    setSearchFocused(false);
    setGoogleResults([]);

    // Navigate to add new place with the search query as name
    router.push({
      pathname: '/place/new',
      params: name ? { name } : {},
    });
  };

  const closeSearch = () => {
    setSearchFocused(false);
    setSearchQuery('');
    setGoogleResults([]);
  };

  // Sidebar animation functions
  const openSidebar = () => {
    setSidebarVisible(true);
    setSidebarOpen(true);
    Animated.parallel([
      Animated.timing(sidebarAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(overlayAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeSidebar = () => {
    Animated.parallel([
      Animated.timing(sidebarAnim, {
        toValue: -SIDEBAR_WIDTH,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(overlayAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setSidebarVisible(false);
      setSidebarOpen(false);
    });
  };

  // Filter users by search query
  const filteredFollowedUsers = followedUsers.filter(
    (user) =>
      user.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      (user.username && user.username.toLowerCase().includes(userSearchQuery.toLowerCase()))
  );

  // Get the places to display based on mode
  const displayPlaces = mapMode === 'profile' ? places : layerPlaces;

  // Filter places by selected tags
  const filteredPlaces = selectedTagIds.length === 0
    ? displayPlaces
    : displayPlaces.filter((place) => {
        if (tagFilterMode === 'any') {
          // Show places that have ANY of the selected tags
          return place.tags.some((tag) => selectedTagIds.includes(tag.id));
        } else {
          // Show places that have ALL of the selected tags
          return selectedTagIds.every((tagId) =>
            place.tags.some((tag) => tag.id === tagId)
          );
        }
      });

  // Get tags for current mode
  const baseTags = mapMode === 'profile' ? tags :
    // Aggregate tags from layer places
    Array.from(new Map(layerPlaces.flatMap(p => p.tags).map(t => [t.id, t])).values());

  // Sort tags based on sort mode
  const displayTags = [...baseTags].sort((a, b) => {
    if (tagSortMode === 'alpha') {
      return a.name.localeCompare(b.name);
    }
    // Sort by usage count (most used first)
    const aCount = (a as TagWithUsage).usage_count || 0;
    const bCount = (b as TagWithUsage).usage_count || 0;
    return bCount - aCount;
  });

  // Get initial region for map
  const getInitialRegion = () => {
    if (filteredPlaces.length > 0) {
      const lats = filteredPlaces.map((p) => p.latitude);
      const lngs = filteredPlaces.map((p) => p.longitude);
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
    }

    if (location) {
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }

    return {
      latitude: 40.7128,
      longitude: -74.006,
      latitudeDelta: 0.1,
      longitudeDelta: 0.1,
    };
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#DE7356" />
        <Text style={styles.loadingText}>Loading your places...</Text>
      </View>
    );
  }

  const selectedPlace = selectedPlaceId
    ? filteredPlaces.find((p) => p.id === selectedPlaceId)
    : null;

  return (
    <View style={styles.container}>
      {/* Header - matching mobile web */}
      <View style={styles.header}>
        <Pressable style={styles.menuButton} onPress={openSidebar}>
          <Ionicons name="menu" size={24} color="#faf9f5" />
        </Pressable>
        {/* Search Bar - inline search */}
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color="#737373" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search places..."
            placeholderTextColor="#737373"
            value={searchQuery}
            onChangeText={handleSearchChange}
            onFocus={() => setSearchFocused(true)}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={closeSearch}>
              <Ionicons name="close-circle" size={18} color="#737373" />
            </Pressable>
          )}
        </View>
        {/* Notification Bell */}
        <NotificationBell />
      </View>

      {/* Search Results Dropdown */}
      {searchFocused && searchQuery.length >= 2 && (
        <View style={styles.searchDropdown}>
          <ScrollView style={styles.searchResults} keyboardShouldPersistTaps="handled">
            {/* Add New Option */}
            {searchQuery.trim().length >= 2 && (
              <Pressable style={styles.searchResultItem} onPress={handleAddNewPlace}>
                <View style={styles.searchResultIconContainer}>
                  <Ionicons name="add-circle" size={20} color="#22C55E" />
                </View>
                <View style={styles.searchResultContent}>
                  <Text style={styles.searchResultTitle}>Create "{searchQuery.trim()}"</Text>
                  <Text style={styles.searchResultSubtitle}>Add as a new place</Text>
                </View>
              </Pressable>
            )}

            {/* Saved Places Section */}
            {filteredSavedPlaces.length > 0 && (
              <>
                <View style={styles.searchSectionHeader}>
                  <Text style={styles.searchSectionTitle}>Your Saved Places</Text>
                </View>
                {filteredSavedPlaces.map((place) => (
                  <Pressable
                    key={place.id}
                    style={styles.searchResultItem}
                    onPress={() => handleSavedPlaceSelect(place)}
                  >
                    <View style={styles.searchResultIconContainer}>
                      <Ionicons name="location" size={20} color="#DE7356" />
                    </View>
                    <View style={styles.searchResultContent}>
                      <Text style={styles.searchResultTitle} numberOfLines={1}>{place.name}</Text>
                      <Text style={styles.searchResultSubtitle} numberOfLines={1}>{place.address}</Text>
                    </View>
                  </Pressable>
                ))}
              </>
            )}

            {/* Google Places Results */}
            {(googleResults.length > 0 || searchLoading) && (
              <>
                <View style={styles.searchSectionHeader}>
                  <Text style={styles.searchSectionTitle}>Search Results</Text>
                </View>
                {searchLoading ? (
                  <View style={styles.searchLoadingContainer}>
                    <ActivityIndicator size="small" color="#DE7356" />
                    <Text style={styles.searchLoadingText}>Searching...</Text>
                  </View>
                ) : (
                  googleResults.slice(0, 5).map((result) => (
                    <Pressable
                      key={result.place_id}
                      style={styles.searchResultItem}
                      onPress={() => handleGooglePlaceSelect(result)}
                    >
                      <View style={styles.searchResultIconContainer}>
                        <Ionicons name="location-outline" size={20} color="#3B82F6" />
                      </View>
                      <View style={styles.searchResultContent}>
                        <Text style={styles.searchResultTitle} numberOfLines={1}>
                          {result.main_text || result.description.split(',')[0]}
                        </Text>
                        <Text style={styles.searchResultSubtitle} numberOfLines={1}>
                          {result.secondary_text || result.description}
                        </Text>
                      </View>
                    </Pressable>
                  ))
                )}
              </>
            )}

            {/* No Results */}
            {searchQuery.length >= 3 && !searchLoading && filteredSavedPlaces.length === 0 && googleResults.length === 0 && (
              <View style={styles.noResultsContainer}>
                <Text style={styles.noResultsText}>No results found</Text>
                <Text style={styles.noResultsSubtext}>Tap "Create" above to add a new place</Text>
              </View>
            )}
          </ScrollView>
        </View>
      )}

      {/* Search Overlay - closes search when tapping outside */}
      {searchFocused && (
        <Pressable style={styles.searchOverlay} onPress={closeSearch} />
      )}

      {/* Active Filters Bar */}
      {selectedTagIds.length > 0 && (
        <View style={styles.activeFiltersBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activeFiltersContent}>
            <Pressable style={styles.clearAllButton} onPress={clearTagFilters}>
              <Ionicons name="close" size={14} color="#faf9f5" />
              <Text style={styles.clearAllText}>Clear all</Text>
            </Pressable>
            {selectedTagIds.map((tagId) => {
              const tag = displayTags.find(t => t.id === tagId);
              if (!tag) return null;
              return (
                <View key={tagId} style={[styles.activeFilterChip, { backgroundColor: tag.color || DEFAULT_TAG_COLOR }]}>
                  <Text style={styles.activeFilterText}>{tag.name}</Text>
                  <Pressable onPress={() => toggleTagFilter(tagId)}>
                    <Ionicons name="close" size={14} color="#faf9f5" />
                  </Pressable>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Map/List Content */}
      {viewMode === 'map' ? (
        <View style={styles.mapContainer}>
          <MapView
            ref={mapRef}
            style={styles.map}
            provider={PROVIDER_DEFAULT}
            initialRegion={getInitialRegion()}
            showsUserLocation
            customMapStyle={darkMapStyle}
            onPress={() => {
              setSelectedPlaceId(null);
              setUserSelectorOpen(false);
            }}
            onRegionChangeComplete={handleRegionChange}
          >
            {filteredPlaces.map((place) => {
              const isSelected = selectedPlaceId === place.id;
              const markerColor = place.tags[0]?.color || DEFAULT_TAG_COLOR;

              return (
                <Marker
                  key={place.id}
                  coordinate={{
                    latitude: place.latitude,
                    longitude: place.longitude,
                  }}
                  onPress={() => handleMarkerPress(place)}
                  pinColor={isSelected ? '#3B82F6' : markerColor}
                />
              );
            })}
            {/* Preview marker for search results */}
            {previewPlace && (
              <Marker
                coordinate={{
                  latitude: previewPlace.latitude,
                  longitude: previewPlace.longitude,
                }}
                pinColor="#3B82F6"
              />
            )}
          </MapView>

          {/* Centered Map/List Toggle - like web */}
          <View style={styles.viewModeToggleContainer}>
            <View style={styles.viewModeToggle}>
              <Pressable
                style={[styles.viewModeButton, styles.viewModeButtonActive]}
                onPress={() => setViewMode('map')}
              >
                <Text style={[styles.viewModeButtonText, styles.viewModeButtonTextActive]}>
                  Map
                </Text>
              </Pressable>
              <Pressable
                style={styles.viewModeButton}
                onPress={() => setViewMode('list')}
              >
                <Text style={styles.viewModeButtonText}>
                  List
                </Text>
              </Pressable>
            </View>

            {/* User Selector - centered below Map/List toggle when in layers mode */}
            {mapMode === 'layers' && (
              <View style={styles.userSelectorContainer}>
                <Pressable
                  style={styles.userSelectorButton}
                  onPress={() => setUserSelectorOpen(!userSelectorOpen)}
                >
                  <Ionicons name="people" size={18} color="#a3a3a3" />
                  <Text style={styles.userSelectorButtonText}>Select Users</Text>
                  {selectedUserIds.length > 0 && (
                    <View style={styles.userCountBadge}>
                      <Text style={styles.userCountText}>{selectedUserIds.length}</Text>
                    </View>
                  )}
                  <Ionicons
                    name={userSelectorOpen ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color="#a3a3a3"
                  />
                </Pressable>

                {/* User Selector Dropdown */}
                {userSelectorOpen && (
                  <View style={styles.userSelectorDropdown}>
                    {/* Search Input */}
                    <View style={styles.userSearchContainer}>
                      <Ionicons name="search" size={16} color="#737373" />
                      <TextInput
                        style={styles.userSearchInput}
                        placeholder="Search users..."
                        placeholderTextColor="#737373"
                        value={userSearchQuery}
                        onChangeText={setUserSearchQuery}
                      />
                    </View>

                    {/* User List */}
                    <ScrollView style={styles.userDropdownList}>
                      {filteredFollowedUsers.length === 0 ? (
                        <Text style={styles.noUsersText}>
                          {userSearchQuery ? 'No users found' : 'You are not following anyone yet'}
                        </Text>
                      ) : (
                        filteredFollowedUsers.map((user) => {
                          const isSelected = selectedUserIds.includes(user.id);
                          return (
                            <Pressable
                              key={user.id}
                              style={styles.userDropdownItem}
                              onPress={() => toggleUserSelection(user.id)}
                            >
                              <View
                                style={[
                                  styles.userCheckbox,
                                  isSelected && styles.userCheckboxSelected,
                                ]}
                              >
                                {isSelected && (
                                  <Ionicons name="checkmark" size={12} color="#faf9f5" />
                                )}
                              </View>
                              <View style={styles.userDropdownInfo}>
                                <Text style={styles.userDropdownName}>{user.name}</Text>
                                {user.username && (
                                  <Text style={styles.userDropdownUsername}>@{user.username}</Text>
                                )}
                              </View>
                            </Pressable>
                          );
                        })
                      )}
                    </ScrollView>

                    {/* Footer */}
                    {selectedUserIds.length > 0 && (
                      <View style={styles.userDropdownFooter}>
                        <Text style={styles.userDropdownFooterText}>
                          {selectedUserIds.length} user{selectedUserIds.length === 1 ? '' : 's'} selected
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Bottom left - Locate button */}
          <View style={styles.leftMapControls}>
            <Pressable style={styles.mapControlButton} onPress={centerOnLocation}>
              <Ionicons name="locate" size={22} color="#faf9f5" />
            </Pressable>
          </View>

          {/* Bottom right - Profile/Layers toggle */}
          <View style={styles.rightMapControls}>
            <View style={styles.mapModeToggleContainer}>
              <Pressable
                style={[
                  styles.mapModeButton,
                  mapMode === 'profile' && styles.mapModeButtonActive,
                ]}
                onPress={() => {
                  setMapMode('profile');
                  setUserSelectorOpen(false);
                }}
              >
                <Ionicons
                  name="person"
                  size={20}
                  color={mapMode === 'profile' ? '#faf9f5' : '#a3a3a3'}
                />
              </Pressable>
              <Pressable
                style={[
                  styles.mapModeButton,
                  mapMode === 'layers' && styles.mapModeButtonActive,
                ]}
                onPress={() => {
                  setMapMode('layers');
                }}
              >
                <Ionicons
                  name="layers"
                  size={20}
                  color={mapMode === 'layers' ? '#faf9f5' : '#a3a3a3'}
                />
              </Pressable>
            </View>
          </View>

          {/* Selected Place Card */}
          {selectedPlace && (
            <Pressable
              style={styles.selectedPlaceCard}
              onPress={() => handlePlacePress(selectedPlace)}
            >
              <View style={[styles.placeIndicator, { backgroundColor: selectedPlace.tags[0]?.color || DEFAULT_TAG_COLOR }]} />
              <View style={styles.placeInfo}>
                <Text style={styles.placeName}>{selectedPlace.name}</Text>
                {(selectedPlace as FollowedUserPlace).ownerName && (
                  <Text style={styles.placeOwner}>by {(selectedPlace as FollowedUserPlace).ownerName}</Text>
                )}
                <Text style={styles.placeAddress} numberOfLines={1}>
                  {selectedPlace.address}
                </Text>
                {selectedPlace.tags.length > 0 && (
                  <View style={styles.tagRow}>
                    {selectedPlace.tags.slice(0, 2).map((tag) => {
                      const tagColor = tag.color || DEFAULT_TAG_COLOR;
                      return (
                        <View
                          key={tag.id}
                          style={[styles.tag, { backgroundColor: tagColor + '33', borderColor: tagColor + '60' }]}
                        >
                          {tag.icon && <TagIcon icon={tag.icon} size="xs" color={tagColor} />}
                          <Text style={[styles.tagText, { color: tagColor }]}>
                            {tag.name}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
              <Ionicons name="chevron-forward" size={20} color="#737373" />
            </Pressable>
          )}

          {/* Loading Layers Indicator */}
          {loadingLayers && (
            <View style={styles.loadingLayersOverlay}>
              <ActivityIndicator size="small" color="#DE7356" />
              <Text style={styles.loadingLayersText}>Loading places...</Text>
            </View>
          )}
        </View>
      ) : (
        /* List View */
        <ScrollView
          style={styles.placesList}
          contentContainerStyle={styles.placesListContent}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor="#DE7356"
            />
          }
        >
          {/* Centered View Toggle in List Mode */}
          <View style={styles.listViewHeader}>
            <View style={styles.listViewModeToggle}>
              <Pressable
                style={styles.listViewModeButton}
                onPress={() => setViewMode('map')}
              >
                <Text style={styles.listViewModeButtonText}>
                  Map
                </Text>
              </Pressable>
              <Pressable
                style={[styles.listViewModeButton, styles.listViewModeButtonActive]}
                onPress={() => setViewMode('list')}
              >
                <Text style={[styles.listViewModeButtonText, styles.listViewModeButtonTextActive]}>
                  List
                </Text>
              </Pressable>
            </View>
          </View>

          {filteredPlaces.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="location-outline" size={64} color="#737373" />
              <Text style={styles.emptyText}>
                {mapMode === 'profile' ? 'No places yet' : 'No places from followed users'}
              </Text>
              <Text style={styles.emptySubtext}>
                {mapMode === 'profile'
                  ? 'Tap New in the center to add your first place'
                  : 'Select users from the menu to see their places'}
              </Text>
            </View>
          ) : (
            filteredPlaces.map((place) => {
              const primaryColor = place.tags[0]?.color || DEFAULT_TAG_COLOR;

              return (
                <Pressable
                  key={place.id}
                  style={styles.placeCard}
                  onPress={() => handlePlacePress(place)}
                >
                  <View style={[styles.placeIndicator, { backgroundColor: primaryColor }]} />
                  <View style={styles.placeInfo}>
                    <Text style={styles.placeName}>{place.name}</Text>
                    {(place as FollowedUserPlace).ownerName && (
                      <Text style={styles.placeOwner}>by {(place as FollowedUserPlace).ownerName}</Text>
                    )}
                    <Text style={styles.placeAddress} numberOfLines={1}>
                      {place.address}
                    </Text>
                    {place.tags.length > 0 && (
                      <View style={styles.tagRow}>
                        {place.tags.slice(0, 3).map((tag) => {
                          const tagColor = tag.color || DEFAULT_TAG_COLOR;
                          return (
                            <View
                              key={tag.id}
                              style={[styles.tag, { backgroundColor: tagColor + '33', borderColor: tagColor + '60' }]}
                            >
                              {tag.icon && <TagIcon icon={tag.icon} size="xs" color={tagColor} />}
                              <Text style={[styles.tagText, { color: tagColor }]}>
                                {tag.name}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#737373" />
                </Pressable>
              );
            })
          )}
        </ScrollView>
      )}

      {/* Animated Sidebar */}
      {sidebarVisible && (
        <View style={styles.sidebarOverlayContainer}>
          {/* Overlay */}
          <Animated.View
            style={[
              styles.sidebarOverlay,
              { opacity: overlayAnim },
            ]}
          >
            <Pressable style={styles.sidebarOverlayPressable} onPress={closeSidebar} />
          </Animated.View>

          {/* Sidebar */}
          <Animated.View
            style={[
              styles.sidebar,
              { transform: [{ translateX: sidebarAnim }] },
            ]}
          >
            <View style={styles.sidebarHeader}>
              <Text style={styles.sidebarTitle}>Filter by Tags</Text>
              <Pressable onPress={closeSidebar}>
                <Ionicons name="close" size={24} color="#faf9f5" />
              </Pressable>
            </View>

            <ScrollView style={styles.sidebarContent}>
              {/* Tags Section */}
              <View style={styles.sidebarSection}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Tags</Text>
                  {selectedTagIds.length > 0 && (
                    <Pressable onPress={clearTagFilters}>
                      <Text style={styles.clearButton}>Clear ({selectedTagIds.length})</Text>
                    </Pressable>
                  )}
                </View>

                {/* Sort toggle - only show when there are tags */}
                {displayTags.length > 0 && (
                  <View style={styles.filterModeContainer}>
                    <Text style={styles.filterModeLabel}>Sort by</Text>
                    <View style={styles.filterModeToggle}>
                      <Pressable
                        style={[
                          styles.filterModeButton,
                          tagSortMode === 'usage' && styles.filterModeButtonActive,
                        ]}
                        onPress={() => setTagSortMode('usage')}
                      >
                        <Text
                          style={[
                            styles.filterModeButtonText,
                            tagSortMode === 'usage' && styles.filterModeButtonTextActive,
                          ]}
                        >
                          Popular
                        </Text>
                      </Pressable>
                      <Pressable
                        style={[
                          styles.filterModeButton,
                          tagSortMode === 'alpha' && styles.filterModeButtonActive,
                        ]}
                        onPress={() => setTagSortMode('alpha')}
                      >
                        <Text
                          style={[
                            styles.filterModeButtonText,
                            tagSortMode === 'alpha' && styles.filterModeButtonTextActive,
                          ]}
                        >
                          A-Z
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                )}

                {/* Filter mode toggle - only show when 2+ tags are selected */}
                {selectedTagIds.length > 1 && (
                  <View style={styles.filterModeContainer}>
                    <Text style={styles.filterModeLabel}>Show places with</Text>
                    <View style={styles.filterModeToggle}>
                      <Pressable
                        style={[
                          styles.filterModeButton,
                          tagFilterMode === 'any' && styles.filterModeButtonActive,
                        ]}
                        onPress={() => setTagFilterMode('any')}
                      >
                        <Text
                          style={[
                            styles.filterModeButtonText,
                            tagFilterMode === 'any' && styles.filterModeButtonTextActive,
                          ]}
                        >
                          Any tag
                        </Text>
                      </Pressable>
                      <Pressable
                        style={[
                          styles.filterModeButton,
                          tagFilterMode === 'all' && styles.filterModeButtonActive,
                        ]}
                        onPress={() => setTagFilterMode('all')}
                      >
                        <Text
                          style={[
                            styles.filterModeButtonText,
                            tagFilterMode === 'all' && styles.filterModeButtonTextActive,
                          ]}
                        >
                          All tags
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                )}
                {displayTags.length === 0 ? (
                  <Text style={styles.emptyTagsText}>No tags available</Text>
                ) : (
                  displayTags.map((tag) => {
                    const isSelected = selectedTagIds.includes(tag.id);
                    const tagColor = tag.color || DEFAULT_TAG_COLOR;
                    return (
                      <Pressable
                        key={tag.id}
                        style={[styles.tagItem, isSelected && styles.tagItemSelected]}
                        onPress={() => toggleTagFilter(tag.id)}
                      >
                        <View style={[styles.tagDot, { backgroundColor: tagColor }]} />
                        {tag.icon && <TagIcon icon={tag.icon} size="sm" color={tagColor} />}
                        <Text style={styles.tagItemName}>{tag.name}</Text>
                        {(tag as TagWithUsage).usage_count !== undefined && (
                          <Text style={styles.tagItemCount}>{(tag as TagWithUsage).usage_count}</Text>
                        )}
                        {isSelected && (
                          <Ionicons name="checkmark" size={18} color="#DE7356" />
                        )}
                      </Pressable>
                    );
                  })
                )}
              </View>
            </ScrollView>
          </Animated.View>
        </View>
      )}

      {/* Place Bottom Sheet */}
      {bottomSheetPlace && (
        <PlaceBottomSheet
          place={bottomSheetPlace}
          onClose={closeBottomSheet}
          isOtherUserPlace={mapMode === 'layers'}
          onAddToMyMap={handleAddToMyMap}
        />
      )}

      {/* Preview Bottom Sheet (for search results before saving) */}
      {previewPlace && (
        <PlaceBottomSheet
          isPreview={true}
          previewPlace={previewPlace}
          onClose={handlePreviewClose}
          onAddToMyPlaces={handlePreviewAddToMyPlaces}
        />
      )}
    </View>
  );
}

export default MapScreen;

// Dark map style for Apple Maps
const darkMapStyle = [
  {
    elementType: 'geometry',
    stylers: [{ color: '#242f3e' }],
  },
  {
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#242f3e' }],
  },
  {
    elementType: 'labels.text.fill',
    stylers: [{ color: '#746855' }],
  },
];

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a38',
    gap: 10,
  },
  menuButton: {
    padding: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3a3a38',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: '#faf9f5',
    fontSize: 15,
    padding: 0,
    margin: 0,
  },
  searchDropdown: {
    position: 'absolute',
    top: 60,
    left: 12,
    right: 12,
    backgroundColor: '#3a3a38',
    borderRadius: 12,
    maxHeight: 400,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
  },
  searchResults: {
    maxHeight: 400,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#4a4a48',
    gap: 12,
  },
  searchResultIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4a4a48',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchResultContent: {
    flex: 1,
  },
  searchResultTitle: {
    color: '#faf9f5',
    fontSize: 14,
    fontWeight: '500',
  },
  searchResultSubtitle: {
    color: '#737373',
    fontSize: 12,
    marginTop: 2,
  },
  searchSectionHeader: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#2a2a28',
  },
  searchSectionTitle: {
    color: '#737373',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  searchLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 8,
  },
  searchLoadingText: {
    color: '#737373',
    fontSize: 14,
  },
  noResultsContainer: {
    alignItems: 'center',
    padding: 24,
  },
  noResultsText: {
    color: '#a3a3a3',
    fontSize: 14,
  },
  noResultsSubtext: {
    color: '#737373',
    fontSize: 12,
    marginTop: 4,
  },
  searchOverlay: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 50,
  },
  activeFiltersBar: {
    backgroundColor: '#3a3a38',
    borderBottomWidth: 1,
    borderBottomColor: '#4a4a48',
  },
  activeFiltersContent: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  clearAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DE7356',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  clearAllText: {
    color: '#faf9f5',
    fontSize: 12,
    fontWeight: '600',
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  activeFilterText: {
    color: '#faf9f5',
    fontSize: 12,
    fontWeight: '600',
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  // Centered Map/List toggle at top
  viewModeToggleContainer: {
    position: 'absolute',
    top: 16,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 30,
  },
  viewModeToggle: {
    flexDirection: 'row',
    backgroundColor: '#3a3a38',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4a4a48',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  viewModeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#3a3a38',
  },
  viewModeButtonActive: {
    backgroundColor: '#DE7356',
  },
  viewModeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#a3a3a3',
  },
  viewModeButtonTextActive: {
    color: '#faf9f5',
  },
  // Left side controls
  leftMapControls: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    gap: 8,
  },
  mapControlButton: {
    backgroundColor: '#3a3a38',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  // Right side controls
  rightMapControls: {
    position: 'absolute',
    bottom: 100,
    right: 16,
    alignItems: 'flex-end',
    gap: 8,
  },
  mapModeToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#3a3a38',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4a4a48',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  mapModeButton: {
    padding: 10,
    backgroundColor: '#3a3a38',
  },
  mapModeButtonActive: {
    backgroundColor: '#DE7356',
  },
  userSelectorContainer: {
    marginTop: 8,
    alignItems: 'center',
  },
  userSelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#3a3a38',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4a4a48',
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  userSelectorButtonText: {
    color: '#a3a3a3',
    fontSize: 13,
    fontWeight: '500',
  },
  userCountBadge: {
    backgroundColor: '#DE7356',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 2,
  },
  userCountText: {
    color: '#faf9f5',
    fontSize: 11,
    fontWeight: '600',
  },
  userSelectorDropdown: {
    marginTop: 8,
    width: 280,
    backgroundColor: '#3a3a38',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4a4a48',
    maxHeight: 300,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 10,
  },
  userSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#4a4a48',
    gap: 8,
  },
  userSearchInput: {
    flex: 1,
    color: '#faf9f5',
    fontSize: 14,
    padding: 0,
  },
  userDropdownList: {
    maxHeight: 200,
    padding: 8,
  },
  noUsersText: {
    color: '#737373',
    fontSize: 13,
    textAlign: 'center',
    paddingVertical: 16,
  },
  userDropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    gap: 10,
  },
  userCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#4a4a48',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userCheckboxSelected: {
    backgroundColor: '#DE7356',
    borderColor: '#DE7356',
  },
  userDropdownInfo: {
    flex: 1,
  },
  userDropdownName: {
    color: '#faf9f5',
    fontSize: 14,
    fontWeight: '500',
  },
  userDropdownUsername: {
    color: '#737373',
    fontSize: 12,
    marginTop: 1,
  },
  userDropdownFooter: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#4a4a48',
    backgroundColor: '#2a2a28',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  userDropdownFooterText: {
    color: '#737373',
    fontSize: 12,
  },
  loadingLayersOverlay: {
    position: 'absolute',
    top: 60,
    left: 16,
    backgroundColor: '#3a3a38',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingLayersText: {
    color: '#a3a3a3',
    fontSize: 12,
  },
  selectedPlaceCard: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3a3a38',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  placesList: {
    flex: 1,
  },
  placesListContent: {
    padding: 16,
    paddingBottom: 100,
  },
  listViewHeader: {
    alignItems: 'center',
    marginBottom: 12,
  },
  listViewModeToggle: {
    flexDirection: 'row',
    backgroundColor: '#3a3a38',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4a4a48',
    overflow: 'hidden',
  },
  listViewModeButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#3a3a38',
  },
  listViewModeButtonActive: {
    backgroundColor: '#DE7356',
  },
  listViewModeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#a3a3a3',
  },
  listViewModeButtonTextActive: {
    color: '#faf9f5',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#a3a3a3',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#737373',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  placeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3a3a38',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  placeIndicator: {
    width: 4,
    height: 44,
    borderRadius: 2,
    marginRight: 12,
  },
  placeInfo: {
    flex: 1,
  },
  placeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#faf9f5',
  },
  placeOwner: {
    fontSize: 12,
    color: '#DE7356',
    marginTop: 2,
  },
  placeAddress: {
    fontSize: 14,
    color: '#a3a3a3',
    marginTop: 2,
  },
  tagRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  // Animated Sidebar Styles
  sidebarOverlayContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  sidebarOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sidebarOverlayPressable: {
    flex: 1,
  },
  sidebar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: '#252523',
    borderRightWidth: 1,
    borderRightColor: '#3a3a38',
    zIndex: 1001,
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a38',
  },
  sidebarTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#faf9f5',
  },
  sidebarContent: {
    flex: 1,
  },
  sidebarSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a38',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#a3a3a3',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  clearButton: {
    color: '#DE7356',
    fontSize: 14,
  },
  filterModeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a38',
  },
  filterModeLabel: {
    fontSize: 12,
    color: '#737373',
  },
  filterModeToggle: {
    flexDirection: 'row',
    backgroundColor: '#252523',
    borderRadius: 8,
    padding: 2,
  },
  filterModeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  filterModeButtonActive: {
    backgroundColor: '#3a3a38',
  },
  filterModeButtonText: {
    fontSize: 12,
    color: '#737373',
  },
  filterModeButtonTextActive: {
    color: '#faf9f5',
  },
  emptyTagsText: {
    color: '#737373',
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  tagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  tagItemSelected: {
    backgroundColor: '#3a3a38',
  },
  tagDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  tagItemName: {
    flex: 1,
    fontSize: 16,
    color: '#faf9f5',
  },
  tagItemCount: {
    fontSize: 14,
    color: '#737373',
    marginRight: 8,
  },
});
