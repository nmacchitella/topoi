import { create } from 'zustand';
import type { User, UserProfileUpdate, Place, List, ListWithPlaceCount, Tag, TagWithUsage, Notification, ShareToken, UserSearchResult, MapBounds, UserMapMetadata } from '@/types';
import { placesApi, listsApi, tagsApi, authApi, notificationsApi, shareApi, usersApi } from '@/lib/api';

// Threshold for when to use viewport-based loading
const LARGE_MAP_THRESHOLD = 1000;
import {
  setAccessToken as saveAccessToken,
  setRefreshToken as saveRefreshToken,
  getAccessToken,
  getRefreshToken,
  clearTokens
} from '@/lib/auth-storage';

interface AppState {
  // Auth
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;

  // Data
  places: Place[];
  lists: ListWithPlaceCount[];
  tags: TagWithUsage[];

  // Phase 2: Notifications
  notifications: Notification[];
  unreadCount: number;

  // Phase 3: Share Token
  shareToken: ShareToken | null;

  // Phase 4: Follow
  followers: UserSearchResult[];
  following: UserSearchResult[];
  followRequests: UserSearchResult[];

  // Phase 5: Map Layers (Followed Users)
  mapViewMode: 'profile' | 'layers';
  selectedFollowedUserIds: string[];
  followedUsersPlaces: Record<string, Place[]>;
  followedUsersMetadata: Record<string, UserMapMetadata>;  // Metadata for large maps
  largeMapUsers: Set<string>;  // Users that need viewport-based loading

  // UI State
  selectedPlaceId: string | null;
  selectedListId: string | null;
  selectedTagIds: string[];
  searchQuery: string;
  viewMode: 'map' | 'list';
  sidebarOpen: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setRefreshToken: (refreshToken: string | null) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  logout: () => void;

  // Data Actions
  fetchPlaces: () => Promise<void>;
  fetchLists: () => Promise<void>;
  fetchTags: () => Promise<void>;
  fetchUserProfile: () => Promise<void>;
  updateUserProfile: (updates: UserProfileUpdate) => Promise<void>;

  // Phase 2: Notification Actions
  fetchNotifications: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markNotificationsRead: (notificationIds: string[]) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;

  // Phase 3: Share Token Actions
  fetchShareToken: () => Promise<void>;

  // Phase 4: Follow Actions
  fetchFollowers: () => Promise<void>;
  fetchFollowing: () => Promise<void>;
  fetchFollowRequests: () => Promise<void>;
  followUser: (userId: string) => Promise<void>;
  unfollowUser: (userId: string) => Promise<void>;
  approveFollowRequest: (followerId: string) => Promise<void>;
  declineFollowRequest: (followerId: string) => Promise<void>;

  // Phase 5: Map Layers Actions
  setMapViewMode: (mode: 'profile' | 'layers') => void;
  setSelectedFollowedUserIds: (userIds: string[]) => void;
  toggleFollowedUser: (userId: string) => void;
  fetchFollowedUserPlaces: (userId: string) => Promise<void>;
  fetchFollowedUserMetadata: (userId: string) => Promise<UserMapMetadata>;
  fetchFollowedUserPlacesInBounds: (userId: string, bounds: MapBounds) => Promise<void>;
  isLargeMapUser: (userId: string) => boolean;
  clearFollowedUsersPlaces: () => void;

  addPlace: (place: Place) => void;
  updatePlace: (place: Place) => void;
  deletePlace: (id: string) => void;

  addList: (list: ListWithPlaceCount) => void;
  updateList: (list: ListWithPlaceCount) => void;
  deleteList: (id: string) => void;

  addTag: (tag: TagWithUsage) => void;
  updateTag: (tag: TagWithUsage) => void;
  deleteTag: (id: string) => void;

  // UI Actions
  setSelectedPlaceId: (id: string | null) => void;
  setSelectedListId: (id: string | null) => void;
  setSelectedTagIds: (tagIds: string[]) => void;
  setSearchQuery: (query: string) => void;
  setViewMode: (mode: 'map' | 'list') => void;
  setSidebarOpen: (open: boolean) => void;

