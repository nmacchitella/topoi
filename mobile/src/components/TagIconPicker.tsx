import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TAG_COLORS, MATERIAL_ICONS, PRESET_TAG_ICONS } from '../lib/tagColors';

interface TagIconPickerProps {
  selectedColor: string;
  selectedIcon: string | null;
  onColorChange: (color: string) => void;
  onIconChange: (icon: string | null) => void;
}

export default function TagIconPicker({
  selectedColor,
  selectedIcon,
  onColorChange,
  onIconChange,
}: TagIconPickerProps) {
  const [iconModalVisible, setIconModalVisible] = useState(false);
  const [iconSearch, setIconSearch] = useState('');

  // Filter icons based on search
  const filteredIcons = useMemo(() => {
    if (!iconSearch.trim()) {
      return PRESET_TAG_ICONS;
    }

    const query = iconSearch.toLowerCase().trim();
    return MATERIAL_ICONS.filter((iconDef) => {
      // Match against icon name
      if (iconDef.name.toLowerCase().includes(query)) {
        return true;
      }
      // Match against keywords
      return iconDef.keywords.some((keyword) =>
        keyword.toLowerCase().includes(query)
      );
    }).map((iconDef) => iconDef.name);
  }, [iconSearch]);

  return (
    <View style={styles.container}>
      {/* Color Picker */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Color</Text>
        <View style={styles.colorGrid}>
          {TAG_COLORS.map((color) => (
            <Pressable
              key={color}
              style={[
                styles.colorSwatch,
                { backgroundColor: color },
                selectedColor === color && styles.colorSwatchSelected,
              ]}
              onPress={() => onColorChange(color)}
            >
              {selectedColor === color && (
                <Ionicons name="checkmark" size={16} color="#fff" />
              )}
            </Pressable>
          ))}
        </View>
      </View>

      {/* Icon Picker */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Icon</Text>
        <Pressable
          style={styles.iconButton}
          onPress={() => setIconModalVisible(true)}
        >
          {selectedIcon ? (
            <View style={[styles.selectedIconPreview, { backgroundColor: selectedColor + '33' }]}>
              <Text style={[styles.materialIcon, { color: selectedColor }]}>
                {selectedIcon}
              </Text>
            </View>
          ) : (
            <View style={styles.noIconPreview}>
              <Ionicons name="add" size={24} color="#737373" />
            </View>
          )}
          <Text style={styles.iconButtonText}>
            {selectedIcon ? 'Change Icon' : 'Add Icon'}
          </Text>
          <Ionicons name="chevron-forward" size={20} color="#737373" />
        </Pressable>
      </View>

      {/* Icon Selection Modal */}
      <Modal
        visible={iconModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIconModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Pressable onPress={() => setIconModalVisible(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Text style={styles.modalTitle}>Choose Icon</Text>
            <Pressable
              onPress={() => {
                onIconChange(null);
                setIconModalVisible(false);
              }}
            >
              <Text style={styles.clearText}>Clear</Text>
            </Pressable>
          </View>

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#737373" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search icons..."
              placeholderTextColor="#737373"
              value={iconSearch}
              onChangeText={setIconSearch}
              autoCapitalize="none"
            />
            {iconSearch.length > 0 && (
              <Pressable onPress={() => setIconSearch('')}>
                <Ionicons name="close-circle" size={20} color="#737373" />
              </Pressable>
            )}
          </View>

          <ScrollView style={styles.iconGrid} contentContainerStyle={styles.iconGridContent}>
            {filteredIcons.length === 0 ? (
              <View style={styles.noResults}>
                <Ionicons name="search-outline" size={48} color="#737373" />
                <Text style={styles.noResultsText}>No icons found</Text>
              </View>
            ) : (
              <View style={styles.iconsRow}>
                {filteredIcons.map((iconName) => (
                  <Pressable
                    key={iconName}
                    style={[
                      styles.iconItem,
                      selectedIcon === iconName && styles.iconItemSelected,
                    ]}
                    onPress={() => {
                      onIconChange(iconName);
                      setIconModalVisible(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.materialIconLarge,
                        { color: selectedIcon === iconName ? selectedColor : '#faf9f5' },
                      ]}
                    >
                      {iconName}
                    </Text>
                    <Text style={styles.iconLabel} numberOfLines={1}>
                      {iconName.replace(/_/g, ' ')}
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 20,
  },
  section: {
    gap: 12,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#a3a3a3',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  colorSwatch: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  colorSwatchSelected: {
    borderWidth: 2,
    borderColor: '#faf9f5',
  },
  iconButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3a3a38',
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  selectedIconPreview: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noIconPreview: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#4a4a48',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#5a5a58',
    borderStyle: 'dashed',
  },
  materialIcon: {
    fontSize: 24,
    fontFamily: 'System',
  },
  iconButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#faf9f5',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#252523',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a38',
  },
  cancelText: {
    color: '#a3a3a3',
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#faf9f5',
  },
  clearText: {
    color: '#DE7356',
    fontSize: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3a3a38',
    margin: 16,
    borderRadius: 12,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: '#faf9f5',
  },
  iconGrid: {
    flex: 1,
  },
  iconGridContent: {
    padding: 16,
  },
  iconsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  iconItem: {
    width: '22%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3a3a38',
    borderRadius: 12,
    padding: 8,
  },
  iconItemSelected: {
    borderWidth: 2,
    borderColor: '#DE7356',
  },
  materialIconLarge: {
    fontSize: 28,
    fontFamily: 'System',
  },
  iconLabel: {
    fontSize: 9,
    color: '#737373',
    marginTop: 4,
    textAlign: 'center',
  },
  noResults: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  noResultsText: {
    color: '#737373',
    fontSize: 14,
    marginTop: 12,
  },
});
