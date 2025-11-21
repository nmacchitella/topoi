# Topoi - Project Plan

## Overview
A simple, personal web-based map application for saving and organizing places. Users can save locations, organize them with lists and categories, and share places or lists externally via public links.

---

## Core Features

### Map & Places
- Interactive OpenStreetMap with pan/zoom
- Click map to add a place at coordinates
- Search by address/name to add places (using Nominatim API)
- Pin markers showing all saved locations
- Click pins to view place details
- Different pin colors by category

### Place Information
**Auto-filled (from Nominatim API):**
- Name
- Address
- Coordinates (lat/lng)
- Place type/category suggestion

**User-entered:**
- Personal notes/description
- Category/tags (restaurant, cafe, bar, park, shop, etc.)
- Phone number (optional, manual entry)
- Website URL (optional, manual entry)
- Opening hours (optional, manual entry)
- Custom list assignments
- Date added (automatic timestamp)

### Tags Management
- Users can create custom tags
- Tags are reusable across places
- Autocomplete from existing tags when adding to a place
- Edit tag name (updates all places using it)
- Delete tag (removes from all places)
- View all tags with usage count
- Search places by tag

### Organization
- Create multiple custom lists
- Assign each place to one or multiple lists
- Filter/view places by list
- Search through saved places (by name, address, notes, tags)
- Category-based filtering

### Basic Actions
- Add new places (via map click or search)
- Edit place details
- Delete places
- Toggle between map view and list view

### Sharing
- Share entire map (all places or filtered by list) as read-only public link
- Share individual places as read-only public link
- Share specific saved lists as read-only public link
- Public views are always read-only
- Edit/add/delete only available when logged in as owner

---

## Technical Stack

