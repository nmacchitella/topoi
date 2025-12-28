# External Integrations

Topoi integrates with Google Cloud (OAuth, Places API), Telegram Bot API, and SMTP for email.

## Google Cloud Setup

### 1. Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click "Select a project" → "New Project"
3. Name it (e.g., "Topoi") and create

### 2. Enable Required APIs

Navigate to **APIs & Services → Library** and enable:

- **Google+ API** (for OAuth)
- **Places API (New)** (for place search)

### 3. Configure OAuth Consent Screen

Go to **APIs & Services → OAuth consent screen**:

1. Select "External" user type
2. Fill in app information:
   - App name: Topoi
   - User support email: your email
   - Developer contact: your email
3. Add scopes:
   - `openid`
   - `email`
   - `profile`
4. Add test users if in testing mode

### 4. Create OAuth Credentials

Go to **APIs & Services → Credentials**:

1. Click "Create Credentials" → "OAuth client ID"
2. Application type: **Web application**
3. Name: "Topoi Web"
4. Authorized JavaScript origins:
   - `http://localhost:3000` (development)
   - `https://topoi-frontend.fly.dev` (production)
5. Authorized redirect URIs:
   - `http://localhost:8000/api/auth/google/callback` (development)
   - `https://topoi-backend.fly.dev/api/auth/google/callback` (production)
6. Save the **Client ID** and **Client Secret**

### 5. Create iOS OAuth Credentials (for Mobile)

1. Click "Create Credentials" → "OAuth client ID"
2. Application type: **iOS**
3. Name: "Topoi iOS"
4. Bundle ID: `com.topoi.app` (or your bundle ID)
5. Save the **Client ID**

### 6. Create API Key for Places

1. Click "Create Credentials" → "API key"
2. Click "Edit API key"
3. Under "API restrictions":
   - Select "Restrict key"
   - Choose "Places API (New)"
4. Under "Application restrictions" (optional):
   - Set HTTP referrers for web
   - Or IP addresses for server
5. Save the **API Key**

### Environment Variables

```env
GOOGLE_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxx
GOOGLE_PLACES_API_KEY=AIzaSy-xxxxxx
```

### Code Reference

**OAuth Flow** (backend/routers/google_auth.py):
```python
oauth = OAuth()
oauth.register(
    name='google',
    client_id=settings.google_client_id,
    client_secret=settings.google_client_secret,
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'}
)
```

**Places API Autocomplete** (backend/routers/search.py):
```python
@router.get("/google/autocomplete")
async def google_places_autocomplete(q: str, lat: Optional[float], lng: Optional[float]):
    headers = {
        "X-Goog-Api-Key": settings.google_places_api_key,
        "X-Goog-FieldMask": "suggestions.placePrediction.placeId,suggestions.placePrediction.text,..."
    }
    body = {"input": q}
    if lat and lng:
        body["locationBias"] = {"circle": {"center": {"latitude": lat, "longitude": lng}, "radius": 50000.0}}
    response = await client.post("https://places.googleapis.com/v1/places:autocomplete", headers=headers, json=body)
```

**Places API Details** (backend/routers/search.py):
```python
@router.get("/google/details/{place_id}")
async def google_place_details(place_id: str):
    headers = {
        "X-Goog-Api-Key": settings.google_places_api_key,
        "X-Goog-FieldMask": "location,formattedAddress,displayName,googleMapsUri,types,..."
    }
    response = await client.get(f"https://places.googleapis.com/v1/places/{place_id}", headers=headers)
```

---

## Telegram Bot Setup

### 1. Create Bot with BotFather

1. Open Telegram and search for @BotFather
2. Send `/newbot`
3. Choose a name (e.g., "Topoi")
4. Choose a username (must end in "bot", e.g., "TopoiAppBot")
5. Save the **bot token**

### 2. Set Bot Commands (Optional)

Send to @BotFather:
```
/setcommands
```
Then select your bot and send:
```
start - Link your Topoi account
help - Show help message
```

### 3. Configure Webhook

The bot uses webhooks to receive messages. Set the webhook URL:

**Using the setup script**:
```bash
cd backend
python setup_telegram_webhook.py https://topoi-backend.fly.dev/api/telegram/webhook
```

**Using curl**:
```bash
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://topoi-backend.fly.dev/api/telegram/webhook"}'
```

**Check webhook status**:
```bash
python setup_telegram_webhook.py info
# or
curl "https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo"
```

### Environment Variables

```env
TELEGRAM_BOT_TOKEN=8110823329:AAE_xxxxxx
```

### How It Works

1. **Linking**: User generates 6-digit code in Settings
2. User sends `/start <code>` to bot
3. Bot validates code and creates link
4. **Saving places**: User sends Google Maps link
5. Bot extracts place info from URL
6. Fetches details from Google Places API
7. Creates place in user's account

### Supported URL Formats

```
https://maps.app.goo.gl/xxxxx        # Short links (expanded automatically)
https://www.google.com/maps/place/...  # Full URLs with place name
https://goo.gl/maps/xxxxx             # Legacy short links
```

### Code Reference

**Webhook Handler** (backend/routers/telegram.py):
```python
@router.post("/webhook")
async def telegram_webhook(request: Request, db: Session = Depends(get_db)):
    update_data = await request.json()
    message = update_data.get("message", {})

    if text.startswith("/start "):
        # Handle account linking
        code = text.split(" ", 1)[1].strip()
        # Validate code and create link...

    if "maps.google.com" in text or "maps.app.goo.gl" in text:
        # Extract place info and save
        place_info = await extract_place_info_from_url(text)
        place_details = await get_place_by_id(place_info["value"])
        # Create place...
```

