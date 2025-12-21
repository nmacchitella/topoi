import React from 'react';
import { Ionicons } from '@expo/vector-icons';

// Map Material Symbol names to Ionicons equivalents
const ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  // Food & Drink
  restaurant: 'restaurant',
  local_cafe: 'cafe',
  local_bar: 'beer',
  bakery_dining: 'cafe-outline',
  icecream: 'ice-cream',
  fastfood: 'fast-food',
  local_pizza: 'pizza',
  ramen_dining: 'restaurant-outline',

  // Shopping & Services
  shopping_cart: 'cart',
  shopping_bag: 'bag',
  storefront: 'storefront',
  local_mall: 'business',
  spa: 'flower',
  content_cut: 'cut',

  // Buildings & Places
  home: 'home',
  business: 'business',
  local_hospital: 'medkit',
  school: 'school',
  museum: 'library',
  hotel: 'bed',
  church: 'heart',
  local_airport: 'airplane',

  // Entertainment & Culture
  theater_comedy: 'happy',
  movie: 'film',
  music_note: 'musical-notes',
  palette: 'color-palette',
  nightlife: 'moon',

  // Sports & Fitness
  fitness_center: 'fitness',
  sports_soccer: 'football',
  sports_basketball: 'basketball',
  sports_tennis: 'tennisball',
  pool: 'water',

  // Nature & Outdoors
  park: 'leaf',
  forest: 'leaf',
  beach_access: 'umbrella',
  landscape: 'image',
  camping: 'bonfire',
  hiking: 'walk',

  // Transportation
  flight: 'airplane',
  directions_car: 'car',
  train: 'train',
  directions_bus: 'bus',
  directions_bike: 'bicycle',

  // General/Favorites
  star: 'star',
  favorite: 'heart',
  bookmark: 'bookmark',
  place: 'location',
  explore: 'compass',
  whatshot: 'flame',
};

interface TagIconProps {
  icon?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  color?: string;
}

const SIZE_MAP = {
  xs: 10,
  sm: 12,
  md: 16,
  lg: 20,
};

export default function TagIcon({ icon, size = 'sm', color = '#faf9f5' }: TagIconProps) {
  if (!icon) return null;

  const ionIconName = ICON_MAP[icon];
  if (!ionIconName) return null;

  return (
    <Ionicons name={ionIconName} size={SIZE_MAP[size]} color={color} />
  );
}
