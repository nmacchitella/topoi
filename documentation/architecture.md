# Architecture Overview

Topoi is a personal map application with a three-tier architecture: a Next.js web frontend, a React Native mobile app, and a FastAPI backend.

## System Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                         │
├─────────────────────┬─────────────────────┬─────────────────────────────────┤
│   Web (Next.js)     │   Mobile (Expo)     │      Telegram Bot               │
│   Port 3000         │   iOS/Android       │      @TopoiAppBot               │
│                     │                     │                                 │
│   - React 18        │   - React Native    │   - Webhook-based               │
│   - Leaflet Maps    │   - Native Maps     │   - Save places via links       │
│   - Zustand State   │   - Zustand State   │                                 │
│   - Tailwind CSS    │   - NativeWind      │                                 │
│   - PWA Support     │   - Expo Router     │                                 │
└─────────┬───────────┴─────────┬───────────┴───────────────┬─────────────────┘
          │                     │                           │
          │ HTTPS               │ HTTPS                     │ HTTPS
          │                     │                           │
          ▼                     ▼                           ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         BACKEND (FastAPI)                                    │
│                           Port 8000                                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Auth      │  │   Places    │  │   Lists     │  │   Tags      │        │
│  │   Router    │  │   Router    │  │   Router    │  │   Router    │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │   Search    │  │   Share     │  │  Telegram   │  │   Admin     │        │
│  │   Router    │  │   Router    │  │   Router    │  │   Router    │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        Core Services                                 │   │
│  │  - JWT Authentication (python-jose)                                 │   │
│  │  - Password Hashing (bcrypt)                                        │   │
│  │  - Email Service (fastapi-mail)                                     │   │
│  │  - OAuth Integration (authlib)                                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────┬───────────────────────────────────┘
                                          │
                                          │ SQLAlchemy ORM
                                          │
                                          ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATABASE (SQLite)                                  │
│                          /data/topoi.db                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│  Users │ Places │ Lists │ Tags │ RefreshTokens │ TelegramLinks │            │
│  TelegramLinkCodes │ VerificationTokens │ Notifications │ ShareTokens │     │
│  UserFollows │ place_lists (M2M) │ place_tags (M2M)                         │
└─────────────────────────────────────────────────────────────────────────────┘

                                          │
                    ┌─────────────────────┼─────────────────────┐
                    │                     │                     │
                    ▼                     ▼                     ▼
┌─────────────────────────┐ ┌─────────────────────────┐ ┌─────────────────────┐
│   Google APIs           │ │   Telegram Bot API      │ │   SMTP Server       │
│   - Places API          │ │   - Webhooks            │ │   - Gmail SMTP      │
│   - OAuth               │ │   - Send Messages       │ │   - Verification    │
│   - Geocoding           │ │                         │ │   - Password Reset  │
└─────────────────────────┘ └─────────────────────────┘ └─────────────────────┘
```

## Data Flow

### Authentication Flow

```
User                    Frontend                 Backend                  Database
  │                        │                        │                        │
  │─── Login Request ─────>│                        │                        │
  │                        │─── POST /auth/login ──>│                        │
  │                        │                        │─── Verify Password ───>│
  │                        │                        │<── User Record ────────│
  │                        │                        │                        │
  │                        │                        │─── Create Tokens ─────>│
  │                        │<── Access + Refresh ───│                        │
  │                        │                        │                        │
  │<── Store Tokens ───────│                        │                        │
  │                        │                        │                        │
  │─── Access Resource ───>│                        │                        │
  │                        │─── GET /places ───────>│                        │
  │                        │    (Bearer Token)      │─── Verify JWT ────────>│
  │                        │                        │<── User Context ───────│
  │                        │                        │                        │
  │                        │<── Places Data ────────│                        │
  │<── Display Places ─────│                        │                        │
```

### Token Refresh Flow

```
Frontend                              Backend                          Database
   │                                     │                                │
   │─── Request with Expired Token ─────>│                                │
   │<── 401 Unauthorized ────────────────│                                │
   │                                     │                                │
   │─── POST /auth/refresh ─────────────>│                                │
   │    (refresh_token)                  │─── Validate Refresh Token ────>│
   │                                     │<── Token Valid ────────────────│
   │                                     │                                │
   │                                     │─── Create New Access Token     │
   │                                     │─── Rotate Refresh Token ──────>│
   │<── New Access + Refresh Tokens ─────│                                │
   │                                     │                                │
   │─── Retry Original Request ─────────>│                                │
   │<── Success ─────────────────────────│                                │
