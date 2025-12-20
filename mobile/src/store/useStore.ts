import { create } from 'zustand';
import type {
  User,
  UserProfileUpdate,
  Place,
  ListWithPlaceCount,
  TagWithUsage,
  Notification,
  ShareToken,
  UserSearchResult,
  MapBounds,
  UserMapMetadata,
} from '../types';
import {
  placesApi,
  listsApi,
  tagsApi,
  authApi,
  notificationsApi,
  shareApi,
  usersApi,
  setLogoutCallback,
  updateCachedToken,
} from '../lib/api';
import {
  setAccessToken as saveAccessToken,
  setRefreshToken as saveRefreshToken,
  clearTokens,
  setTokens as saveTokens,
} from '../lib/auth-storage';

// Threshold for when to use viewport-based loading
const LARGE_MAP_THRESHOLD = 1000;

interface AppState {
  // Auth
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;

  // Data
  places: Place[];
  lists: ListWithPlaceCount[];
  tags: TagWithUsage[];

  // Notifications
  notifications: Notification[];
  unreadCount: number;

  // Share Token
  shareToken: ShareToken | null;

  // Follow
  followers: UserSearchResult[];
  following: UserSearchResult[];
  followRequests: UserSearchResult[];

  // Map Layers (Followed Users)
  mapViewMode: 'profile' | 'layers';
  selectedFollowedUserIds: string[];
  followedUsersPlaces: Record<string, Place[]>;
  followedUsersMetadata: Record<string, UserMapMetadata>;
  largeMapUsers: Set<string>;

  // UI State
  selectedPlaceId: string | null;
  selectedListId: string | null;
  selectedTagIds: string[];
  tagFilterMode: 'any' | 'all';
  searchQuery: string;
  viewMode: 'map' | 'list';

  // Actions
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setRefreshToken: (refreshToken: string | null) => void;
  setTokens: (accessToken: string, refreshToken: string) => Promise<void>;
  setInitialized: (initialized: boolean) => void;
  logout: () => Promise<void>;

  // Data Actions
  fetchPlaces: () => Promise<void>;
  fetchLists: () => Promise<void>;
  fetchTags: () => Promise<void>;
  fetchUserProfile: () => Promise<void>;
  updateUserProfile: (updates: UserProfileUpdate) => Promise<void>;

  // Notification Actions
  fetchNotifications: () => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markNotificationsRead: (notificationIds: string[]) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;

  // Share Token Actions
  fetchShareToken: () => Promise<void>;

  // Follow Actions
  fetchFollowers: () => Promise<void>;
  fetchFollowing: () => Promise<void>;
  fetchFollowRequests: () => Promise<void>;
  followUser: (userId: string) => Promise<void>;
  unfollowUser: (userId: string) => Promise<void>;
  approveFollowRequest: (followerId: string) => Promise<void>;
  declineFollowRequest: (followerId: string) => Promise<void>;

  // Map Layers Actions
  setMapViewMode: (mode: 'profile' | 'layers') => void;
  setSelectedFollowedUserIds: (userIds: string[]) => void;
  toggleFollowedUser: (userId: string) => void;
  fetchFollowedUserPlaces: (userId: string) => Promise<void>;
  fetchFollowedUserMetadata: (userId: string) => Promise<UserMapMetadata>;
  fetchFollowedUserPlacesInBounds: (userId: string, bounds: MapBounds) => Promise<void>;
  isLargeMapUser: (userId: string) => boolean;
  clearFollowedUsersPlaces: () => void;

  // Place Actions
  addPlace: (place: Place) => void;
  updatePlace: (place: Place) => void;
  deletePlace: (id: string) => void;

  // List Actions
  addList: (list: ListWithPlaceCount) => void;
  updateList: (list: ListWithPlaceCount) => void;
  deleteList: (id: string) => void;

  // Tag Actions
  addTag: (tag: TagWithUsage) => void;
  updateTag: (tag: TagWithUsage) => void;
  deleteTag: (id: string) => void;

  // UI Actions
  setSelectedPlaceId: (id: string | null) => void;
  setSelectedListId: (id: string | null) => void;
  setSelectedTagIds: (tagIds: string[]) => void;
  setTagFilterMode: (mode: 'any' | 'all') => void;
  setSearchQuery: (query: string) => void;
  setViewMode: (mode: 'map' | 'list') => void;

  // Computed
  getFilteredPlaces: () => Place[];
}