  // Computed
  getFilteredPlaces: () => Place[];
}

export const useStore = create<AppState>((set, get) => ({
  // Initial state
  user: null,
  token: typeof window !== 'undefined' ? getAccessToken() : null,
  refreshToken: typeof window !== 'undefined' ? getRefreshToken() : null,
  isAuthenticated: false,
  places: [],
  lists: [],
  tags: [],
  notifications: [],
  unreadCount: 0,
  shareToken: null,
  followers: [],
  following: [],
  followRequests: [],
  mapViewMode: 'profile',
  selectedFollowedUserIds: [],
  followedUsersPlaces: {},
  followedUsersMetadata: {},
  largeMapUsers: new Set<string>(),
  selectedPlaceId: null,
  selectedListId: null,
  selectedTagIds: [],
  searchQuery: '',
  viewMode: 'map',
  sidebarOpen: false,

  // Auth actions
  setUser: (user) => set({ user, isAuthenticated: !!user }),

  setToken: (token) => {
    if (token) {
      saveAccessToken(token);
    } else {
      clearTokens();
    }
    set({ token, isAuthenticated: !!token });
  },

  setRefreshToken: (token) => {
    if (token) {
      saveRefreshToken(token);
    } else {
      clearTokens();
    }
    set({ refreshToken: token });
  },

  setTokens: (accessToken, refreshTokenValue) => {
    saveAccessToken(accessToken);
    saveRefreshToken(refreshTokenValue);
    set({ token: accessToken, refreshToken: refreshTokenValue, isAuthenticated: true });
  },

  logout: () => {
    clearTokens();
    set({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      places: [],
      lists: [],
      tags: [],
      notifications: [],
      unreadCount: 0,
      shareToken: null,
      followers: [],
      following: [],
      followRequests: [],
    });
  },

  // Data fetching
  fetchPlaces: async () => {
    try {
      const places = await placesApi.getAll();
      set({ places });
    } catch (error) {
      console.error('Failed to fetch places:', error);
    }
  },

  fetchLists: async () => {
    try {
      const lists = await listsApi.getAll();
      set({ lists });
    } catch (error) {
      console.error('Failed to fetch lists:', error);
    }
  },

  fetchTags: async () => {
    try {
      const tags = await tagsApi.getAll();
      set({ tags });
    } catch (error) {
      console.error('Failed to fetch tags:', error);
    }
  },

  // Phase 1: Profile actions
  fetchUserProfile: async () => {
    try {
      const user = await authApi.getUserProfile();
      set({ user });
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    }
  },

  updateUserProfile: async (updates: UserProfileUpdate) => {
    try {
      const user = await authApi.updateUserProfile(updates);
      set({ user });
    } catch (error) {
      console.error('Failed to update user profile:', error);
      throw error; // Re-throw so UI can handle the error
    }
  },

  // Phase 2: Notification actions
  fetchNotifications: async () => {
    try {
      const notifications = await notificationsApi.getAll();
      set({ notifications });
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  },

  fetchUnreadCount: async () => {
    try {
      const unreadCount = await notificationsApi.getUnreadCount();
      set({ unreadCount });
    } catch (error) {
      console.error('Failed to fetch unread count:', error);
    }
  },

  markNotificationsRead: async (notificationIds: string[]) => {
    try {
      await notificationsApi.markRead(notificationIds);
      // Update local state
      set((state) => ({
        notifications: state.notifications.map(n =>
          notificationIds.includes(n.id) ? { ...n, is_read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - notificationIds.length)
      }));
    } catch (error) {
      console.error('Failed to mark notifications as read:', error);
      throw error;
    }
  },

  markAllNotificationsRead: async () => {
    try {
      await notificationsApi.markAllRead();
      // Update local state
      set((state) => ({
        notifications: state.notifications.map(n => ({ ...n, is_read: true })),
        unreadCount: 0
      }));
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      throw error;
    }
  },

  deleteNotification: async (notificationId: string) => {
    try {
      await notificationsApi.delete(notificationId);
      // Update local state
      set((state) => {
        const notification = state.notifications.find(n => n.id === notificationId);
        const wasUnread = notification && !notification.is_read;
        return {
          notifications: state.notifications.filter(n => n.id !== notificationId),
          unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount
        };
      });
    } catch (error) {
      console.error('Failed to delete notification:', error);
      throw error;
    }
  },

  // Phase 3: Share Token actions
  fetchShareToken: async () => {
    try {
      const shareToken = await shareApi.createOrGetToken();
      set({ shareToken });
    } catch (error) {
      console.error('Failed to fetch share token:', error);
      throw error;
    }
  },

  // Phase 4: Follow actions
  fetchFollowers: async () => {
    try {
      const followers = await usersApi.getFollowers('confirmed');
      set({ followers });
    } catch (error) {
      console.error('Failed to fetch followers:', error);
      throw error;
    }
  },

  fetchFollowing: async () => {
    try {
      const following = await usersApi.getFollowing();
      set({ following });
    } catch (error) {
      console.error('Failed to fetch following:', error);
      throw error;
    }
  },

  fetchFollowRequests: async () => {
    try {
      const followRequests = await usersApi.getFollowers('pending');
      set({ followRequests });
    } catch (error) {
      console.error('Failed to fetch follow requests:', error);
      throw error;
    }
  },

  followUser: async (userId: string) => {
    try {
      await usersApi.follow(userId);
      // Refresh following list
      await get().fetchFollowing();
    } catch (error) {
      console.error('Failed to follow user:', error);
      throw error;
    }
  },

  unfollowUser: async (userId: string) => {
    try {
      await usersApi.unfollow(userId);
      // Refresh following list
      await get().fetchFollowing();
    } catch (error) {
      console.error('Failed to unfollow user:', error);
      throw error;
    }
  },

  approveFollowRequest: async (followerId: string) => {
    try {
      await usersApi.approveFollower(followerId);
      // Refresh followers and requests
      await get().fetchFollowers();
      await get().fetchFollowRequests();
    } catch (error) {
      console.error('Failed to approve follow request:', error);
      throw error;
    }
  },

  declineFollowRequest: async (followerId: string) => {
    try {
      await usersApi.declineFollower(followerId);
      // Refresh requests
      await get().fetchFollowRequests();
    } catch (error) {
      console.error('Failed to decline follow request:', error);
      throw error;
    }
  },

  // Phase 5: Map Layers actions
  setMapViewMode: (mode) => set({ mapViewMode: mode }),

  setSelectedFollowedUserIds: (userIds) => set({ selectedFollowedUserIds: userIds }),

  toggleFollowedUser: (userId) => set((state) => {
    const isSelected = state.selectedFollowedUserIds.includes(userId);
    return {
      selectedFollowedUserIds: isSelected
        ? state.selectedFollowedUserIds.filter(id => id !== userId)
        : [...state.selectedFollowedUserIds, userId]
    };
  }),

  fetchFollowedUserPlaces: async (userId: string) => {
    try {
      // First, check if this is a large map user by fetching metadata
      const metadata = await usersApi.getUserMapMetadata(userId);

      // Store metadata
      set((state) => ({
        followedUsersMetadata: {
          ...state.followedUsersMetadata,
          [userId]: metadata
        }
      }));

      // If it's a large map, mark it and don't fetch all places
      if (metadata.total_places >= LARGE_MAP_THRESHOLD) {
        set((state) => ({
          largeMapUsers: new Set([...state.largeMapUsers, userId]),
          // Initialize empty places array - will be loaded via viewport
          followedUsersPlaces: {
            ...state.followedUsersPlaces,
            [userId]: []
          }
        }));
        return;
      }

      // For small maps, fetch all places
      const mapData = await usersApi.getUserMap(userId);
      set((state) => ({
        followedUsersPlaces: {
          ...state.followedUsersPlaces,
          [userId]: mapData.places
        }
      }));
    } catch (error) {
      console.error(`Failed to fetch places for user ${userId}:`, error);
      throw error;
    }
  },

  fetchFollowedUserMetadata: async (userId: string) => {
    try {
      const metadata = await usersApi.getUserMapMetadata(userId);
      set((state) => ({
        followedUsersMetadata: {
          ...state.followedUsersMetadata,
          [userId]: metadata
        },
        largeMapUsers: metadata.total_places >= LARGE_MAP_THRESHOLD
          ? new Set([...state.largeMapUsers, userId])
          : state.largeMapUsers
      }));
      return metadata;
    } catch (error) {
      console.error(`Failed to fetch metadata for user ${userId}:`, error);
      throw error;
    }
  },

  fetchFollowedUserPlacesInBounds: async (userId: string, bounds: MapBounds) => {
    try {
      const response = await usersApi.getUserMapPlacesInBounds(userId, bounds);
      set((state) => ({
        followedUsersPlaces: {
          ...state.followedUsersPlaces,
          [userId]: response.places
        }
      }));
    } catch (error) {
      console.error(`Failed to fetch places in bounds for user ${userId}:`, error);
      throw error;
    }
  },

  isLargeMapUser: (userId: string) => {
    return get().largeMapUsers.has(userId);
  },

  clearFollowedUsersPlaces: () => set({
    followedUsersPlaces: {},
    followedUsersMetadata: {},
    largeMapUsers: new Set<string>()
  }),

  // Place actions
  addPlace: (place) => set((state) => ({ places: [...state.places, place] })),

  updatePlace: (updatedPlace) => set((state) => ({
    places: state.places.map(p => p.id === updatedPlace.id ? updatedPlace : p)
  })),

  deletePlace: (id) => set((state) => ({
    places: state.places.filter(p => p.id !== id)
  })),

  // List actions
  addList: (list) => set((state) => ({ lists: [...state.lists, list] })),

  updateList: (updatedList) => set((state) => ({
    lists: state.lists.map(l => l.id === updatedList.id ? updatedList : l)
  })),

  deleteList: (id) => set((state) => ({
    lists: state.lists.filter(l => l.id !== id)
  })),

  // Tag actions
  addTag: (tag) => set((state) => ({ tags: [...state.tags, tag] })),

  updateTag: (updatedTag) => set((state) => ({
    tags: state.tags.map(t => t.id === updatedTag.id ? updatedTag : t)
  })),

  deleteTag: (id) => set((state) => ({
    tags: state.tags.filter(t => t.id !== id)
  })),

  // UI actions
  setSelectedPlaceId: (id) => set({ selectedPlaceId: id }),
  setSelectedListId: (id) => set({ selectedListId: id }),
  setSelectedTagIds: (tagIds) => set({ selectedTagIds: tagIds }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  // Computed getters
  getFilteredPlaces: () => {
    const {
      places,
      selectedListId,
      selectedTagIds,
      searchQuery,
      mapViewMode,
      selectedFollowedUserIds,
      followedUsersPlaces
    } = get();

    // Determine which places to show based on mapViewMode
    let filtered: Place[] = [];

    if (mapViewMode === 'profile') {
      // Show user's own places
      filtered = [...places];
    } else {
      // Show places from selected followed users
      filtered = selectedFollowedUserIds.flatMap(userId =>
        followedUsersPlaces[userId] || []
      );
    }

    // Filter by list (only in profile mode, as lists belong to the user)
    if (mapViewMode === 'profile' && selectedListId) {
      filtered = filtered.filter(p =>
        p.lists.some(l => l.id === selectedListId)
      );
    }

    // Filter by tags (works in both modes - matches tag names)
    if (selectedTagIds.length > 0) {
      if (mapViewMode === 'profile') {
        // In profile mode, filter by tag IDs
        filtered = filtered.filter(p =>
          p.tags.some(t => selectedTagIds.includes(t.id))
        );
      } else {
        // In layers mode, we need to get tag names from user's tags and match by name
        const state = get();
        const selectedTagNames = state.tags
          .filter(t => selectedTagIds.includes(t.id))
          .map(t => t.name.toLowerCase());

        filtered = filtered.filter(p =>
          p.tags.some(t => selectedTagNames.includes(t.name.toLowerCase()))
        );
      }
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.address.toLowerCase().includes(query) ||
        p.notes.toLowerCase().includes(query) ||
        p.tags.some(t => t.name.toLowerCase().includes(query))
      );
    }

    return filtered;
  },
}));
