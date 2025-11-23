#!/usr/bin/env python3
"""
Script to set up Telegram webhook for TopoiAppBot.

Usage:
    python setup_telegram_webhook.py <webhook_url>

Example:
    python setup_telegram_webhook.py https://your-backend.com/api/telegram/webhook
    python setup_telegram_webhook.py https://abc123.ngrok.io/api/telegram/webhook
"""

import sys
import requests
from database import settings


def set_webhook(webhook_url: str):
    """Set the webhook URL for the Telegram bot."""
    bot_token = settings.telegram_bot_token

    if not bot_token:
        print("❌ Error: TELEGRAM_BOT_TOKEN not found in environment variables")
        return False

    telegram_api_url = f"https://api.telegram.org/bot{bot_token}/setWebhook"

    print(f"🔄 Setting webhook to: {webhook_url}")
    print(f"🤖 Bot token: {bot_token[:10]}...")

    try:
        response = requests.post(telegram_api_url, json={"url": webhook_url})
        response.raise_for_status()
        result = response.json()

        if result.get("ok"):
            print("✅ Webhook set successfully!")
            print(f"📋 Response: {result.get('description')}")
            return True
        else:
            print(f"❌ Failed to set webhook: {result.get('description')}")
            return False
    except Exception as e:
        print(f"❌ Error setting webhook: {e}")
        return False


def get_webhook_info():
    """Get current webhook information."""
    bot_token = settings.telegram_bot_token

    if not bot_token:
        print("❌ Error: TELEGRAM_BOT_TOKEN not found in environment variables")
        return

    telegram_api_url = f"https://api.telegram.org/bot{bot_token}/getWebhookInfo"

    try:
        response = requests.get(telegram_api_url)
        response.raise_for_status()
        result = response.json()

        if result.get("ok"):
            info = result.get("result", {})
            print("\n📊 Current Webhook Info:")
            print(f"   URL: {info.get('url', 'Not set')}")
            print(f"   Pending updates: {info.get('pending_update_count', 0)}")
            if info.get('last_error_date'):
                print(f"   Last error: {info.get('last_error_message', 'N/A')}")
        else:
            print(f"❌ Failed to get webhook info: {result.get('description')}")
    except Exception as e:
        print(f"❌ Error getting webhook info: {e}")


def delete_webhook():
    """Delete the current webhook."""
    bot_token = settings.telegram_bot_token

    if not bot_token:
        print("❌ Error: TELEGRAM_BOT_TOKEN not found in environment variables")
        return False

    telegram_api_url = f"https://api.telegram.org/bot{bot_token}/deleteWebhook"

    try:
        response = requests.post(telegram_api_url)
        response.raise_for_status()
        result = response.json()

        if result.get("ok"):
            print("✅ Webhook deleted successfully!")
            return True
        else:
            print(f"❌ Failed to delete webhook: {result.get('description')}")
            return False
    except Exception as e:
        print(f"❌ Error deleting webhook: {e}")
        return False


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("📖 Usage: python setup_telegram_webhook.py <webhook_url|info|delete>")
        print("\nExamples:")
        print("  python setup_telegram_webhook.py https://your-backend.com/api/telegram/webhook")
        print("  python setup_telegram_webhook.py https://abc123.ngrok.io/api/telegram/webhook")
        print("  python setup_telegram_webhook.py info")
        print("  python setup_telegram_webhook.py delete")
        print("\n💡 For local development:")
        print("  1. Install ngrok: brew install ngrok  (or download from ngrok.com)")
        print("  2. Start your backend: uvicorn main:app --reload")
        print("  3. In another terminal: ngrok http 8000")
        print("  4. Copy the https URL from ngrok (e.g., https://abc123.ngrok.io)")
        print("  5. Run: python setup_telegram_webhook.py https://abc123.ngrok.io/api/telegram/webhook")
        sys.exit(1)

    command = sys.argv[1]

    if command == "info":
        get_webhook_info()
    elif command == "delete":
        delete_webhook()
    else:
        webhook_url = command
        if not webhook_url.startswith("https://"):
            print("❌ Error: Webhook URL must start with https://")
            print("💡 Telegram requires HTTPS for webhooks")
            sys.exit(1)

        if not webhook_url.endswith("/api/telegram/webhook"):
            print("⚠️  Warning: URL doesn't end with /api/telegram/webhook")
            print(f"   Using: {webhook_url}")

        success = set_webhook(webhook_url)
        if success:
            print("\n📊 Verifying webhook...")
            get_webhook_info()
            print("\n✅ All done! Your bot is ready to receive messages.")
            print("🧪 Test it by sending /start to @TopoiAppBot on Telegram")
