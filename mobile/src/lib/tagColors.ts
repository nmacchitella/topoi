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
export const getRandomTagColor = (): string => {
  const randomIndex = Math.floor(Math.random() * TAG_COLORS.length);
  return TAG_COLORS[randomIndex];
};

// Material Symbol icons for tags - comprehensive list organized by category
export const MATERIAL_ICONS = [
  // Food & Drink
  { name: 'restaurant', keywords: ['restaurant', 'food', 'eat', 'dining', 'dinner', 'lunch'] },
  { name: 'local_cafe', keywords: ['cafe', 'coffee', 'espresso', 'latte', 'cappuccino'] },
  { name: 'local_bar', keywords: ['bar', 'pub', 'beer', 'drinks', 'cocktail', 'wine'] },
  { name: 'bakery_dining', keywords: ['bakery', 'bread', 'pastry', 'cake', 'dessert'] },
  { name: 'icecream', keywords: ['ice cream', 'gelato', 'frozen', 'dessert'] },
  { name: 'fastfood', keywords: ['fast food', 'burger', 'quick', 'takeout', 'takeaway'] },
  { name: 'local_pizza', keywords: ['pizza', 'italian', 'pizzeria'] },
  { name: 'ramen_dining', keywords: ['ramen', 'noodle', 'asian', 'japanese', 'soup', 'pho'] },

  // Shopping & Services
  { name: 'shopping_cart', keywords: ['shopping', 'grocery', 'supermarket', 'store', 'market'] },
  { name: 'shopping_bag', keywords: ['shop', 'retail', 'boutique', 'fashion', 'clothes'] },
  { name: 'storefront', keywords: ['store', 'shop', 'retail', 'business'] },
  { name: 'local_mall', keywords: ['mall', 'shopping center', 'retail'] },
  { name: 'spa', keywords: ['spa', 'wellness', 'massage', 'relaxation', 'beauty'] },
  { name: 'content_cut', keywords: ['barber', 'haircut', 'salon', 'hairdresser'] },

  // Buildings & Places
  { name: 'home', keywords: ['home', 'house', 'residence', 'apartment'] },
  { name: 'business', keywords: ['office', 'work', 'business', 'corporate'] },
  { name: 'local_hospital', keywords: ['hospital', 'medical', 'clinic', 'health', 'doctor'] },
  { name: 'school', keywords: ['school', 'education', 'learning', 'study'] },
  { name: 'museum', keywords: ['museum', 'gallery', 'art', 'exhibition', 'history'] },
  { name: 'hotel', keywords: ['hotel', 'accommodation', 'lodging', 'stay', 'motel'] },
  { name: 'church', keywords: ['church', 'religious', 'worship', 'christian'] },
  { name: 'local_airport', keywords: ['airport', 'flight', 'travel', 'plane'] },

  // Entertainment & Culture
  { name: 'theater_comedy', keywords: ['theater', 'theatre', 'comedy', 'show', 'performance'] },
  { name: 'movie', keywords: ['movie', 'cinema', 'film', 'theater'] },
  { name: 'music_note', keywords: ['music', 'concert', 'live', 'band', 'gig'] },
  { name: 'palette', keywords: ['art', 'gallery', 'creative', 'painting', 'exhibition'] },
  { name: 'nightlife', keywords: ['nightlife', 'club', 'nightclub', 'dancing', 'party'] },

  // Sports & Fitness
  { name: 'fitness_center', keywords: ['gym', 'fitness', 'workout', 'exercise', 'training'] },
  { name: 'sports_soccer', keywords: ['soccer', 'football', 'sport', 'field'] },
  { name: 'sports_basketball', keywords: ['basketball', 'court', 'sport', 'nba'] },
  { name: 'sports_tennis', keywords: ['tennis', 'court', 'racket'] },
  { name: 'pool', keywords: ['pool', 'swimming', 'swim', 'aquatic'] },

  // Nature & Outdoors
  { name: 'park', keywords: ['park', 'garden', 'green', 'outdoor', 'nature'] },
  { name: 'forest', keywords: ['forest', 'woods', 'trees', 'nature'] },
  { name: 'beach_access', keywords: ['beach', 'sea', 'ocean', 'coast', 'shore'] },
  { name: 'landscape', keywords: ['mountain', 'hill', 'landscape', 'scenic', 'view'] },
  { name: 'camping', keywords: ['camping', 'camp', 'tent', 'outdoor'] },
  { name: 'hiking', keywords: ['hiking', 'trail', 'walk', 'trekking'] },

  // Transportation
  { name: 'flight', keywords: ['flight', 'airplane', 'travel', 'airport'] },
  { name: 'directions_car', keywords: ['car', 'drive', 'parking', 'auto'] },
  { name: 'train', keywords: ['train', 'railway', 'station', 'metro', 'subway'] },
  { name: 'directions_bus', keywords: ['bus', 'transit', 'public transport'] },
  { name: 'directions_bike', keywords: ['bike', 'cycling', 'bicycle'] },

  // General/Favorites
  { name: 'star', keywords: ['favorite', 'best', 'top', 'starred', 'recommended'] },
  { name: 'favorite', keywords: ['love', 'heart', 'liked', 'favorite'] },
  { name: 'bookmark', keywords: ['saved', 'bookmark', 'later', 'remember'] },
  { name: 'place', keywords: ['place', 'location', 'map'] },
  { name: 'explore', keywords: ['explore', 'discover', 'adventure', 'new'] },
  { name: 'whatshot', keywords: ['hot', 'trending', 'popular', 'fire'] },
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
