# Deployment Guide

Topoi is deployed on Fly.io with automated CI/CD via GitHub Actions.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        GitHub Repository                         │
├─────────────────────────────────────────────────────────────────┤
│  main branch ────────> Deploy to Production                     │
│  development branch ──> Deploy to Development                   │
└─────────────────────────────┬───────────────────────────────────┘
                              │
                              │ GitHub Actions
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                           Fly.io                                 │
├───────────────────────────────┬─────────────────────────────────┤
│         Production            │         Development             │
├───────────────────────────────┼─────────────────────────────────┤
│  topoi-backend                │  topoi-backend-dev              │
│  ├── fly.toml                 │  ├── fly.dev.toml               │
│  └── Volume: topoi_data       │  └── Volume: topoi_data_dev     │
│                               │                                 │
│  topoi-frontend               │  topoi-frontend-dev             │
│  └── fly.toml                 │  └── fly.dev.toml               │
└───────────────────────────────┴─────────────────────────────────┘
```

## Fly.io Apps

| Environment | App Name | URL |
|-------------|----------|-----|
| Production Backend | topoi-backend | https://topoi-backend.fly.dev |
| Production Frontend | topoi-frontend | https://topoi-frontend.fly.dev |
| Development Backend | topoi-backend-dev | https://topoi-backend-dev.fly.dev |
| Development Frontend | topoi-frontend-dev | https://topoi-frontend-dev.fly.dev |

## CI/CD Workflows

### Production Deployment (.github/workflows/deploy-prod.yml)

Triggered on push to `main` branch:

```yaml
name: Deploy to Production

on:
  push:
    branches:
      - main

jobs:
  deploy-backend-prod:
    name: Deploy Backend to Production
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4
      - uses: superfly/flyctl-actions/setup-flyctl@master
      - name: Deploy Backend to Production
        run: flyctl deploy --remote-only
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}

  deploy-frontend-prod:
    name: Deploy Frontend to Production
    runs-on: ubuntu-latest
    needs: deploy-backend-prod  # Wait for backend first
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4
      - uses: superfly/flyctl-actions/setup-flyctl@master
      - name: Deploy Frontend to Production
        run: flyctl deploy --remote-only
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

### Development Deployment (.github/workflows/deploy-dev.yml)

Triggered on push to `development` branch:

```yaml
name: Deploy to Development

on:
  push:
    branches:
      - development

jobs:
  deploy-backend-dev:
    name: Deploy Backend to Dev
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4
      - uses: superfly/flyctl-actions/setup-flyctl@master
      - name: Deploy Backend to Dev
        run: flyctl deploy --config fly.dev.toml --remote-only
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}

  deploy-frontend-dev:
    name: Deploy Frontend to Dev
    runs-on: ubuntu-latest
    needs: deploy-backend-dev
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4
      - uses: superfly/flyctl-actions/setup-flyctl@master
      - name: Deploy Frontend to Dev
        run: flyctl deploy --config fly.dev.toml --remote-only
        env:
          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}
```

## Initial Setup

### 1. Install Fly CLI

```bash
# macOS
brew install flyctl

# Linux
curl -L https://fly.io/install.sh | sh

# Windows
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
```

### 2. Authenticate

```bash
fly auth login
```

### 3. Create Apps (First Time Only)

```bash
# Production apps
fly apps create topoi-backend
fly apps create topoi-frontend

# Development apps
fly apps create topoi-backend-dev
fly apps create topoi-frontend-dev
```

### 4. Create Volumes (Backend Only)

```bash
# Production
fly volumes create topoi_data --size 1 -a topoi-backend --region iad

# Development
fly volumes create topoi_data_dev --size 1 -a topoi-backend-dev --region iad
```

### 5. Set Secrets

