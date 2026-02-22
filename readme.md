# Topoi

Personal map app for saving, organizing, and sharing your favorite places.

Because Google Maps saved places is fine, until it isn't.

**Live:** https://topoi-frontend.fly.dev

## What it does

- Interactive map with OpenStreetMap, clustering, the works
- Save places with notes, phone, website, hours — whatever you need
- Organize things into lists and tags
- Search via Google Places autocomplete
- Import your Google Maps data (CSV, with duplicate detection)
- Share your map or individual collections via link
- Telegram bot — forward a Google Maps link to [@TopoiAppBot](https://t.me/TopoiAppBot), done
- PWA + native mobile app, works offline
- MCP server so Claude can manage your map for you

## Stack

| | |
|---|---|
| **Frontend** | Next.js 14, TypeScript, Tailwind, Leaflet.js, Zustand |
| **Backend** | FastAPI, SQLAlchemy, SQLite, JWT + Google OAuth |
| **Mobile** | Expo, React Native, React Native Maps |
| **Infra** | Fly.io, GitHub Actions, Docker |

## Run it yourself

You'll need Python 3.11+ and Node.js 18+.

```bash
# backend
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # fill in your secrets
uvicorn main:app --reload --port 8000

# frontend
cd frontend
npm install
echo "NEXT_PUBLIC_API_URL=http://localhost:8000/api" > .env.local
npm run dev
```

Or, if you'd rather not think about it:

```bash
docker-compose up
```

Frontend at [localhost:3000](http://localhost:3000), API docs at [localhost:8000/docs](http://localhost:8000/docs), admin at [localhost:8000/admin](http://localhost:8000/admin).

### Environment variables

Copy `backend/.env.example` and fill in what you need. Only `SECRET_KEY` is truly required — generate one with `openssl rand -hex 32`. The rest unlock specific features:

| Variable | For |
|---|---|
| `GOOGLE_CLIENT_ID` / `SECRET` | OAuth login |
| `GOOGLE_PLACES_API_KEY` | Place search |
| `TELEGRAM_BOT_TOKEN` | Telegram bot |
| `MAIL_*` | Email verification |
| `MCP_AUTH_TOKEN` | Claude MCP access |

Everything runs fine without the optional ones. You just won't have those features.

## Project structure

```
topoi/
├── backend/           # FastAPI + MCP server
├── frontend/          # Next.js web app
├── mobile/            # React Native / Expo
├── documentation/     # the deep dives
└── .github/workflows/ # CI/CD
```

## Docs

The [documentation/](documentation/) folder covers everything in detail:

[Architecture](documentation/architecture.md) · [Auth](documentation/auth-system.md) · [Environment](documentation/environment.md) · [Local Dev](documentation/local-development.md) · [Database](documentation/database.md) · [Deployment](documentation/deployment.md) · [Integrations](documentation/integrations.md) · [Mobile](documentation/mobile.md) · [MCP](documentation/mcp.md)

## Deployment

Push to `main` or `development` and GitHub Actions takes care of the rest.

| Branch | Environment |
|---|---|
| `main` | [Production](https://topoi-frontend.fly.dev) |
| `development` | [Dev](https://topoi-frontend-dev.fly.dev) |

---

Built by [Nicola Macchitella](https://www.macchitella.xyz)
