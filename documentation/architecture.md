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
│  Users │ Places │ Lists │ Tags │ RefreshTokens │ TelegramLinks │ etc.      │
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
├── app/                          # Next.js App Router
│   ├── (protected)/              # Auth-required routes
│   │   ├── page.tsx              # Main map view
│   │   ├── settings/             # User settings
│   │   ├── places/[id]/          # Place details
│   │   ├── collections/          # List management
│   │   └── tags/                 # Tag management
│   ├── (public)/                 # Public routes
│   │   ├── login/                # Authentication
│   │   ├── shared/               # Public sharing views
│   │   └── verify-email/         # Email verification
│   └── auth/callback/            # OAuth callback handler
│
├── components/                   # React Components
│   ├── Map.tsx                   # Leaflet map with clustering
│   ├── Navbar.tsx                # Top navigation
│   ├── Sidebar.tsx               # Desktop sidebar
│   ├── BottomNav.tsx             # Mobile navigation
│   ├── PlaceModal.tsx            # Create/edit forms
│   └── SearchBar.tsx             # Google Places search
│
├── store/                        # State Management
│   └── useStore.ts               # Zustand global store
│
├── lib/                          # Utilities
│   ├── api.ts                    # Axios client + interceptors
│   └── auth-storage.ts           # Token management
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
│   └── admin_router.py           # Admin operations
│
└── services/
    └── email_service.py          # Verification + reset emails
```

### Mobile (Expo/React Native)

```
mobile/
├── app/                          # Expo Router
│   ├── (auth)/                   # Auth screens
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (tabs)/                   # Main app tabs
│   │   ├── index.tsx             # Map view
│   │   ├── lists.tsx             # Collections
│   │   └── profile.tsx           # User profile
│   ├── place/[id].tsx            # Place details
│   └── _layout.tsx               # Root layout
│
├── src/
│   ├── components/               # Shared components
│   ├── store/useStore.ts         # Zustand (shared logic)
│   ├── lib/api.ts                # API client
│   └── lib/auth-storage.ts       # Expo SecureStore
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

  // Core Data
  places: Place[];
  lists: ListWithPlaceCount[];
  tags: TagWithUsage[];

  // Social Features
  notifications: Notification[];
  followers: UserSearchResult[];
  following: UserSearchResult[];

  // UI State
  selectedPlaceId: string | null;
  selectedListId: string | null;
  selectedTagIds: string[];
  viewMode: 'map' | 'list';

  // Actions
  fetchPlaces(): Promise<void>;
  fetchLists(): Promise<void>;
  logout(): Promise<void>;
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
