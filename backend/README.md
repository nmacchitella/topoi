# Topoi Backend

FastAPI backend for the Topoi personal map application.

## Setup

```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env      # Edit with your credentials
uvicorn main:app --reload --port 8000
```

**Access:**
- API: http://localhost:8000
- Docs: http://localhost:8000/docs
- Admin: http://localhost:8000/admin

## Project Structure

```
backend/
├── main.py              # FastAPI app entry point
├── database.py          # SQLAlchemy engine & session
├── models.py            # Database models
├── schemas.py           # Pydantic request/response schemas
├── auth.py              # JWT authentication logic
├── admin.py             # SQLAdmin configuration
├── create_admin.py      # CLI script to create admin users
├── routers/
│   ├── auth_router.py   # Auth endpoints (login, register, profile)
│   ├── google_auth.py   # Google OAuth flow
│   ├── places.py        # Places CRUD
│   ├── lists.py         # Lists/collections CRUD
│   ├── tags.py          # Tags CRUD
│   ├── search.py        # Google Places & Nominatim search
│   ├── share.py         # Public sharing endpoints
│   ├── data_router.py   # CSV import/export
│   ├── telegram.py      # Telegram bot webhook
│   └── admin_router.py  # Admin operations
├── services/
│   └── email_service.py # Email verification & password reset
├── requirements.txt     # Python dependencies
├── Dockerfile           # Production container
├── fly.toml             # Fly.io production config
└── fly.dev.toml         # Fly.io development config
```

## Database Models

| Model | Description |
|-------|-------------|
| `User` | User accounts with email/OAuth auth |
| `Place` | Saved locations with coordinates and metadata |
| `List` | Collections to organize places |
| `Tag` | Reusable tags for categorization |
| `RefreshToken` | JWT refresh tokens |
| `VerificationToken` | Email verification & password reset |
| `TelegramLink` | Telegram account connections |
| `Notification` | User notifications |
| `UserFollow` | User follow relationships |

## API Endpoints

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create new account |
| POST | `/api/auth/login-json` | Login with email/password |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Revoke refresh token |
| GET | `/api/auth/me` | Get current user |
| PUT | `/api/auth/profile` | Update profile |
| GET | `/api/auth/google/login` | Initiate Google OAuth |
| GET | `/api/auth/google/callback` | Google OAuth callback |

### Places

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/places` | List user's places |
| POST | `/api/places` | Create new place |
| GET | `/api/places/{id}` | Get place details |
| PUT | `/api/places/{id}` | Update place |
| DELETE | `/api/places/{id}` | Delete place |

### Lists & Tags

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/lists` | List collections |
| POST | `/api/lists` | Create collection |
| PUT | `/api/lists/{id}` | Update collection |
| DELETE | `/api/lists/{id}` | Delete collection |
| GET | `/api/tags` | List tags with usage count |
| POST | `/api/tags` | Create tag |
| DELETE | `/api/tags/{id}` | Delete tag |

### Search

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/search/google/autocomplete` | Google Places autocomplete |
| GET | `/api/search/google/details/{place_id}` | Get place details |
| GET | `/api/search/nominatim` | OpenStreetMap search |

### Sharing

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/share/place/{id}` | Public place view |
| GET | `/api/share/list/{id}` | Public list view |
| GET | `/api/share/map/{user_id}` | Public user map |

### Telegram

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/telegram/generate-link-code` | Get linking code |
| POST | `/api/telegram/webhook` | Bot webhook |
| DELETE | `/api/telegram/unlink` | Disconnect account |

## Environment Variables

```env
# Database
DATABASE_URL=sqlite:///./topoi.db

# Authentication
SECRET_KEY=<openssl-rand-hex-32>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15

# Google
GOOGLE_CLIENT_ID=<google-cloud-console>
GOOGLE_CLIENT_SECRET=<google-cloud-console>
GOOGLE_PLACES_API_KEY=<google-cloud-console>

# Telegram
TELEGRAM_BOT_TOKEN=<from-botfather>

# URLs
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:8000