```bash
# Production backend
fly secrets set -a topoi-backend \
  SECRET_KEY="$(openssl rand -hex 32)" \
  DATABASE_URL="sqlite:////data/topoi.db" \
  FRONTEND_URL="https://topoi-frontend.fly.dev" \
  BACKEND_URL="https://topoi-backend.fly.dev" \
  GOOGLE_CLIENT_ID="your-client-id" \
  GOOGLE_CLIENT_SECRET="your-client-secret" \
  GOOGLE_PLACES_API_KEY="your-api-key" \
  TELEGRAM_BOT_TOKEN="your-bot-token" \
  MAIL_USERNAME="your-email" \
  MAIL_PASSWORD="your-app-password" \
  MAIL_FROM="your-email" \
  MAIL_SERVER="smtp.gmail.com" \
  MAIL_PORT="587" \
  MAIL_STARTTLS="True" \
  MAIL_SSL_TLS="False"

# Development backend (use different values)
fly secrets set -a topoi-backend-dev \
  SECRET_KEY="$(openssl rand -hex 32)" \
  DATABASE_URL="sqlite:////data/topoi_dev.db" \
  FRONTEND_URL="https://topoi-frontend-dev.fly.dev" \
  BACKEND_URL="https://topoi-backend-dev.fly.dev" \
  # ... other secrets
```

### 6. Set GitHub Secret

Add `FLY_API_TOKEN` to your GitHub repository secrets:

```bash
# Get your token
fly tokens create deploy:topoi-backend,topoi-frontend,topoi-backend-dev,topoi-frontend-dev

# Add to GitHub:
# Repository > Settings > Secrets and variables > Actions > New repository secret
# Name: FLY_API_TOKEN
# Value: <paste token>
```

## Manual Deployment

### Deploy Production

```bash
# Backend
cd backend
fly deploy

# Frontend
cd frontend
fly deploy
```

### Deploy Development

```bash
# Backend
cd backend
fly deploy --config fly.dev.toml

# Frontend
cd frontend
fly deploy --config fly.dev.toml
```

## Configuration Files

### Backend fly.toml (Production)

```toml
app = "topoi-backend"
primary_region = "iad"

[build]
  dockerfile = "Dockerfile"

[env]
  ALGORITHM = "HS256"
  ACCESS_TOKEN_EXPIRE_MINUTES = "15"

[http_service]
  internal_port = 8000
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0

[[vm]]
  memory = '256mb'
  cpu_kind = 'shared'
  cpus = 1

[mounts]
  source = "topoi_data"
  destination = "/data"
```

### Backend fly.dev.toml (Development)

```toml
app = "topoi-backend-dev"
primary_region = "iad"

[build]
  dockerfile = "Dockerfile"

[env]
  ALGORITHM = "HS256"
  ACCESS_TOKEN_EXPIRE_MINUTES = "15"

[http_service]
  internal_port = 8000
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0

[[vm]]
  memory = '256mb'
  cpu_kind = 'shared'
  cpus = 1

[mounts]
  source = "topoi_data_dev"
  destination = "/data"
```

### Frontend fly.toml (Production)

```toml
app = "topoi-frontend"
primary_region = "iad"

[build]
  dockerfile = "Dockerfile"

[build.args]
  NEXT_PUBLIC_API_URL = "https://topoi-backend.fly.dev/api"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0

[[vm]]
  memory = '256mb'
  cpu_kind = 'shared'
  cpus = 1
```

### Frontend fly.dev.toml (Development)

```toml
app = "topoi-frontend-dev"
primary_region = "iad"

[build]
  dockerfile = "Dockerfile"

[build.args]
  NEXT_PUBLIC_API_URL = "https://topoi-backend-dev.fly.dev/api"

[http_service]
  internal_port = 3000
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0

[[vm]]
  memory = '256mb'
  cpu_kind = 'shared'
  cpus = 1
```

## Database Management

### SSH Access

```bash
# Production
fly ssh console -a topoi-backend

# Development
fly ssh console -a topoi-backend-dev
```

### SQLite Access

```bash
# After SSH
sqlite3 /data/topoi.db

# Common commands
.tables              # List tables
.schema users        # Show table schema
SELECT * FROM users; # Query data
.quit                # Exit
```

