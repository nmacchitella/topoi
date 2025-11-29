# Topoi

A personal map application for saving, organizing, and sharing your favorite places.

**Live:** https://topoi-frontend.fly.dev

## Features

- **Interactive Maps** - OpenStreetMap with Leaflet.js, clustering, and smooth navigation
- **Place Management** - Save locations with notes, phone, website, hours, and metadata
- **Smart Organization** - Create collections (lists) and tags to organize places
- **Google Places Search** - Autocomplete search with place details import
- **CSV Import** - Import from Google Maps exports with duplicate detection
- **Public Sharing** - Share individual places or entire collections via public links
- **Telegram Bot** - Save places directly from shared Google Maps links via @TopoiAppBot
- **Progressive Web App** - Installable on mobile with offline map tile caching
- **Admin Panel** - SQLAdmin interface for database management

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | Next.js 14, React 18, TypeScript, Tailwind CSS, Leaflet.js, Zustand |
| **Backend** | FastAPI, SQLAlchemy 2.0, SQLite/PostgreSQL, JWT auth, Google OAuth |
| **Infrastructure** | Fly.io, GitHub Actions, Docker |
| **Integrations** | Google Places API, Google OAuth, Telegram Bot API, Nominatim |

## Quick Start

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # Edit with your credentials
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:8000/api" > .env.local
npm run dev
```

**Access:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Admin Panel: http://localhost:8000/admin

## Project Structure

```
topoi/
├── backend/               # FastAPI application
│   ├── main.py            # App entry point
│   ├── models.py          # SQLAlchemy models
│   ├── schemas.py         # Pydantic schemas
│   ├── auth.py            # JWT authentication
│   ├── routers/           # API endpoints
│   ├── services/          # Email service
│   └── fly.toml           # Fly.io config
├── frontend/              # Next.js application
│   ├── src/app/           # App Router pages
│   ├── src/components/    # React components
│   ├── src/store/         # Zustand state
│   ├── src/lib/           # API client
│   └── fly.toml           # Fly.io config
└── .github/workflows/     # CI/CD pipelines
```

## Environment Variables

### Backend (.env)

```env
DATABASE_URL=sqlite:///./topoi.db
SECRET_KEY=<generate-with-openssl-rand-hex-32>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15

# Google
GOOGLE_CLIENT_ID=<from-google-cloud-console>
GOOGLE_CLIENT_SECRET=<from-google-cloud-console>
GOOGLE_PLACES_API_KEY=<from-google-cloud-console>

# Telegram
TELEGRAM_BOT_TOKEN=<from-botfather>

# URLs
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:8000

# Email (optional)
MAIL_USERNAME=<smtp-username>
MAIL_PASSWORD=<smtp-password>
MAIL_FROM=<sender-email>
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_STARTTLS=True
MAIL_SSL_TLS=False
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

## Deployment

### Branch Workflow

- `development` branch → deploys to **dev** environment
- `main` branch → deploys to **production** environment

Push to either branch triggers automatic deployment via GitHub Actions.

### Fly.io Apps

| Environment | Backend | Frontend |
|-------------|---------|----------|
| Development | topoi-backend-dev | topoi-frontend-dev |
| Production | topoi-backend | topoi-frontend |

### Manual Deployment

```bash
# Deploy backend
cd backend && flyctl deploy

# Deploy frontend
cd frontend && flyctl deploy

# Deploy to dev environment
flyctl deploy --config fly.dev.toml
```

### Setting Secrets

```bash
fly secrets set SECRET_KEY="your-key" -a topoi-backend
fly secrets set DATABASE_URL="sqlite:////data/topoi.db" -a topoi-backend
# ... repeat for all required secrets
```

## Database

SQLite in development, PostgreSQL-ready for production.

### SSH Access

```bash
fly ssh console -a topoi-backend
sqlite3 /data/topoi.db
```

### Create Admin User

```bash
cd backend
python create_admin.py admin@example.com
```

## Telegram Integration

1. Go to app Settings
2. Click "Link Telegram"
3. Copy the 6-digit code
4. Message @TopoiAppBot with `/start`
5. Enter your code
6. Share Google Maps links to save places!

Supported URL formats:
- `https://maps.app.goo.gl/<id>`
- `https://www.google.com/maps/place/...`
- `https://goo.gl/maps/<id>`

## API Overview

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/register` | POST | Create account |
| `/api/auth/login-json` | POST | Login |
| `/api/auth/refresh` | POST | Refresh token |
| `/api/places` | GET/POST | List/create places |
| `/api/places/{id}` | GET/PUT/DELETE | Place operations |
| `/api/lists` | GET/POST | List/create collections |
| `/api/tags` | GET/POST | List/create tags |
| `/api/search/google/autocomplete` | GET | Search places |
| `/api/share/place/{id}` | GET | Public place view |
| `/api/share/list/{id}` | GET | Public collection view |

Full docs: https://topoi-backend.fly.dev/docs

## Monitoring

```bash
# View logs
fly logs -a topoi-backend

# Check status
fly status -a topoi-backend

# Restart
fly apps restart topoi-backend
```

## Troubleshooting

**CORS errors:** Add frontend URL to allowed origins in `main.py`

**OAuth redirect mismatch:** Update redirect URI in Google Cloud Console to match `BACKEND_URL/api/auth/google/callback`

**Token expired:** Frontend auto-refreshes tokens; clear localStorage if stuck

**Map not loading:** Ensure Leaflet CSS is imported and map container has height

**Database errors:** Delete `topoi.db` and restart to recreate tables

## License

Private and proprietary. All rights reserved.

---

**Built by Nicola Macchitella**
