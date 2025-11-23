# Telegram Integration Setup & Testing Guide

## Overview
The Telegram integration allows users to save places to their Topoi account by sending Google Maps links to @TopoiAppBot on Telegram.

## Architecture

### Components
1. **Telegram Bot**: @TopoiAppBot (Token: 8110823329:AAE_MvJueCyqaZ8LYpxBpT-Sgb8l1bNL1tU)
2. **Backend Webhook**: https://topoi-backend.fly.dev/api/telegram/webhook
3. **Frontend UI**: Settings page with Telegram linking section

### Database Models
- `telegram_links`: Stores user-Telegram account associations
- `telegram_link_codes`: Temporary 6-digit codes for linking (10-minute expiry)

### Endpoints
- `POST /api/telegram/generate-link-code` - Generate a linking code
- `GET /api/telegram/link-status` - Check if user has linked Telegram
- `DELETE /api/telegram/unlink` - Unlink Telegram account
- `POST /api/telegram/webhook` - Handle incoming Telegram messages

## How It Works

### 1. Linking Process
1. User clicks "Link Telegram Account" in Settings
2. Backend generates a 6-digit code (valid for 10 minutes)
3. User opens @TopoiAppBot on Telegram
4. User sends `/start CODE`
5. Bot verifies code and links Telegram account to Topoi account
6. Bot sends confirmation message

### 2. Saving Places
1. User finds a place on Google Maps
2. User shares the link and copies it
3. User sends the link to @TopoiAppBot on Telegram
4. Bot extracts the place_id from the URL
5. Bot fetches place details from Google Places API
6. Bot creates a new place in the user's Topoi account
7. Bot sends confirmation message

### 3. Supported Google Maps URL Formats
- Direct place ID: `place_id=ChIJN1t_tDeuEmsRUsoyG83frY4`
- Data parameter: `/data=...1sChIJN1t_tDeuEmsRUsoyG83frY4`
- Short URLs: Automatically redirects and extracts place_id

## Testing Instructions

### Prerequisites
- Access to Telegram app
- Topoi account on https://your-frontend-url.com
- @TopoiAppBot is active and webhook is set

### Test 1: Link Telegram Account
1. Go to Settings page on Topoi
2. Scroll to "Telegram Integration" section
3. Click "Link Telegram Account"
4. A 6-digit code should appear
5. Click "Copy Command" or "Open Bot"
6. In Telegram, open @TopoiAppBot
7. Send `/start YOUR_CODE` (replace YOUR_CODE with the 6-digit code)
8. Bot should respond: "✅ Account linked successfully! You can now send Google Maps links to save places."
9. Refresh Settings page - should show "Connected" status with your Telegram username

### Test 2: Save a Place via Telegram
1. Open Google Maps (web or mobile)
2. Search for any place (e.g., "Eiffel Tower")
3. Click Share → Copy link
4. Open @TopoiAppBot on Telegram
5. Paste and send the Google Maps link
6. Bot should respond: "✅ Place saved: [Place Name]"
7. Go to Topoi homepage - the place should appear in your places list

### Test 3: Unlink Telegram Account
1. Go to Settings page on Topoi
2. Scroll to "Telegram Integration" section
3. Click "Unlink Telegram"
4. Confirm the action
5. Section should return to "Not Linked" state
6. Try sending a Google Maps link to @TopoiAppBot
7. Bot should respond: "Please link your account first..."

### Test 4: Link Code Expiry
1. Generate a link code but don't use it
2. Wait 10 minutes
3. Try to use the expired code with `/start CODE`
4. Bot should respond: "❌ Invalid or expired code..."

### Test 5: Error Handling
1. Send a random message to @TopoiAppBot (not a Google Maps link)
2. Bot should respond: "Please send a Google Maps link..."
3. Send an invalid Google Maps link
4. Bot should handle gracefully

## Webhook Management

### Check Webhook Status
```bash
curl "https://api.telegram.org/bot8110823329:AAE_MvJueCyqaZ8LYpxBpT-Sgb8l1bNL1tU/getWebhookInfo"
```

### Set Webhook (if needed)
```bash
curl -X POST "https://api.telegram.org/bot8110823329:AAE_MvJueCyqaZ8LYpxBpT-Sgb8l1bNL1tU/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://topoi-backend.fly.dev/api/telegram/webhook"}'
```

### Delete Webhook (for debugging)
```bash
curl -X POST "https://api.telegram.org/bot8110823329:AAE_MvJueCyqaZ8LYpxBpT-Sgb8l1bNL1tU/deleteWebhook"
```

### Using the Setup Script
```bash
cd backend
python3 setup_telegram_webhook.py info                                              # Check status
python3 setup_telegram_webhook.py https://topoi-backend.fly.dev/api/telegram/webhook # Set webhook
python3 setup_telegram_webhook.py delete                                            # Delete webhook
```

## Troubleshooting

### Webhook Not Receiving Messages
1. Check webhook status: Look for `pending_update_count` - should be 0
2. Check if backend is running: `curl https://topoi-backend.fly.dev/health`
3. Check logs: `flyctl logs -a topoi-backend`
4. Verify bot token is set: `flyctl secrets list -a topoi-backend`

### Link Code Not Working
1. Check if code has expired (10-minute window)
2. Verify user is authenticated in frontend
3. Check backend logs for errors
4. Verify database tables exist: `telegram_link_codes`, `telegram_links`

### Place Not Saving
1. Verify Google Places API key is set and has quota
2. Check if the Google Maps URL contains a valid place_id
3. Check backend logs for API errors
4. Verify user's Telegram account is linked

### Bot Not Responding
1. Check webhook is set correctly
2. Verify backend deployment is successful
3. Check if machine is running: `flyctl status -a topoi-backend`
4. View real-time logs: `flyctl logs -a topoi-backend`

## Development Notes

### Local Testing
For local development, you need to expose your local backend:

1. Install ngrok: `brew install ngrok`
2. Start backend: `cd backend && uvicorn main:app --reload`
3. In another terminal: `ngrok http 8000`
4. Copy the https URL (e.g., https://abc123.ngrok.io)
5. Set webhook: `python3 setup_telegram_webhook.py https://abc123.ngrok.io/api/telegram/webhook`
6. Test with @TopoiAppBot

### Code Locations
- Backend router: `backend/routers/telegram.py`
- Database models: `backend/models.py` (lines 113-128)
- Frontend UI: `frontend/src/app/settings/page.tsx` (lines 37-418)
- Setup script: `backend/setup_telegram_webhook.py`

## Security Considerations

1. **Bot Token**: Stored as environment variable, never committed to git
2. **Link Codes**:
   - 6 digits (1,000,000 combinations)
   - 10-minute expiry
   - One-time use (deleted after successful link)
3. **Message Verification**: All messages verified against linked accounts
4. **HTTPS Required**: Telegram webhooks require HTTPS endpoints

## Current Status

✅ Bot created: @TopoiAppBot
✅ Webhook set: https://topoi-backend.fly.dev/api/telegram/webhook
✅ Backend deployed with Telegram integration
✅ Frontend UI implemented
✅ Database models created
⏳ Ready for testing

## Next Steps

1. Deploy frontend with Telegram UI
2. Test the complete flow
3. Monitor webhook for any errors
4. Consider adding:
   - Photo upload support
   - Multiple place batch import
   - Location sharing support
   - Custom tags during save
