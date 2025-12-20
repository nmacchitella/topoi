import { useEffect, useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  Pressable,
  ScrollView,
  RefreshControl,
} from 'react-native';
import * as Location from 'expo-location';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../../src/store/useStore';
import { authApi } from '../../src/lib/api';
import type { Place } from '../../src/types';
import { DEFAULT_TAG_COLOR } from '../../src/lib/tagColors';

// Check if running in Expo Go (maps won't work there)
const isExpoGo = Constants.appOwnership === 'expo';

function MapScreen() {
  const router = useRouter();
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    user,
    setUser,
    fetchPlaces,
    fetchLists,
    fetchTags,
    getFilteredPlaces,
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
      ]);
    } catch (error) {
      console.error('Failed to initialize:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    initData();
  }, []);

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

  const handlePlacePress = useCallback((place: Place) => {
    router.push(`/place/${place.id}`);
  }, [router]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    initData();
  };

  const filteredPlaces = getFilteredPlaces();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#DE7356" />
        <Text style={styles.loadingText}>Loading your places...</Text>
      </View>
    );
  }

  // List view (works in Expo Go and as fallback)
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="map-outline" size={28} color="#DE7356" />
        <Text style={styles.headerTitle}>Your Places</Text>
        <Text style={styles.placeCount}>
          {filteredPlaces.length} {filteredPlaces.length === 1 ? 'place' : 'places'}
        </Text>
      </View>

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
        {filteredPlaces.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="location-outline" size={64} color="#737373" />
            <Text style={styles.emptyText}>No places yet</Text>
            <Text style={styles.emptySubtext}>
              Tap the + button to add your first place
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
                  <Text style={styles.placeAddress} numberOfLines={1}>
                    {place.address}
                  </Text>
                  {place.tags.length > 0 && (
                    <View style={styles.tagRow}>
                      {place.tags.slice(0, 3).map((tag) => (
                        <View
                          key={tag.id}
                          style={[styles.tag, { backgroundColor: (tag.color || DEFAULT_TAG_COLOR) + '33' }]}
                        >
                          <Text style={[styles.tagText, { color: tag.color || DEFAULT_TAG_COLOR }]}>
                            {tag.name}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={20} color="#737373" />
              </Pressable>
            );
          })
        )}
      </ScrollView>

      {/* Add Place Button */}
      <Pressable
        style={styles.addButton}
        onPress={() => router.push('/place/new')}
      >
        <Ionicons name="add" size={28} color="#faf9f5" />
      </Pressable>
    </View>
  );
}

export default MapScreen;

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
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a38',
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#faf9f5',
    flex: 1,
  },
  placeCount: {
    fontSize: 14,
    color: '#737373',
  },
  addButton: {
    position: 'absolute',
    bottom: 100,
    right: 16,
    backgroundColor: '#DE7356',
    borderRadius: 28,
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
