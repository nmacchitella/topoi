import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import Constants from 'expo-constants';
import {
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
  clearTokens,
} from './auth-storage';
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  User,
  UserProfileUpdate,
  Place,
  PlaceCreate,
  PlaceUpdate,
  List,
  ListWithPlaceCount,
  Tag,
  TagWithUsage,
  NominatimResult,
  ImportPlacePreview,
  ImportPreviewResponse,
  Notification,
  ShareToken,
  SharedMapData,
  UserSearchResult,
  UserProfilePublic,
  FollowResponse,
  MapBounds,
  PlacesInBoundsResponse,
  UserMapMetadata,
} from '../types';

// Get API URL from app config or use default
const getApiUrl = (): string => {
  const extra = Constants.expoConfig?.extra;

  // Use dev API in development, production API otherwise
  if (__DEV__) {
    return extra?.devApiUrl || 'https://topoi-backend-dev.fly.dev/api';
  }

  return extra?.apiUrl || 'https://topoi-backend.fly.dev/api';
};

const API_URL = getApiUrl();

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token management for request interceptor
let cachedToken: string | null = null;

// Function to update cached token
export const updateCachedToken = (token: string | null) => {
  cachedToken = token;
};

// Add token to requests if available
api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  // Use cached token if available, otherwise fetch from secure storage
  let token = cachedToken;
  if (!token) {
    token = await getAccessToken();
    cachedToken = token;
  }

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors with auto-refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Callback for handling logout (will be set by the store)
let onLogout: (() => void) | null = null;

export const setLogoutCallback = (callback: () => void) => {
  onLogout = callback;
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue the request while refresh is in progress
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return api(originalRequest);
          })
          .catch(err => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = await getRefreshToken();

      if (!refreshToken) {
        // No refresh token - logout
        await clearTokens();
        cachedToken = null;
        onLogout?.();
        return Promise.reject(error);
      }

      try {
        // Try to refresh the token
        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refresh_token: refreshToken
        });

        const { access_token, refresh_token: new_refresh_token } = response.data;

        // Save new tokens
        await setAccessToken(access_token);
        await setRefreshToken(new_refresh_token);
        cachedToken = access_token;

        // Update authorization header
        api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
        originalRequest.headers.Authorization = `Bearer ${access_token}`;

        // Process queued requests
        processQueue(null, access_token);

        isRefreshing = false;

        // Retry original request
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed - logout
        processQueue(refreshError as Error, null);
        isRefreshing = false;

        await clearTokens();
        cachedToken = null;
        onLogout?.();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Authentication
export const authApi = {
  register: async (data: RegisterRequest): Promise<User> => {
    const response = await api.post<User>('/auth/register', data);
    return response.data;
  },

  login: async (data: LoginRequest): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login-json', data);
    return response.data;
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await api.get<User>('/auth/me');
    return response.data;
  },

  updateProfile: async (data: { name?: string; email?: string }): Promise<User> => {
    const response = await api.put<User>('/auth/me', data);
    return response.data;
  },

  changePassword: async (data: { current_password: string; new_password: string }): Promise<{ message: string }> => {
    const response = await api.put<{ message: string }>('/auth/me/password', data);
    return response.data;
  },

  deleteAccount: async (): Promise<{ message: string }> => {
    const response = await api.delete<{ message: string }>('/auth/me');
    return response.data;
  },

  getUserProfile: async (): Promise<User> => {
    const response = await api.get<User>('/auth/profile');
    return response.data;
  },

  updateUserProfile: async (data: UserProfileUpdate): Promise<User> => {
    const response = await api.patch<User>('/auth/profile', data);
    return response.data;
  },

  verifyEmail: async (token: string): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>(`/auth/verify-email?token=${token}`);
    return response.data;
  },

  resendVerification: async (email: string): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>(`/auth/resend-verification?email=${email}`);
    return response.data;
  },

  forgotPassword: async (email: string): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>(`/auth/forgot-password?email=${email}`);
    return response.data;
  },

  resetPassword: async (token: string, newPassword: string): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>(`/auth/reset-password?token=${token}&new_password=${newPassword}`);
    return response.data;
  },

  googleMobileAuth: async (idToken: string): Promise<AuthResponse & { user: { id: string; email: string; name: string } }> => {
    const response = await api.post('/auth/google/mobile', { id_token: idToken });
    return response.data;
  },
};

// Places
export const placesApi = {
  getAll: async (): Promise<Place[]> => {
    const response = await api.get<Place[]>('/places');
    return response.data;
  },

  getById: async (id: string): Promise<Place> => {
    const response = await api.get<Place>(`/places/${id}`);
    return response.data;
  },

  create: async (data: PlaceCreate): Promise<Place> => {
    const response = await api.post<Place>('/places', data);
    return response.data;
  },

  update: async (id: string, data: PlaceUpdate): Promise<Place> => {
    const response = await api.put<Place>(`/places/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/places/${id}`);
  },

  togglePublic: async (id: string): Promise<Place> => {
    const response = await api.patch<Place>(`/places/${id}/public`);
    return response.data;
  },
};

