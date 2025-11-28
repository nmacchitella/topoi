// Tag color palette - discretized grid for consistent colors
export const TAG_COLORS = [
  '#EF4444', // Red
  '#F97316', // Orange
  '#F59E0B', // Amber
  '#84CC16', // Lime
  '#22C55E', // Green
  '#10B981', // Emerald
  '#14B8A6', // Teal
  '#06B6D4', // Cyan
  '#0EA5E9', // Sky
  '#3B82F6', // Blue (default)
  '#6366F1', // Indigo
  '#8B5CF6', // Violet
  '#A855F7', // Purple
  '#D946EF', // Fuchsia
  '#EC4899', // Pink
  '#F43F5E', // Rose
];

// Default tag color
export const DEFAULT_TAG_COLOR = '#3B82F6';

// Get a random color from the palette
// Uses crypto API for better randomness
export const getRandomTagColor = (): string => {
  const randomIndex = crypto.getRandomValues(new Uint32Array(1))[0] % TAG_COLORS.length;
  return TAG_COLORS[randomIndex];
};

// Material Symbol icons for tags - organized by category
// Format: { name: icon_name, keywords: [related words for matching] }
export const MATERIAL_ICONS = [
  // Food & Drink
  { name: 'restaurant', keywords: ['restaurant', 'food', 'eat', 'dining', 'dinner', 'lunch'] },
  { name: 'local_pizza', keywords: ['pizza', 'italian', 'pizzeria'] },
  { name: 'ramen_dining', keywords: ['ramen', 'noodle', 'asian', 'japanese', 'soup'] },
  { name: 'local_cafe', keywords: ['cafe', 'coffee', 'espresso', 'latte', 'cappuccino'] },
  { name: 'local_bar', keywords: ['bar', 'pub', 'beer', 'drinks', 'cocktail', 'wine'] },
  { name: 'bakery_dining', keywords: ['bakery', 'bread', 'pastry', 'cake', 'dessert'] },
  { name: 'icecream', keywords: ['ice cream', 'gelato', 'frozen', 'dessert'] },
  { name: 'breakfast_dining', keywords: ['breakfast', 'brunch', 'morning'] },
  { name: 'lunch_dining', keywords: ['lunch', 'midday'] },
  { name: 'dinner_dining', keywords: ['dinner', 'evening', 'supper'] },
  { name: 'fastfood', keywords: ['fast food', 'burger', 'quick', 'takeout', 'takeaway'] },
  { name: 'set_meal', keywords: ['sushi', 'japanese', 'asian'] },

  // Shopping & Services
  { name: 'shopping_cart', keywords: ['shopping', 'grocery', 'supermarket', 'store', 'market'] },
  { name: 'shopping_bag', keywords: ['shop', 'retail', 'boutique', 'fashion', 'clothes'] },
  { name: 'storefront', keywords: ['store', 'shop', 'retail', 'business'] },
  { name: 'local_pharmacy', keywords: ['pharmacy', 'drugstore', 'medicine', 'health'] },
  { name: 'content_cut', keywords: ['barber', 'haircut', 'salon', 'hairdresser'] },
  { name: 'spa', keywords: ['spa', 'wellness', 'massage', 'relaxation', 'beauty'] },
  { name: 'local_laundry_service', keywords: ['laundry', 'dry clean', 'washing'] },
  { name: 'local_gas_station', keywords: ['gas', 'petrol', 'fuel', 'station'] },

  // Buildings & Places
  { name: 'home', keywords: ['home', 'house', 'residence', 'apartment'] },
  { name: 'apartment', keywords: ['apartment', 'flat', 'building', 'residential'] },
  { name: 'business', keywords: ['office', 'work', 'business', 'corporate'] },
  { name: 'local_hospital', keywords: ['hospital', 'medical', 'clinic', 'health', 'doctor'] },
  { name: 'school', keywords: ['school', 'education', 'learning', 'study'] },
  { name: 'church', keywords: ['church', 'religious', 'worship', 'temple', 'mosque'] },
  { name: 'museum', keywords: ['museum', 'gallery', 'art', 'exhibition', 'history'] },
  { name: 'local_library', keywords: ['library', 'books', 'reading'] },
  { name: 'hotel', keywords: ['hotel', 'accommodation', 'lodging', 'stay', 'motel'] },
  { name: 'local_airport', keywords: ['airport', 'flight', 'travel', 'plane'] },

  // Entertainment & Culture
  { name: 'theater_comedy', keywords: ['theater', 'theatre', 'comedy', 'show', 'performance'] },
  { name: 'movie', keywords: ['movie', 'cinema', 'film', 'theater'] },
  { name: 'music_note', keywords: ['music', 'concert', 'live', 'band', 'gig'] },
  { name: 'palette', keywords: ['art', 'gallery', 'creative', 'painting', 'exhibition'] },
  { name: 'menu_book', keywords: ['book', 'bookstore', 'reading', 'literature'] },
  { name: 'nightlife', keywords: ['nightlife', 'club', 'nightclub', 'dancing', 'party'] },
  { name: 'casino', keywords: ['casino', 'gambling', 'gaming'] },
  { name: 'attractions', keywords: ['attraction', 'tourist', 'sightseeing', 'landmark'] },

  // Sports & Fitness
  { name: 'fitness_center', keywords: ['gym', 'fitness', 'workout', 'exercise', 'training'] },
  { name: 'sports_soccer', keywords: ['soccer', 'football', 'sport', 'field'] },
  { name: 'sports_basketball', keywords: ['basketball', 'court', 'sport'] },
  { name: 'sports_tennis', keywords: ['tennis', 'court', 'racket'] },
  { name: 'pool', keywords: ['pool', 'swimming', 'swim', 'aquatic'] },
  { name: 'self_improvement', keywords: ['yoga', 'meditation', 'wellness', 'mindfulness'] },
  { name: 'hiking', keywords: ['hiking', 'trail', 'walk', 'trekking'] },
  { name: 'directions_bike', keywords: ['bike', 'cycling', 'bicycle'] },
  { name: 'golf_course', keywords: ['golf', 'course', 'green'] },

  // Nature & Outdoors
  { name: 'park', keywords: ['park', 'garden', 'green', 'outdoor', 'nature'] },
  { name: 'forest', keywords: ['forest', 'woods', 'trees', 'nature'] },
  { name: 'beach_access', keywords: ['beach', 'sea', 'ocean', 'coast', 'shore'] },
  { name: 'landscape', keywords: ['mountain', 'hill', 'landscape', 'scenic', 'view'] },
  { name: 'camping', keywords: ['camping', 'camp', 'tent', 'outdoor'] },
  { name: 'water', keywords: ['water', 'lake', 'river', 'pond'] },

  // Transportation
  { name: 'flight', keywords: ['flight', 'airplane', 'travel', 'airport'] },
  { name: 'directions_car', keywords: ['car', 'drive', 'parking', 'auto'] },
  { name: 'train', keywords: ['train', 'railway', 'station', 'metro', 'subway'] },
  { name: 'directions_boat', keywords: ['boat', 'ferry', 'ship', 'port', 'marina'] },
  { name: 'local_taxi', keywords: ['taxi', 'cab', 'uber', 'lyft', 'ride'] },
  { name: 'directions_bus', keywords: ['bus', 'transit', 'public transport'] },

  // General/Favorites
  { name: 'star', keywords: ['favorite', 'best', 'top', 'starred', 'recommended'] },
  { name: 'favorite', keywords: ['love', 'heart', 'liked', 'favorite'] },
  { name: 'local_fire_department', keywords: ['hot', 'fire', 'trending', 'popular'] },
  { name: 'diamond', keywords: ['premium', 'luxury', 'special', 'exclusive'] },
  { name: 'flag', keywords: ['flag', 'marker', 'important', 'noted'] },
  { name: 'bookmark', keywords: ['saved', 'bookmark', 'later', 'remember'] },
  { name: 'pin_drop', keywords: ['location', 'place', 'spot', 'point'] },
  { name: 'explore', keywords: ['explore', 'discover', 'adventure', 'new'] },

  // Attributes/Tags
  { name: 'family_restroom', keywords: ['family', 'kid', 'child', 'children', 'friendly'] },
  { name: 'pets', keywords: ['pet', 'dog', 'cat', 'animal', 'friendly'] },
  { name: 'accessible', keywords: ['accessible', 'wheelchair', 'disability'] },
  { name: 'wifi', keywords: ['wifi', 'internet', 'wireless', 'connected'] },
  { name: 'local_parking', keywords: ['parking', 'park', 'car'] },
  { name: 'deck', keywords: ['outdoor', 'patio', 'terrace', 'seating', 'rooftop'] },
  { name: 'mood', keywords: ['romantic', 'date', 'cozy', 'intimate'] },
  { name: 'groups', keywords: ['group', 'party', 'gathering', 'event', 'social'] },
  { name: 'eco', keywords: ['eco', 'green', 'sustainable', 'organic', 'vegan', 'vegetarian'] },
  { name: 'payments', keywords: ['cheap', 'affordable', 'budget', 'inexpensive'] },
  { name: 'attach_money', keywords: ['expensive', 'pricey', 'upscale', 'fancy'] },
  { name: 'schedule', keywords: ['late', 'night', 'open', 'hours', '24h'] },
  { name: 'verified', keywords: ['verified', 'trusted', 'recommended', 'approved'] },
  { name: 'new_releases', keywords: ['new', 'recent', 'fresh', 'latest'] },
];

