import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { dataApi } from '../src/lib/api';
import { useStore } from '../src/store/useStore';
import type { ImportPlacePreview, ImportPreviewResponse } from '../src/types';

export default function ImportPreviewScreen() {
  const router = useRouter();
  const { fetchPlaces, fetchTags, fetchLists } = useStore();

  // In a real implementation, this would come from a file picker
  // For now, we'll show the UI pattern
  const [previewData, setPreviewData] = useState<ImportPreviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedPlaces, setSelectedPlaces] = useState<Set<number>>(new Set());

  const togglePlace = (index: number) => {
    setSelectedPlaces((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (previewData) {
      const validIndices = previewData.places
        .map((_, i) => i)
        .filter((i) => !previewData.places[i].is_duplicate && !previewData.places[i].error);
      setSelectedPlaces(new Set(validIndices));
    }
  };

  const deselectAll = () => {
    setSelectedPlaces(new Set());
  };

  const handleImport = async () => {
    if (!previewData || selectedPlaces.size === 0) return;

    const placesToImport = Array.from(selectedPlaces).map(
      (i) => previewData.places[i]
    );

    setIsImporting(true);
    try {
      await dataApi.confirmImport(placesToImport);

      // Refresh data
      await Promise.all([fetchPlaces(), fetchTags(), fetchLists()]);

      Alert.alert(
        'Import Successful',
        `Successfully imported ${placesToImport.length} places.`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      Alert.alert(
        'Import Failed',
        error.response?.data?.detail || 'Failed to import places'
      );
    } finally {
      setIsImporting(false);
    }
  };

  // Show empty state when no preview data
  if (!previewData) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Ionicons name="cloud-upload-outline" size={80} color="#737373" />
          <Text style={styles.emptyTitle}>Import Places</Text>
          <Text style={styles.emptySubtitle}>
            Upload a file to preview and import your places.
            {'\n\n'}
            Supported formats:
            {'\n'}• JSON
            {'\n'}• CSV
            {'\n'}• Google Maps export
          </Text>
          <Pressable
            style={styles.uploadButton}
            onPress={() => {
              // In a real implementation, this would open a file picker
              Alert.alert(
                'Coming Soon',
                'File import will be available in a future update.'
              );
            }}
          >
            <Ionicons name="cloud-upload" size={20} color="#faf9f5" />
            <Text style={styles.uploadButtonText}>Choose File</Text>
          </Pressable>
          <Pressable style={styles.cancelButton} onPress={() => router.back()}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const validPlaces = previewData.places.filter(
    (p) => !p.is_duplicate && !p.error
  );
  const duplicates = previewData.places.filter((p) => p.is_duplicate);
  const errors = previewData.places.filter((p) => p.error);

  return (
    <View style={styles.container}>
      {/* Summary */}
      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNumber}>{previewData.summary.total}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNumber, { color: '#22C55E' }]}>
            {previewData.summary.successful}
          </Text>
          <Text style={styles.summaryLabel}>Valid</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNumber, { color: '#F59E0B' }]}>
            {previewData.summary.duplicates}
          </Text>
          <Text style={styles.summaryLabel}>Duplicates</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNumber, { color: '#EF4444' }]}>
            {previewData.summary.failed}
          </Text>
          <Text style={styles.summaryLabel}>Errors</Text>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable style={styles.actionButton} onPress={selectAll}>
          <Text style={styles.actionText}>Select Valid</Text>
        </Pressable>
        <Pressable style={styles.actionButton} onPress={deselectAll}>
          <Text style={styles.actionText}>Deselect All</Text>
        </Pressable>
        <Text style={styles.selectedCount}>
          {selectedPlaces.size} selected
        </Text>
      </View>

      {/* Places List */}
      <ScrollView style={styles.placesList} contentContainerStyle={styles.placesListContent}>
        {previewData.places.map((place, index) => {
          const isSelected = selectedPlaces.has(index);
          const isDisabled = place.is_duplicate || !!place.error;

          return (
            <Pressable
              key={index}
              style={[
                styles.placeCard,
                isSelected && styles.placeCardSelected,
                isDisabled && styles.placeCardDisabled,
              ]}
              onPress={() => !isDisabled && togglePlace(index)}
              disabled={isDisabled}
            >
              <View style={styles.placeInfo}>
                <Text style={styles.placeName}>{place.name}</Text>
                <Text style={styles.placeAddress} numberOfLines={1}>
                  {place.address}
                </Text>
                {place.tags.length > 0 && (
                  <View style={styles.tagRow}>
                    {place.tags.slice(0, 3).map((tag, i) => (
                      <View key={i} style={styles.tagChip}>
                        <Text style={styles.tagText}>{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {place.is_duplicate && (
                  <View style={styles.warningRow}>
                    <Ionicons name="alert-circle" size={14} color="#F59E0B" />
                    <Text style={styles.warningText}>Duplicate - already exists</Text>
                  </View>
                )}
                {place.error && (
                  <View style={styles.errorRow}>
                    <Ionicons name="close-circle" size={14} color="#EF4444" />
                    <Text style={styles.errorText}>{place.error}</Text>
                  </View>
                )}
              </View>
              {!isDisabled && (
                <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                  {isSelected && <Ionicons name="checkmark" size={16} color="#faf9f5" />}
                </View>
              )}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Import Button */}
      <View style={styles.footer}>
        <Pressable
          style={[
            styles.importButton,
            (selectedPlaces.size === 0 || isImporting) && styles.importButtonDisabled,
          ]}
          onPress={handleImport}
          disabled={selectedPlaces.size === 0 || isImporting}
        >
          {isImporting ? (
            <ActivityIndicator color="#faf9f5" />
          ) : (
            <>
              <Ionicons name="cloud-download" size={20} color="#faf9f5" />
              <Text style={styles.importButtonText}>
                Import {selectedPlaces.size} Place{selectedPlaces.size !== 1 ? 's' : ''}
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#252523',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#faf9f5',
    marginTop: 20,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#a3a3a3',
    marginTop: 12,
    textAlign: 'center',
    lineHeight: 22,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DE7356',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 32,
    gap: 8,
  },
  uploadButtonText: {
    color: '#faf9f5',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 16,
    marginTop: 16,
  },
  cancelButtonText: {
    color: '#a3a3a3',
    fontSize: 16,
  },
  summary: {
    flexDirection: 'row',
    backgroundColor: '#3a3a38',
    margin: 16,
    borderRadius: 12,
    padding: 16,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#faf9f5',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#a3a3a3',
    marginTop: 4,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#4a4a48',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 12,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#3a3a38',
  },
  actionText: {
    color: '#DE7356',
    fontSize: 13,
    fontWeight: '600',
  },
  selectedCount: {
    flex: 1,
    textAlign: 'right',
    color: '#a3a3a3',
    fontSize: 13,
  },
  placesList: {
    flex: 1,
  },
  placesListContent: {
    padding: 16,
    paddingTop: 0,
  },
  placeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3a3a38',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  placeCardSelected: {
    borderWidth: 2,
    borderColor: '#DE7356',
  },
  placeCardDisabled: {
    opacity: 0.6,
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
    backgroundColor: '#4a4a48',
  },
  tagText: {
    fontSize: 11,
    color: '#a3a3a3',
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  warningText: {
    fontSize: 12,
    color: '#F59E0B',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4a4a48',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  checkboxSelected: {
    backgroundColor: '#DE7356',
    borderColor: '#DE7356',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#3a3a38',
  },
  importButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DE7356',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  importButtonDisabled: {
    opacity: 0.5,
  },
  importButtonText: {
    color: '#faf9f5',
    fontSize: 16,
    fontWeight: '600',
  },
});
