# Local Development Guide

This guide covers setting up Topoi for local development on macOS, Linux, or Windows.

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Python | 3.11+ | Backend runtime |
| Node.js | 18+ | Frontend runtime |
| npm | 9+ | Package manager |
| Git | Latest | Version control |

### Optional

| Tool | Purpose |
|------|---------|
| Docker | Container testing |
| ngrok | Telegram webhook testing |
| SQLite Browser | Database inspection |

## Quick Start

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/topoi.git
cd topoi
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
source venv/bin/activate  # macOS/Linux
# or
.\venv\Scripts\activate   # Windows

# Install dependencies
pip install -r requirements.txt

# Create environment file
cp .env.example .env
# Edit .env with your credentials (see below)

# Run development server
uvicorn main:app --reload --port 8000
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create environment file
echo "NEXT_PUBLIC_API_URL=http://localhost:8000/api" > .env.local

# Run development server
npm run dev
```

### 4. Access Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **Admin Panel**: http://localhost:8000/admin

## Environment Configuration

### Minimal Backend .env

For basic local development without external services:

```env
DATABASE_URL=sqlite:///./topoi.db
SECRET_KEY=dev-secret-key-for-local-testing-only
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:8000
```

### Full Backend .env

With all features enabled:

```env
# Database
DATABASE_URL=sqlite:///./topoi.db

# Authentication
SECRET_KEY=your-32-byte-hex-secret
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15

# Google (optional - for OAuth and Places)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_PLACES_API_KEY=your-api-key

# Telegram (optional - for bot integration)
TELEGRAM_BOT_TOKEN=your-bot-token

# URLs
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:8000

# Email (optional - for verification)
MAIL_USERNAME=your-email
MAIL_PASSWORD=your-app-password
MAIL_FROM=your-email
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_STARTTLS=True
MAIL_SSL_TLS=False
```

## Development Workflow

### Running Both Services

**Terminal 1 - Backend**:
```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload --port 8000
```

**Terminal 2 - Frontend**:
```bash
cd frontend
npm run dev
```

### Using a Process Manager

Create a `Procfile.dev`:
```
backend: cd backend && source venv/bin/activate && uvicorn main:app --reload --port 8000
frontend: cd frontend && npm run dev
```

Run with [honcho](https://honcho.readthedocs.io/):
```bash
pip install honcho
honcho start -f Procfile.dev
```

## Database

### Location

Local development uses SQLite stored at `backend/topoi.db`.

### Reset Database

```bash
cd backend
rm topoi.db
# Restart server - tables recreate automatically
```

### View Database

Using SQLite CLI:
```bash
sqlite3 backend/topoi.db
.tables
SELECT * FROM users;
.quit
```

Or use a GUI like [DB Browser for SQLite](https://sqlitebrowser.org/).

### Create Admin User

```bash
cd backend
source venv/bin/activate
python create_admin.py admin@example.com
```

## Testing

### Backend Tests

```bash
cd backend
source venv/bin/activate
pytest
```

### Frontend Linting

```bash
cd frontend
npm run lint
```

### Type Checking

```bash
cd frontend
npx tsc --noEmit
```

## Common Tasks

### Adding a Python Dependency

```bash
cd backend
source venv/bin/activate
pip install new-package
pip freeze > requirements.txt
```

### Adding an npm Dependency

```bash
cd frontend
npm install new-package
```

### Testing Google OAuth Locally

1. Set up Google Cloud credentials (see [integrations.md](integrations.md))
2. Add `http://localhost:8000/api/auth/google/callback` to authorized redirect URIs
3. Add `http://localhost:3000` to authorized JavaScript origins

### Testing Telegram Bot Locally

