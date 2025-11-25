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
