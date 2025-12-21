import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../src/store/useStore';
import { usersApi } from '../src/lib/api';
import type { Notification } from '../src/types';

export default function NotificationsScreen() {
  const router = useRouter();
  const {
    notifications,
    fetchNotifications,
    fetchUnreadCount,
    markAllNotificationsRead,
    deleteNotification,
  } = useStore();

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setIsLoading(true);
    try {
      await fetchNotifications();
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchNotifications();
      await fetchUnreadCount();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleDeleteNotification = async (id: string) => {
    Alert.alert(
      'Delete Notification',
      'Are you sure you want to delete this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteNotification(id);
            } catch (error) {
              console.error('Failed to delete notification:', error);
            }
          },
        },
      ]
    );
  };

  const handleAcceptFollow = async (followerId: string, notificationId: string) => {
    setProcessingId(notificationId);
    try {
      await usersApi.approveFollower(followerId);
      await deleteNotification(notificationId);
      await fetchNotifications();
      Alert.alert('Success', 'Follow request accepted!');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to accept follow request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeclineFollow = async (followerId: string, notificationId: string) => {
    setProcessingId(notificationId);
    try {
      await usersApi.declineFollower(followerId);
      await deleteNotification(notificationId);
      await fetchNotifications();
      Alert.alert('Success', 'Follow request declined');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to decline follow request');
    } finally {
      setProcessingId(null);
    }
  };

  const handleNotificationPress = (notification: Notification) => {
    if (notification.link) {
      router.push(notification.link as any);
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#DE7356" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Actions */}
      {notifications.length > 0 && unreadCount > 0 && (
        <View style={styles.headerActions}>
          <Pressable onPress={handleMarkAllRead} style={styles.markAllButton}>
            <Ionicons name="checkmark-done" size={18} color="#DE7356" />
            <Text style={styles.markAllText}>Mark all as read</Text>
          </Pressable>
        </View>
      )}

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
        {notifications.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-off-outline" size={80} color="#737373" />
            <Text style={styles.emptyTitle}>No Notifications</Text>
            <Text style={styles.emptySubtitle}>
              You're all caught up! New notifications will appear here.
            </Text>
          </View>
        ) : (
          notifications.map((notification) => (
            <NotificationCard
              key={notification.id}
              notification={notification}
              onPress={() => handleNotificationPress(notification)}
              onDelete={() => handleDeleteNotification(notification.id)}
              onAcceptFollow={(followerId) =>
                handleAcceptFollow(followerId, notification.id)
              }
              onDeclineFollow={(followerId) =>
                handleDeclineFollow(followerId, notification.id)
              }
              isProcessing={processingId === notification.id}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

interface NotificationCardProps {
  notification: Notification;
  onPress: () => void;
  onDelete: () => void;
  onAcceptFollow: (followerId: string) => void;
  onDeclineFollow: (followerId: string) => void;
  isProcessing: boolean;
}

function NotificationCard({
  notification,
  onPress,
  onDelete,
  onAcceptFollow,
  onDeclineFollow,
  isProcessing,
}: NotificationCardProps) {
  const formattedTime = formatTimeAgo(notification.created_at);
  const isFollowRequest = notification.type === 'follow_request';
  const followerId = notification.metadata?.actor_id as string | undefined;

  const getIcon = () => {
    switch (notification.type) {
      case 'follow_request':
        return 'person-add';
      case 'follow_accepted':
        return 'person-circle';
      case 'place_shared':
        return 'location';
      case 'collection_shared':
        return 'folder';
      default:
        return 'notifications';
    }
  };

  return (
    <Pressable
      style={[
        styles.notificationCard,
        !notification.is_read && styles.notificationCardUnread,
      ]}
      onPress={isFollowRequest ? undefined : onPress}
    >
      <View style={styles.notificationIcon}>
        <Ionicons name={getIcon()} size={24} color="#DE7356" />
      </View>

      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <Text style={styles.notificationTitle}>{notification.title}</Text>
          <Pressable onPress={onDelete} hitSlop={10}>
            <Ionicons name="close" size={18} color="#737373" />
          </Pressable>
        </View>
        <Text style={styles.notificationMessage}>{notification.message}</Text>
        <Text style={styles.notificationTime}>{formattedTime}</Text>

        {isFollowRequest && followerId && (
          <View style={styles.followActions}>
            <Pressable
              style={styles.acceptButton}
              onPress={() => onAcceptFollow(followerId)}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#faf9f5" />
              ) : (
                <Text style={styles.acceptButtonText}>Accept</Text>
              )}
            </Pressable>
            <Pressable
              style={styles.declineButton}
              onPress={() => onDeclineFollow(followerId)}
              disabled={isProcessing}
            >
              <Text style={styles.declineButtonText}>Decline</Text>
            </Pressable>
          </View>
        )}
      </View>

      {!notification.is_read && <View style={styles.unreadIndicator} />}
    </Pressable>
  );
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;

  return date.toLocaleDateString();
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
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a38',
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  markAllText: {
    color: '#DE7356',
    fontSize: 14,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 100,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#faf9f5',
    marginTop: 20,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#737373',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 22,
  },
  notificationCard: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#3a3a38',
  },
  notificationCardUnread: {
    backgroundColor: '#DE735615',
  },
  notificationIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#DE735620',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#faf9f5',
    flex: 1,
    marginRight: 8,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#a3a3a3',
    marginTop: 4,
    lineHeight: 20,
  },
  notificationTime: {
    fontSize: 12,
    color: '#737373',
    marginTop: 6,
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DE7356',
    marginLeft: 8,
    marginTop: 4,
  },
  followActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  acceptButton: {
    backgroundColor: '#DE7356',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  acceptButtonText: {
    color: '#faf9f5',
    fontSize: 14,
    fontWeight: '600',
  },
  declineButton: {
    backgroundColor: '#3a3a38',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4a4a48',
  },
  declineButtonText: {
    color: '#a3a3a3',
    fontSize: 14,
    fontWeight: '600',
  },
});
