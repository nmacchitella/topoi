# Environment Variables

This document describes all environment variables used by Topoi across backend, frontend, and mobile applications.

## Backend Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# Database
DATABASE_URL=sqlite:///./topoi.db

# Authentication
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15

# Google OAuth & Places
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_PLACES_API_KEY=your-google-places-api-key

# Telegram Bot
TELEGRAM_BOT_TOKEN=your-telegram-bot-token

# URLs
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:8000

# Email (SMTP)
MAIL_USERNAME=your-smtp-username
MAIL_PASSWORD=your-smtp-password
MAIL_FROM=noreply@yourdomain.com
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_STARTTLS=True
MAIL_SSL_TLS=False
```

### Variable Reference

#### Database

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | SQLAlchemy database URL. Use `sqlite:///./topoi.db` for local dev, `sqlite:////data/topoi.db` for Fly.io |

**Examples**:
- Local SQLite: `sqlite:///./topoi.db`
- Fly.io (persistent volume): `sqlite:////data/topoi.db`
- PostgreSQL: `postgresql://user:pass@host:5432/dbname`

#### Authentication

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SECRET_KEY` | Yes | - | Secret key for JWT signing. Must be kept secure and consistent |
| `ALGORITHM` | No | `HS256` | JWT signing algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | `15` | Access token lifetime in minutes |

**Generating SECRET_KEY**:
```bash
# Using OpenSSL
openssl rand -hex 32

# Using Python
python -c "import secrets; print(secrets.token_hex(32))"
```

#### Google Services

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GOOGLE_CLIENT_ID` | Yes* | - | OAuth 2.0 client ID from Google Cloud Console |
| `GOOGLE_CLIENT_SECRET` | Yes* | - | OAuth 2.0 client secret |
| `GOOGLE_PLACES_API_KEY` | Yes* | - | API key for Google Places API (New) |

*Required for Google features to work. App will function without them but Google login and place search will be disabled.

**Where to get these**:
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create or select a project
3. Enable APIs: Google+ API, Places API (New)
4. Create OAuth 2.0 credentials (client ID/secret)
5. Create API key for Places API
6. Restrict API key to Places API only

#### Telegram

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TELEGRAM_BOT_TOKEN` | No | - | Bot token from @BotFather |

**Getting a bot token**:
1. Message @BotFather on Telegram
2. Send `/newbot`
3. Follow prompts to name your bot
4. Copy the token provided

#### URLs

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FRONTEND_URL` | Yes | - | Full URL to frontend (for OAuth redirects, email links) |
| `BACKEND_URL` | Yes | - | Full URL to backend (for OAuth callback) |

**Examples**:
- Local: `http://localhost:3000` / `http://localhost:8000`
- Production: `https://topoi-frontend.fly.dev` / `https://topoi-backend.fly.dev`

#### Email (SMTP)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MAIL_USERNAME` | No | `""` | SMTP username (often your email) |
| `MAIL_PASSWORD` | No | `""` | SMTP password or app password |
| `MAIL_FROM` | No | `noreply@topoi.app` | Sender email address |
| `MAIL_SERVER` | No | `smtp.gmail.com` | SMTP server hostname |
| `MAIL_PORT` | No | `587` | SMTP port |
| `MAIL_STARTTLS` | No | `True` | Enable STARTTLS |
| `MAIL_SSL_TLS` | No | `False` | Enable SSL/TLS |

**Gmail Setup**:
1. Enable 2-factor authentication on your Google account
2. Go to Google Account > Security > App passwords
3. Generate an app password for "Mail"
4. Use your email as `MAIL_USERNAME` and app password as `MAIL_PASSWORD`

---

## Frontend Environment Variables

Create a `.env.local` file in the `frontend/` directory:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

### Variable Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | - | Backend API base URL (must include `/api`) |

**Note**: Variables prefixed with `NEXT_PUBLIC_` are exposed to the browser. Never put secrets here.

**For Production**: Set via Fly.io build args in `fly.toml`:

```toml
[build.args]
  NEXT_PUBLIC_API_URL = "https://topoi-backend.fly.dev/api"
```

---

## Mobile Environment Variables

