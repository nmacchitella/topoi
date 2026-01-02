import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { placesApi, searchApi, GooglePlaceResult } from '../../src/lib/api';
import { useStore } from '../../src/store/useStore';
import type { PlaceCreate } from '../../src/types';
import TagInput from '../../src/components/TagInput';
import CollectionInput from '../../src/components/CollectionInput';

export default function NewPlaceScreen() {
  const router = useRouter();
  const { edit, lat, lng, name, address } = useLocalSearchParams<{
    edit?: string;
    lat?: string;
    lng?: string;
    name?: string;
    address?: string;
  }>();
  const { addPlace, updatePlace, places, fetchLists, fetchTags } = useStore();

  const [isLoading, setIsLoading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<GooglePlaceResult[]>([]);
  const [showResults, setShowResults] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    latitude: 0,
    longitude: 0,
    notes: '',
    phone: '',
    website: '',
    hours: '',
    is_public: true,
  });

  // Tag and collection selection state
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [selectedCollectionIds, setSelectedCollectionIds] = useState<string[]>([]);

  // Load lists and tags on mount
  useEffect(() => {
    fetchLists();
    fetchTags();
  }, []);

  // Load place data if editing or pre-filled from search
  useEffect(() => {
    if (edit) {
      const existingPlace = places.find(p => p.id === edit);
      if (existingPlace) {
        setFormData({
          name: existingPlace.name,
          address: existingPlace.address,
          latitude: existingPlace.latitude,
          longitude: existingPlace.longitude,
          notes: existingPlace.notes || '',
          phone: existingPlace.phone || '',
          website: existingPlace.website || '',
          hours: existingPlace.hours || '',
          is_public: existingPlace.is_public,
        });
        // Load existing tags and collections
        setSelectedTagIds(existingPlace.tags.map(t => t.id));
        setSelectedCollectionIds(existingPlace.lists.map(l => l.id));
      }
    } else if (lat && lng) {
      // Pre-filled from Google Places search or long press on map
      setFormData(prev => ({
        ...prev,
        name: name || '',
        address: address || '',
        latitude: parseFloat(lat),
        longitude: parseFloat(lng),
      }));
    } else if (name) {
      // Just a name was provided (from "Create" option in search)
      setFormData(prev => ({
        ...prev,
        name: name,
      }));
    }
  }, [edit, lat, lng, name, address]);

  const handleSearch = async (query: string) => {
    setFormData(prev => ({ ...prev, name: query }));

    if (query.length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    try {
      // Get current location for better search results
      let lat: number | undefined;
      let lng: number | undefined;

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          lat = location.coords.latitude;
          lng = location.coords.longitude;
        }
      } catch (e) {
        // Ignore location errors
      }

      const results = await searchApi.googlePlaces(query, lat, lng);
      setSearchResults(results);
      setShowResults(true);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const selectSearchResult = async (result: GooglePlaceResult) => {
    setShowResults(false);
    setIsSearching(true);

    try {
      const details = await searchApi.googlePlaceDetails(result.place_id);
      if (details) {
        setFormData(prev => ({
          ...prev,
          name: details.name || result.main_text,
          address: details.address,
          latitude: details.lat,
          longitude: details.lng,
          website: prev.website || details.website || '',
          phone: prev.phone || details.phone || '',
          hours: prev.hours || details.hours || '',
        }));
      }
    } catch (error) {
      console.error('Failed to get place details:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter a name');
      return;
    }

    if (!formData.address.trim()) {
      Alert.alert('Error', 'Please enter an address');
      return;
    }

    if (formData.latitude === 0 && formData.longitude === 0) {
      Alert.alert('Error', 'Please select a location from the search results');
      return;
    }

    setIsLoading(true);

    try {
      const placeData: PlaceCreate = {
        name: formData.name.trim(),
        address: formData.address.trim(),
        latitude: formData.latitude,
        longitude: formData.longitude,
        notes: formData.notes.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        website: formData.website.trim() || undefined,
        hours: formData.hours.trim() || undefined,
        is_public: formData.is_public,
        tag_ids: selectedTagIds.length > 0 ? selectedTagIds : undefined,
        list_ids: selectedCollectionIds.length > 0 ? selectedCollectionIds : undefined,
      };

      if (edit) {
        const updated = await placesApi.update(edit, placeData);
        updatePlace(updated);
      } else {
        const created = await placesApi.create(placeData);
        addPlace(created);
      }

      router.back();
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.response?.data?.detail || 'Failed to save place'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Name Input with Search */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Name *</Text>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.input}
              value={formData.name}
              onChangeText={handleSearch}
              placeholder="Search for a place..."
              placeholderTextColor="#737373"
            />
            {isSearching && (
              <ActivityIndicator size="small" color="#DE7356" style={styles.searchLoader} />
            )}
          </View>
          {showResults && searchResults.length > 0 && (
            <View style={styles.searchResults}>
              {searchResults.map((result) => (
                <Pressable
                  key={result.place_id}
                  style={styles.searchResult}
                  onPress={() => selectSearchResult(result)}
                >
                  <Ionicons name="location" size={20} color="#DE7356" />
                  <View style={styles.searchResultText}>
                    <Text style={styles.searchResultMain}>{result.main_text}</Text>
                    <Text style={styles.searchResultSecondary} numberOfLines={1}>
                      {result.secondary_text}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Address */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Address *</Text>
          <TextInput
            style={styles.input}
            value={formData.address}
            onChangeText={(text) => setFormData(prev => ({ ...prev, address: text }))}
            placeholder="Address"
            placeholderTextColor="#737373"
          />
        </View>

        {/* Notes */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={formData.notes}
            onChangeText={(text) => setFormData(prev => ({ ...prev, notes: text }))}
            placeholder="Add notes..."
            placeholderTextColor="#737373"
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Phone */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Phone</Text>
          <TextInput
            style={styles.input}
            value={formData.phone}
            onChangeText={(text) => setFormData(prev => ({ ...prev, phone: text }))}
            placeholder="Phone number"
            placeholderTextColor="#737373"
            keyboardType="phone-pad"
          />
        </View>

        {/* Website */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Website</Text>
          <TextInput
            style={styles.input}
            value={formData.website}
            onChangeText={(text) => setFormData(prev => ({ ...prev, website: text }))}
            placeholder="https://"
            placeholderTextColor="#737373"
            keyboardType="url"
            autoCapitalize="none"
          />
        </View>

        {/* Hours */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Hours</Text>
          <TextInput
            style={styles.input}
            value={formData.hours}
            onChangeText={(text) => setFormData(prev => ({ ...prev, hours: text }))}
            placeholder="e.g., Mon-Fri 9am-5pm"
            placeholderTextColor="#737373"
          />
        </View>

        {/* Collections */}
        <CollectionInput
          selectedCollectionIds={selectedCollectionIds}
          onCollectionsChange={setSelectedCollectionIds}
        />

        {/* Tags */}
        <TagInput
          selectedTagIds={selectedTagIds}
          onTagsChange={setSelectedTagIds}
        />

        {/* Public Toggle */}
        <Pressable
          style={styles.toggleRow}
          onPress={() => setFormData(prev => ({ ...prev, is_public: !prev.is_public }))}
        >
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleLabel}>Make Public</Text>
            <Text style={styles.toggleDescription}>
              Allow others to discover this place
            </Text>
          </View>
          <View
            style={[
              styles.toggle,
              formData.is_public && styles.toggleActive,
            ]}
          >
            <View
              style={[
                styles.toggleCircle,
                formData.is_public && styles.toggleCircleActive,
              ]}
            />
          </View>
        </Pressable>

        {/* Submit Button */}
        <Pressable
          style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#faf9f5" />
          ) : (
            <Text style={styles.submitButtonText}>
              {edit ? 'Save Changes' : 'Add Place'}
            </Text>
          )}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
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
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#a3a3a3',
    marginBottom: 8,
  },
  searchContainer: {
    position: 'relative',
  },
  input: {
    backgroundColor: '#3a3a38',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#faf9f5',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  searchLoader: {
    position: 'absolute',
    right: 16,
    top: 18,
  },
  searchResults: {
    backgroundColor: '#3a3a38',
    borderRadius: 12,
    marginTop: 8,
    overflow: 'hidden',
  },
  searchResult: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#4a4a48',
  },
  searchResultText: {
    flex: 1,
    marginLeft: 12,
  },
  searchResultMain: {
    fontSize: 16,
    color: '#faf9f5',
  },
  searchResultSecondary: {
    fontSize: 14,
    color: '#737373',
    marginTop: 2,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#3a3a38',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  toggleInfo: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 16,
    color: '#faf9f5',
    fontWeight: '500',
  },
  toggleDescription: {
    fontSize: 14,
    color: '#737373',
    marginTop: 2,
  },
  toggle: {
    width: 52,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4a4a48',
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: '#DE7356',
  },
  toggleCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#737373',
  },
  toggleCircleActive: {
    backgroundColor: '#faf9f5',
    alignSelf: 'flex-end',
  },
  submitButton: {
    backgroundColor: '#DE7356',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#faf9f5',
  },
});
