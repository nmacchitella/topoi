# Topoi Frontend

Next.js frontend for the Topoi personal map application.

## Setup

```bash
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:8000/api" > .env.local
npm run dev
```

**Access:** http://localhost:3000

## Project Structure

```
frontend/
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── page.tsx               # Main map view (/)
│   │   ├── layout.tsx             # Root layout
│   │   ├── login/                 # Login/register page
│   │   ├── settings/              # User settings & Telegram link
│   │   ├── places/[id]/           # Place details page
│   │   ├── collections/           # Collections management
│   │   ├── collections/[id]/      # Collection details
│   │   ├── tags/                  # Tags management
│   │   ├── tags/[id]/             # Tag details
│   │   ├── shared/                # Public sharing views
│   │   ├── import-preview/        # CSV import wizard
│   │   ├── explore/               # Explore/discover page
│   │   ├── verify-email/          # Email verification
│   │   ├── forgot-password/       # Password reset request
│   │   ├── reset-password/        # Password reset form
│   │   └── auth/callback/         # OAuth callback
│   ├── components/
│   │   ├── Map.tsx                # Leaflet map with markers
│   │   ├── Navbar.tsx             # Top navigation bar
│   │   ├── Sidebar.tsx            # Desktop sidebar
│   │   ├── BottomNav.tsx          # Mobile bottom navigation
│   │   ├── PlaceModal.tsx         # Create/edit place modal
│   │   ├── PlaceCard.tsx          # Place list item
│   │   ├── SearchBar.tsx          # Google Places autocomplete
│   │   ├── ListSelector.tsx       # Collection picker
│   │   ├── TagInput.tsx           # Tag input component
│   │   └── ...                    # Other components
│   ├── store/
│   │   └── useStore.ts            # Zustand global state
│   ├── lib/
│   │   ├── api.ts                 # Axios API client
│   │   └── auth-storage.ts        # Token storage utilities
│   ├── hooks/
│   │   └── useGooglePlacesAutocomplete.ts
│   └── types/
│       └── index.ts               # TypeScript interfaces
├── public/
│   ├── manifest.json              # PWA manifest
│   ├── icons/                     # PWA icons
│   └── sw.js                      # Service worker
├── next.config.js                 # Next.js configuration
├── tailwind.config.ts             # Tailwind CSS config
├── Dockerfile                     # Production build
├── fly.toml                       # Fly.io production config
└── fly.dev.toml                   # Fly.io development config
```

## Pages

| Route | Access | Description |
|-------|--------|-------------|
| `/` | Protected | Main map view with all features |
| `/login` | Public | Login and registration |
| `/settings` | Protected | User profile, Telegram integration |
| `/places/[id]` | Protected | Individual place details |
| `/collections` | Protected | Manage collections |
| `/collections/[id]` | Protected | View collection places |
| `/tags` | Protected | Manage tags |
| `/tags/[id]` | Protected | View places by tag |
| `/shared/place/[id]` | Public | Public place view |
| `/shared/collection/[id]` | Public | Public collection view |
| `/shared/map/[userId]` | Public | Public user map |
| `/import-preview` | Protected | CSV import wizard |
| `/explore` | Protected | Discover places |

## State Management

Zustand store (`src/store/useStore.ts`):

```typescript
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

  // UI
  selectedPlaceId: string | null;
  selectedListId: string | null;
  selectedTagIds: string[];
  searchQuery: string;
  viewMode: 'map' | 'list';
  sidebarOpen: boolean;

  // Actions
  setUser, logout, fetchPlaces, createPlace, updatePlace, deletePlace,
  fetchLists, createList, updateList, deleteList,
  fetchTags, createTag, deleteTag, ...
}
```

## API Client

Located at `src/lib/api.ts`:

- Axios instance with base URL from environment
- Automatic token injection via interceptor
- 401 handling with token refresh
- Type-safe API methods

```typescript
import { placesApi, authApi, listsApi, tagsApi } from '@/lib/api';

// Usage
const places = await placesApi.getAll();
const place = await placesApi.create({ name, latitude, longitude, ... });
```

## Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

For production builds, set via Fly.io build args in `fly.toml`:

```toml
[build.args]
  NEXT_PUBLIC_API_URL = "https://topoi-backend.fly.dev/api"
```

## Responsive Design

**Desktop (>=768px):**
- Sidebar on left with places list
- Map fills remaining space
- Navbar at top
- Modal dialogs for forms

**Mobile (<768px):**
- Bottom navigation bar
- Full-screen map
- Bottom sheets for place details
- Slide-up panels for lists

## Progressive Web App

Features:
- Installable on iOS/Android
- Offline map tile caching
- Service worker for assets
- Add to home screen prompt

Configuration in `public/manifest.json` and `next.config.js`.

## Key Components

### Map.tsx
- Leaflet map with OpenStreetMap tiles
- Marker clustering for performance
- Click-to-add place functionality
- Custom markers with collection colors
- Popup with place details

### SearchBar.tsx
- Google Places autocomplete
- Debounced search
- Location bias for nearby results
- Place details fetch on selection

### PlaceModal.tsx
- Create/edit place form
- Collection and tag selection
- Address/coordinates input
- Validation and error handling

### Sidebar.tsx
- Places list with filters
- Collection/tag filter tabs
- Search within places
- Sort options

## Deployment

### Fly.io

```bash
# Production
flyctl deploy

# Development
flyctl deploy --config fly.dev.toml
```

### Build for Production

```bash
npm run build
npm run start
```

### Docker

```bash
docker build -t topoi-frontend .
docker run -p 3000:3000 topoi-frontend
```

## Development

### Scripts

```bash
npm run dev      # Development server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

### Code Style

- TypeScript strict mode
- ESLint with Next.js config
- Prettier for formatting
- Tailwind CSS for styling

## Dependencies

Key packages:
- `next` - React framework
- `react` / `react-dom` - UI library
- `typescript` - Type safety
- `tailwindcss` - Styling
- `zustand` - State management
- `axios` - HTTP client
- `leaflet` / `react-leaflet` - Maps
- `next-pwa` - PWA support

See `package.json` for full list.
