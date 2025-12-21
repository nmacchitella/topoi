import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Linking,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { shareApi } from '../../../src/lib/api';
import type { Place } from '../../../src/types';

const { width } = Dimensions.get('window');

export default function SharedPlaceScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [place, setPlace] = useState<Place | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      loadSharedPlace();
    }
  }, [id]);

  const loadSharedPlace = async () => {
    if (!id) return;

    try {
      const data = await shareApi.getSharedPlace(id);
      setPlace(data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load shared place');
    } finally {
      setIsLoading(false);
    }
  };

  const openInMaps = () => {
    if (!place) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`;
    Linking.openURL(url);
  };

  const callPhone = () => {
    if (!place?.phone) return;
    Linking.openURL(`tel:${place.phone}`);
  };

  const openWebsite = () => {
    if (!place?.website) return;
    Linking.openURL(place.website);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#DE7356" />
      </View>
    );
  }

  if (error || !place) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color="#EF4444" />
        <Text style={styles.errorTitle}>Unable to Load Place</Text>
        <Text style={styles.errorText}>{error || 'This shared place is no longer available'}</Text>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Map Preview */}
        <View style={styles.mapContainer}>
          <MapView
            style={styles.map}
            provider={PROVIDER_DEFAULT}
            initialRegion={{
              latitude: place.latitude,
              longitude: place.longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
            scrollEnabled={false}
            zoomEnabled={false}
          >
            <Marker
              coordinate={{
                latitude: place.latitude,
                longitude: place.longitude,
              }}
            />
          </MapView>
          <Pressable style={styles.openMapButton} onPress={openInMaps}>
            <Ionicons name="navigate" size={18} color="#faf9f5" />
            <Text style={styles.openMapText}>Open in Maps</Text>
          </Pressable>
        </View>

        {/* Place Info */}
        <View style={styles.infoSection}>
          <Text style={styles.placeName}>{place.name}</Text>
          <Text style={styles.placeAddress}>{place.address}</Text>

          {/* Tags */}
          {place.tags.length > 0 && (
            <View style={styles.tagRow}>
              {place.tags.map((tag) => (
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

          {/* Notes */}
          {place.notes && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Notes</Text>
              <Text style={styles.notes}>{place.notes}</Text>
            </View>
          )}

          {/* Contact Info */}
          {(place.phone || place.website || place.hours) && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Details</Text>

              {place.phone && (
                <Pressable style={styles.detailRow} onPress={callPhone}>
                  <Ionicons name="call-outline" size={20} color="#DE7356" />
                  <Text style={styles.detailText}>{place.phone}</Text>
                </Pressable>
              )}

              {place.website && (
                <Pressable style={styles.detailRow} onPress={openWebsite}>
                  <Ionicons name="globe-outline" size={20} color="#DE7356" />
                  <Text style={styles.detailText} numberOfLines={1}>
                    {place.website}
                  </Text>
                </Pressable>
              )}

              {place.hours && (
                <View style={styles.detailRow}>
                  <Ionicons name="time-outline" size={20} color="#a3a3a3" />
                  <Text style={styles.detailText}>{place.hours}</Text>
                </View>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  mapContainer: {
    height: 200,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  openMapButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DE7356',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  openMapText: {
    color: '#faf9f5',
    fontSize: 14,
    fontWeight: '600',
  },
  infoSection: {
    padding: 20,
  },
  placeName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#faf9f5',
  },
  placeAddress: {
    fontSize: 15,
    color: '#a3a3a3',
    marginTop: 6,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
  },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '600',
  },
  section: {
    marginTop: 24,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#737373',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  notes: {
    fontSize: 15,
    color: '#a3a3a3',
    lineHeight: 22,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a38',
  },
  detailText: {
    fontSize: 15,
    color: '#faf9f5',
    flex: 1,
  },
});
