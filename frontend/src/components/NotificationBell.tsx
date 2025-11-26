'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/store/useStore';
import type { Notification } from '@/types';

export default function NotificationBell() {
  const router = useRouter();
  const { notifications, unreadCount, fetchNotifications, fetchUnreadCount } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch unread count on mount and periodically
  useEffect(() => {
    fetchUnreadCount();

    // Poll for new notifications every 30 seconds
    const interval = setInterval(() => {
      fetchUnreadCount();
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Fetch full notifications when dropdown opens
  useEffect(() => {
    if (isOpen && notifications.length === 0) {
      setIsLoading(true);
      fetchNotifications().finally(() => setIsLoading(false));
    }
  }, [isOpen, notifications.length, fetchNotifications]);

  const handleBellClick = () => {
    setIsOpen(!isOpen);
  };

  const handleViewAll = () => {
    setIsOpen(false);
    router.push('/notifications');
  };

  // Get recent notifications (last 5)
  const recentNotifications = notifications.slice(0, 5);

  return (
    <div className="relative">
      {/* Bell Icon */}
      <button
        onClick={handleBellClick}
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full"
        aria-label="Notifications"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-6 h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
          />
        </svg>

        {/* Unread count badge */}
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown content */}
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg z-20 border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">Notifications</h3>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 text-center text-gray-500">
                  Loading...
                </div>
              ) : recentNotifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No notifications
                </div>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {recentNotifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onClick={() => {
                        setIsOpen(false);
                        if (notification.link) {
                          router.push(notification.link);
                        }
                      }}
                    />
                  ))}
                </ul>
              )}
            </div>

            {recentNotifications.length > 0 && (
              <div className="p-3 border-t border-gray-200">
                <button
                  onClick={handleViewAll}
                  className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  View all notifications
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

interface NotificationItemProps {
  notification: Notification;
  onClick: () => void;
}

function NotificationItem({ notification, onClick }: NotificationItemProps) {
  const formattedTime = formatTimeAgo(notification.created_at);

  return (
    <li
      onClick={onClick}
      className={`p-4 hover:bg-gray-50 cursor-pointer transition ${
        !notification.is_read ? 'bg-blue-50' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Unread indicator */}
        {!notification.is_read && (
          <div className="flex-shrink-0 w-2 h-2 mt-2 bg-blue-500 rounded-full" />
        )}

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900">
            {notification.title}
          </p>
          <p className="text-sm text-gray-600 mt-1">
            {notification.message}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {formattedTime}
          </p>
        </div>
      </div>
    </li>
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