// Lists
export const listsApi = {
  getAll: async (): Promise<ListWithPlaceCount[]> => {
    const response = await api.get<ListWithPlaceCount[]>('/lists');
    return response.data;
  },

  getById: async (id: string): Promise<List> => {
    const response = await api.get<List>(`/lists/${id}`);
    return response.data;
  },

  create: async (data: Partial<List>): Promise<List> => {
    const response = await api.post<List>('/lists', data);
    return response.data;
  },

  update: async (id: string, data: Partial<List>): Promise<List> => {
    const response = await api.put<List>(`/lists/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/lists/${id}`);
  },

  getPlaces: async (id: string): Promise<Place[]> => {
    const response = await api.get<Place[]>(`/lists/${id}/places`);
    return response.data;
  },

  searchPublic: async (query: string, limit: number = 20): Promise<ListWithPlaceCount[]> => {
    const response = await api.get<ListWithPlaceCount[]>('/lists/search/public', {
      params: { q: query, limit },
    });
    return response.data;
  },
};

// Tags
export const tagsApi = {
  getAll: async (): Promise<TagWithUsage[]> => {
    const response = await api.get<TagWithUsage[]>('/tags');
    return response.data;
  },

  getById: async (id: string): Promise<Tag> => {
    const response = await api.get<Tag>(`/tags/${id}`);
    return response.data;
  },

  create: async (name: string, color?: string, icon?: string): Promise<Tag> => {
    const response = await api.post<Tag>('/tags', { name, color, icon });
    return response.data;
  },

  update: async (id: string, data: { name?: string; color?: string; icon?: string }): Promise<Tag> => {
    const response = await api.put<Tag>(`/tags/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/tags/${id}`);
  },

  getPlaces: async (id: string): Promise<Place[]> => {
    const response = await api.get<Place[]>(`/tags/${id}/places`);
    return response.data;
  },
};

// Google Places result type
export interface GooglePlaceResult {
  place_id: string;
  description: string;
  main_text: string;
  secondary_text: string;
}

// Google Place details type
export interface GooglePlaceDetails {
  lat: number;
  lng: number;
  address: string;
  name: string;
  google_maps_uri: string;
  types: string[];
  website: string;
  phone: string;
  hours: string;
  business_status: string;
}

// Search
export const searchApi = {
  nominatim: async (query: string, limit: number = 5): Promise<NominatimResult[]> => {
    const response = await api.get<NominatimResult[]>('/search/nominatim', {
      params: { q: query, limit },
    });
    return response.data;
  },

  reverse: async (latitude: number, longitude: number): Promise<NominatimResult> => {
    const response = await api.post<NominatimResult>('/search/reverse', {
      latitude,
      longitude,
    });
    return response.data;
  },

  googlePlaces: async (query: string, lat?: number, lng?: number): Promise<GooglePlaceResult[]> => {
    try {
      const params: { q: string; lat?: number; lng?: number } = { q: query };
      if (lat !== undefined && lng !== undefined) {
        params.lat = lat;
        params.lng = lng;
      }
      const response = await api.get<GooglePlaceResult[]>('/search/google/autocomplete', { params });
      return response.data;
    } catch (error) {
      console.warn('Google Places search failed');
      return [];
    }
  },

  googlePlaceDetails: async (placeId: string): Promise<GooglePlaceDetails | null> => {
    try {
      const response = await api.get<GooglePlaceDetails>(`/search/google/details/${placeId}`);
      return response.data;
    } catch (error) {
      console.warn('Google Place details failed');
      return null;
    }
  },
};

// Sharing
export const shareApi = {
  getSharedMap: async (userId: string, listId?: string): Promise<Place[]> => {
    const params = listId ? { list_id: listId } : {};
    const response = await api.get<Place[]>(`/share/map/${userId}`, { params });
    return response.data;
  },

  getSharedList: async (listId: string): Promise<Place[]> => {
    const response = await api.get<Place[]>(`/share/list/${listId}`);
    return response.data;
  },

  getSharedPlace: async (placeId: string): Promise<Place> => {
    const response = await api.get<Place>(`/share/place/${placeId}`);
    return response.data;
  },

  createOrGetToken: async (): Promise<ShareToken> => {
    const response = await api.post<ShareToken>('/share/token');
    return response.data;
  },

  getSharedMapByToken: async (token: string): Promise<SharedMapData> => {
    const response = await api.get<SharedMapData>(`/share/${token}`);
    return response.data;
  },
};

