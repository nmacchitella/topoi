import { create } from 'zustand';
import type { User, Place, List, ListWithPlaceCount, Tag, TagWithUsage } from '@/types';
import { placesApi, listsApi, tagsApi, authApi } from '@/lib/api';

interface AppState {
  // Auth
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;

  // Data
  places: Place[];
  lists: ListWithPlaceCount[];
  tags: TagWithUsage[];

  // UI State
  selectedPlaceId: string | null;
  selectedListId: string | null;
  selectedTagIds: string[];
  searchQuery: string;
  viewMode: 'map' | 'list';
  sidebarOpen: boolean;

  // Actions
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setRefreshToken: (refreshToken: string | null) => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
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
  setSelectedTagIds: (tagIds: string[]) => void;
  setSearchQuery: (query: string) => void;
  setViewMode: (mode: 'map' | 'list') => void;
  setSidebarOpen: (open: boolean) => void;

  // Computed
  getFilteredPlaces: () => Place[];
}

export const useStore = create<AppState>((set, get) => ({
  // Initial state
  user: null,
  token: typeof window !== 'undefined' ? localStorage.getItem('access_token') : null,
  refreshToken: typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null,
  isAuthenticated: false,
  places: [],
  lists: [],
  tags: [],
  selectedPlaceId: null,
  selectedListId: null,
  selectedTagIds: [],
  searchQuery: '',
  viewMode: 'map',
  sidebarOpen: false,

  // Auth actions
  setUser: (user) => set({ user, isAuthenticated: !!user }),

  setToken: (token) => {
    if (token) {
      localStorage.setItem('access_token', token);
    } else {
      localStorage.removeItem('access_token');
    }
    set({ token, isAuthenticated: !!token });
  },

  setRefreshToken: (refreshToken) => {
    if (refreshToken) {
      localStorage.setItem('refresh_token', refreshToken);
    } else {
      localStorage.removeItem('refresh_token');
    }
    set({ refreshToken });
  },

  setTokens: (accessToken, refreshToken) => {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    set({ token: accessToken, refreshToken, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    set({
      user: null,
      token: null,
      refreshToken: null,
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
  setSelectedTagIds: (tagIds) => set({ selectedTagIds: tagIds }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  // Computed getters
  getFilteredPlaces: () => {
    const { places, selectedListId, selectedTagIds, searchQuery } = get();

    let filtered = [...places];

    // Filter by list
    if (selectedListId) {
      filtered = filtered.filter(p =>
        p.lists.some(l => l.id === selectedListId)
      );
    }

    // Filter by tags (OR logic - place must have at least one of the selected tags)
    if (selectedTagIds.length > 0) {
      filtered = filtered.filter(p =>
        p.tags.some(t => selectedTagIds.includes(t.id))
      );
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