# Email (SMTP)
MAIL_USERNAME=<smtp-user>
MAIL_PASSWORD=<smtp-pass>
MAIL_FROM=<sender-email>
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_STARTTLS=True
MAIL_SSL_TLS=False
```

## Authentication

JWT-based authentication with refresh tokens:

- **Access token**: 15 minutes, stored in frontend memory
- **Refresh token**: 7 days, stored in localStorage + database
- **Token rotation**: New refresh token issued on each refresh
- **Password hashing**: bcrypt via passlib

Include access token in requests:
```
Authorization: Bearer <access_token>
```

## Admin Panel

### Create Admin User

```bash
python create_admin.py admin@example.com
```

The script will create a new admin user or promote an existing user.

### Access

Navigate to `/admin` and login with admin credentials.

### Capabilities

- **Users**: View, edit, promote/demote, delete
- **Places**: View, edit, change ownership, delete
- **Lists/Tags**: View, edit, manage associations
- **Tokens**: View refresh tokens, revoke, cleanup expired
- **Telegram**: View linked accounts, manage link codes

### Admin API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/users` | List all users |
| POST | `/api/admin/promote-user/{id}` | Promote to admin |
| POST | `/api/admin/demote-user/{id}` | Demote from admin |

Note: Cannot demote yourself.

### Manual Admin Status (Python)

```python
from database import SessionLocal
from models import User

db = SessionLocal()
user = db.query(User).filter(User.email == "your@email.com").first()
user.is_admin = True
db.commit()
db.close()
```

## Deployment

### Fly.io

```bash
# Production
flyctl deploy

# Development
flyctl deploy --config fly.dev.toml
```

### Set Secrets

```bash
fly secrets set SECRET_KEY="..." -a topoi-backend
fly secrets set DATABASE_URL="sqlite:////data/topoi.db" -a topoi-backend
fly secrets set GOOGLE_CLIENT_ID="..." -a topoi-backend
# ... other secrets
```

### Volume Mount

Database stored on persistent volume at `/data/topoi.db`.

### Monitoring

```bash
fly logs -a topoi-backend
fly status -a topoi-backend
fly ssh console -a topoi-backend
```

## Development

### Run Tests

```bash
pytest
```

### Database Reset

```bash
rm topoi.db
python -c "from database import Base, engine; Base.metadata.create_all(engine)"
```

## Telegram Integration

The bot @TopoiAppBot allows users to save places by sending Google Maps links.

### How It Works

1. **Linking**: User generates 6-digit code in Settings → sends `/start CODE` to bot
2. **Saving**: User sends Google Maps link → bot extracts place_id → fetches details → saves place

### Supported URL Formats

- `https://maps.app.goo.gl/<id>` (short links)
- `https://www.google.com/maps/place/...`
- `https://goo.gl/maps/<id>`

### Webhook Management

```bash
# Using the setup script
python setup_telegram_webhook.py info      # Check status
python setup_telegram_webhook.py <url>     # Set webhook URL
python setup_telegram_webhook.py delete    # Delete webhook

# Or using curl (replace BOT_TOKEN)
curl "https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo"
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -d '{"url":"https://topoi-backend.fly.dev/api/telegram/webhook"}'
```

### Local Development

To test Telegram locally, expose your backend with ngrok:

```bash
ngrok http 8000
python setup_telegram_webhook.py https://<ngrok-id>.ngrok.io/api/telegram/webhook
```

### Troubleshooting

**Bot not responding:**
- Check webhook: `python setup_telegram_webhook.py info`
- Verify `TELEGRAM_BOT_TOKEN` is set in secrets
- Check logs: `fly logs -a topoi-backend`

**Link code not working:**
- Codes expire after 10 minutes
- Each code is single-use

**Place not saving:**
- Verify `GOOGLE_PLACES_API_KEY` has quota
- Check URL contains valid place_id

## Dependencies

Key packages:
- `fastapi` - Web framework
- `uvicorn` - ASGI server
- `sqlalchemy` - ORM
- `python-jose` - JWT tokens
- `passlib[bcrypt]` - Password hashing
- `authlib` - OAuth2
- `httpx` - Async HTTP client
- `python-telegram-bot` - Telegram bot
- `sqladmin` - Admin panel
- `fastapi-mail` - Email sending

See `requirements.txt` for full list.
