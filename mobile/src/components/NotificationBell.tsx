import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store/useStore';
import { usersApi } from '../lib/api';
import type { Notification } from '../types';

export default function NotificationBell() {
  const router = useRouter();
  const {
    notifications,
    unreadCount,
    fetchNotifications,
    fetchUnreadCount,
    markNotificationsRead,
    deleteNotification,
  } = useStore();

  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [processingFollowRequest, setProcessingFollowRequest] = useState<string | null>(null);

  // Fetch unread count on mount and periodically
  useEffect(() => {
    fetchUnreadCount();

    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Fetch full notifications when modal opens
  useEffect(() => {
    if (isOpen && notifications.length === 0) {
      setIsLoading(true);
      fetchNotifications().finally(() => setIsLoading(false));
    }
  }, [isOpen]);

  // Mark notifications as read when modal opens
  useEffect(() => {
    if (isOpen && notifications.length > 0) {
      const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);

      if (unreadIds.length > 0) {
        markNotificationsRead(unreadIds).catch((err) => {
          console.error('Failed to mark notifications as read:', err);
        });
      }
    }
  }, [isOpen, notifications]);

  const handleBellClick = () => {
    setIsOpen(!isOpen);
  };

  const handleViewAll = () => {
    setIsOpen(false);
    router.push('/notifications');
  };

  const handleAcceptFollow = async (followerId: string, notificationId: string) => {
    setProcessingFollowRequest(notificationId);
    try {
      await usersApi.approveFollower(followerId);
      await deleteNotification(notificationId);
      fetchNotifications();
      fetchUnreadCount();
    } catch (error: any) {
      console.error('Failed to accept follow request:', error);
    } finally {
      setProcessingFollowRequest(null);
    }
  };

  const handleDeclineFollow = async (followerId: string, notificationId: string) => {
    setProcessingFollowRequest(notificationId);
    try {
      await usersApi.declineFollower(followerId);
      await deleteNotification(notificationId);
      fetchNotifications();
      fetchUnreadCount();
    } catch (error: any) {
      console.error('Failed to decline follow request:', error);
    } finally {
      setProcessingFollowRequest(null);
    }
  };

  const recentNotifications = notifications.slice(0, 5);

  return (
    <View>
      {/* Bell Icon Button */}
      <Pressable onPress={handleBellClick} style={styles.bellButton}>
        <Ionicons name="notifications-outline" size={24} color="#faf9f5" />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        )}
      </Pressable>

      {/* Notifications Modal */}
      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setIsOpen(false)}>
          <View style={styles.dropdownContainer}>
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View style={styles.dropdown}>
                <View style={styles.header}>
                  <Text style={styles.headerTitle}>Notifications</Text>
                  <Pressable onPress={() => setIsOpen(false)}>
                    <Ionicons name="close" size={24} color="#a3a3a3" />
                  </Pressable>
                </View>

                <ScrollView style={styles.content}>
                  {isLoading ? (
                    <View style={styles.emptyState}>
                      <ActivityIndicator color="#DE7356" />
                    </View>
                  ) : recentNotifications.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Ionicons name="notifications-off-outline" size={40} color="#737373" />
                      <Text style={styles.emptyText}>No notifications</Text>
                    </View>
                  ) : (
                    recentNotifications.map((notification) => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onPress={() => {
                          setIsOpen(false);
                          if (notification.link) {
                            router.push(notification.link as any);
                          }
                        }}
                        onAcceptFollow={(followerId) =>
                          handleAcceptFollow(followerId, notification.id)
                        }
                        onDeclineFollow={(followerId) =>
                          handleDeclineFollow(followerId, notification.id)
                        }
                        isProcessing={processingFollowRequest === notification.id}
                      />
                    ))
                  )}
                </ScrollView>

                <Pressable style={styles.footer} onPress={handleViewAll}>
                  <Text style={styles.footerText}>See all notifications</Text>
                  <Ionicons name="arrow-forward" size={16} color="#DE7356" />
                </Pressable>
              </View>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

interface NotificationItemProps {
  notification: Notification;
  onPress: () => void;
  onAcceptFollow: (followerId: string) => void;
  onDeclineFollow: (followerId: string) => void;
  isProcessing: boolean;
}

function NotificationItem({
  notification,
  onPress,
  onAcceptFollow,
  onDeclineFollow,
  isProcessing,
}: NotificationItemProps) {
  const formattedTime = formatTimeAgo(notification.created_at);
  const isFollowRequest = notification.type === 'follow_request';
  const followerId = notification.metadata?.actor_id as string | undefined;

  return (
    <Pressable
      style={[
        styles.notificationItem,
        !notification.is_read && styles.notificationItemUnread,
      ]}
      onPress={isFollowRequest ? undefined : onPress}
    >
      <View style={styles.notificationContent}>
        {!notification.is_read && <View style={styles.unreadDot} />}
        <View style={styles.notificationText}>
          <Text style={styles.notificationTitle}>{notification.title}</Text>
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
      </View>
    </Pressable>
  );
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return date.toLocaleDateString();
}

const styles = StyleSheet.create({
  bellButton: {
    position: 'relative',
    padding: 8,
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
  },
  dropdownContainer: {
    marginTop: 100,
    marginHorizontal: 16,
  },
  dropdown: {
    backgroundColor: '#3a3a38',
    borderRadius: 16,
    overflow: 'hidden',
    maxHeight: 500,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#4a4a48',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#faf9f5',
  },
  content: {
    maxHeight: 350,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    color: '#737373',
    marginTop: 12,
    fontSize: 14,
  },
  notificationItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#4a4a48',
  },
  notificationItemUnread: {
    backgroundColor: '#DE735620',
  },
  notificationContent: {
    flexDirection: 'row',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DE7356',
    marginRight: 12,
    marginTop: 6,
  },
  notificationText: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#faf9f5',
  },
  notificationMessage: {
    fontSize: 13,
    color: '#a3a3a3',
    marginTop: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: '#737373',
    marginTop: 4,
  },
  followActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  acceptButton: {
    backgroundColor: '#DE7356',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  acceptButtonText: {
    color: '#faf9f5',
    fontSize: 13,
    fontWeight: '600',
  },
  declineButton: {
    backgroundColor: '#4a4a48',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  declineButtonText: {
    color: '#a3a3a3',
    fontSize: 13,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#4a4a48',
    gap: 8,
  },
  footerText: {
    color: '#DE7356',
    fontSize: 14,
    fontWeight: '600',
  },
});
