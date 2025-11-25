# Topoi - System Architecture

> A comprehensive guide to the architecture, stack, and deployment of Topoi - a personal map application for saving and organizing favorite places.

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [System Architecture](#system-architecture)
4. [Frontend Architecture](#frontend-architecture)
5. [Backend Architecture](#backend-architecture)
6. [Database Schema](#database-schema)
7. [Authentication & Security](#authentication--security)
8. [External Integrations](#external-integrations)
9. [Deployment & Infrastructure](#deployment--infrastructure)
10. [Development Workflow](#development-workflow)

---

## Overview

Topoi is a full-stack web application that allows users to save, organize, and share their favorite places. It combines an interactive map interface with powerful organization tools (collections and tags), social features (public sharing), and third-party integrations (Google OAuth, Telegram bot, Google Places API).

### Key Features

- **Interactive Map**: OpenStreetMap-based interface with Leaflet.js
- **Place Management**: Add, edit, organize places with notes, photos, and metadata
- **Collections & Tags**: Flexible organization with colored collections and reusable tags
- **Smart Search**: Google Places API integration with autocomplete
- **Data Import**: CSV import with duplicate detection
- **Public Sharing**: Share individual places or entire collections
- **Telegram Integration**: Save places directly from Telegram via @TopoiAppBot
- **Progressive Web App**: Installable on mobile devices with offline maps
- **Admin Panel**: SQLAdmin-powered interface for database management

---

## Tech Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| **Next.js** | 14.2.0 | React framework with App Router |
| **React** | 18.3.0 | UI library |
| **TypeScript** | 5.3.3 | Type-safe JavaScript |
| **Tailwind CSS** | 3.4.1 | Utility-first styling |
| **Zustand** | 4.5.0 | Lightweight state management |
| **Leaflet.js** | 1.9.4 | Interactive maps |
| **React-Leaflet** | 4.2.1 | React bindings for Leaflet |
| **Axios** | 1.6.5 | HTTP client |
| **next-pwa** | 5.6.0 | Progressive Web App support |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| **FastAPI** | 0.115.0+ | Python web framework |
| **Uvicorn** | 0.32.0+ | ASGI server |
| **SQLAlchemy** | 2.0.35+ | ORM for database operations |
| **SQLite** | Default | Development database |
| **PostgreSQL** | Compatible | Production database (optional) |
| **python-jose** | 3.3.0+ | JWT token creation/validation |
| **passlib[bcrypt]** | 1.7.4+ | Password hashing |
| **authlib** | 1.6.5+ | OAuth2 implementation |
| **httpx** | 0.27.0+ | Async HTTP client |
| **python-telegram-bot** | 21.0+ | Telegram bot SDK |
| **sqladmin** | 0.16.0+ | Admin panel |
| **wtforms** | 3.0.0+ | Form validation for admin |

### Infrastructure

| Service | Purpose |
|---------|---------|
| **Fly.io** | Container hosting (backend + frontend) |
| **GitHub Actions** | CI/CD pipelines |
| **Docker** | Containerization |
| **Google Cloud Platform** | OAuth, Places API |
| **Telegram** | Bot integration |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User Layer                               │
├─────────────────┬──────────────────┬──────────────────────────────┤
│   Web Browser   │  Mobile Browser  │     Telegram Bot            │
│   (Desktop)     │  (PWA Install)   │   (@TopoiAppBot)            │
└────────┬────────┴────────┬─────────┴──────────┬──────────────────┘
         │                 │                    │
         └─────────────────┼────────────────────┘
                           │
         ┌─────────────────▼─────────────────┐
         │     Frontend (Next.js 14)         │
         │  https://topoi-frontend.fly.dev   │
         │                                   │
         │  • React Components               │
         │  • Zustand State Management       │
         │  • Leaflet Maps                   │
         │  • Service Worker (PWA)           │
         └───────────────┬───────────────────┘
                         │
                         │ REST API (HTTPS)
                         │ /api/*
                         │
         ┌───────────────▼───────────────────┐
         │     Backend (FastAPI)             │
         │  https://topoi-backend.fly.dev    │
         │                                   │
         │  ┌─────────────────────────────┐ │
         │  │   Authentication Layer      │ │
         │  │  • JWT Tokens               │ │
         │  │  • OAuth2 Flow              │ │
         │  │  • Session Management       │ │
         │  └─────────────────────────────┘ │
         │                                   │
         │  ┌─────────────────────────────┐ │
         │  │   API Routers               │ │
         │  │  • Places  • Tags           │ │
         │  │  • Lists   • Search         │ │
         │  │  • Share   • Data Import    │ │
         │  │  • Admin   • Telegram       │ │
         │  └─────────────────────────────┘ │
         │                                   │
         │  ┌─────────────────────────────┐ │
         │  │   Admin Panel (SQLAdmin)    │ │
         │  │  /admin                     │ │
         │  └─────────────────────────────┘ │
         └───────────────┬───────────────────┘
                         │
                         │ SQLAlchemy ORM
                         │
         ┌───────────────▼───────────────────┐
         │   Database (SQLite / PostgreSQL)  │
         │                                   │
         │  • Users    • Places              │
         │  • Lists    • Tags                │
         │  • Tokens   • Telegram Links      │
         └───────────────────────────────────┘

External Services:
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  Google OAuth    │  │ Google Places API│  │  Telegram API    │
│  Authentication  │  │  Search/Geocode  │  │  Bot Messages    │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

### Data Flow

**1. User Authentication Flow:**
```
User → Frontend → Backend /api/auth/login-json
Backend → Validate credentials → Generate JWT tokens
Backend → Return {access_token, refresh_token}
Frontend → Store tokens → Include in Authorization header
```

**2. Place Creation Flow:**
```
User → Click map → Frontend shows modal
User → Fills form → Frontend sends POST /api/places
Backend → Validates data → Creates Place + associations
Backend → Returns Place with Lists and Tags
Frontend → Updates Zustand store → Refreshes map
```

**3. Telegram Bot Flow:**
```
User → Shares Google Maps link in Telegram
Telegram → Sends webhook to Backend /api/telegram/webhook
Backend → Parses URL → Fetches place details
Backend → Creates Place for linked user
Bot → Confirms creation to user
```

---

## Frontend Architecture

### Directory Structure

```
frontend/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── page.tsx              # Main map view
│   │   ├── layout.tsx            # Root layout
│   │   ├── login/                # Authentication
│   │   ├── settings/             # User settings
│   │   ├── places/[id]/          # Place details
│   │   ├── collections/          # Collections UI
│   │   ├── tags/                 # Tags management
│   │   ├── shared/               # Public sharing
│   │   └── import-preview/       # CSV import
│   ├── components/               # React components
│   │   ├── Map.tsx               # Leaflet map
│   │   ├── Navbar.tsx            # Top navigation
│   │   ├── Sidebar.tsx           # Desktop sidebar
│   │   ├── BottomNav.tsx         # Mobile navigation
│   │   ├── PlaceModal.tsx        # Place form modal
│   │   ├── SearchBar.tsx         # Search with autocomplete
│   │   └── ...                   # Other components
│   ├── store/
│   │   └── useStore.ts           # Zustand state
│   ├── lib/
│   │   └── api.ts                # Axios API client
│   ├── hooks/
│   │   └── useGooglePlacesAutocomplete.ts
│   └── types/
│       └── index.ts              # TypeScript types
├── public/                       # Static assets
│   ├── icons/                    # PWA icons
│   └── manifest.json             # PWA manifest
├── next.config.js                # Next.js config
├── tailwind.config.ts            # Tailwind config
├── Dockerfile                    # Production build
└── package.json                  # Dependencies
```

### State Management (Zustand)

**Global Store Structure:**

```typescript
interface AppState {
  // Authentication
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
  setUser: (user: User) => void;
  logout: () => void;
  fetchPlaces: () => Promise<void>;
  createPlace: (place: PlaceCreate) => Promise<Place>;
  updatePlace: (id: string, updates: PlaceUpdate) => Promise<void>;
  deletePlace: (id: string) => Promise<void>;
  // ... more actions
}
```

**Key Features:**
- Persistent auth tokens in localStorage
- Optimistic UI updates
- Computed getters for filtered data
- Automatic token refresh on 401 errors

### Routing & Pages

| Route | Access | Purpose |
|-------|--------|---------|
| `/` | Protected | Main map view with all features |
| `/login` | Public | Login/register page |
| `/settings` | Protected | User profile & Telegram integration |
| `/places/[id]` | Protected | Individual place details |
| `/collections` | Protected | Manage collections |
| `/collections/[id]` | Protected | View places in collection |
| `/tags` | Protected | Manage tags |
| `/tags/[id]` | Protected | View places by tag |
| `/shared/collection/[id]` | Public | Public collection view |
| `/shared/place/[id]` | Public | Public place view |
| `/import-preview` | Protected | CSV import wizard |

### Responsive Design

**Desktop (≥768px):**
- Sidebar on left with places list
- Map fills remaining space
- Navbar at top
- Modal dialogs for forms

**Mobile (<768px):**
- Bottom navigation bar
- Full-screen map
- Bottom sheets for place details
- Slide-up panels for lists

### Progressive Web App (PWA)

**Features:**
- Installable on iOS/Android
- Offline map tile caching
- Service worker for asset caching
- Add to home screen prompt
- App-like experience

**Configuration:**
- `public/manifest.json` defines app metadata
- Icons generated for all device sizes
- Workbox for service worker management
- Offline fallback page

---

## Backend Architecture

### Project Structure

```
backend/
├── main.py                       # FastAPI application entry
├── database.py                   # SQLAlchemy setup
├── models.py                     # Database models
├── schemas.py                    # Pydantic schemas
├── auth.py                       # Authentication logic
├── admin.py                      # SQLAdmin configuration
├── create_admin.py               # CLI script for admin users
├── routers/                      # API endpoints
│   ├── auth_router.py            # User auth & profile
│   ├── google_auth.py            # OAuth2 flow
│   ├── places.py                 # Places CRUD
│   ├── lists.py                  # Lists CRUD
│   ├── tags.py                   # Tags CRUD
│   ├── search.py                 # Geocoding & search
│   ├── share.py                  # Public sharing
│   ├── data_router.py            # Import/export
│   ├── telegram.py               # Telegram bot
│   └── admin_router.py           # Admin operations
├── topoi.db                      # SQLite database (dev)
├── requirements.txt              # Python dependencies
├── Dockerfile                    # Production build
└── fly.toml                      # Fly.io config
```

### API Design

**RESTful Principles:**
- Resource-based URLs (`/places`, `/lists`, `/tags`)
- HTTP verbs (GET, POST, PUT, PATCH, DELETE)
- JSON request/response bodies
- Consistent error responses
- Pagination support (skip/limit)

**Authentication:**
- Bearer token in `Authorization` header
- JWT access tokens (15-minute expiry)
- Refresh tokens (7-day expiry)
- Automatic token rotation

**Error Handling:**
```json
{
  "detail": "Error message",
  "status_code": 400
}
```

**Common Status Codes:**
- `200 OK` - Successful GET/PUT
- `201 Created` - Successful POST
- `204 No Content` - Successful DELETE
- `400 Bad Request` - Validation error
- `401 Unauthorized` - Missing/invalid token
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource doesn't exist
- `422 Unprocessable Entity` - Invalid data

### Middleware & CORS

**Configured Middleware:**
1. **SessionMiddleware** - Required for SQLAdmin authentication
2. **CORSMiddleware** - Cross-origin requests from frontend

**Allowed Origins:**
- `http://localhost:3000` (dev)
- `http://localhost:3001` (dev)
- `https://topoi-frontend.fly.dev` (production)

---

## Database Schema

### Entity Relationship Diagram

```
┌─────────────────┐
│      User       │
├─────────────────┤
│ id (PK)         │──┐
│ email (UNIQUE)  │  │
│ name            │  │
│ hashed_password │  │
│ oauth_provider  │  │
│ oauth_id        │  │
│ is_admin        │  │
│ created_at      │  │
└─────────────────┘  │
         │           │
         │ 1:N       │
         ▼           │
┌─────────────────┐  │
│     Place       │  │
├─────────────────┤  │
│ id (PK)         │  │
│ user_id (FK)    │◀─┘
│ name            │
│ address         │
│ latitude        │
│ longitude       │
│ notes           │
│ phone           │
│ website         │
│ hours           │
│ is_public       │
│ created_at      │
│ updated_at      │
└─────────────────┘
      │    │
      │    │ M:N
      │    └─────────────┐
      │                  │
      │ M:N              ▼
      │          ┌─────────────────┐
      │          │      List       │
      │          ├─────────────────┤
      │          │ id (PK)         │
      │          │ user_id (FK)    │
      │          │ name            │
      │          │ color           │
      │          │ icon            │
      │          │ is_public       │
      │          │ created_at      │
      │          └─────────────────┘
      │
      └─────────────┐
                    │
                    ▼
         ┌─────────────────┐
         │      Tag        │
         ├─────────────────┤
         │ id (PK)         │
         │ user_id (FK)    │
         │ name            │
         │ created_at      │
         └─────────────────┘
```

### Model Definitions

**User Model:**
```python
class User(Base):
    __tablename__ = "users"

    id: String (UUID, primary key)
    email: String (unique, indexed)
    name: String
    hashed_password: String (nullable for OAuth users)
    oauth_provider: String (nullable, e.g., 'google')
    oauth_id: String (nullable)
    is_admin: Boolean (default False)
    created_at: DateTime (with timezone)

    # Relationships
    places: List[Place] (cascade delete)
    lists: List[List] (cascade delete)
    tags: List[Tag] (cascade delete)
    refresh_tokens: List[RefreshToken] (cascade delete)
```

**Place Model:**
```python
class Place(Base):
    __tablename__ = "places"

    id: String (UUID, primary key)
    user_id: String (FK → users.id, cascade delete)
    name: String
    address: String
    latitude: Float
    longitude: Float
    notes: String (default "")
    phone: String (nullable)
    website: String (nullable)
    hours: String (nullable)
    is_public: Boolean (default True)
    created_at: DateTime (with timezone)
    updated_at: DateTime (with timezone, auto-update)

    # Relationships
    owner: User
    lists: List[List] (many-to-many)
    tags: List[Tag] (many-to-many)
```

**List Model (Collections):**
```python
class List(Base):
    __tablename__ = "lists"

    id: String (UUID, primary key)
    user_id: String (FK → users.id, cascade delete)
    name: String
    color: String (hex, default "#3B82F6")
    icon: String (nullable, emoji/icon)
    is_public: Boolean (default True)
    created_at: DateTime (with timezone)

    # Relationships
    owner: User
    places: List[Place] (many-to-many)
```

**Tag Model:**
```python
class Tag(Base):
    __tablename__ = "tags"

    id: String (UUID, primary key)
    user_id: String (FK → users.id, cascade delete)
    name: String
    created_at: DateTime (with timezone)

    # Relationships
    owner: User
    places: List[Place] (many-to-many)
```

**RefreshToken Model:**
```python
class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id: String (UUID, primary key)
    token: String (unique, indexed)
    user_id: String (FK → users.id, cascade delete)
    expires_at: DateTime (with timezone)
    created_at: DateTime (with timezone)
    revoked: Boolean (default False)

    # Relationships
    owner: User
```

### Database Migrations

**SQLite → PostgreSQL Migration:**

1. Export data from SQLite:
```bash
sqlite3 topoi.db .dump > backup.sql
```

2. Update `DATABASE_URL` in `.env`:
```env
DATABASE_URL="postgresql://user:password@host:port/database"
```

3. Create tables in PostgreSQL:
```bash
python -c "from database import Base, engine; Base.metadata.create_all(engine)"
```

4. Import data (adjust SQL syntax for PostgreSQL)

**Schema Changes:**
- Add new columns with `ALTER TABLE` statements
- Run migration before deploying new code
- Test migrations on staging environment first

---

## Authentication & Security

### JWT Token System

**Token Types:**

1. **Access Token:**
   - Expiry: 15 minutes
   - Purpose: API authentication
   - Storage: Frontend memory (Zustand store)
   - Algorithm: HS256
   - Payload: `{"sub": user_email, "exp": timestamp}`

2. **Refresh Token:**
   - Expiry: 7 days
   - Purpose: Renew access tokens
   - Storage: Frontend localStorage + backend database
   - Rotation: New token issued on refresh
   - Revocation: Supports logout from all devices

**Authentication Flow:**

```
1. User logs in with email/password or OAuth
   POST /api/auth/login-json

2. Backend validates credentials
   - Hash password and compare
   - Or validate OAuth token

3. Backend creates token pair
   access_token = create_access_token(user.email)
   refresh_token = create_refresh_token(user.id, db)

4. Frontend stores tokens
   localStorage.setItem('refreshToken', token)
   useStore.setState({ token: access_token })

5. Frontend includes access token in requests
   Authorization: Bearer <access_token>

6. Token expires (401 error)
   Frontend automatically calls /api/auth/refresh

7. Backend validates refresh token
   - Check not expired
   - Check not revoked
   - Issue new token pair

8. Frontend updates tokens and retries request
```

### Password Security

**Hashing:**
- Algorithm: bcrypt with salt
- Rounds: Default (12 rounds)
- Library: `passlib[bcrypt]`

**Password Requirements:**
- Minimum 8 characters (enforced in UI)
- No maximum length
- No character requirements (flexibility)

**OAuth Users:**
- `hashed_password` field is NULL
- Cannot login with password
- Must use OAuth flow

### OAuth2 Implementation

**Google OAuth Flow:**

```
1. User clicks "Login with Google"
   Frontend redirects to /api/auth/google/login

2. Backend generates OAuth URL
   authlib creates authorization URL
   Includes: client_id, redirect_uri, scopes

3. User authorizes on Google
   Google redirects to /api/auth/google/callback?code=...

4. Backend exchanges code for tokens
   Fetches user info from Google

5. Backend creates or links user account
   - If email exists: Link OAuth provider
   - If new email: Create user with oauth_provider='google'

6. Backend creates JWT tokens
   Same as password login flow

7. Redirect to frontend with tokens
   Frontend URL: /?token=...&refresh=...
```

**Supported Providers:**
- Google (implemented)
- GitHub (planned)
- Other OAuth2 providers (easily extensible)

### Authorization Model

**Resource Ownership:**
- Users can only CRUD their own resources
- Backend checks `place.user_id == current_user.id`
- SQLAlchemy filters: `query.filter(Place.user_id == user_id)`

**Public Access:**
- Places/Lists with `is_public=True` are viewable by anyone
- Public endpoints: `/api/share/*` (no auth required)
- Private resources return 404 (not 403) to non-owners

**Admin Privileges:**
- `is_admin=True` users can access `/admin` panel
- Admin API endpoints check `current_user.is_admin`
- Admins cannot demote themselves
- Promotion/demotion via API or admin panel

### Security Best Practices

**Implemented:**
- ✅ HTTPS enforced in production (Fly.io)
- ✅ CORS restricted to known origins
- ✅ SQL injection prevented (SQLAlchemy ORM)
- ✅ Password hashing with bcrypt
- ✅ JWT token expiration
- ✅ Refresh token rotation
- ✅ Cascading deletes for data integrity
- ✅ Input validation with Pydantic
- ✅ Rate limiting on external APIs

**Recommended for Production:**
- 🔲 Rate limiting on API endpoints
- 🔲 CAPTCHA on login/register
- 🔲 Account lockout after failed attempts
- 🔲 Email verification
- 🔲 2FA support
- 🔲 Audit logging for admin actions
- 🔲 CSP headers
- 🔲 Security headers (HSTS, X-Frame-Options)

---

## External Integrations

### Google OAuth (Authentication)

**Purpose:** Allow users to login with Google accounts

**Setup:**
1. Create project in Google Cloud Console
2. Enable Google+ API
3. Create OAuth 2.0 credentials
4. Set authorized redirect URI: `https://topoi-backend.fly.dev/api/auth/google/callback`
5. Add credentials to environment:
   ```env
   GOOGLE_CLIENT_ID="..."
   GOOGLE_CLIENT_SECRET="..."
   ```

**Scopes Requested:**
- `openid` - OpenID Connect
- `email` - User's email address
- `profile` - Basic profile info (name)

**User Linking:**
- If email already exists → Link OAuth provider to existing account
- If new email → Create new user with `oauth_provider='google'`

### Google Places API

**Purpose:** Enhanced place search and geocoding

**Setup:**
1. Enable Places API (New) in Google Cloud Console
2. Create API key
3. Add to environment:
   ```env
   GOOGLE_PLACES_API_KEY="..."
   ```

**Endpoints Used:**

**Autocomplete Search:**
```
POST https://places.googleapis.com/v1/places:autocomplete
{
  "input": "coffee shop",
  "locationBias": {
    "circle": {
      "center": {"latitude": 40.7, "longitude": -74.0},
      "radius": 5000
    }
  }
}
```

**Place Details:**
```
GET https://places.googleapis.com/v1/places/{place_id}
?fields=displayName,formattedAddress,location,nationalPhoneNumber,websiteUri,regularOpeningHours
```

**Rate Limits:**
- Autocomplete: $0.00 - $0.0283 per request (first 100k/month free)
- Place Details: $0.017 per request
- Monitor usage in Google Cloud Console

**Fallback:**
- Nominatim (OpenStreetMap) used when Google API unavailable
- No API key required for Nominatim
- Rate-limited to 1 request/second

### Telegram Bot (@TopoiAppBot)

**Purpose:** Save places directly from Telegram

**Setup:**
1. Create bot via @BotFather
2. Get bot token
3. Set webhook:
   ```bash
   cd backend
   python setup_telegram_webhook.py
   ```
4. Add to environment:
   ```env
   TELEGRAM_BOT_TOKEN="..."
   ```

**Account Linking Process:**
1. User clicks "Link Telegram" in app settings
2. Backend generates 6-digit code (10-minute expiry)
3. User sends `/start` or `/link` to @TopoiAppBot
4. Bot prompts for code
5. User sends code
6. Bot validates and links accounts

**Supported Google Maps URL Formats:**
```
https://maps.app.goo.gl/<short_id>
https://www.google.com/maps/place/...
https://goo.gl/maps/<short_id>
```

**Place Creation:**
1. User shares Google Maps link in Telegram
2. Telegram sends webhook to `/api/telegram/webhook`
3. Backend parses URL and extracts place_id
4. Backend fetches details from Google Places API
5. Backend creates Place for linked user
6. Bot sends confirmation message

**Commands:**
- `/start` - Welcome message + linking instructions
- `/link` - Initiate account linking
- `/unlink` - Disconnect Telegram account
- `/help` - Usage instructions

### Nominatim (OpenStreetMap)

**Purpose:** Free geocoding and reverse geocoding

**Rate Limits:**
- 1 request per second (enforced by backend)
- User-Agent header required: "Topoi/1.0"
- No API key needed

**Usage:**
- Fallback when Google Places unavailable
- Reverse geocoding (lat/lng → address)
- Address search

**Endpoint:**
```
GET https://nominatim.openstreetmap.org/search
?q=1600+Amphitheatre+Parkway
&format=json
```

---

## Deployment & Infrastructure

### Fly.io Architecture

**Backend Deployment:**
```yaml
App: topoi-backend
Region: iad (US East - Virginia)
URL: https://topoi-backend.fly.dev
Config: backend/fly.toml

Resources:
  Memory: 256MB
  CPU: 1 shared vCPU
  Auto-scaling: Min 0, auto-stop/start

Storage:
  Volume: topoi_data
  Mount: /data
  Size: 1GB (adjustable)

Environment:
  ALGORITHM: HS256
  ACCESS_TOKEN_EXPIRE_MINUTES: 15

Secrets (via flyctl secrets):
  DATABASE_URL
  SECRET_KEY
  GOOGLE_CLIENT_ID
  GOOGLE_CLIENT_SECRET
  GOOGLE_PLACES_API_KEY
  TELEGRAM_BOT_TOKEN
  FRONTEND_URL
  BACKEND_URL
```

**Frontend Deployment:**
```yaml
App: topoi-frontend
Region: iad (US East - Virginia)
URL: https://topoi-frontend.fly.dev
Config: frontend/fly.toml

Resources:
  Memory: 256MB
  CPU: 1 shared vCPU
  Auto-scaling: Min 0, auto-stop/start

Environment:
  NEXT_PUBLIC_API_URL: https://topoi-backend.fly.dev/api
```

### CI/CD Pipeline

**GitHub Actions Workflows:**

**Backend Deployment** (`.github/workflows/deploy-backend.yml`):
```yaml
name: Deploy Backend to Fly.io

on:
  push:
    branches: [main]
    paths:
      - 'backend/**'
      - '.github/workflows/deploy-backend.yml'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: superfly/flyctl-actions/setup-flyctl@master
      - run: flyctl deploy --config backend/fly.toml --remote-only
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

**Frontend Deployment** (`.github/workflows/deploy-frontend.yml`):
```yaml
name: Deploy Frontend to Fly.io

on:
  push:
    branches: [main]
    paths:
      - 'frontend/**'
      - '.github/workflows/deploy-frontend.yml'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: superfly/flyctl-actions/setup-flyctl@master
      - run: flyctl deploy --config frontend/fly.toml --remote-only
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

**Deployment Process:**
1. Developer pushes to `main` branch
2. GitHub Actions detects changes
3. Triggers appropriate workflow (backend/frontend)
4. Fly.io builds Docker image remotely
5. Deploys with zero-downtime rolling update
6. Health checks ensure successful deployment

### Docker Configuration

**Backend Dockerfile:**
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y gcc && rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create data directory for SQLite
RUN mkdir -p /data

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Frontend Dockerfile (Multi-stage):**
```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Runtime stage
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["node", "server.js"]
```

### Monitoring & Maintenance

**Health Checks:**
- Backend: `GET /health` → `{"status": "healthy"}`
- Frontend: Next.js built-in health monitoring
- Fly.io automatic health checks

**Logs:**
```bash
# View backend logs
flyctl logs -a topoi-backend

# View frontend logs
flyctl logs -a topoi-frontend

# Stream logs in real-time
flyctl logs -a topoi-backend --follow
```

**Database Access:**
```bash
# SSH into backend machine
flyctl ssh console -a topoi-backend

# Access SQLite database
python -c "from database import SessionLocal; db = SessionLocal(); ..."

# Or use sqlite3 directly
sqlite3 /data/topoi.db
```

**Scaling:**
```bash
# Scale to 2 machines
flyctl scale count 2 -a topoi-backend

# Update memory/CPU
flyctl scale memory 512 -a topoi-backend
flyctl scale cpu 2 -a topoi-backend
```

### Cost Optimization

**Free Tier Eligibility:**
- Up to 3 shared VMs (1 vCPU, 256MB RAM each)
- 3GB persistent storage
- 160GB outbound data transfer/month

**Current Usage:**
- Backend: 1 VM (256MB RAM, 1 vCPU)
- Frontend: 1 VM (256MB RAM, 1 vCPU)
- Total: 2 VMs within free tier

**Auto-stop Feature:**
- Machines stop after inactivity
- Automatically start on incoming requests
- Cold start: ~1-2 seconds
- Saves costs by not running 24/7

**Monitoring Costs:**
```bash
# View usage dashboard
flyctl dashboard -a topoi-backend

# Check billing
flyctl billing
```

---

## Development Workflow

### Local Development Setup

**Prerequisites:**
- Python 3.10+
- Node.js 18+
- Docker (optional)
- Git

**Backend Setup:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env with your credentials

# Run migrations (create tables)
python -c "from database import Base, engine; Base.metadata.create_all(engine)"

# Start development server
uvicorn main:app --reload --port 8000
```

**Frontend Setup:**
```bash
cd frontend
npm install

# Create .env.local file
echo "NEXT_PUBLIC_API_URL=http://localhost:8000/api" > .env.local

# Start development server
npm run dev
```

**Access:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Admin Panel: http://localhost:8000/admin

### Environment Variables

**Backend (.env):**
```env
# Database
DATABASE_URL=sqlite:///./topoi.db

# Authentication
SECRET_KEY=<generate-with-openssl-rand-hex-32>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15

# Google OAuth
GOOGLE_CLIENT_ID=<google-cloud-console>
GOOGLE_CLIENT_SECRET=<google-cloud-console>

# Google Places API
GOOGLE_PLACES_API_KEY=<google-cloud-console>

# Telegram Bot
TELEGRAM_BOT_TOKEN=<@BotFather>

# URLs
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:8000
```

**Frontend (.env.local):**
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

### Testing

**Backend Testing:**
```bash
cd backend
pytest  # (when tests are added)
```

**Frontend Testing:**
```bash
cd frontend
npm test  # (when tests are added)
```

**Manual Testing:**
- Use Swagger UI at `/docs` for API testing
- Test OAuth flow with ngrok for local callbacks
- Test Telegram bot with ngrok webhook

### Common Development Tasks

**Create Admin User:**
```bash
cd backend
source venv/bin/activate
python create_admin.py admin@example.com
```

**Setup Telegram Webhook:**
```bash
cd backend
python setup_telegram_webhook.py
```

**Database Migrations:**
```python
# Add new column (example)
from database import engine
from sqlalchemy import text

with engine.connect() as conn:
    conn.execute(text("ALTER TABLE users ADD COLUMN new_field TEXT"))
    conn.commit()
```

**Clear Database (Dev):**
```bash
rm backend/topoi.db
python -c "from database import Base, engine; Base.metadata.create_all(engine)"
```

### Code Style

**Backend (Python):**
- PEP 8 style guide
- Type hints encouraged
- Docstrings for public functions
- Black formatter (optional)

**Frontend (TypeScript):**
- ESLint with Next.js config
- Prettier for formatting
- Consistent naming conventions
- Component-based architecture

### Git Workflow

**Branching:**
```bash
git checkout -b feature/your-feature-name
# Make changes
git add .
git commit -m "Add your feature"
git push origin feature/your-feature-name
# Create pull request on GitHub
```

**Commit Messages:**
- Use conventional commits format
- Examples:
  - `feat: Add place search`
  - `fix: Resolve map marker issue`
  - `docs: Update API documentation`
  - `refactor: Simplify auth logic`

**Deployment:**
- Push to `main` branch triggers automatic deployment
- Monitor GitHub Actions for deployment status
- Check Fly.io logs for any issues

---

## Troubleshooting

### Common Issues

**1. Database Connection Errors:**
```
Solution: Check DATABASE_URL format
SQLite: sqlite:///./topoi.db
PostgreSQL: postgresql://user:pass@host:port/db
```

**2. CORS Errors in Browser:**
```
Solution: Verify frontend URL in CORS origins list (backend/main.py)
Add origin to allow_origins list
```

**3. OAuth Redirect Mismatch:**
```
Solution: Update redirect URI in Google Cloud Console
Must match: https://your-backend-url/api/auth/google/callback
```

**4. Telegram Webhook Not Working:**
```
Solution: Run setup_telegram_webhook.py
Verify webhook URL is publicly accessible
Check Telegram bot token is correct
```

**5. 401 Unauthorized After Login:**
```
Solution: Check token expiry and refresh logic
Clear localStorage and login again
Verify SECRET_KEY matches between deployments
```

**6. Map Not Loading:**
```
Solution: Check Leaflet CSS is imported
Verify map div has height set
Check browser console for errors
```

**7. Place Creation Fails:**
```
Solution: Verify Google Places API key is valid
Check API quotas in Google Cloud Console
Ensure coordinates are valid (lat: -90 to 90, lng: -180 to 180)
```

### Debugging Tips

**Backend Debugging:**
```python
# Enable debug mode
import logging
logging.basicConfig(level=logging.DEBUG)

# Print SQL queries
DATABASE_URL = "sqlite:///./topoi.db?echo=true"
```

**Frontend Debugging:**
```typescript
// Enable verbose logging in Zustand
const useStore = create<AppState>()(
  devtools(
    persist(
      (set) => ({...}),
      { name: 'topoi-store' }
    )
  )
);
```

**Network Debugging:**
```bash
# Test API endpoints
curl -X GET http://localhost:8000/api/places \
  -H "Authorization: Bearer <your-token>"

# Check Fly.io machine status
flyctl status -a topoi-backend

# View real-time logs
flyctl logs -a topoi-backend --follow
```

---

## Future Enhancements

### Planned Features
- [ ] Multi-language support (i18n)
- [ ] Place photos upload
- [ ] Route planning between places
- [ ] Collaborative collections
- [ ] Place recommendations
- [ ] Advanced filtering (distance, date added)
- [ ] Export to various formats (KML, GeoJSON)
- [ ] Mobile apps (React Native)
- [ ] Activity feed
- [ ] Social features (follow users, like places)

### Technical Improvements
- [ ] Unit tests (backend & frontend)
- [ ] E2E tests (Playwright/Cypress)
- [ ] Rate limiting on API
- [ ] Caching layer (Redis)
- [ ] CDN for static assets
- [ ] Database connection pooling
- [ ] Async background jobs (Celery)
- [ ] Elasticsearch for advanced search
- [ ] Monitoring (Sentry, DataDog)
- [ ] Performance monitoring (Web Vitals)

---

## Resources

### Documentation
- [FastAPI Docs](https://fastapi.tiangolo.com/)
- [Next.js Docs](https://nextjs.org/docs)
- [SQLAlchemy Docs](https://docs.sqlalchemy.org/)
- [Leaflet Docs](https://leafletjs.com/)
- [Fly.io Docs](https://fly.io/docs/)

### API References
- [Google Places API](https://developers.google.com/maps/documentation/places/web-service)
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Nominatim API](https://nominatim.org/release-docs/latest/api/Overview/)

### Community
- [GitHub Repository](https://github.com/nmacchitella/topoi)
- [Issue Tracker](https://github.com/nmacchitella/topoi/issues)

---

**Last Updated:** November 25, 2025
**Version:** 1.0.0
**Maintainer:** Nicola Macchitella
