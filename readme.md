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
- **Mobile App** - Native iOS/Android app with React Native/Expo

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | Next.js 14, React 18, TypeScript, Tailwind CSS, Leaflet.js, Zustand |
| **Backend** | FastAPI, SQLAlchemy 2.0, SQLite, JWT auth, Google OAuth |
| **Mobile** | Expo, React Native, React Native Maps, NativeWind |
| **Infrastructure** | Fly.io, GitHub Actions, Docker |
| **Integrations** | Google Places API, Google OAuth, Telegram Bot API, Nominatim |

## Quick Start

```bash
# Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # Edit with your credentials
uvicorn main:app --reload --port 8000

# Frontend
cd frontend
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:8000/api" > .env.local
npm run dev
```

**Access:**
- Frontend: http://localhost:3000
- API Docs: http://localhost:8000/docs
- Admin Panel: http://localhost:8000/admin

See [Local Development Guide](documentation/local-development.md) for detailed setup instructions.

## Documentation

Detailed documentation is available in the [documentation/](documentation/) folder:

| Document | Description |
|----------|-------------|
| [Architecture](documentation/architecture.md) | System overview, diagrams, data flow |
| [Auth System](documentation/auth-system.md) | JWT, OAuth, email verification, password reset |
| [Environment Variables](documentation/environment.md) | All configuration options explained |
| [Deployment](documentation/deployment.md) | CI/CD, Fly.io setup, secrets management |
| [Database](documentation/database.md) | Schema, models, relationships, queries |
| [Integrations](documentation/integrations.md) | Google Cloud, Telegram Bot, SMTP setup |
| [Local Development](documentation/local-development.md) | Getting started, IDE setup, troubleshooting |
| [Mobile App](documentation/mobile.md) | React Native/Expo app guide |

## Project Structure

```
topoi/
├── backend/           # FastAPI application
├── frontend/          # Next.js web application
├── mobile/            # React Native/Expo mobile app
├── documentation/     # Detailed documentation
└── .github/workflows/ # CI/CD pipelines
```

## Deployment

| Branch | Environment | URLs |
|--------|-------------|------|
| `main` | Production | [frontend](https://topoi-frontend.fly.dev) / [backend](https://topoi-backend.fly.dev) |
| `development` | Development | [frontend](https://topoi-frontend-dev.fly.dev) / [backend](https://topoi-backend-dev.fly.dev) |

Push to either branch triggers automatic deployment via GitHub Actions.

See [Deployment Guide](documentation/deployment.md) for manual deployment and configuration.

## License

Private and proprietary. All rights reserved.

---

**Built by Nicola Macchitella**
