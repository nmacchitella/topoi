import { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store/useStore';
import { listsApi } from '../lib/api';
import type { List, ListWithPlaceCount } from '../types';

interface CollectionInputProps {
  selectedCollectionIds: string[];
  onCollectionsChange: (collectionIds: string[]) => void;
}

export default function CollectionInput({ selectedCollectionIds, onCollectionsChange }: CollectionInputProps) {
  const { lists, addList, fetchLists } = useStore();
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Get selected collections
  const selectedCollections = lists.filter(list => selectedCollectionIds.includes(list.id));

  // Filter suggestions based on input
  const suggestions = lists.filter(list =>
    !selectedCollectionIds.includes(list.id) &&
    list.name.toLowerCase().includes(inputValue.toLowerCase())
  );

  const handleAddCollection = async (collectionName: string) => {
    const trimmedName = collectionName.trim();
    if (!trimmedName) return;

    // Check if collection already exists
    const existingCollection = lists.find(l => l.name.toLowerCase() === trimmedName.toLowerCase());

    if (existingCollection) {
      // Add existing collection
      if (!selectedCollectionIds.includes(existingCollection.id)) {
        onCollectionsChange([...selectedCollectionIds, existingCollection.id]);
      }
    } else {
      // Create new collection with default color
      setCreating(true);
      try {
        const newCollection = await listsApi.create({
          name: trimmedName,
          color: '#3B82F6', // Default blue
          is_public: false,
        });
        addList({ ...newCollection, place_count: 0 } as ListWithPlaceCount);
        onCollectionsChange([...selectedCollectionIds, newCollection.id]);
        await fetchLists();
      } catch (error) {
        console.error('Failed to create collection:', error);
      } finally {
        setCreating(false);
      }
    }

    setInputValue('');
    setShowSuggestions(false);
  };

  const handleRemoveCollection = (collectionId: string) => {
    onCollectionsChange(selectedCollectionIds.filter(id => id !== collectionId));
  };

  const handleSuggestionPress = (collection: List | ListWithPlaceCount) => {
    onCollectionsChange([...selectedCollectionIds, collection.id]);
    setInputValue('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Collections</Text>

      {/* Selected collections */}
      {selectedCollections.length > 0 && (
        <View style={styles.selectedCollections}>
          {selectedCollections.map((collection) => (
            <View
              key={collection.id}
              style={[styles.collectionChip, { backgroundColor: `${collection.color}20`, borderColor: `${collection.color}40` }]}
            >
              {collection.icon && <Text style={styles.collectionIcon}>{collection.icon}</Text>}
              <Text style={[styles.collectionChipText, { color: collection.color }]}>{collection.name}</Text>
              <Pressable onPress={() => handleRemoveCollection(collection.id)} hitSlop={8}>
                <Ionicons name="close" size={14} color={collection.color} />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      {/* Input field */}
      <View style={styles.inputContainer}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          value={inputValue}
          onChangeText={(text) => {
            setInputValue(text);
            setShowSuggestions(text.length > 0);
          }}
          onFocus={() => inputValue && setShowSuggestions(true)}
          onSubmitEditing={() => {
            if (inputValue.trim()) {
              handleAddCollection(inputValue);
            }
          }}
          placeholder="Type to search or create collections..."
          placeholderTextColor="#737373"
          returnKeyType="done"
          editable={!creating}
        />
        {creating && (
          <ActivityIndicator size="small" color="#DE7356" style={styles.loader} />
        )}
      </View>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestions}>
          <ScrollView style={styles.suggestionsList} keyboardShouldPersistTaps="handled">
            {suggestions.slice(0, 5).map((collection) => (
              <Pressable
                key={collection.id}
                style={styles.suggestionItem}
                onPress={() => handleSuggestionPress(collection)}
              >
                <View style={styles.suggestionLeft}>
                  {collection.icon && <Text style={styles.suggestionIcon}>{collection.icon}</Text>}
                  <Text style={[styles.suggestionText, { color: collection.color }]}>{collection.name}</Text>
                </View>
                <Text style={styles.placeCount}>
                  {(collection as ListWithPlaceCount).place_count || 0} places
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Create new collection hint */}
      {showSuggestions && inputValue.trim() && suggestions.length === 0 && (
        <View style={styles.createHint}>
          <Text style={styles.createHintText}>
            Press return to create "{inputValue.trim()}"
          </Text>
        </View>
      )}

      <Text style={styles.helperText}>
        Type to search existing collections or create new ones
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#a3a3a3',
    marginBottom: 8,
  },
  selectedCollections: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  collectionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  collectionIcon: {
    fontSize: 14,
  },
  collectionChipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  inputContainer: {
    position: 'relative',
  },
  input: {
    backgroundColor: '#3a3a38',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#faf9f5',
  },
  loader: {
    position: 'absolute',
    right: 16,
    top: 18,
  },
  suggestions: {
    backgroundColor: '#3a3a38',
    borderRadius: 12,
    marginTop: 8,
    overflow: 'hidden',
    maxHeight: 200,
  },
  suggestionsList: {
    maxHeight: 200,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#4a4a48',
  },
  suggestionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  suggestionIcon: {
    fontSize: 16,
  },
  suggestionText: {
    fontSize: 15,
  },
  placeCount: {
    fontSize: 12,
    color: '#737373',
  },
  createHint: {
    backgroundColor: '#3a3a38',
    borderRadius: 12,
    marginTop: 8,
    padding: 12,
  },
  createHintText: {
    fontSize: 14,
    color: '#737373',
  },
  helperText: {
    fontSize: 12,
    color: '#737373',
    marginTop: 8,
  },
});