// Get just the icon names for the picker
export const PRESET_TAG_ICONS = MATERIAL_ICONS.map(i => i.name);

// Calculate similarity between two strings (case-insensitive)
function stringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  // Exact match
  if (s1 === s2) return 1;

  // One contains the other
  if (s1.includes(s2) || s2.includes(s1)) {
    return 0.9;
  }

  // Calculate Levenshtein distance
  const len1 = s1.length;
  const len2 = s2.length;
  const maxLen = Math.max(len1, len2);

  if (maxLen === 0) return 1;

  const matrix: number[][] = [];
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return 1 - matrix[len1][len2] / maxLen;
}

// Suggest an icon based on tag name (returns icon name if match >= 90%)
export function suggestIconForTag(tagName: string): string | null {
  const normalizedName = tagName.toLowerCase().trim();

  let bestMatch: { icon: string; score: number } | null = null;

  for (const iconDef of MATERIAL_ICONS) {
    // Check against icon name
    let score = stringSimilarity(normalizedName, iconDef.name.replace(/_/g, ' '));

    // Check against keywords
    for (const keyword of iconDef.keywords) {
      const keywordScore = stringSimilarity(normalizedName, keyword);
      if (keywordScore > score) {
        score = keywordScore;
      }

      // Also check if tag name contains keyword or vice versa
      if (normalizedName.includes(keyword) || keyword.includes(normalizedName)) {
        score = Math.max(score, 0.9);
      }
    }

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = { icon: iconDef.name, score };
    }
  }

  // Return icon if match is >= 90%
  if (bestMatch && bestMatch.score >= 0.9) {
    return bestMatch.icon;
  }

  return null;
}

// Determine if a color is light or dark (for contrast text)
export const isLightColor = (hexColor: string): boolean => {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  // Using relative luminance formula
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
};

// Get contrasting text color for a background
export const getContrastColor = (hexColor: string): string => {
  return isLightColor(hexColor) ? '#000000' : '#FFFFFF';
};