export const useStore = create<AppState>((set, get) => {
  // Set up logout callback for API interceptor
  setLogoutCallback(() => {
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
    updateCachedToken(null);
  });

  return {
    // Initial state
    user: null,
    token: null,
    refreshToken: null,
    isAuthenticated: false,
    isInitialized: false,
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
    tagFilterMode: 'any',
    searchQuery: '',
    viewMode: 'map',

    // Auth actions
    setUser: (user) => set({ user, isAuthenticated: !!user }),

    setToken: (token) => {
      updateCachedToken(token);
      set({ token, isAuthenticated: !!token });
    },

    setRefreshToken: (token) => {
      set({ refreshToken: token });
    },

    setTokens: async (accessToken, refreshTokenValue) => {
      await saveTokens(accessToken, refreshTokenValue);
      updateCachedToken(accessToken);
      set({ token: accessToken, refreshToken: refreshTokenValue, isAuthenticated: true });
    },

    setInitialized: (initialized) => set({ isInitialized: initialized }),

    logout: async () => {
      await clearTokens();
      updateCachedToken(null);
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
        throw error;
      }
    },

    // Notification actions
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

    // Share Token actions
    fetchShareToken: async () => {
      try {
        const shareToken = await shareApi.createOrGetToken();
        set({ shareToken });
      } catch (error) {
        console.error('Failed to fetch share token:', error);
        throw error;
      }
    },

    // Follow actions
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
        await get().fetchFollowing();
      } catch (error) {
        console.error('Failed to follow user:', error);
        throw error;
      }
    },

    unfollowUser: async (userId: string) => {
      try {
        await usersApi.unfollow(userId);
        await get().fetchFollowing();
      } catch (error) {
        console.error('Failed to unfollow user:', error);
        throw error;
      }
    },

    approveFollowRequest: async (followerId: string) => {
      try {
        await usersApi.approveFollower(followerId);
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
        await get().fetchFollowRequests();
      } catch (error) {
        console.error('Failed to decline follow request:', error);
        throw error;
      }
    },

    // Map Layers actions
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
        const metadata = await usersApi.getUserMapMetadata(userId);

        set((state) => ({
          followedUsersMetadata: {
            ...state.followedUsersMetadata,
            [userId]: metadata
          }
        }));

        if (metadata.total_places >= LARGE_MAP_THRESHOLD) {
          set((state) => ({
            largeMapUsers: new Set([...state.largeMapUsers, userId]),
            followedUsersPlaces: {
              ...state.followedUsersPlaces,
              [userId]: []
            }
          }));
          return;
        }

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
    setTagFilterMode: (mode) => set({ tagFilterMode: mode }),
    setSearchQuery: (query) => set({ searchQuery: query }),
    setViewMode: (mode) => set({ viewMode: mode }),

    // Computed getters
    getFilteredPlaces: () => {
      const {
        places,
        selectedListId,
        selectedTagIds,
        tagFilterMode,
        searchQuery,
        mapViewMode,
        selectedFollowedUserIds,
        followedUsersPlaces
      } = get();

      let filtered: Place[] = [];

      if (mapViewMode === 'profile') {
        filtered = [...places];
      } else {
        filtered = selectedFollowedUserIds.flatMap(userId =>
          followedUsersPlaces[userId] || []
        );
      }

      // Filter by list (only in profile mode)
      if (mapViewMode === 'profile' && selectedListId) {
        filtered = filtered.filter(p =>
          p.lists.some(l => l.id === selectedListId)
        );
      }

      // Filter by tags
      if (selectedTagIds.length > 0) {
        if (mapViewMode === 'profile') {
          if (tagFilterMode === 'any') {
            filtered = filtered.filter(p =>
              p.tags.some(t => selectedTagIds.includes(t.id))
            );
          } else {
            filtered = filtered.filter(p =>
              selectedTagIds.every(tagId =>
                p.tags.some(t => t.id === tagId)
              )
            );
          }
        } else {
          const state = get();
          const selectedTagNames: string[] = [];

          state.selectedFollowedUserIds.forEach(userId => {
            const metadata = state.followedUsersMetadata[userId];
            if (metadata?.tags) {
              metadata.tags.forEach(tag => {
                if (selectedTagIds.includes(tag.id)) {
                  selectedTagNames.push(tag.name.toLowerCase());
                }
              });
            }
          });

          const uniqueTagNames = [...new Set(selectedTagNames)];

          if (tagFilterMode === 'any') {
            filtered = filtered.filter(p =>
              p.tags.some(t => uniqueTagNames.includes(t.name.toLowerCase()))
            );
          } else {
            filtered = filtered.filter(p =>
              uniqueTagNames.every(tagName =>
                p.tags.some(t => t.name.toLowerCase() === tagName)
              )
            );
          }
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
  };
});