### Local Development

For local testing, expose your backend with ngrok:

```bash
# Terminal 1: Run backend
uvicorn main:app --reload --port 8000

# Terminal 2: Expose with ngrok
ngrok http 8000

# Terminal 3: Set webhook
python setup_telegram_webhook.py https://xxxx.ngrok.io/api/telegram/webhook
```

---

## Email (SMTP) Setup

Topoi uses SMTP for sending verification and password reset emails.

### Gmail Setup

1. **Enable 2-Factor Authentication** on your Google account
2. Go to [Google Account Security](https://myaccount.google.com/security)
3. Under "2-Step Verification", click "App passwords"
4. Select "Mail" and "Other (Custom name)"
5. Enter "Topoi" and generate
6. Copy the 16-character password

### Environment Variables

```env
MAIL_USERNAME=your-email@gmail.com
MAIL_PASSWORD=xxxx xxxx xxxx xxxx  # App password (no spaces in actual value)
MAIL_FROM=your-email@gmail.com
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_STARTTLS=True
MAIL_SSL_TLS=False
```

### Other SMTP Providers

**SendGrid**:
```env
MAIL_USERNAME=apikey
MAIL_PASSWORD=SG.xxxxxx
MAIL_FROM=noreply@yourdomain.com
MAIL_SERVER=smtp.sendgrid.net
MAIL_PORT=587
MAIL_STARTTLS=True
MAIL_SSL_TLS=False
```

**Mailgun**:
```env
MAIL_USERNAME=postmaster@mg.yourdomain.com
MAIL_PASSWORD=xxxxxx
MAIL_FROM=noreply@yourdomain.com
MAIL_SERVER=smtp.mailgun.org
MAIL_PORT=587
MAIL_STARTTLS=True
MAIL_SSL_TLS=False
```

**Amazon SES**:
```env
MAIL_USERNAME=AKIA...
MAIL_PASSWORD=xxxxxx
MAIL_FROM=noreply@yourdomain.com
MAIL_SERVER=email-smtp.us-east-1.amazonaws.com
MAIL_PORT=587
MAIL_STARTTLS=True
MAIL_SSL_TLS=False
```

### Email Templates

Emails use branded HTML templates defined in `backend/services/email_service.py`:

- **Verification Email**: Sent on registration
- **Password Reset Email**: Sent on forgot password

Both include:
- Topoi branding with logo
- Action button
- Fallback plain text link
- Responsive design for mobile

### Code Reference

**Email Service** (backend/services/email_service.py):
```python
class EmailService:
    def __init__(self):
        self.fastmail = FastMail(conf)

    async def send_verification_email(self, email: EmailStr, token: str, background_tasks):
        link = f"{FRONTEND_URL}/verify-email?token={token}"
        html_body = self._get_base_template(self._get_verification_content(link))

        message = MessageSchema(
            subject="Verify your Topoi account",
            recipients=[email],
            body=html_body,
            subtype=MessageType.html
        )
        background_tasks.add_task(self.fastmail.send_message, message)
```

### Testing Email Locally

Without SMTP configured, emails will fail silently (development mode). To test:

1. Use a service like [Mailtrap](https://mailtrap.io) for testing
2. Or temporarily use your Gmail with app password

---

## Nominatim (OpenStreetMap)

Topoi also supports Nominatim for address search as a fallback/alternative.

### No Setup Required

Nominatim is free and doesn't require API keys. However, please respect their [usage policy](https://operations.osmfoundation.org/policies/nominatim/):

- Max 1 request per second
- Include a valid User-Agent
- Consider caching results

### Code Reference

```python
async def search_nominatim(query: str, limit: int = 5):
    url = "https://nominatim.openstreetmap.org/search"
    params = {
        "q": query,
        "format": "json",
        "limit": limit,
        "addressdetails": 1
    }
    headers = {"User-Agent": "Topoi/1.0"}
    response = await client.get(url, params=params, headers=headers)
```

---

## Troubleshooting

### Google OAuth

**"redirect_uri_mismatch" error**:
- Check the redirect URI in Google Cloud Console matches exactly:
  - `{BACKEND_URL}/api/auth/google/callback`
- Include both http and https versions for local/production

**"Access blocked: This app's request is invalid"**:
- OAuth consent screen not configured
- Required scopes not added
- App still in "Testing" and user not in test users list

### Google Places API

**"REQUEST_DENIED" error**:
- API key not valid or restricted incorrectly
- Places API (New) not enabled
- Billing not set up (required for Places API)

**No results returned**:
- Check field mask includes required fields
- Verify location bias is reasonable

### Telegram Bot

**Bot not responding**:
- Check webhook is set: `python setup_telegram_webhook.py info`
- Verify `TELEGRAM_BOT_TOKEN` is correct
- Check backend logs: `fly logs -a topoi-backend`

**"Invalid or expired code"**:
- Codes expire after 10 minutes
- Each code is single-use
- Check system time is synchronized

### Email

**Emails not sending**:
- Verify all MAIL_* environment variables
- For Gmail, use App Password (not regular password)
- Check spam folder

**"Authentication failed"**:
- Gmail: Ensure 2FA is enabled and using App Password
- Other providers: Verify credentials

**Emails going to spam**:
- Set up SPF/DKIM records for your domain
- Use a proper FROM address
- Consider using a dedicated email service (SendGrid, etc.)