1. Install ngrok: `brew install ngrok` (macOS) or [download](https://ngrok.com/download)
2. Run backend: `uvicorn main:app --reload --port 8000`
3. Expose with ngrok: `ngrok http 8000`
4. Set webhook: `python setup_telegram_webhook.py https://xxxx.ngrok.io/api/telegram/webhook`

### Testing Email Locally

Option 1: Use [Mailtrap](https://mailtrap.io) for safe email testing
Option 2: Use Gmail with app password
Option 3: Skip email - accounts won't require verification in dev mode

## Troubleshooting

### Backend won't start

**"ModuleNotFoundError"**:
```bash
# Ensure virtual environment is activated
source venv/bin/activate
pip install -r requirements.txt
```

**Port already in use**:
```bash
# Find process using port 8000
lsof -i :8000
# Kill it
kill -9 <PID>
```

### Frontend won't start

**"ENOENT: no such file or directory"**:
```bash
cd frontend
rm -rf node_modules package-lock.json
npm install
```

**Port already in use**:
```bash
# Use a different port
npm run dev -- -p 3001
# Update FRONTEND_URL in backend .env
```

### Database errors

**"no such table"**:
```bash
# Tables should auto-create on first run
# If not, check database.py initialization
cd backend
python -c "from database import Base, engine; Base.metadata.create_all(engine)"
```

**Database locked**:
- Close any other connections (SQLite Browser, other terminal)
- Only one write connection allowed at a time

### CORS errors

Check `backend/main.py` CORS configuration:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### API requests failing

**401 Unauthorized**:
- Token expired - check token refresh logic
- Clear localStorage and login again

**Network Error**:
- Backend not running
- Wrong API URL in `.env.local`

## IDE Setup

### VS Code

Recommended extensions:
- Python (Microsoft)
- Pylance
- ESLint
- Tailwind CSS IntelliSense
- Prettier

Settings (`.vscode/settings.json`):
```json
{
  "python.defaultInterpreterPath": "./backend/venv/bin/python",
  "python.analysis.typeCheckingMode": "basic",
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[python]": {
    "editor.defaultFormatter": "ms-python.python"
  }
}
```

### PyCharm

1. Open the `topoi` folder as a project
2. Configure Python interpreter: Settings → Project → Python Interpreter → Add → Existing environment → Select `backend/venv/bin/python`
3. Mark `backend` as Sources Root
4. Mark `frontend` as Resource Root

## Project Structure

```
topoi/
├── backend/                 # FastAPI backend
│   ├── main.py             # Entry point
│   ├── database.py         # DB configuration
│   ├── models.py           # SQLAlchemy models
│   ├── schemas.py          # Pydantic schemas
│   ├── auth.py             # Authentication
│   ├── routers/            # API endpoints
│   ├── services/           # Business logic
│   ├── requirements.txt    # Python dependencies
│   ├── .env                # Environment (not committed)
│   └── venv/               # Virtual environment
│
├── frontend/               # Next.js frontend
│   ├── src/
│   │   ├── app/           # Pages (App Router)
│   │   ├── components/    # React components
│   │   ├── store/         # Zustand state
│   │   ├── lib/           # Utilities
│   │   └── types/         # TypeScript types
│   ├── public/            # Static assets
│   ├── package.json       # npm dependencies
│   └── .env.local         # Environment (not committed)
│
├── mobile/                 # React Native/Expo app
│   ├── app/               # Expo Router pages
│   ├── src/               # Source code
│   └── package.json       # npm dependencies
│
├── documentation/          # This documentation
│
└── .github/
    └── workflows/         # CI/CD pipelines
```

## Git Workflow

### Branch Strategy

- `main` - Production (auto-deploys)
- `development` - Development environment (auto-deploys)
- `feature/*` - Feature branches (merge to development)

### Making Changes

```bash
# Create feature branch
git checkout development
git pull
git checkout -b feature/my-feature

# Make changes...

# Commit
git add .
git commit -m "Add my feature"

# Push and create PR
git push -u origin feature/my-feature
# Create PR on GitHub: feature/my-feature → development
```

### Deployment

Merging to `development` triggers dev deployment.
Merging to `main` triggers production deployment.