### Backup Database

```bash
# Download database
fly sftp shell -a topoi-backend
get /data/topoi.db ./topoi-backup.db

# Or use fly ssh
fly ssh sftp get /data/topoi.db ./topoi-backup.db -a topoi-backend
```

### Restore Database

```bash
fly sftp shell -a topoi-backend
put ./topoi-backup.db /data/topoi.db
```

## Monitoring

### View Logs

```bash
# Real-time logs
fly logs -a topoi-backend
fly logs -a topoi-frontend

# Follow logs
fly logs -a topoi-backend -f
```

### Check Status

```bash
fly status -a topoi-backend
fly status -a topoi-frontend
```

### View Machines

```bash
fly machine list -a topoi-backend
```

### Restart App

```bash
fly apps restart topoi-backend
fly apps restart topoi-frontend
```

## Secrets Management

### List Secrets

```bash
fly secrets list -a topoi-backend
```

### Update a Secret

```bash
fly secrets set SECRET_KEY="new-value" -a topoi-backend
```

### Unset a Secret

```bash
fly secrets unset OLD_SECRET -a topoi-backend
```

## Scaling

### Adjust Memory

Edit `fly.toml`:

```toml
[[vm]]
  memory = '512mb'  # Increase from 256mb
```

Then deploy.

### Always-On Machines

```toml
[http_service]
  min_machines_running = 1  # Keep at least 1 machine running
```

### Multiple Regions

```bash
fly scale count 2 --region iad,lhr -a topoi-backend
```

## Troubleshooting

### Deployment Fails

1. Check build logs:
   ```bash
   fly logs -a topoi-backend
   ```

2. Try local build:
   ```bash
   cd backend
   docker build -t test .
   ```

3. Check Dockerfile syntax and dependencies

### App Won't Start

1. Check secrets are set:
   ```bash
   fly secrets list -a topoi-backend
   ```

2. SSH in and check:
   ```bash
   fly ssh console -a topoi-backend
   cat /app/main.py  # Verify files exist
   ```

3. Check volume is mounted:
   ```bash
   fly volumes list -a topoi-backend
   ls -la /data/  # Inside SSH
   ```

### Database Errors

1. Check volume exists:
   ```bash
   fly volumes list -a topoi-backend
   ```

2. Check DATABASE_URL:
   ```bash
   fly secrets list -a topoi-backend
   ```

3. Recreate database:
   ```bash
   fly ssh console -a topoi-backend
   rm /data/topoi.db
   # Restart app - tables will be recreated
   ```

### CORS Errors

1. Check FRONTEND_URL in secrets matches actual frontend URL
2. Check CORS configuration in `backend/main.py`

### OAuth Redirect Errors

1. Verify BACKEND_URL secret
2. Check Google Cloud Console redirect URIs match exactly:
   - `https://topoi-backend.fly.dev/api/auth/google/callback`

## Rollback

### To Previous Release

```bash
# List releases
fly releases -a topoi-backend

# Rollback to previous
fly deploy --image registry.fly.io/topoi-backend:deployment-<version> -a topoi-backend
```

### Using Machine Snapshots

```bash
# Create snapshot before risky changes
fly machine snapshot create <machine-id> -a topoi-backend

# List snapshots
fly machine snapshot list <machine-id> -a topoi-backend

# Restore from snapshot
fly machine update <machine-id> --snapshot <snapshot-id> -a topoi-backend
```

## Cost Optimization

Fly.io charges based on:
- **Compute**: VM hours (machines)
- **Storage**: Volume size
- **Network**: Outbound data transfer

Current configuration minimizes costs:
- `auto_stop_machines = true`: Stops when idle
- `auto_start_machines = true`: Starts on request
- `min_machines_running = 0`: No always-on cost
- `memory = '256mb'`: Minimum allocation

**Note**: Cold starts may take 1-3 seconds when machines are stopped.