```

## Component Architecture

### Frontend (Next.js)

```
src/
├── app/                          # Next.js App Router (flat structure)
│   ├── page.tsx                  # Main map view
│   ├── layout.tsx                # Root layout
│   ├── globals.css               # Global styles
│   ├── auth/callback/            # OAuth callback handler
│   ├── collections/[id]/         # Collection detail
│   ├── explore/                  # Explore/discover page
│   ├── forgot-password/          # Password recovery
│   ├── import-preview/           # Import preview
│   ├── login/                    # Authentication
│   ├── notifications/            # User notifications
│   ├── places/[id]/              # Place details
│   ├── profile/                  # User profile
│   ├── reset-password/           # Password reset
│   ├── settings/                 # User settings
│   ├── share/[token]/            # Shareable link view
│   ├── shared/                   # Public sharing views
│   │   ├── collection/[id]/      # Shared collection
│   │   └── place/[id]/           # Shared place
│   ├── tags/[id]/                # Tag detail
│   ├── users/[userId]/           # User profile view
│   ├── verification-required/    # Email verification pending
│   └── verify-email/             # Email verification
│
├── components/                   # React Components
│   ├── Map.tsx                   # Leaflet map with clustering
│   ├── MapView.tsx               # Map view container
│   ├── Navbar.tsx                # Top navigation
│   ├── Sidebar.tsx               # Desktop sidebar
│   ├── BottomNav.tsx             # Bottom navigation (mobile)
│   ├── PlaceModal.tsx            # Create/edit place forms
│   ├── PlaceBottomSheet.tsx      # Mobile place details sheet
│   ├── PlacesList.tsx            # List view of places
│   ├── SearchBar.tsx             # Basic search bar
│   ├── UnifiedSearchBar.tsx      # Combined search + create
│   ├── NotificationBell.tsx      # Notification indicator
│   ├── FollowedUsersSelector.tsx # User selector for map layers
│   ├── MapViewToggle.tsx         # Toggle between map modes
│   ├── ViewModeToggle.tsx        # Toggle map/list view
│   ├── AdoptPlaceModal.tsx       # Adopt shared place modal
│   ├── PullToRefresh.tsx         # Pull to refresh wrapper
│   ├── PublicSignupCTA.tsx       # Public signup prompt
│   ├── InstallPrompt.tsx         # PWA install prompt
│   ├── UnifiedTagInput.tsx       # Tag input component
│   ├── SimpleTagInput.tsx        # Simple tag input variant
│   ├── TagInput.tsx              # Basic tag input
│   ├── TagIcon.tsx               # Tag icon renderer
│   └── CollectionInput.tsx       # Collection input component
│
├── hooks/                        # Custom React hooks
│
├── store/                        # State Management
│   └── useStore.ts               # Zustand global store
│
├── lib/                          # Utilities
│   ├── api.ts                    # Axios client + interceptors
│   ├── auth-storage.ts           # Token management
│   └── tagColors.ts              # Tag color utilities
│
└── types/                        # TypeScript definitions
    └── index.ts
```

### Backend (FastAPI)

```
backend/
├── main.py                       # FastAPI app entry + CORS
├── database.py                   # SQLAlchemy engine + settings
├── models.py                     # Database models
├── schemas.py                    # Pydantic schemas
├── auth.py                       # JWT + password utilities
├── admin.py                      # SQLAdmin configuration
├── tag_utils.py                  # Tag processing utilities
│
├── routers/                      # API Endpoints
│   ├── auth_router.py            # Login, register, profile
│   ├── google_auth.py            # Google OAuth flow
│   ├── places.py                 # CRUD for places
│   ├── lists.py                  # CRUD for collections
│   ├── tags.py                   # CRUD for tags
│   ├── search.py                 # Google Places + Nominatim
│   ├── share.py                  # Public sharing
│   ├── telegram.py               # Bot webhook handler
│   ├── admin_router.py           # Admin operations
│   ├── data_router.py            # Data import/export
│   ├── explore_router.py         # Explore recommendations
│   ├── notifications.py          # User notifications
│   └── users.py                  # User search, follow system
│
└── services/
    ├── email_service.py          # Verification + reset emails
    ├── follow_service.py         # Follow/unfollow logic
    └── notification_service.py   # Notification creation
