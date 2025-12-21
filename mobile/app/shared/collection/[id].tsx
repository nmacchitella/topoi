import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { shareApi } from '../../../src/lib/api';
import type { Place } from '../../../src/types';

export default function SharedCollectionScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [places, setPlaces] = useState<Place[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      loadSharedCollection();
    }
  }, [id]);

  const loadSharedCollection = async () => {
    if (!id) return;

    try {
      const data = await shareApi.getSharedList(id);
      setPlaces(data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load shared collection');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadSharedCollection();
    setIsRefreshing(false);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#DE7356" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color="#EF4444" />
        <Text style={styles.errorTitle}>Unable to Load Collection</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
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
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Ionicons name="folder" size={40} color="#DE7356" />
          </View>
          <Text style={styles.title}>Shared Collection</Text>
          <Text style={styles.subtitle}>
            {places.length} {places.length === 1 ? 'place' : 'places'}
          </Text>
        </View>

        {/* Places List */}
        <View style={styles.placesSection}>
          {places.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="location-outline" size={48} color="#737373" />
              <Text style={styles.emptyText}>No places in this collection</Text>
            </View>
          ) : (
            places.map((place) => (
              <Pressable
                key={place.id}
                style={styles.placeCard}
                onPress={() => router.push(`/shared/place/${place.id}`)}
              >
                <View style={styles.placeIcon}>
                  <Ionicons name="location" size={24} color="#DE7356" />
                </View>
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
                          style={[styles.tagChip, { backgroundColor: (tag.color || '#DE7356') + '33' }]}
                        >
                          <Text style={[styles.tagText, { color: tag.color || '#DE7356' }]}>
                            {tag.name}
                          </Text>
                        </View>
                      ))}
                      {place.tags.length > 3 && (
                        <Text style={styles.moreTags}>+{place.tags.length - 3}</Text>
                      )}
                    </View>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={20} color="#737373" />
              </Pressable>
            ))
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
  header: {
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a38',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#DE735633',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#faf9f5',
  },
  subtitle: {
    fontSize: 14,
    color: '#a3a3a3',
    marginTop: 4,
  },
  placesSection: {
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    color: '#737373',
    fontSize: 14,
    marginTop: 12,
  },
  placeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3a3a38',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  placeIcon: {
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
    fontSize: 13,
    color: '#a3a3a3',
    marginTop: 2,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  tagChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '600',
  },
  moreTags: {
    fontSize: 11,
    color: '#737373',
    alignSelf: 'center',
  },
});