// Data import/export
export const dataApi = {
  importData: async (file: FormData): Promise<{ success: boolean; summary: unknown }> => {
    const response = await api.post<{ success: boolean; summary: unknown }>('/data/import', file, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  previewImport: async (file: FormData): Promise<ImportPreviewResponse> => {
    const response = await api.post<ImportPreviewResponse>('/data/import/preview', file, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  confirmImport: async (places: ImportPlacePreview[]): Promise<{ message: string; summary: unknown }> => {
    const response = await api.post<{ message: string; summary: unknown }>('/data/import/confirm', {
      places,
    });
    return response.data;
  },
};

// Notifications
export const notificationsApi = {
  getAll: async (skip: number = 0, limit: number = 50): Promise<Notification[]> => {
    const response = await api.get<Notification[]>('/notifications', {
      params: { skip, limit }
    });
    return response.data;
  },

  getUnreadCount: async (): Promise<number> => {
    const response = await api.get<{ count: number }>('/notifications/unread-count');
    return response.data.count;
  },

  markRead: async (notificationIds: string[]): Promise<number> => {
    const response = await api.post<{ marked_read: number }>('/notifications/mark-read', {
      notification_ids: notificationIds
    });
    return response.data.marked_read;
  },

  markAllRead: async (): Promise<number> => {
    const response = await api.post<{ marked_read: number }>('/notifications/mark-all-read');
    return response.data.marked_read;
  },

  delete: async (notificationId: string): Promise<void> => {
    await api.delete(`/notifications/${notificationId}`);
  },
};

// Users & Follow
export const usersApi = {
  search: async (query: string, limit: number = 20): Promise<UserSearchResult[]> => {
    const response = await api.get<UserSearchResult[]>('/users/search', {
      params: { q: query, limit }
    });
    return response.data;
  },

  getProfile: async (userId: string): Promise<UserProfilePublic> => {
    const response = await api.get<UserProfilePublic>(`/users/${userId}`);
    return response.data;
  },

  follow: async (userId: string): Promise<FollowResponse> => {
    const response = await api.post<FollowResponse>('/users/follow', {
      user_id: userId
    });
    return response.data;
  },

  unfollow: async (userId: string): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>(`/users/unfollow/${userId}`);
    return response.data;
  },

  getFollowers: async (status: 'pending' | 'confirmed' = 'confirmed'): Promise<UserSearchResult[]> => {
    const response = await api.get<UserSearchResult[]>('/users/me/followers', {
      params: { status }
    });
    return response.data;
  },

  getFollowing: async (): Promise<UserSearchResult[]> => {
    const response = await api.get<UserSearchResult[]>('/users/me/following');
    return response.data;
  },

  approveFollower: async (followerId: string): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>(`/users/followers/${followerId}/approve`);
    return response.data;
  },

  declineFollower: async (followerId: string): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>(`/users/followers/${followerId}/decline`);
    return response.data;
  },

  getUserMap: async (userId: string): Promise<SharedMapData> => {
    const response = await api.get<SharedMapData>(`/users/${userId}/map`);
    return response.data;
  },

  getUserMapMetadata: async (userId: string): Promise<UserMapMetadata> => {
    const response = await api.get<UserMapMetadata>(`/users/${userId}/map/metadata`);
    return response.data;
  },

  getUserMapPlacesInBounds: async (
    userId: string,
    bounds: MapBounds,
    limit: number = 500
  ): Promise<PlacesInBoundsResponse> => {
    const response = await api.get<PlacesInBoundsResponse>(`/users/${userId}/map/places`, {
      params: {
        min_lat: bounds.minLat,
        max_lat: bounds.maxLat,
        min_lng: bounds.minLng,
        max_lng: bounds.maxLng,
        limit
      }
    });
    return response.data;
  },
};

// Place Adoption
export interface AdoptPlaceRequest {
  place_id: string;
  list_id?: string;
}

export const placesAdoptApi = {
  adoptPlace: async (request: AdoptPlaceRequest): Promise<Place> => {
    const response = await api.post<Place>('/places/adopt', request);
    return response.data;
  },
};

// Explore API
export interface TopPlace {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  notes: string;
  user_count: number;
  distance_km: number;
  owner: {
    id: string;
    name: string;
    username: string | null;
  } | null;
  tags: Array<{
    id: string;
    name: string;
    color: string;
    icon: string | null;
  }>;
}

export const exploreApi = {
  getTopUsers: async (limit: number = 5): Promise<UserSearchResult[]> => {
    const response = await api.get<UserSearchResult[]>('/explore/top-users', {
      params: { limit }
    });
    return response.data;
  },

  getTopPlaces: async (lat?: number, lng?: number, limit: number = 10): Promise<TopPlace[]> => {
    const params: Record<string, number> = { limit };
    if (lat !== undefined) params.lat = lat;
    if (lng !== undefined) params.lng = lng;

    const response = await api.get<TopPlace[]>('/explore/top-places', { params });
    return response.data;
  },
};

export default api;
