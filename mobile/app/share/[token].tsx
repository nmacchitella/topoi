import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { shareApi } from '../../src/lib/api';
import type { SharedMapData, Place } from '../../src/types';

const { width } = Dimensions.get('window');

export default function SharedMapScreen() {
  const router = useRouter();
  const { token } = useLocalSearchParams<{ token: string }>();

  const [mapData, setMapData] = useState<SharedMapData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);

  useEffect(() => {
    if (token) {
      loadSharedMap();
    }
  }, [token]);

  const loadSharedMap = async () => {
    if (!token) return;

    try {
      const data = await shareApi.getSharedMapByToken(token);
      setMapData(data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load shared map');
    } finally {
      setIsLoading(false);
    }
  };

  const getInitialRegion = () => {
    if (!mapData || mapData.places.length === 0) {
      return {
        latitude: 41.9028,
        longitude: 12.4964,
        latitudeDelta: 10,
        longitudeDelta: 10,
      };
    }

    const lats = mapData.places.map((p) => p.latitude);
    const lngs = mapData.places.map((p) => p.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: Math.max(0.05, (maxLat - minLat) * 1.5),
      longitudeDelta: Math.max(0.05, (maxLng - minLng) * 1.5),
    };
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#DE7356" />
      </View>
    );
  }

  if (error || !mapData) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color="#EF4444" />
        <Text style={styles.errorTitle}>Unable to Load Map</Text>
        <Text style={styles.errorText}>{error || 'This shared map is no longer available'}</Text>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* User Info Header */}
      <View style={styles.header}>
        <View style={styles.userAvatar}>
          <Text style={styles.userAvatarText}>
            {mapData.user.name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{mapData.user.name}'s Map</Text>
          <Text style={styles.placeCount}>
            {mapData.places.length} {mapData.places.length === 1 ? 'place' : 'places'}
          </Text>
        </View>
      </View>

      {/* Map */}
      <MapView
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={getInitialRegion()}
        showsUserLocation={false}
        showsCompass={true}
      >
        {mapData.places.map((place) => (
          <Marker
            key={place.id}
            coordinate={{
              latitude: place.latitude,
              longitude: place.longitude,
            }}
            onPress={() => setSelectedPlace(place)}
          />
        ))}
      </MapView>

      {/* Selected Place Card */}
      {selectedPlace && (
        <View style={styles.placeCard}>
          <Pressable
            style={styles.closeButton}
            onPress={() => setSelectedPlace(null)}
          >
            <Ionicons name="close" size={20} color="#a3a3a3" />
          </Pressable>
          <Text style={styles.placeName}>{selectedPlace.name}</Text>
          <Text style={styles.placeAddress}>{selectedPlace.address}</Text>
          {selectedPlace.notes && (
            <Text style={styles.placeNotes} numberOfLines={2}>
              {selectedPlace.notes}
            </Text>
          )}
          {selectedPlace.tags.length > 0 && (
            <View style={styles.tagRow}>
              {selectedPlace.tags.slice(0, 4).map((tag) => (
                <View
                  key={tag.id}
                  style={[styles.tagChip, { backgroundColor: (tag.color || '#DE7356') + '33' }]}
                >
                  <Text style={[styles.tagText, { color: tag.color || '#DE7356' }]}>
                    {tag.name}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
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
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#252523',
    padding: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#faf9f5',
    marginTop: 16,
  },
  errorText: {
    color: '#a3a3a3',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  backButton: {
    marginTop: 24,
    backgroundColor: '#DE7356',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#faf9f5',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#3a3a38',
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
    marginLeft: 12,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#faf9f5',
  },
  placeCount: {
    fontSize: 14,
    color: '#a3a3a3',
    marginTop: 2,
  },
  map: {
    flex: 1,
  },
  placeCard: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: '#3a3a38',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1,
  },
  placeName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#faf9f5',
    paddingRight: 30,
  },
  placeAddress: {
    fontSize: 14,
    color: '#a3a3a3',
    marginTop: 4,
  },
  placeNotes: {
    fontSize: 13,
    color: '#737373',
    marginTop: 8,
    fontStyle: 'italic',
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
  },
  tagChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