```

### Mobile (Expo/React Native)

```
mobile/
├── app/                          # Expo Router
│   ├── _layout.tsx               # Root layout
│   ├── +html.tsx                 # HTML template
│   ├── +not-found.tsx            # 404 page
│   ├── (auth)/                   # Auth screens
│   │   ├── _layout.tsx           # Auth layout
│   │   ├── login.tsx             # Login screen
│   │   ├── register.tsx          # Registration
│   │   ├── forgot-password.tsx   # Password recovery
│   │   ├── reset-password.tsx    # Password reset
│   │   ├── verify-email.tsx      # Email verification
│   │   └── verification-required.tsx
│   ├── (tabs)/                   # Main app tabs
│   │   ├── _layout.tsx           # Tabs layout
│   │   ├── index.tsx             # Map view
│   │   ├── collections.tsx       # Collections list
│   │   ├── explore.tsx           # Explore/discover
│   │   └── profile.tsx           # User profile
│   ├── place/[id]/               # Place details
│   ├── collection/               # Collection detail
│   ├── share/                    # Share handling
│   ├── shared/                   # Shared content views
│   ├── tag/                      # Tag detail
│   ├── user/                     # User profile
│   ├── import-preview.tsx        # Import preview
│   ├── notifications.tsx         # Notifications
│   └── settings.tsx              # Settings
│
├── src/
│   ├── components/               # Shared components
│   ├── hooks/                    # Custom hooks
│   ├── store/useStore.ts         # Zustand (shared logic)
│   ├── types/                    # TypeScript types
│   └── lib/
│       ├── api.ts                # API client
│       ├── auth-storage.ts       # Expo SecureStore
│       ├── tagColors.ts          # Tag color utilities
│       ├── theme.ts              # Theme configuration
│       └── useGoogleAuth.ts      # Google OAuth hook
│
└── app.config.js                 # Expo configuration
```

## API Structure

All API endpoints are prefixed with `/api`:

| Router | Prefix | Purpose |
|--------|--------|---------|
| auth_router | `/api/auth` | Registration, login, profile |
| google_auth | `/api/auth/google` | OAuth login + callback |
| places | `/api/places` | Place CRUD operations |
| lists | `/api/lists` | Collection management |
| tags | `/api/tags` | Tag management |
| search | `/api/search` | Google Places + Nominatim |
| share | `/api/share` | Public sharing endpoints |
| telegram | `/api/telegram` | Bot webhook + linking |
| users | `/api/users` | User search, follow system |
| notifications | `/api/notifications` | User notifications |
| data_router | `/api/data` | Data import/export |
| explore_router | `/api/explore` | Explore recommendations |
| admin_router | `/api/admin` | Admin operations |

## State Management

Both web and mobile apps use Zustand for state management with a similar structure:

```typescript
interface AppState {
  // Authentication
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isInitialized: boolean;        // Mobile: tracks auth initialization

  // Core Data
  places: Place[];
  lists: ListWithPlaceCount[];
  tags: TagWithUsage[];

  // Notifications
  notifications: Notification[];
  unreadCount: number;

  // Share Token
  shareToken: ShareToken | null;

  // Social Features (Follow System)
  followers: UserSearchResult[];
  following: UserSearchResult[];
  followRequests: UserSearchResult[];

  // Map Layers (View other users' maps)
  mapViewMode: 'profile' | 'layers';
  selectedFollowedUserIds: string[];
  followedUsersPlaces: Record<string, Place[]>;
  followedUsersMetadata: Record<string, UserMapMetadata>;
  largeMapUsers: Set<string>;    // Users with >1000 places

  // UI State
  selectedPlaceId: string | null;
  selectedListId: string | null;
  selectedTagIds: string[];
  tagFilterMode: 'any' | 'all';  // OR vs AND tag filtering
  searchQuery: string;
  viewMode: 'map' | 'list';
  sidebarOpen: boolean;          // Web only

  // Actions (partial list)
  fetchPlaces(): Promise<void>;
  fetchLists(): Promise<void>;
  fetchTags(): Promise<void>;
  fetchUserProfile(): Promise<void>;
  fetchNotifications(): Promise<void>;
  fetchFollowers(): Promise<void>;
  fetchFollowing(): Promise<void>;
  followUser(userId: string): Promise<void>;
  unfollowUser(userId: string): Promise<void>;
  logout(): Promise<void>;
  getFilteredPlaces(): Place[];  // Computed getter
  // ... more actions
}
```

## Security Model

1. **Authentication**: JWT-based with short-lived access tokens (15 min) and long-lived refresh tokens (7 days)
2. **Password Storage**: bcrypt hashing with automatic salt
3. **API Protection**: Bearer token required for protected endpoints
4. **CORS**: Configured to allow only known frontend origins
5. **OAuth**: Google OAuth with server-side token exchange
6. **Email Verification**: Required for email/password accounts (OAuth users auto-verified)

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        GitHub Repository                         │
│                                                                 │
│  main branch ──────────────> Production Deploy                  │
│  development branch ──────-> Development Deploy                 │
│                                                                 │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 │ GitHub Actions
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                           Fly.io                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Production:                    Development:                    │
│  ├── topoi-backend              ├── topoi-backend-dev           │
│  │   └── /data volume           │   └── /data volume            │
│  └── topoi-frontend             └── topoi-frontend-dev          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Key Design Decisions

1. **SQLite over PostgreSQL**: Simpler deployment, sufficient for single-user/small-scale use. Stored on persistent Fly.io volume.

2. **Zustand over Redux**: Lighter weight, simpler API, works well for both web and React Native.

3. **Leaflet over Google Maps (Web)**: No API key required, open-source, good React integration.

4. **Native Maps (Mobile)**: Better performance and native feel on iOS/Android.

5. **JWT with Refresh Tokens**: Balances security (short access token lifetime) with UX (no frequent re-login).

6. **Monorepo Structure**: Frontend, backend, and mobile in single repo for easier coordination.

7. **Fly.io over AWS/Vercel**: Simple Docker deployment, built-in persistent volumes, global edge network.
