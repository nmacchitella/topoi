export interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
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
  category: string;
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
  category: string;
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
  category?: string;
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
  token_type: string;
}

export interface NominatimResult {
  place_id: number;
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
}

export const CATEGORIES = [
  'restaurant',
  'cafe',
  'bar',
  'park',
  'shop',
  'culture',
  'other'
] as const;

export type Category = typeof CATEGORIES[number];

export const CATEGORY_COLORS: Record<Category, string> = {
  restaurant: '#EF4444',
  cafe: '#F59E0B',
  bar: '#8B5CF6',
  park: '#10B981',
  shop: '#3B82F6',
  culture: '#EC4899',
  other: '#6B7280'
};

export const CATEGORY_LABELS: Record<Category, string> = {
  restaurant: 'Restaurant',
  cafe: 'Cafe',
  bar: 'Bar',
  park: 'Park',
  shop: 'Shop',
  culture: 'Culture',
  other: 'Other'
};
