export interface User {
  id: string;
  email: string;
  name: string;
  is_admin: boolean;
  created_at: string;
  username?: string;
  bio?: string;
  is_public: boolean;
  profile_image_url?: string;
  follower_count?: number;
  following_count?: number;
}

export interface UserProfileUpdate {
  name?: string;
  username?: string;
  bio?: string;
  is_public?: boolean;
}

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  color: string;
  icon?: string;
  created_at: string;
}

export interface TagWithUsage extends Tag {
  usage_count: number;
}

export interface List {
  id: string;
  user_id: string;
  name: string;
  color: string;
  icon?: string;
  is_public: boolean;
  created_at: string;
}

export interface ListWithPlaceCount extends List {
  place_count: number;
  owner_name?: string;
  owner_username?: string;
}

export interface Place {
  id: string;
  user_id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  notes: string;
  phone?: string;
  website?: string;
  hours?: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  lists: List[];
  tags: Tag[];
}

export interface PlaceCreate {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  notes?: string;
  phone?: string;
  website?: string;
  hours?: string;
  is_public?: boolean;
  list_ids?: string[];
  tag_ids?: string[];
}

export interface PlaceUpdate {
  name?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
  phone?: string;
  website?: string;
  hours?: string;
  is_public?: boolean;
  list_ids?: string[];
  tag_ids?: string[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  name: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface NominatimResult {
  place_id: number | string;
  lat: string;
  lon: string;
  display_name: string;
  address: {
    road?: string;
    house_number?: string;
    city?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
  type?: string;
  category?: string;
  // Google Places metadata (optional)
  google_metadata?: {
    name?: string;
    website?: string;
    phone?: string;
    hours?: string;
    google_maps_uri?: string;
    types?: string[];
  };
}

export interface ImportPlacePreview {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  notes: string;
  phone: string;
  website: string;
  hours: string;
  tags: string[];
  is_duplicate: boolean;
  error?: string;
}

export interface ImportPreviewResponse {
  places: ImportPlacePreview[];
  summary: {
    total: number;
    successful: number;
    duplicates: number;
    failed: number;
    errors?: string[];
  };
}

export interface ImportConfirmRequest {
  places: ImportPlacePreview[];
}

// Phase 2: Notification types
export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  link?: string;
  is_read: boolean;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface NotificationMarkRead {
  notification_ids: string[];
}

// Phase 3: Share Token types
export interface ShareToken {
  id: string;
  user_id: string;
  token: string;
  created_at: string;
}

export interface PublicUserProfile {
  id: string;
  name: string;
  username?: string;
  bio?: string;
  profile_image_url?: string;
}

export interface SharedMapData {
  user: PublicUserProfile;
  places: Place[];
  lists: ListWithPlaceCount[];
  tags: TagWithUsage[];
}

// Phase 4: User Follow types
export interface UserSearchResult {
  id: string;
  name: string;
  username?: string;
  profile_image_url?: string;
  is_public: boolean;
  is_followed_by_me: boolean;
  follow_status?: 'pending' | 'confirmed' | null;
}

export interface UserFollow {
  id: string;
  follower_id: string;
  following_id: string;
  status: 'pending' | 'confirmed' | 'declined';
  created_at: string;
  updated_at: string;
}

export interface FollowRequest {
  user_id: string;
}

export interface FollowResponse {
  status: 'pending' | 'confirmed';
  message: string;
}

export interface UserProfilePublic {
  id: string;
  name: string;
  username?: string;
  bio?: string;
  profile_image_url?: string;
  is_public: boolean;
  follower_count: number;
  following_count: number;
  is_followed_by_me: boolean;
  follow_status?: 'pending' | 'confirmed' | null;
}
