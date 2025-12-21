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
import { tagsApi } from '../../src/lib/api';
import type { Tag, Place } from '../../src/types';

export default function TagDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [tag, setTag] = useState<Tag | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      loadTag();
    }
  }, [id]);

  const loadTag = async () => {
    if (!id) return;

    try {
      const [tagData, placesData] = await Promise.all([
        tagsApi.getById(id),
        tagsApi.getPlaces(id),
      ]);
      setTag(tagData);
      setPlaces(placesData);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load tag');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadTag();
    setIsRefreshing(false);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#DE7356" />
      </View>
    );
  }

  if (error || !tag) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color="#EF4444" />
        <Text style={styles.errorText}>{error || 'Tag not found'}</Text>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const tagColor = tag.color || '#DE7356';

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
          <View style={[styles.iconContainer, { backgroundColor: tagColor + '33' }]}>
            {tag.icon ? (
              <Text style={[styles.materialIcon, { color: tagColor }]}>{tag.icon}</Text>
            ) : (
              <Ionicons name="pricetag" size={36} color={tagColor} />
            )}
          </View>
          <Text style={styles.title}>{tag.name}</Text>
          <Text style={styles.subtitle}>
            {places.length} {places.length === 1 ? 'place' : 'places'}
          </Text>
        </View>

        {/* Places List */}
        <View style={styles.placesSection}>
          <Text style={styles.sectionTitle}>Tagged Places</Text>
          {places.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="location-outline" size={48} color="#737373" />
              <Text style={styles.emptyText}>No places with this tag</Text>
            </View>
          ) : (
            places.map((place) => (
              <Pressable
                key={place.id}
                style={styles.placeCard}
                onPress={() => router.push(`/place/${place.id}`)}
              >
                <View style={styles.placeIcon}>
                  <Ionicons name="location" size={24} color="#DE7356" />
                </View>
                <View style={styles.placeInfo}>
                  <Text style={styles.placeName}>{place.name}</Text>
                  <Text style={styles.placeAddress} numberOfLines={1}>
                    {place.address}
                  </Text>
                  {place.lists.length > 0 && (
                    <View style={styles.collectionRow}>
                      <Ionicons name="folder-outline" size={12} color="#737373" />
                      <Text style={styles.collectionText}>
                        {place.lists.map((l) => l.name).join(', ')}
                      </Text>
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
  errorText: {
    color: '#EF4444',
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  backButton: {
    marginTop: 24,
    backgroundColor: '#3a3a38',
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
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  materialIcon: {
    fontSize: 36,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#faf9f5',
    marginBottom: 16,
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
  collectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  collectionText: {
    fontSize: 12,
    color: '#737373',
  },
});
