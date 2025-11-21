# Topoi Deployment Guide

This guide covers deploying Topoi to Fly.io using Docker.

## Prerequisites

1. Install [Docker](https://www.docker.com/get-started)
2. Install [Fly CLI](https://fly.io/docs/hands-on/install-flyctl/)
3. Sign up for a [Fly.io account](https://fly.io/app/sign-up)

## Local Testing with Docker

### 1. Build and run with Docker Compose

```bash
# Build and start all services
docker-compose up --build

# Or run in detached mode
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

The app will be available at:
- Frontend: http://localhost:3000
- Backend: http://localhost:8000

### 2. Test individual services

Backend only:
```bash
cd backend
docker build -t topoi-backend .
docker run -p 8000:8000 \
  -e DATABASE_URL=sqlite:////data/mapstr.db \
  -e SECRET_KEY=your-secret-key \
  -v topoi-data:/data \
  topoi-backend
```

Frontend only:
```bash
cd frontend
docker build -t topoi-frontend .
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_API_URL=http://localhost:8000/api \
  topoi-frontend
```

## Deploying to Fly.io

### 1. Login to Fly.io

```bash
flyctl auth login
```

### 2. Deploy Backend

```bash
cd backend

# Create a new Fly.io app (first time only)
flyctl launch --no-deploy

# Create a volume for persistent database storage (first time only)
flyctl volumes create topoi_data --region iad --size 1

# Set secrets
flyctl secrets set \
  SECRET_KEY="your-secret-key-here" \
  DATABASE_URL="sqlite:////data/mapstr.db" \
  GOOGLE_CLIENT_ID="your-google-client-id" \
  GOOGLE_CLIENT_SECRET="your-google-client-secret" \
  FRONTEND_URL="https://topoi-frontend.fly.dev"

# Deploy
flyctl deploy
```

### 3. Deploy Frontend

```bash
cd frontend

# Create a new Fly.io app (first time only)
flyctl launch --no-deploy

# Set the backend API URL
flyctl secrets set NEXT_PUBLIC_API_URL="https://topoi-backend.fly.dev/api"

# Deploy
flyctl deploy
```

### 4. Update CORS in Backend

After deploying the frontend, update the backend's CORS configuration to allow requests from your frontend URL.

Edit `backend/main.py` and add your frontend URL to `allow_origins`:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://topoi-frontend.fly.dev",  # Add your Fly.io frontend URL
    ],
    ...
)
```

Then redeploy the backend:
```bash
cd backend
flyctl deploy
```

## Monitoring and Maintenance

### View logs
```bash
# Backend logs
cd backend
flyctl logs

# Frontend logs
cd frontend
flyctl logs
```

### Access the app
```bash
# Open backend
cd backend
flyctl open

# Open frontend
cd frontend
flyctl open
```

### Scale machines
```bash
# Scale backend
cd backend
flyctl scale count 1

# Scale frontend
cd frontend
flyctl scale count 1
```

### SSH into machine
```bash
# Backend
cd backend
flyctl ssh console

# Frontend
cd frontend
flyctl ssh console
```

## Environment Variables

### Backend Required Variables
- `SECRET_KEY`: JWT secret key for authentication
- `DATABASE_URL`: SQLite database path (use `/data/mapstr.db` for persistent storage)
- `GOOGLE_CLIENT_ID`: Google OAuth client ID (optional)
- `GOOGLE_CLIENT_SECRET`: Google OAuth client secret (optional)
- `FRONTEND_URL`: Frontend URL for OAuth redirects

### Frontend Required Variables
- `NEXT_PUBLIC_API_URL`: Backend API URL

## Troubleshooting

### Database not persisting
Make sure the volume is created and mounted correctly in `fly.toml`:
```toml
[mounts]
  source = "topoi_data"
  destination = "/data"
```

### CORS errors
Ensure the frontend URL is added to the backend's CORS allow_origins list.

### OAuth callback errors
Update the Google Cloud Console OAuth settings with your production URLs:
- Authorized JavaScript origins: `https://topoi-frontend.fly.dev`
- Authorized redirect URIs: `https://topoi-backend.fly.dev/api/auth/google/callback`

## Cost Optimization

Fly.io offers:
- Free tier: 3 shared-cpu-1x 256mb VMs
- Auto-stop machines when not in use
- Auto-start on incoming requests

The configuration in `fly.toml` is set to:
- `auto_stop_machines = true`
- `auto_start_machines = true`
- `min_machines_running = 0`

This means your app will automatically sleep when inactive and wake up on requests, keeping costs minimal.
