# Topoi

> A personal map application for saving, organizing, and sharing your favorite places.

[![Deploy Backend](https://github.com/nmacchitella/topoi/actions/workflows/deploy-backend.yml/badge.svg)](https://github.com/nmacchitella/topoi/actions/workflows/deploy-backend.yml)
[![Deploy Frontend](https://github.com/nmacchitella/topoi/actions/workflows/deploy-frontend.yml/badge.svg)](https://github.com/nmacchitella/topoi/actions/workflows/deploy-frontend.yml)

## Overview

Topoi is a full-stack web application that lets you save, organize, and share places you love. Built with modern technologies and deployed on Fly.io, it features an interactive map interface, flexible organization tools, and seamless integrations with Google Places and Telegram.

**Live App:** https://topoi-frontend.fly.dev

## Key Features

- 🗺️ **Interactive Maps** - OpenStreetMap with Leaflet.js for smooth navigation
- 📍 **Place Management** - Save locations with notes, photos, and metadata
- 🏷️ **Smart Organization** - Create collections and tags to organize your places
- 🔍 **Powerful Search** - Google Places API integration with autocomplete
- 📥 **Data Import** - Import from Google Maps CSV exports
- 🔗 **Public Sharing** - Share individual places or entire collections
- 💬 **Telegram Integration** - Save places directly from Telegram via @TopoiAppBot
- 📱 **Progressive Web App** - Install on mobile devices with offline map support
- 🔐 **Secure Authentication** - JWT tokens + Google OAuth support
- 👑 **Admin Panel** - SQLAdmin interface for database management

## Tech Stack

### Frontend
- **Framework:** Next.js 14 (React 18) with App Router
- **Language:** TypeScript
- **Styling:** Tailwind CSS (dark mode)
- **Maps:** Leaflet.js with React-Leaflet
- **State:** Zustand
- **HTTP:** Axios

### Backend
- **Framework:** FastAPI (Python 3.10+)
- **ORM:** SQLAlchemy 2.0+
- **Database:** SQLite (dev) / PostgreSQL (production-ready)
- **Auth:** JWT with refresh tokens, Google OAuth2
- **Admin:** SQLAdmin + WTForms
- **APIs:** Google Places, Telegram Bot, Nominatim

### Infrastructure
- **Hosting:** Fly.io (auto-scaling containers)
- **CI/CD:** GitHub Actions
- **Containers:** Docker (multi-stage builds)
- **Storage:** Persistent volumes for SQLite

## Quick Start

### Prerequisites
- Python 3.10+
- Node.js 18+
- Docker (optional)

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Initialize database
python -c "from database import Base, engine; Base.metadata.create_all(engine)"

# Start server
uvicorn main:app --reload --port 8000
```

### Frontend Setup

```bash
cd frontend
npm install

# Configure environment
echo "NEXT_PUBLIC_API_URL=http://localhost:8000/api" > .env.local

# Start development server
npm run dev
```

**Access the app:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Admin Panel: http://localhost:8000/admin

## Documentation

Comprehensive documentation is available in the following files:

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - Complete system architecture, tech stack, database schema, and API design
- **[SETUP.md](SETUP.md)** - Detailed development setup guide with troubleshooting
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Fly.io deployment instructions and CI/CD setup
- **[TELEGRAM_INTEGRATION.md](TELEGRAM_INTEGRATION.md)** - Telegram bot integration guide
- **[backend/ADMIN_README.md](backend/ADMIN_README.md)** - Admin panel usage and user management

## Project Structure

```
topoi/
├── frontend/              # Next.js application
│   ├── src/
│   │   ├── app/          # App Router pages
│   │   ├── components/   # React components
│   │   ├── store/        # Zustand state
│   │   ├── lib/          # API client
│   │   └── hooks/        # Custom hooks
│   ├── public/           # Static assets
│   └── Dockerfile        # Production build
├── backend/              # FastAPI application
│   ├── main.py           # App entry point
│   ├── models.py         # SQLAlchemy models
│   ├── schemas.py        # Pydantic schemas
│   ├── auth.py           # Authentication logic
│   ├── admin.py          # SQLAdmin config
│   ├── routers/          # API endpoints
│   └── Dockerfile        # Production build
├── .github/
│   └── workflows/        # CI/CD pipelines
├── ARCHITECTURE.md       # System documentation
├── SETUP.md              # Development guide
├── DEPLOYMENT.md         # Deployment guide
└── README.md             # This file
```

## API Overview

The backend provides a RESTful API with automatic OpenAPI documentation at `/docs`.

### Core Endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /api/auth/login-json` | Login with email/password |
| `POST /api/auth/refresh` | Refresh access token |
| `GET /api/places` | Get all user's places |
| `POST /api/places` | Create new place |
| `GET /api/lists` | Get collections |
| `GET /api/tags` | Get tags with usage counts |
| `GET /api/search/google/autocomplete` | Search places |
| `POST /api/telegram/generate-link-code` | Link Telegram account |
| `/admin` | Admin panel (requires admin role) |

Full API documentation: https://topoi-backend.fly.dev/docs

## Environment Variables

### Backend (.env)

```env
# Database
DATABASE_URL=sqlite:///./topoi.db

# Authentication
SECRET_KEY=<your-secret-key>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15

# Google OAuth
GOOGLE_CLIENT_ID=<google-client-id>
GOOGLE_CLIENT_SECRET=<google-client-secret>

# Google Places API
GOOGLE_PLACES_API_KEY=<google-api-key>

# Telegram Bot
TELEGRAM_BOT_TOKEN=<telegram-bot-token>

# URLs
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:8000
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

## Deployment

The app uses GitHub Actions for continuous deployment to Fly.io:

1. **Push to main branch** → Triggers CI/CD workflow
2. **GitHub Actions** → Builds Docker images
3. **Fly.io** → Deploys with zero-downtime

Manual deployment:

```bash
# Deploy backend
cd backend
flyctl deploy

# Deploy frontend
cd frontend
flyctl deploy
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

## Admin Panel

Create an admin user to access the database management interface:

```bash
cd backend
source venv/bin/activate
python create_admin.py admin@example.com
```

Then access the admin panel at `/admin` with your credentials.

## Telegram Bot

Connect your Telegram account to save places from shared Google Maps links:

1. Open app settings
2. Click "Link Telegram"
3. Get your 6-digit code
4. Send `/start` to @TopoiAppBot
5. Enter your code
6. Start sharing Google Maps links!

See [TELEGRAM_INTEGRATION.md](TELEGRAM_INTEGRATION.md) for more details.

## Development

### Run with Docker Compose

```bash
docker-compose up
```

### Create Admin User

```bash
python backend/create_admin.py your@email.com
```

### Setup Telegram Webhook

```bash
python backend/setup_telegram_webhook.py
```

### Database Migrations

```bash
# Add new column (example)
python -c "from database import engine; from sqlalchemy import text;
with engine.connect() as conn:
    conn.execute(text('ALTER TABLE users ADD COLUMN new_field TEXT'));
    conn.commit()"
```

## Features Roadmap

### Completed ✅
- Interactive map with place markers
- Place CRUD operations
- Collections and tags
- Google Places search integration
- Public sharing
- Telegram bot integration
- Google OAuth login
- CSV import with preview
- Admin panel with role-based access
- PWA support with offline maps
- Auto-scaling deployment

### Planned 🚧
- [ ] Place photos upload
- [ ] Route planning between places
- [ ] Collaborative collections
- [ ] Place recommendations
- [ ] Advanced filtering (distance, date)
- [ ] Export to KML/GeoJSON
- [ ] Mobile apps (React Native)
- [ ] Social features (follow, like)
- [ ] Multi-language support

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is private and proprietary. All rights reserved.

## Support

For issues, questions, or feature requests:
- GitHub Issues: https://github.com/nmacchitella/topoi/issues
- Documentation: See [ARCHITECTURE.md](ARCHITECTURE.md)

## Acknowledgments

- [FastAPI](https://fastapi.tiangolo.com/) - Modern Python web framework
- [Next.js](https://nextjs.org/) - React framework
- [Leaflet.js](https://leafletjs.com/) - Interactive maps
- [OpenStreetMap](https://www.openstreetmap.org/) - Map data
- [Fly.io](https://fly.io/) - Hosting platform
- [Google Cloud](https://cloud.google.com/) - Places API & OAuth
- [Telegram](https://telegram.org/) - Bot integration

---

**Built with ❤️ by Nicola Macchitella**

**Last Updated:** November 25, 2025 | **Version:** 1.0.0
