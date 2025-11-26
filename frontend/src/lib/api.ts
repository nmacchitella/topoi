import axios from 'axios';
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
  NotificationMarkRead,
  ShareToken,
  SharedMapData,
  UserSearchResult,
  UserProfilePublic,
  FollowRequest,
  FollowResponse
} from '@/types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors with auto-refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (reason?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
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

      const refreshToken = localStorage.getItem('refresh_token');

      if (!refreshToken) {
        // No refresh token - logout
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }

      try {
        // Try to refresh the token
        const response = await axios.post(`${API_URL}/auth/refresh`, {
          refresh_token: refreshToken
        });

        const { access_token, refresh_token: new_refresh_token } = response.data;

        // Save new tokens
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('refresh_token', new_refresh_token);

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
        processQueue(refreshError, null);
        isRefreshing = false;

        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
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

  googleLogin: async (): Promise<{ authorization_url: string }> => {
    const response = await api.get<{ authorization_url: string }>('/auth/google/login');
    return response.data;
  },

  // Phase 1: Profile management
  getUserProfile: async (): Promise<User> => {
    const response = await api.get<User>('/auth/profile');
    return response.data;
  },

  updateUserProfile: async (data: UserProfileUpdate): Promise<User> => {
    const response = await api.patch<User>('/auth/profile', data);
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

  create: async (name: string): Promise<Tag> => {
    const response = await api.post<Tag>('/tags', { name });
    return response.data;
  },

  update: async (id: string, name: string): Promise<Tag> => {
    const response = await api.put<Tag>(`/tags/${id}`, { name });
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

  // Google Places Autocomplete (via backend)
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

  // Get place details (lat/lng + metadata) from place_id (via backend)
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

// Sharing (public endpoints)
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

  // Phase 3: Share Token endpoints
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
  importData: async (file: File): Promise<{ success: boolean; summary: any }> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<{ success: boolean; summary: any }>('/data/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  previewImport: async (file: File): Promise<ImportPreviewResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<ImportPreviewResponse>('/data/import/preview', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  confirmImport: async (places: ImportPlacePreview[]): Promise<{ message: string; summary: any }> => {
    const response = await api.post<{ message: string; summary: any }>('/data/import/confirm', {
      places,
    });
    return response.data;
  },
};

// Phase 2: Notifications
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

// Phase 4: Users & Follow
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

  // Phase 5: Map Consumption
  getUserMap: async (userId: string): Promise<SharedMapData> => {
    const response = await api.get<SharedMapData>(`/users/${userId}/map`);
    return response.data;
  },
};

// Phase 5: Place Adoption
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

export default api;
