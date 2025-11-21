import { create } from 'zustand';
import type { User, Place, List, ListWithPlaceCount, Tag, TagWithUsage } from '@/types';
import { placesApi, listsApi, tagsApi, authApi } from '@/lib/api';

interface AppState {
  // Auth
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;

  // Data
  places: Place[];
  lists: ListWithPlaceCount[];
  tags: TagWithUsage[];

  // UI State
  selectedPlaceId: string | null;
  selectedListId: string | null;
  selectedCategory: string | null;
  searchQuery: string;
  viewMode: 'map' | 'list';

  // Actions
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  logout: () => void;

  // Data Actions
  fetchPlaces: () => Promise<void>;
  fetchLists: () => Promise<void>;
  fetchTags: () => Promise<void>;

  addPlace: (place: Place) => void;
  updatePlace: (place: Place) => void;
  deletePlace: (id: string) => void;

  addList: (list: ListWithPlaceCount) => void;
  updateList: (list: ListWithPlaceCount) => void;
  deleteList: (id: string) => void;

  addTag: (tag: TagWithUsage) => void;
  updateTag: (tag: TagWithUsage) => void;
  deleteTag: (id: string) => void;

  // UI Actions
  setSelectedPlaceId: (id: string | null) => void;
  setSelectedListId: (id: string | null) => void;
  setSelectedCategory: (category: string | null) => void;
  setSearchQuery: (query: string) => void;
  setViewMode: (mode: 'map' | 'list') => void;

  // Computed
  getFilteredPlaces: () => Place[];
}

export const useStore = create<AppState>((set, get) => ({
  // Initial state
  user: null,
  token: typeof window !== 'undefined' ? localStorage.getItem('token') : null,
  isAuthenticated: false,
  places: [],
  lists: [],
  tags: [],
  selectedPlaceId: null,
  selectedListId: null,
  selectedCategory: null,
  searchQuery: '',
  viewMode: 'map',

  // Auth actions
  setUser: (user) => set({ user, isAuthenticated: !!user }),

  setToken: (token) => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
    set({ token, isAuthenticated: !!token });
  },

  logout: () => {
    localStorage.removeItem('token');
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      places: [],
      lists: [],
      tags: [],
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
  setSelectedCategory: (category) => set({ selectedCategory: category }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setViewMode: (mode) => set({ viewMode: mode }),

  // Computed getters
  getFilteredPlaces: () => {
    const { places, selectedListId, selectedCategory, searchQuery } = get();

    let filtered = [...places];

    // Filter by list
    if (selectedListId) {
      filtered = filtered.filter(p =>
        p.lists.some(l => l.id === selectedListId)
      );
    }

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(p => p.category === selectedCategory);
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
}));
