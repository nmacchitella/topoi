# Topoi Development & Deployment Guide

This document describes the development workflow, deployment infrastructure, and environment management for Topoi.

## Overview

Topoi uses a two-environment setup:
- **Development** (`dev`) - For testing new features before production
- **Production** (`prod`) - Live application for end users

Both environments are hosted on [Fly.io](https://fly.io).

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         GitHub Repository                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   development branch ──push──► GitHub Actions ──► Dev Environment│
│                                                                  │
│   main branch ─────────push──► GitHub Actions ──► Prod Environment│
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Fly.io Apps

| Environment | Backend App | Frontend App |
|-------------|-------------|--------------|
| Development | `topoi-backend-dev` | `topoi-frontend-dev` |
| Production | `topoi-backend` | `topoi-frontend` |

### URLs

| Environment | Backend URL | Frontend URL |
|-------------|-------------|--------------|
| Development | https://topoi-backend-dev.fly.dev | https://topoi-frontend-dev.fly.dev |
| Production | https://topoi-backend.fly.dev | https://topoi-frontend.fly.dev |

## Branch Workflow

### Development Flow

1. Create feature branch from `development`:
   ```bash
   git checkout development
   git pull
   git checkout -b feature/my-feature
   ```

2. Make changes and commit

3. Push and merge to `development`:
   ```bash
   git push origin feature/my-feature
   # Create PR to development branch, or merge locally:
   git checkout development
   git merge feature/my-feature
   git push
   ```

4. **Automatic deployment**: Pushing to `development` triggers CI/CD deployment to dev environment

### Production Release

1. Ensure `development` is stable and tested

2. Merge `development` into `main`:
   ```bash
   git checkout main
   git pull
   git merge development
   git push
   ```

3. **Automatic deployment**: Pushing to `main` triggers CI/CD deployment to production

## Manual Deployment

For manual deployments (useful for hotfixes or when CI/CD is unavailable), use the deploy script:

```bash
# Deploy to development
./deploy.sh dev all        # Both backend and frontend
./deploy.sh dev backend    # Backend only
./deploy.sh dev frontend   # Frontend only

# Deploy to production
./deploy.sh prod all
./deploy.sh prod backend
./deploy.sh prod frontend
```

## Configuration Files

### Fly.io Config Files

| File | Purpose |
|------|---------|
| `backend/fly.toml` | Production backend config |
| `backend/fly.dev.toml` | Development backend config |
| `frontend/fly.toml` | Production frontend config |
| `frontend/fly.dev.toml` | Development frontend config |

Key differences between environments:
- **App names**: `topoi-backend` vs `topoi-backend-dev`
- **Volume mounts**: `topoi_data` vs `topoi_data_dev` (database isolation)
- **API URLs**: Frontend dev points to backend dev

### GitHub Actions Workflows

| File | Trigger | Action |
|------|---------|--------|
| `.github/workflows/deploy-dev.yml` | Push to `development` | Deploy to dev |
| `.github/workflows/deploy-prod.yml` | Push to `main` | Deploy to prod |

## Environment Secrets

Backend secrets must be set separately for each Fly.io app:

```bash
# For development
fly secrets set SECRET_KEY="your-secret-key" -a topoi-backend-dev
fly secrets set DATABASE_URL="sqlite:////data/topoi_dev.db" -a topoi-backend-dev
fly secrets set FRONTEND_URL="https://topoi-frontend-dev.fly.dev" -a topoi-backend-dev
fly secrets set BACKEND_URL="https://topoi-backend-dev.fly.dev" -a topoi-backend-dev
# ... other secrets

# For production
fly secrets set SECRET_KEY="your-secret-key" -a topoi-backend
fly secrets set DATABASE_URL="sqlite:////data/topoi.db" -a topoi-backend
fly secrets set FRONTEND_URL="https://topoi-frontend.fly.dev" -a topoi-backend
fly secrets set BACKEND_URL="https://topoi-backend.fly.dev" -a topoi-backend
# ... other secrets
```

### Required Secrets

| Secret | Description |
|--------|-------------|
| `SECRET_KEY` | JWT signing key |
| `DATABASE_URL` | SQLite database path |
| `FRONTEND_URL` | Frontend app URL (for CORS) |
| `BACKEND_URL` | Backend API URL |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth secret |
| `GOOGLE_PLACES_API_KEY` | Google Places API key |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token |
| `MAIL_USERNAME` | SMTP username |
| `MAIL_PASSWORD` | SMTP password |
| `MAIL_FROM` | Email sender address |
| `MAIL_SERVER` | SMTP server |
| `MAIL_PORT` | SMTP port |
| `MAIL_STARTTLS` | Enable STARTTLS |
| `MAIL_SSL_TLS` | Enable SSL/TLS |

### View Current Secrets

```bash
fly secrets list -a topoi-backend-dev
fly secrets list -a topoi-backend
```

## Database Management

Each environment has its own isolated SQLite database stored on a Fly.io volume:

- **Development**: `/data/topoi_dev.db` on volume `topoi_data_dev`
- **Production**: `/data/topoi.db` on volume `topoi_data`

### SSH into Backend

```bash
# Development
fly ssh console -a topoi-backend-dev

# Production
fly ssh console -a topoi-backend
```

### Create Test User (Development)

```bash
fly ssh console -a topoi-backend-dev

# Inside the container:
python3 -c "
from sqlalchemy.orm import Session
from database import engine
from models import User
from passlib.context import CryptContext
import uuid

pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')

with Session(engine) as db:
    user = User(
        id=str(uuid.uuid4()),
        email='test@example.com',
        hashed_password=pwd_context.hash('password'),
        display_name='Test User',
        is_verified=True
    )
    db.add(user)
    db.commit()
    print(f'Created user: {user.email}')
"
```

## Monitoring & Logs

### View Logs

```bash
# Development
fly logs -a topoi-backend-dev
fly logs -a topoi-frontend-dev

# Production
fly logs -a topoi-backend
fly logs -a topoi-frontend
```

### Check App Status

```bash
fly status -a topoi-backend-dev
fly status -a topoi-frontend-dev
```

### Restart Apps

```bash
fly apps restart topoi-backend-dev
fly apps restart topoi-frontend-dev
```

## GitHub Secrets

The following secret must be set in GitHub repository settings for CI/CD:

- `FLY_API_TOKEN` - Fly.io API token for deployments

Generate token:
```bash
fly tokens create deploy -x 999999h
```

## Local Development

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Local frontend defaults to `http://localhost:8000/api` for the backend.

## Troubleshooting

### Deployment Fails

1. Check GitHub Actions logs
2. Verify `FLY_API_TOKEN` is set in GitHub secrets
3. Check Fly.io status: `fly status -a <app-name>`

### Database Issues

1. SSH into the backend container
2. Check database file exists: `ls -la /data/`
3. Check volume is mounted: `df -h`

### Frontend Can't Connect to Backend

1. Verify `NEXT_PUBLIC_API_URL` build arg in `fly.dev.toml`
2. Check CORS settings in backend (FRONTEND_URL secret)
3. Check backend is running: `fly status -a topoi-backend-dev`