Create a `.env` file in the `mobile/` directory:

```env
API_URL=https://topoi-backend.fly.dev/api
DEV_API_URL=http://192.168.1.100:8000/api
GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

### Variable Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `API_URL` | No | `https://topoi-backend.fly.dev/api` | Production backend API URL |
| `DEV_API_URL` | No | `http://localhost:8000/api` | Development backend API URL (use local IP for device testing) |
| `GOOGLE_MAPS_API_KEY` | No | - | Google Maps API key for iOS and Android map rendering |

**Note**: For local development with a physical device, use your computer's local IP address in `DEV_API_URL` (e.g., `192.168.1.100`) instead of `localhost`.

**Finding your local IP**:
```bash
# macOS
ipconfig getifaddr en0

# Linux
hostname -I | awk '{print $1}'

# Windows
ipconfig | findstr IPv4
```

---

## Environment by Deployment Stage

### Local Development

**Backend** (`backend/.env`):
```env
DATABASE_URL=sqlite:///./topoi.db
SECRET_KEY=dev-secret-key-for-local-testing-only
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:8000
# Add Google/Telegram credentials as needed
```

**Frontend** (`frontend/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

### Fly.io Development

```bash
# Set backend secrets
fly secrets set -a topoi-backend-dev \
  DATABASE_URL="sqlite:////data/topoi_dev.db" \
  SECRET_KEY="your-dev-secret" \
  FRONTEND_URL="https://topoi-frontend-dev.fly.dev" \
  BACKEND_URL="https://topoi-backend-dev.fly.dev" \
  GOOGLE_CLIENT_ID="..." \
  GOOGLE_CLIENT_SECRET="..." \
  GOOGLE_PLACES_API_KEY="..." \
  TELEGRAM_BOT_TOKEN="..." \
  MAIL_USERNAME="..." \
  MAIL_PASSWORD="..."
```

Frontend build args are set in `fly.dev.toml`.

### Fly.io Production

```bash
# Set backend secrets
fly secrets set -a topoi-backend \
  DATABASE_URL="sqlite:////data/topoi.db" \
  SECRET_KEY="your-production-secret" \
  FRONTEND_URL="https://topoi-frontend.fly.dev" \
  BACKEND_URL="https://topoi-backend.fly.dev" \
  GOOGLE_CLIENT_ID="..." \
  GOOGLE_CLIENT_SECRET="..." \
  GOOGLE_PLACES_API_KEY="..." \
  TELEGRAM_BOT_TOKEN="..." \
  MAIL_USERNAME="..." \
  MAIL_PASSWORD="..."
```

Frontend build args are set in `fly.toml`.

---

## Fly.io Configuration Files

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

---

## Security Best Practices

1. **Never commit `.env` files** - They're in `.gitignore` for a reason
2. **Use different secrets per environment** - Dev, staging, production should have unique keys
3. **Rotate secrets periodically** - Especially if you suspect compromise
4. **Restrict API keys** - In Google Cloud Console, restrict keys to specific APIs and domains
5. **Use app passwords** - For Gmail, use app passwords instead of your main password
6. **Minimum permissions** - API keys should only have access to required services

---

## Troubleshooting

### "SECRET_KEY not set"
- Ensure `.env` file exists in `backend/` directory
- Check file is named exactly `.env` (not `.env.txt`)
- Restart the backend server after changes

### Google OAuth not working
- Verify redirect URI in Google Cloud Console: `{BACKEND_URL}/api/auth/google/callback`
- Check both `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set
- Ensure APIs are enabled in Google Cloud Console

### Emails not sending
- Check `MAIL_USERNAME` and `MAIL_PASSWORD`
- For Gmail, you need an App Password (not your regular password)
- Verify `MAIL_SERVER` and `MAIL_PORT` are correct

### "API URL undefined" in frontend
- Ensure `NEXT_PUBLIC_API_URL` is set in `.env.local`
- Restart Next.js dev server after adding env vars
- For production, check `fly.toml` build args

### Mobile can't connect to backend
- Use your computer's local IP, not `localhost`
- Ensure backend is running on `0.0.0.0` not just `127.0.0.1`
- Check firewall isn't blocking the connection