### Frontend
- **Framework:** Next.js 14+ (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS (dark mode only)
- **Map Library:** Leaflet.js with React-Leaflet
- **Map Tiles:** OpenStreetMap
- **HTTP Client:** Axios or fetch for API calls

### Backend
- **Framework:** FastAPI (Python)
- **Language:** Python 3.10+
- **Authentication:** FastAPI with JWT tokens (or OAuth2)
- **Database:** PostgreSQL (or SQLite for simplicity)
- **ORM:** SQLAlchemy
- **API Documentation:** Auto-generated with FastAPI (Swagger/OpenAPI)

### Database
Simple approach for ~1k places:
- **Option 1:** PostgreSQL (production-ready)
- **Option 2:** SQLite (simplest, file-based)
- **Migration Tool:** Alembic

### External APIs
- **Geocoding/Search:** Nominatim (OpenStreetMap)
  - Endpoint: `https://nominatim.openstreetmap.org/search`
  - Free, rate limited to 1 req/second
  - Returns: name, address, coordinates, place type
  - Note: Does NOT include photos, prices, hours, phone numbers reliably

### Hosting
- **Frontend:** Vercel or Netlify
- **Backend:** Railway, Render, or DigitalOcean
- **Database:** Hosted with backend or separate (e.g., Supabase PostgreSQL)
- **Cost:** Free tiers available for all

---

## Data Models

### User
```typescript
{
  id: string
  email: string
  name: string
  createdAt: DateTime
}
```

### Place
```typescript
{
  id: string
  userId: string
  name: string
  address: string
  latitude: number
  longitude: number
  category: string // restaurant, cafe, bar, park, shop, etc.
  tagIds: string[] // array of tag IDs
  notes: string // personal description
  phone: string | null // optional phone number
  website: string | null // optional website URL
  hours: string | null // optional opening hours (free text)
  listIds: string[] // array of list IDs this place belongs to
  isPublic: boolean // determines if shareable
  createdAt: DateTime
  updatedAt: DateTime
}
```

### List
```typescript
{
  id: string
  userId: string
  name: string // "Favorites", "Want to Try", "Date Night"
  color: string // hex color for UI (from predefined palette)
  icon: string // optional emoji or icon identifier
  isPublic: boolean
  createdAt: DateTime
}
```

### Tag
```typescript
{
  id: string
  userId: string
  name: string // "romantic", "kid-friendly", "outdoor-seating"
  createdAt: DateTime
}
```

**Note:** Tags are user-specific and reusable across multiple places. When a user types a tag, the system will autocomplete from their existing tags or allow creation of new ones.

---

## Application Structure

### Routes

#### Protected Routes (require authentication)
- `/` - Main map view (user's places)
- `/lists` - Manage lists page
- `/tags` - Manage tags page
- `/place/[id]` - Place detail page (edit mode)
- `/place/new` - Add new place form
- `/api/*` - Backend API endpoints

#### Public Routes
- `/login` - Login/signup page
- `/share/map/[userId]` - Shared map view (read-only)
- `/share/list/[listId]` - Shared list view (read-only)
- `/share/place/[placeId]` - Shared place view (read-only)

### Pages

#### 1. Main Map View (`/`)
**Layout:**
- Full-screen map (70% width)
- Collapsible sidebar (30% width) with:
  - Search bar (search saved places)
  - List filter dropdown
  - Category filter
  - List of saved places (scrollable)
- Navbar at top

**Features:**
- All saved places shown as pins
- Different pin colors by category
- Click pin → show popup with name/category
- Click popup → navigate to place detail page
- Click map → add new place at coordinates
- Search bar → filter visible places
- Toggle map/list view button

#### 2. Place Detail Page (`/place/[id]`)
**Layout:**
- Large map showing single place location
- Place information card:
  - Name (editable)
  - Address (editable)
  - Coordinates (read-only)
  - Category dropdown (editable)
  - Tags input with autocomplete (editable, create/delete)
  - Phone number input (optional, editable)
  - Website URL input (optional, editable)
  - Opening hours textarea (optional, editable)
  - Notes textarea (editable)
  - Lists assignment (multi-select)
  - Public toggle (share on/off)
  - Created date (read-only)
- Action buttons:
  - Save changes
  - Delete place
  - Share (copy link)
  - Back to map

#### 3. Lists Management Page (`/lists`)
**Layout:**
- List of all user's lists
- Each list shows:
  - Name
  - Color indicator
  - Number of places
  - Edit/Delete buttons
- "Create New List" button
- Form to create/edit list:
  - Name input
  - Color picker (predefined palette)
  - Icon/emoji picker
  - Public toggle

#### 4. Tags Management Page (`/tags`)
**Layout:**
- List of all user's tags
- Each tag shows:
  - Tag name
  - Usage count (number of places using it)
  - Edit/Delete buttons
- "Create New Tag" button
- Form to create/edit tag:
  - Name input
  - Preview of places using this tag
- Bulk operations:
  - Merge tags
  - Delete unused tags

#### 5. Login Page (`/login`)
**Layout:**
- Centered form
- Email/password inputs
- Login button
- "Sign up" toggle
- Optional: Social login buttons (Google, GitHub via OAuth2)

#### 6. List View (Toggle from Map View)
**Layout:**
- Table or card grid of all places
- Sortable columns: name, category, date added
- Filter by list/category
- Search bar
- Each row/card shows:
  - Place name
  - Category badge
  - Address snippet
  - Lists badges
  - Quick actions (view, edit, delete)

#### 7. Shared Views (Read-Only)
**`/share/map/[userId]` or `/share/list/[listId]`**
- Same map interface as main view
- No edit buttons
- "Sign in to save your own places" banner
- Can view all shared places/list

**`/share/place/[placeId]`**
- Same as place detail page
- No edit buttons
- Read-only view

### Navigation Bar
**Always visible at top:**
- Logo/App name (links to `/`)
- Global search bar (searches saved places)
- View toggle (Map ⟷ List)
- Lists dropdown (quick filter)
- Category filter
- User menu:
  - Profile
  - Settings
  - Logout
- If not logged in: "Login" button

---

## Search Functionality

### 1. Add Place Search (Geocoding)
**Flow:**
1. User types in search box: "Central Park, NYC" or "123 Main St"
2. Call Nominatim API on debounce:
   ```
   GET https://nominatim.openstreetmap.org/search?
       q=[query]&
       format=json&
       limit=5
   ```
3. Display dropdown with results:
   - Display name
   - Address
   - Place type
4. User clicks result:
   - Extract lat/lng
   - Navigate to place detail page with pre-filled data
   - Or add pin directly to map

**Rate Limiting:** 1 request/second (implement debouncing)

### 2. Search Saved Places
**Client-side filtering:**
- Search through existing places array
- Match against: name, address, notes, tags
- Update visible pins on map
- Update sidebar list
- Instant results, no API calls

---

## Key Features Detail

### Adding a Place

**Method 1: Click on Map**
1. User clicks anywhere on map
2. Reverse geocode coordinates using Nominatim:
   ```
   GET https://nominatim.openstreetmap.org/reverse?
       lat=[lat]&
       lon=[lng]&
       format=json
   ```
3. Open place detail form with:
   - Coordinates (from click)
   - Address (from reverse geocode)
   - Name (user enters or from reverse geocode)
   - Category (user selects)
   - Notes (optional)
   - Lists (optional)

**Method 2: Search**
1. User searches for "Pizza Hut, Brooklyn"
2. Select from results
3. Open place detail form with pre-filled data

### Editing a Place
- Click on pin or select from list
- Navigate to `/place/[id]`
- All fields editable except coordinates
- Save button persists changes
- "Move pin" button to reposition on map

### Sharing
**Generated URLs:**
- Map: `yourdomain.com/share/map/[userId]?list=[listId]` (optional list filter)
- List: `yourdomain.com/share/list/[listId]`
- Place: `yourdomain.com/share/place/[placeId]`

**Permission Logic:**
- If `isPublic: true` → shareable
- If `isPublic: false` → only owner can view
- Share links only work for public items
- No authentication required to view shared content
- Edit/delete buttons hidden for non-owners

### Pin Colors by Category
```javascript
const categoryColors = {
  restaurant: '#EF4444',  // red
  cafe: '#F59E0B',        // amber
  bar: '#8B5CF6',         // purple
  park: '#10B981',        // green
  shop: '#3B82F6',        // blue
  culture: '#EC4899',     // pink
  other: '#6B7280'        // gray
}
```

---

## Implementation Phases

### Phase 1: Backend Setup (Week 1)
- [ ] Set up FastAPI project structure
- [ ] Configure SQLAlchemy with PostgreSQL/SQLite
- [ ] Create database models (User, Place, List, Tag)
- [ ] Implement JWT authentication endpoints
- [ ] Create Alembic migrations
- [ ] Build CRUD endpoints for Places
- [ ] Build CRUD endpoints for Lists
- [ ] Build CRUD endpoints for Tags
- [ ] Add authentication middleware
- [ ] Set up CORS for Next.js frontend

### Phase 2: Frontend Setup (Week 1-2)
- [ ] Set up Next.js project with TypeScript
- [ ] Configure Tailwind CSS (dark mode)
- [ ] Create authentication context/hooks
- [ ] Build login/register pages
- [ ] Set up Axios client with JWT interceptors
- [ ] Create protected route wrapper
- [ ] Build basic layout and navbar

### Phase 3: Map & Core Features (Week 2-3)
- [ ] Implement Leaflet map with OpenStreetMap
- [ ] Add place functionality (click map to add)
- [ ] Place detail page (create/edit with all fields)
- [ ] Implement Nominatim search for adding places
- [ ] Display pins on map with category colors
- [ ] Click pin to view place popup/details
- [ ] Simple list view of places
- [ ] Client-side search of saved places

### Phase 4: Organization Features (Week 3)
- [ ] Lists management page
- [ ] Assign places to lists
- [ ] Filter places by list
- [ ] Tags management page
- [ ] Tag autocomplete when adding to places
- [ ] Edit/delete tags with cascade updates
- [ ] Category filtering
- [ ] Delete functionality for places

### Phase 5: Sharing & Polish (Week 4)
- [ ] Public/private toggle for places and lists
- [ ] Generate shareable links
- [ ] Public share views (read-only)
- [ ] Map/List view toggle
- [ ] Navbar with all filters
- [ ] Responsive design
- [ ] Loading states & error handling
- [ ] Toast notifications
- [ ] Form validation
- [ ] Error boundaries

### Phase 6: Deployment
- [ ] Deploy FastAPI backend (Railway/Render/DigitalOcean)
- [ ] Deploy Next.js frontend (Vercel/Netlify)
- [ ] Set up production database
- [ ] Configure environment variables
- [ ] Test all features in production
- [ ] Set up monitoring/logging

---

## UI/UX Considerations

### Dark Mode Theme
- Background: `#111827` (gray-900)
- Cards: `#1F2937` (gray-800)
- Text: `#F9FAFB` (gray-50)
- Accent: `#3B82F6` (blue-500)
- Map tiles: Use dark mode tile provider or apply CSS filters

### Responsive Design
- Desktop: Sidebar + Map side-by-side
- Tablet: Collapsible sidebar
- Mobile: Full-screen map, slide-up drawer for places list

### Loading States
- Skeleton loaders for map pins
- Spinner for search results
- Toast notifications for success/error

---

## API Routes Structure

### Backend (FastAPI)

**Base URL:** `http://localhost:8000/api` (development)

```python
# Authentication
POST   /auth/register          # Register new user
POST   /auth/login             # Login (returns JWT token)
POST   /auth/logout            # Logout
GET    /auth/me                # Get current user info

# Places
GET    /places                 # Get all user's places (requires auth)
POST   /places                 # Create new place (requires auth)
GET    /places/{id}            # Get single place (auth or public)
PUT    /places/{id}            # Update place (requires auth)
DELETE /places/{id}            # Delete place (requires auth)
PATCH  /places/{id}/public     # Toggle public status (requires auth)

# Lists
GET    /lists                  # Get all user's lists (requires auth)
POST   /lists                  # Create new list (requires auth)
GET    /lists/{id}             # Get single list (auth or public)
PUT    /lists/{id}             # Update list (requires auth)
DELETE /lists/{id}             # Delete list (requires auth)
GET    /lists/{id}/places      # Get all places in a list

# Tags
GET    /tags                   # Get all user's tags (requires auth)
POST   /tags                   # Create new tag (requires auth)
GET    /tags/{id}              # Get single tag (requires auth)
PUT    /tags/{id}              # Update tag name (requires auth)
DELETE /tags/{id}              # Delete tag (requires auth)
GET    /tags/{id}/places       # Get places using this tag

# Sharing (Public endpoints)
GET    /share/map/{userId}     # Get public places for user
GET    /share/list/{listId}    # Get places in public list
GET    /share/place/{id}       # Get single public place

# Search/Geocoding
GET    /search/nominatim       # Proxy to Nominatim (with rate limiting)
POST   /search/reverse         # Reverse geocode coordinates
```

### Frontend (Next.js)

All frontend routes make API calls to the FastAPI backend using Axios/fetch with JWT authentication headers.

**Frontend Routes:**
- Client-side routing with Next.js App Router
- API calls to FastAPI backend
- JWT token stored in httpOnly cookie or localStorage

---

## Security Considerations

- All API routes check authentication (except `/api/share/*`)
- Share routes verify `isPublic: true` before returning data
- SQL injection prevention via Prisma/ORM
- Rate limiting on Nominatim API calls
- CORS configuration for Next.js API routes
- Environment variables for secrets
- Input validation and sanitization

---

## Performance Optimization

- Lazy load map tiles
- Virtualize long lists of places
- Debounce search inputs (300ms)
- Cache Nominatim results
- Optimize database queries with indexes
- Use Next.js Image component for any images
- Implement pagination for lists > 100 places

---

## Getting Started

### Prerequisites
- Node.js 18+
- Python 3.10+
- npm/yarn/pnpm
- pip and virtualenv
- PostgreSQL (or use SQLite for simplicity)

### Backend Setup (FastAPI)
```bash
# Create backend directory
mkdir backend
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install fastapi uvicorn sqlalchemy alembic psycopg2-binary python-jose[cryptography] passlib[bcrypt] python-multipart

# Create main.py and start server
uvicorn main:app --reload --port 8000
```

### Frontend Setup (Next.js)
```bash
# Create frontend directory
npx create-next-app@latest frontend --typescript --tailwind --app
cd frontend

# Install dependencies
npm install leaflet react-leaflet axios
npm install -D @types/leaflet

# Start development server
npm run dev
```

### Project Structure
```
topoi/
├── backend/
│   ├── main.py
│   ├── models.py
│   ├── schemas.py
│   ├── database.py
│   ├── auth.py
│   ├── routers/
│   │   ├── places.py
│   │   ├── lists.py
│   │   ├── tags.py
│   │   └── share.py
│   ├── alembic/
│   └── requirements.txt
└── frontend/
    ├── src/
    │   ├── app/
    │   ├── components/
    │   ├── lib/
    │   └── types/
    ├── public/
    └── package.json
```

### Environment Variables

**Backend (.env)**
```env
DATABASE_URL="postgresql://user:password@localhost/topoi"
# or for SQLite: "sqlite:///./topoi.db"
SECRET_KEY="your-secret-key-here"
ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

**Frontend (.env.local)**
```env
NEXT_PUBLIC_API_URL="http://localhost:8000/api"
```

### Commands

**Backend:**
```bash
uvicorn main:app --reload          # Start dev server
alembic revision --autogenerate    # Create migration
alembic upgrade head               # Run migrations
pytest                             # Run tests
```

**Frontend:**
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
```

---

## Success Metrics

- User can add a place in < 30 seconds
- Search returns results in < 500ms
- Map loads and renders in < 2 seconds
- Zero data loss (all places saved reliably)
- Share links work immediately after creation
- Mobile responsive on all screen sizes

---

## Notes

- Keep it simple: ~1k places means no need for complex optimization
- Nominatim rate limit: 1 req/sec (respect this to avoid blocks)
- Dark mode only (as requested)
- No social features (personal use + external sharing only)
- Authentication required for all CRUD operations
- Public views are completely read-only

---

### Tag System Details
- When user edits a tag name, it updates across all places using it
- Deleting a tag removes it from all places (with confirmation)
- Tag autocomplete helps maintain consistency
- Can filter places by multiple tags (AND/OR logic)
- Tags are personal (not shared across users)


---

**Last Updated:** November 2025
**Version:** 1.0
**Status:** Ready for implementation