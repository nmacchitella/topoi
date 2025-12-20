import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable,
  Linking,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { placesApi } from '../../src/lib/api';
import { useStore } from '../../src/store/useStore';
import type { Place } from '../../src/types';
import { DEFAULT_TAG_COLOR } from '../../src/lib/tagColors';

export default function PlaceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [place, setPlace] = useState<Place | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  const { deletePlace, user } = useStore();

  useEffect(() => {
    const fetchPlace = async () => {
      if (!id) return;

      try {
        const data = await placesApi.getById(id);
        setPlace(data);
      } catch (error) {
        console.error('Failed to fetch place:', error);
        Alert.alert('Error', 'Failed to load place details');
        router.back();
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlace();
  }, [id]);

  const handleOpenInMaps = () => {
    if (!place) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`;
    Linking.openURL(url);
  };

  const handleCall = () => {
    if (!place?.phone) return;
    Linking.openURL(`tel:${place.phone}`);
  };

  const handleWebsite = () => {
    if (!place?.website) return;
    Linking.openURL(place.website);
  };

  const handleDelete = () => {
    if (!place) return;

    Alert.alert(
      'Delete Place',
      `Are you sure you want to delete "${place.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await placesApi.delete(place.id);
              deletePlace(place.id);
              router.back();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete place');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#DE7356" />
      </View>
    );
  }

  if (!place) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color="#737373" />
        <Text style={styles.errorText}>Place not found</Text>
      </View>
    );
  }

  const isOwner = user?.id === place.user_id;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.name}>{place.name}</Text>
        {place.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {place.tags.map((tag) => (
              <View
                key={tag.id}
                style={[
                  styles.tag,
                  { backgroundColor: (tag.color || DEFAULT_TAG_COLOR) + '33' },
                ]}
              >
                <Text style={[styles.tagText, { color: tag.color || DEFAULT_TAG_COLOR }]}>
                  {tag.name}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Address */}
      <Pressable style={styles.section} onPress={handleOpenInMaps}>
        <Ionicons name="location-outline" size={24} color="#DE7356" />
        <View style={styles.sectionContent}>
          <Text style={styles.sectionLabel}>Address</Text>
          <Text style={styles.sectionText}>{place.address}</Text>
          <Text style={styles.linkText}>Open in Google Maps</Text>
        </View>
      </Pressable>

      {/* Notes */}
      {place.notes && (
        <View style={styles.section}>
          <Ionicons name="document-text-outline" size={24} color="#a3a3a3" />
          <View style={styles.sectionContent}>
            <Text style={styles.sectionLabel}>Notes</Text>
            <Text style={styles.sectionText}>{place.notes}</Text>
          </View>
        </View>
      )}

      {/* Phone */}
      {place.phone && (
        <Pressable style={styles.section} onPress={handleCall}>
          <Ionicons name="call-outline" size={24} color="#22C55E" />
          <View style={styles.sectionContent}>
            <Text style={styles.sectionLabel}>Phone</Text>
            <Text style={styles.linkText}>{place.phone}</Text>
          </View>
        </Pressable>
      )}

      {/* Website */}
      {place.website && (
        <Pressable style={styles.section} onPress={handleWebsite}>
          <Ionicons name="globe-outline" size={24} color="#3B82F6" />
          <View style={styles.sectionContent}>
            <Text style={styles.sectionLabel}>Website</Text>
            <Text style={styles.linkText} numberOfLines={1}>
              {place.website}
            </Text>
          </View>
        </Pressable>
      )}

      {/* Hours */}
      {place.hours && (
        <View style={styles.section}>
          <Ionicons name="time-outline" size={24} color="#a3a3a3" />
          <View style={styles.sectionContent}>
            <Text style={styles.sectionLabel}>Hours</Text>
            <Text style={styles.sectionText}>{place.hours}</Text>
          </View>
        </View>
      )}

      {/* Collections */}
      {place.lists.length > 0 && (
        <View style={styles.section}>
          <Ionicons name="folder-outline" size={24} color="#a3a3a3" />
          <View style={styles.sectionContent}>
            <Text style={styles.sectionLabel}>Collections</Text>
            <View style={styles.collectionsContainer}>
              {place.lists.map((list) => (
                <View
                  key={list.id}
                  style={[styles.collection, { backgroundColor: list.color + '33' }]}
                >
                  <Text style={[styles.collectionText, { color: list.color }]}>
                    {list.name}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      )}

      {/* Metadata */}
      <View style={styles.metadata}>
        <Text style={styles.metadataText}>
          Added {new Date(place.created_at).toLocaleDateString()}
        </Text>
        {place.updated_at !== place.created_at && (
          <Text style={styles.metadataText}>
            Updated {new Date(place.updated_at).toLocaleDateString()}
          </Text>
        )}
      </View>

      {/* Actions */}
      {isOwner && (
        <View style={styles.actions}>
          <Pressable
            style={styles.editButton}
            onPress={() => router.push(`/place/new?edit=${place.id}`)}
          >
            <Ionicons name="pencil" size={20} color="#faf9f5" />
            <Text style={styles.editButtonText}>Edit</Text>
          </Pressable>
          <Pressable
            style={[styles.deleteButton, isDeleting && styles.buttonDisabled]}
            onPress={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color="#EF4444" />
            ) : (
              <>
                <Ionicons name="trash" size={20} color="#EF4444" />
                <Text style={styles.deleteButtonText}>Delete</Text>
              </>
            )}
          </Pressable>
        </View>
      )}
    </ScrollView>
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
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a38',
  },
  name: {
    fontSize: 28,
    fontWeight: '700',
    color: '#faf9f5',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  tag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a38',
  },
  sectionContent: {
    flex: 1,
    marginLeft: 16,
  },
  sectionLabel: {
    fontSize: 12,
    color: '#737373',
    marginBottom: 4,
  },
  sectionText: {
    fontSize: 16,
    color: '#faf9f5',
    lineHeight: 24,
  },
  linkText: {
    fontSize: 16,
    color: '#3B82F6',
  },
  collectionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  collection: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  collectionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  metadata: {
    padding: 16,
    gap: 4,
  },
  metadataText: {
    fontSize: 12,
    color: '#737373',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    paddingTop: 8,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3a3a38',
    borderRadius: 12,
    padding: 16,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#faf9f5',
  },
  deleteButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EF444420',
    borderRadius: 12,
    padding: 16,
  },
  deleteButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
