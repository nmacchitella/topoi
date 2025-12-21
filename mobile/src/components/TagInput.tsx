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
import { tagsApi } from '../lib/api';
import { getRandomTagColor, DEFAULT_TAG_COLOR } from '../lib/tagColors';
import type { Tag, TagWithUsage } from '../types';
import TagIcon from './TagIcon';

interface TagInputProps {
  selectedTagIds: string[];
  onTagsChange: (tagIds: string[]) => void;
}

export default function TagInput({ selectedTagIds, onTagsChange }: TagInputProps) {
  const { tags, addTag, fetchTags } = useStore();
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [creating, setCreating] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Get selected tags
  const selectedTags = tags.filter(tag => selectedTagIds.includes(tag.id));

  // Filter suggestions based on input
  const suggestions = tags.filter(tag =>
    !selectedTagIds.includes(tag.id) &&
    tag.name.toLowerCase().includes(inputValue.toLowerCase())
  );

  const handleAddTag = async (tagName: string) => {
    const trimmedName = tagName.trim();
    if (!trimmedName) return;

    // Check if tag already exists
    const existingTag = tags.find(t => t.name.toLowerCase() === trimmedName.toLowerCase());

    if (existingTag) {
      // Add existing tag
      if (!selectedTagIds.includes(existingTag.id)) {
        onTagsChange([...selectedTagIds, existingTag.id]);
      }
    } else {
      // Create new tag with random color
      setCreating(true);
      try {
        const randomColor = getRandomTagColor();
        const newTag = await tagsApi.create(trimmedName, randomColor);
        addTag({ ...newTag, usage_count: 0 } as TagWithUsage);
        onTagsChange([...selectedTagIds, newTag.id]);
        await fetchTags();
      } catch (error) {
        console.error('Failed to create tag:', error);
      } finally {
        setCreating(false);
      }
    }

    setInputValue('');
    setShowSuggestions(false);
  };

  const handleRemoveTag = (tagId: string) => {
    onTagsChange(selectedTagIds.filter(id => id !== tagId));
  };

  const handleSuggestionPress = (tag: Tag | TagWithUsage) => {
    onTagsChange([...selectedTagIds, tag.id]);
    setInputValue('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Tags</Text>

      {/* Selected tags */}
      {selectedTags.length > 0 && (
        <View style={styles.selectedTags}>
          {selectedTags.map((tag) => {
            const tagColor = tag.color || DEFAULT_TAG_COLOR;
            return (
              <View
                key={tag.id}
                style={[styles.tagChip, { backgroundColor: `${tagColor}40`, borderColor: `${tagColor}60` }]}
              >
                {tag.icon && <TagIcon icon={tag.icon} size="xs" color={tagColor} />}
                <Text style={[styles.tagChipText, { color: tagColor }]}>{tag.name}</Text>
                <Pressable onPress={() => handleRemoveTag(tag.id)} hitSlop={8}>
                  <Ionicons name="close" size={14} color={tagColor} />
                </Pressable>
              </View>
            );
          })}
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
              handleAddTag(inputValue);
            }
          }}
          placeholder="Type to search or create tags..."
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
            {suggestions.slice(0, 5).map((tag) => {
              const tagColor = tag.color || DEFAULT_TAG_COLOR;
              return (
                <Pressable
                  key={tag.id}
                  style={styles.suggestionItem}
                  onPress={() => handleSuggestionPress(tag)}
                >
                  <View style={[styles.tagDot, { backgroundColor: tagColor }]} />
                  {tag.icon && <TagIcon icon={tag.icon} size="sm" color={tagColor} />}
                  <Text style={styles.suggestionText}>{tag.name}</Text>
                  <Text style={styles.usageCount}>
                    {(tag as TagWithUsage).usage_count || 0} uses
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Create new tag hint */}
      {showSuggestions && inputValue.trim() && suggestions.length === 0 && (
        <View style={styles.createHint}>
          <Text style={styles.createHintText}>
            Press return to create "{inputValue.trim()}"
          </Text>
        </View>
      )}

      <Text style={styles.helperText}>
        Type to search existing tags or create new ones
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
  selectedTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  tagChipText: {
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
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#4a4a48',
    gap: 10,
  },
  tagDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  suggestionText: {
    flex: 1,
    fontSize: 15,
    color: '#faf9f5',
  },
  usageCount: {
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
