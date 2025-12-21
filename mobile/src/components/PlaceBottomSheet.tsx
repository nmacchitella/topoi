import React, { useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Linking,
  Animated,
  Dimensions,
  PanResponder,
  Share,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import type { Place, List } from '../types';
import { DEFAULT_TAG_COLOR } from '../lib/tagColors';
import { placesApi } from '../lib/api';
import { useStore } from '../store/useStore';
import TagIcon from './TagIcon';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Snap points as percentages of screen height
const SNAP_POINTS = {
  CLOSED: 0,
  INITIAL: 0.35, // 35% - compact view
  MEDIUM: 0.55,  // 55% - medium view
  FULL: 0.85,    // 85% - full view
};

interface PlaceBottomSheetProps {
  place: Place & { ownerName?: string; ownerId?: string };
  onClose: () => void;
  isOtherUserPlace?: boolean;
  onAddToMyMap?: () => void;
}

export default function PlaceBottomSheet({
  place,
  onClose,
  isOtherUserPlace = false,
  onAddToMyMap,
}: PlaceBottomSheetProps) {
  const router = useRouter();
  const { user, deletePlace } = useStore();
  const [isDeleting, setIsDeleting] = React.useState(false);

  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const currentSnapPoint = useRef(SNAP_POINTS.INITIAL);
  const lastGestureDy = useRef(0);

  // Calculate sheet height from snap point
  const getSheetHeight = (snapPoint: number) => SCREEN_HEIGHT * snapPoint;

  // Animate to a snap point
  const animateToSnapPoint = useCallback((snapPoint: number) => {
    currentSnapPoint.current = snapPoint;
    const targetY = SCREEN_HEIGHT - getSheetHeight(snapPoint);

    if (snapPoint === SNAP_POINTS.CLOSED) {
      Animated.timing(translateY, {
        toValue: SCREEN_HEIGHT,
        duration: 200,
        useNativeDriver: true,
      }).start(() => onClose());
    } else {
      Animated.spring(translateY, {
        toValue: targetY,
        damping: 20,
        stiffness: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [translateY, onClose]);

  // Show sheet on mount
  useEffect(() => {
    animateToSnapPoint(SNAP_POINTS.INITIAL);
  }, [animateToSnapPoint]);

  // Pan responder for drag gestures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        lastGestureDy.current = 0;
      },
      onPanResponderMove: (_, gestureState) => {
        const currentY = SCREEN_HEIGHT - getSheetHeight(currentSnapPoint.current);
        const newY = currentY + gestureState.dy;

        // Clamp to valid range
        const minY = SCREEN_HEIGHT - getSheetHeight(SNAP_POINTS.FULL);
        const maxY = SCREEN_HEIGHT;
        const clampedY = Math.max(minY, Math.min(maxY, newY));

        translateY.setValue(clampedY);
        lastGestureDy.current = gestureState.dy;
      },
      onPanResponderRelease: (_, gestureState) => {
        const currentY = SCREEN_HEIGHT - getSheetHeight(currentSnapPoint.current) + gestureState.dy;
        const currentHeight = SCREEN_HEIGHT - currentY;
        const currentRatio = currentHeight / SCREEN_HEIGHT;
        const velocity = gestureState.vy;

        // Determine target snap point based on position and velocity
        let targetSnapPoint: number;

        if (velocity > 0.5) {
          // Fast downward swipe - go to lower snap point or close
          if (currentSnapPoint.current === SNAP_POINTS.FULL) {
            targetSnapPoint = SNAP_POINTS.MEDIUM;
          } else if (currentSnapPoint.current === SNAP_POINTS.MEDIUM) {
            targetSnapPoint = SNAP_POINTS.INITIAL;
          } else {
            targetSnapPoint = SNAP_POINTS.CLOSED;
          }
        } else if (velocity < -0.5) {
          // Fast upward swipe - go to higher snap point
          if (currentSnapPoint.current === SNAP_POINTS.INITIAL) {
            targetSnapPoint = SNAP_POINTS.MEDIUM;
          } else {
            targetSnapPoint = SNAP_POINTS.FULL;
          }
        } else {
          // Slow gesture - snap to nearest point
          if (currentRatio < 0.2) {
            targetSnapPoint = SNAP_POINTS.CLOSED;
          } else if (currentRatio < 0.45) {
            targetSnapPoint = SNAP_POINTS.INITIAL;
          } else if (currentRatio < 0.7) {
            targetSnapPoint = SNAP_POINTS.MEDIUM;
          } else {
            targetSnapPoint = SNAP_POINTS.FULL;
          }
        }

        animateToSnapPoint(targetSnapPoint);
      },
    })
  ).current;

  const handleOpenInMaps = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${place.latitude},${place.longitude}`;
    Linking.openURL(url);
  };

  const handleCall = () => {
    if (place.phone) {
      Linking.openURL(`tel:${place.phone}`);
    }
  };

  const handleWebsite = () => {
    if (place.website) {
      Linking.openURL(place.website);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out ${place.name} on Topoi`,
        url: `https://topoi.app/shared/place/${place.id}`,
      });
    } catch (error) {
      // User cancelled or share failed
    }
  };

  const handleEdit = () => {
    onClose();
    router.push(`/place/new?edit=${place.id}`);
  };

  const handleDelete = () => {
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
              onClose();
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

  const isOwner = user?.id === place.user_id;

  return (
    <>
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Animated.View
          style={[
            styles.backdropOverlay,
            {
              opacity: translateY.interpolate({
                inputRange: [SCREEN_HEIGHT * 0.15, SCREEN_HEIGHT],
                outputRange: [0.5, 0],
                extrapolate: 'clamp',
              }),
            },
          ]}
        />
      </Pressable>

      {/* Bottom Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          {
            transform: [{ translateY }],
            height: SCREEN_HEIGHT,
          },
        ]}
      >
        {/* Drag Handle */}
        <View {...panResponder.panHandlers} style={styles.handleContainer}>
          <View style={styles.handle} />
        </View>

        {/* Content */}
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.name}>{place.name}</Text>
              {place.ownerName && (
                <Text style={styles.ownerText}>by {place.ownerName}</Text>
              )}
            </View>
            <View style={styles.headerActions}>
              {isOtherUserPlace ? (
                <Pressable style={styles.addToMapButton} onPress={onAddToMyMap}>
                  <Ionicons name="add" size={18} color="#faf9f5" />
                  <Text style={styles.addToMapText}>Add to My Map</Text>
                </Pressable>
              ) : (
                <>
                  <Pressable style={styles.iconButton} onPress={handleShare}>
                    <Ionicons name="share-outline" size={22} color="#a3a3a3" />
                  </Pressable>
                  {isOwner && (
                    <Pressable style={styles.iconButton} onPress={handleEdit}>
                      <Ionicons name="pencil-outline" size={22} color="#a3a3a3" />
                    </Pressable>
                  )}
                </>
              )}
              <Pressable style={styles.iconButton} onPress={onClose}>
                <Ionicons name="close" size={24} color="#a3a3a3" />
              </Pressable>
            </View>
          </View>

          {/* Tags */}
          {place.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {place.tags.map((tag) => {
                const tagColor = tag.color || DEFAULT_TAG_COLOR;
                return (
                  <View
                    key={tag.id}
                    style={[styles.tag, { backgroundColor: tagColor + '33', borderColor: tagColor + '60' }]}
                  >
                    {tag.icon && <TagIcon icon={tag.icon} size="xs" color={tagColor} />}
                    <Text style={[styles.tagText, { color: tagColor }]}>
                      {tag.name}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}

          {/* Address */}
          <Pressable style={styles.section} onPress={handleOpenInMaps}>
            <View style={styles.sectionContent}>
              <Text style={styles.address}>{place.address}</Text>
              <Text style={styles.linkText}>Open in Google Maps</Text>
            </View>
          </Pressable>

          {/* Notes */}
          {place.notes && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Notes</Text>
              <Text style={styles.sectionText}>{place.notes}</Text>
            </View>
          )}

          {/* Phone */}
          {place.phone && (
            <Pressable style={styles.section} onPress={handleCall}>
              <Text style={styles.sectionLabel}>Phone</Text>
              <Text style={styles.linkText}>{place.phone}</Text>
            </Pressable>
          )}

          {/* Website */}
          {place.website && (
            <Pressable style={styles.section} onPress={handleWebsite}>
              <Text style={styles.sectionLabel}>Website</Text>
              <Text style={styles.linkText} numberOfLines={1}>{place.website}</Text>
            </Pressable>
          )}

          {/* Hours */}
          {place.hours && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Hours</Text>
              <Text style={styles.sectionText}>{place.hours}</Text>
            </View>
          )}

          {/* Collections */}
          {place.lists.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Collections</Text>
              <View style={styles.collectionsContainer}>
                {place.lists.map((list: List) => (
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
          )}

          {/* Coordinates */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Coordinates</Text>
            <Text style={styles.coordinates}>
              {place.latitude.toFixed(6)}, {place.longitude.toFixed(6)}
            </Text>
          </View>

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

          {/* Owner Actions */}
          {isOwner && !isOtherUserPlace && (
            <View style={styles.actions}>
              <Pressable
                style={[styles.deleteButton, isDeleting && styles.buttonDisabled]}
                onPress={handleDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#EF4444" />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    <Text style={styles.deleteButtonText}>Delete Place</Text>
                  </>
                )}
              </Pressable>
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  backdropOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#2a2a28',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    zIndex: 101,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 20,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#4a4a48',
    borderRadius: 2,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
    marginRight: 12,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: '#faf9f5',
  },
  ownerText: {
    fontSize: 14,
    color: '#DE7356',
    marginTop: 4,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconButton: {
    padding: 8,
  },
  addToMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#DE7356',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addToMapText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#faf9f5',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '500',
  },
  section: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a38',
  },
  sectionContent: {
    gap: 4,
  },
  sectionLabel: {
    fontSize: 12,
    color: '#737373',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionText: {
    fontSize: 15,
    color: '#faf9f5',
    lineHeight: 22,
  },
  address: {
    fontSize: 15,
    color: '#faf9f5',
  },
  linkText: {
    fontSize: 13,
    color: '#3B82F6',
    marginTop: 2,
  },
  coordinates: {
    fontSize: 14,
    color: '#a3a3a3',
    fontFamily: 'Courier',
  },
  collectionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  collection: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  collectionText: {
    fontSize: 13,
    fontWeight: '500',
  },
  metadata: {
    paddingVertical: 16,
    gap: 4,
  },
  metadataText: {
    fontSize: 12,
    color: '#737373',
  },
  actions: {
    paddingTop: 8,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EF444420',
    borderRadius: 10,
    padding: 14,
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#EF4444',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
});
