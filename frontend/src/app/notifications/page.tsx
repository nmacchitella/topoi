'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import { usersApi } from '@/lib/api';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';
import type { Notification } from '@/types';

export default function NotificationsPage() {
  const router = useRouter();
  const {
    notifications,
    fetchNotifications,
    markNotificationsRead,
    markAllNotificationsRead,
    deleteNotification
  } = useStore();

  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [processingFollowRequest, setProcessingFollowRequest] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    fetchNotifications().finally(() => setIsLoading(false));
  }, [fetchNotifications]);

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markNotificationsRead([notificationId]);
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleDelete = async (notificationId: string) => {
    try {
      await deleteNotification(notificationId);
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read if unread
    if (!notification.is_read) {
      handleMarkAsRead(notification.id);
    }
    // Navigate to link if present
    if (notification.link) {
      router.push(notification.link);
    }
  };

  const handleAcceptFollow = async (followerId: string, notificationId: string) => {
    setProcessingFollowRequest(notificationId);
    try {
      await usersApi.approveFollower(followerId);
      await deleteNotification(notificationId);
      alert('Follow request accepted!');
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to accept follow request');
    } finally {
      setProcessingFollowRequest(null);
    }
  };

  const handleDeclineFollow = async (followerId: string, notificationId: string) => {
    setProcessingFollowRequest(notificationId);
    try {
      await usersApi.declineFollower(followerId);
      await deleteNotification(notificationId);
      alert('Follow request declined');
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to decline follow request');
    } finally {
      setProcessingFollowRequest(null);
    }
  };

  const filteredNotifications = filter === 'unread'
    ? notifications.filter(n => !n.is_read)
    : notifications;

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="h-screen flex flex-col bg-dark-bg">
      <Navbar />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar />

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-white">Notifications</h1>
              <p className="text-gray-400 mt-1">
                Stay updated with your activity
              </p>
            </div>

        {/* Actions Bar */}
        <div className="bg-dark-card rounded-lg shadow-sm border border-gray-700 p-4 mb-4">
          <div className="flex items-center justify-between">
            {/* Filter Tabs */}
            <div className="flex gap-4">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filter === 'all'
                    ? 'bg-primary/20 text-primary'
                    : 'text-gray-400 hover:bg-dark-hover'
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-4 py-2 rounded-lg font-medium transition ${
                  filter === 'unread'
                    ? 'bg-primary/20 text-primary'
                    : 'text-gray-400 hover:bg-dark-hover'
                }`}
              >
                Unread ({unreadCount})
              </button>
            </div>

            {/* Mark All Read */}
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="px-4 py-2 text-sm text-primary hover:text-primary/80 font-medium"
              >
                Mark all as read
              </button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="bg-dark-card rounded-lg shadow-sm border border-gray-700">
          {isLoading ? (
            <div className="p-8 text-center text-gray-400">
              Loading notifications...
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="p-8 text-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-12 h-12 mx-auto text-gray-600 mb-3"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
                />
              </svg>
              <p className="text-gray-400 text-lg">
                {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
              </p>
              <p className="text-gray-500 text-sm mt-1">
                {filter === 'unread'
                  ? "You're all caught up!"
                  : 'Notifications will appear here when you have activity'}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-700">
              {filteredNotifications.map((notification) => (
                <NotificationListItem
                  key={notification.id}
                  notification={notification}
                  onClick={() => handleNotificationClick(notification)}
                  onMarkAsRead={() => handleMarkAsRead(notification.id)}
                  onDelete={() => handleDelete(notification.id)}
                  onAcceptFollow={(followerId) => handleAcceptFollow(followerId, notification.id)}
                  onDeclineFollow={(followerId) => handleDeclineFollow(followerId, notification.id)}
                  isProcessing={processingFollowRequest === notification.id}
                />
              ))}
            </ul>
          )}
        </div>
          </div>
        </div>
      </div>

      <BottomNav showNewButton={false} />
    </div>
  );
}

interface NotificationListItemProps {
  notification: Notification;
  onClick: () => void;
  onMarkAsRead: () => void;
  onDelete: () => void;
  onAcceptFollow: (followerId: string) => void;
  onDeclineFollow: (followerId: string) => void;
  isProcessing: boolean;
}

function NotificationListItem({
  notification,
  onClick,
  onMarkAsRead,
  onDelete,
  onAcceptFollow,
  onDeclineFollow,
  isProcessing
}: NotificationListItemProps) {
  const [showActions, setShowActions] = useState(false);
  const formattedTime = formatTimeAgo(notification.created_at);
  const isFollowRequest = notification.type === 'follow_request';
  const followerId = notification.metadata?.actor_id;

  // Debug logging - log all notifications to see structure
  console.log('Notification on page:', {
    id: notification.id,
    type: notification.type,
    title: notification.title,
    metadata: notification.metadata,
    hasMetadata: !!notification.metadata,
    followerId,
    isFollowRequest,
    shouldShowButtons: isFollowRequest && !!followerId
  });

  return (
    <li
      className={`p-4 hover:bg-dark-hover transition relative ${
        !notification.is_read ? 'bg-primary/10' : ''
      }`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex items-start gap-3">
        {/* Unread indicator */}
        {!notification.is_read && (
          <div className="flex-shrink-0 w-2 h-2 mt-2 bg-primary rounded-full" />
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className={isFollowRequest ? '' : 'cursor-pointer'} onClick={isFollowRequest ? undefined : onClick}>
            <p className="text-sm font-medium text-white">
              {notification.title}
            </p>
            <p className="text-sm text-gray-300 mt-1">
              {notification.message}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {formattedTime}
            </p>
          </div>

          {/* Follow Request Actions */}
          {isFollowRequest && (
            <div className="flex gap-2 mt-3">
              {followerId ? (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAcceptFollow(followerId);
                    }}
                    disabled={isProcessing}
                    className="btn-primary text-xs px-4 py-2"
                  >
                    {isProcessing ? 'Processing...' : 'Accept'}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeclineFollow(followerId);
                    }}
                    disabled={isProcessing}
                    className="btn-secondary text-xs px-4 py-2"
                  >
                    Decline
                  </button>
                </>
              ) : (
                <div className="text-xs text-red-400">
                  Error: Missing follower ID. Check console for details.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        {showActions && !isFollowRequest && (
          <div className="flex-shrink-0 flex gap-2">
            {!notification.is_read && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkAsRead();
                }}
                className="p-2 text-gray-400 hover:text-primary hover:bg-primary/10 rounded-lg transition"
                title="Mark as read"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition"
              title="Delete"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                />
              </svg>
            </button>
          </div>
        )}
      </div>
    </li>
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

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
}
