# Topoi - Setup Guide

A full-stack web application for saving and organizing your favorite places with interactive maps, lists, tags, and sharing capabilities.

## Quick Start

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the backend server
python main.py
```

Backend runs at: [http://localhost:8000](http://localhost:8000)
API Docs: [http://localhost:8000/docs](http://localhost:8000/docs)

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

Frontend runs at: [http://localhost:3000](http://localhost:3000)

### 3. First Use

1. Open [http://localhost:3000](http://localhost:3000)
2. Click "Sign Up" to create an account
3. Start adding places by clicking on the map!

## Features

- Interactive OpenStreetMap with Leaflet.js
- Click map to add places or search by address
- Organize places with custom lists and tags
- Category-based filtering with color-coded pins
- Share maps, lists, or places via public links
- Dark mode UI throughout
- JWT authentication

## Tech Stack

**Frontend:**
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Leaflet.js
- Zustand (state management)

**Backend:**
- FastAPI (Python)
- SQLAlchemy ORM
- SQLite database
- JWT authentication

## Project Structure

```
topoi/
├── backend/
│   ├── main.py              # FastAPI app
│   ├── models.py            # Database models
│   ├── schemas.py           # Pydantic schemas
│   ├── database.py          # DB configuration
│   ├── auth.py              # Authentication
│   └── routers/             # API endpoints
├── frontend/
│   └── src/
│       ├── app/             # Next.js pages
│       ├── components/      # React components
│       ├── lib/            # API client
│       └── store/          # State management
└── readme.md                # Original plan
```

## Environment Variables

All environment files are pre-configured for local development.

**Backend** (`.env`):
- SQLite database (auto-created)
- Development JWT secret
- Token expiration: 30 minutes

**Frontend** (`.env.local`):
- API URL: `http://localhost:8000/api`

## Switching to PostgreSQL

1. Update `backend/.env`:
```env
DATABASE_URL="postgresql://user:password@localhost/topoi"
```

2. Install PostgreSQL and create database:
```bash
createdb topoi
```

3. Restart backend

## API Endpoints

See [http://localhost:8000/docs](http://localhost:8000/docs) for interactive API documentation.

Key endpoints:
- `POST /api/auth/register` - Create account
- `POST /api/auth/login-json` - Login
- `GET /api/places` - Get places
- `POST /api/places` - Create place
- `GET /api/lists` - Get lists
- `GET /api/tags` - Get tags
- `GET /api/share/map/{userId}` - Public map view

## Troubleshooting

**Map not loading:**
- Ensure you're using `npm run dev` (not `npm start` without building first)
- Check browser console for errors

**Login issues:**
- Verify backend is running on port 8000
- Clear browser localStorage and try again

**Database errors:**
- Delete `backend/topoi.db` and restart backend to recreate

## Production Deployment

**Backend:**
```bash
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000
```

**Frontend:**
```bash
cd frontend
npm run build
npm run start
```

Recommended hosting:
- Frontend: Vercel, Netlify
- Backend: Railway, Render, DigitalOcean
- Database: PostgreSQL on same platform

## License

MIT License - Free to use for personal or commercial projects.
