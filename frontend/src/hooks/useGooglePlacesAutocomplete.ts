import { useState, useRef } from 'react';
import { searchApi, GooglePlaceResult } from '@/lib/api';

export interface UseGooglePlacesAutocompleteReturn {
  loading: boolean;
  results: GooglePlaceResult[];
  query: string;
  showDropdown: boolean;
  search: (query: string) => void;
  clear: () => void;
  setShowDropdown: (show: boolean) => void;
}

export function useGooglePlacesAutocomplete(
  debounceMs: number = 300,
  minChars: number = 3
): UseGooglePlacesAutocompleteReturn {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GooglePlaceResult[]>([]);
  const [query, setQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>();

  const search = (searchQuery: string) => {
    setQuery(searchQuery);
    setShowDropdown(true);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (searchQuery.length < minChars) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const searchResults = await searchApi.googlePlaces(searchQuery);
        setResults(searchResults);
      } catch (error) {
        console.error('Google Places search failed:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, debounceMs);
  };

  const clear = () => {
    setQuery('');
    setResults([]);
    setShowDropdown(false);
    setLoading(false);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
  };

  return {
    loading,
    results,
    query,
    showDropdown,
    search,
    clear,
    setShowDropdown,
  };
}
