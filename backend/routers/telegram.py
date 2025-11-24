from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from database import get_db, get_settings
from datetime import datetime, timedelta
import auth
import models
import re
import random
import string
import httpx
from typing import Optional

router = APIRouter(prefix="/telegram", tags=["telegram"])
settings = get_settings()

# Helper function to extract place_id from Google Maps URL
def extract_place_id_from_url(url: str) -> Optional[str]:
    """Extract place_id from Google Maps URL"""
    # Pattern for place_id parameter
    place_id_match = re.search(r'place_id=([a-zA-Z0-9_-]+)', url)
    if place_id_match:
        return place_id_match.group(1)

    # Pattern for /data=!4m2!3m1!1s format (ChIJ...)
    data_match = re.search(r'/data=.*?1s([a-zA-Z0-9_-]+)', url)
    if data_match:
        potential_id = data_match.group(1)
        # Google place IDs typically start with ChIJ and are longer
        if len(potential_id) > 10:
            return potential_id

    return None


# Helper function to get place details from Google Places API
async def get_place_details_from_google(place_id: str) -> Optional[dict]:
    """Fetch place details from Google Places API"""
    if not settings.google_places_api_key:
        return None

    url = "https://maps.googleapis.com/maps/api/place/details/json"
    params = {
        "place_id": place_id,
        "fields": "name,formatted_address,geometry,formatted_phone_number,website,opening_hours",
        "key": settings.google_places_api_key
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(url, params=params)
        if response.status_code == 200:
            data = response.json()
            if data.get("status") == "OK":
                result = data.get("result", {})
                return {
                    "name": result.get("name"),
                    "address": result.get("formatted_address"),
                    "lat": result.get("geometry", {}).get("location", {}).get("lat"),
                    "lng": result.get("geometry", {}).get("location", {}).get("lng"),
                    "phone": result.get("formatted_phone_number"),
                    "website": result.get("website"),
                    "hours": "\n".join(result.get("opening_hours", {}).get("weekday_text", []))
                }
    return None


@router.post("/generate-link-code")
async def generate_link_code(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Generate a 6-digit code for linking Telegram account"""
    # Delete any existing unexpired codes for this user
    db.query(models.TelegramLinkCode).filter(
        models.TelegramLinkCode.user_id == current_user.id
    ).delete()

    # Generate random 6-digit code
    code = ''.join(random.choices(string.digits, k=6))

    # Store with 10-minute expiry
    link_code = models.TelegramLinkCode(
        code=code,
        user_id=current_user.id,
        expires_at=datetime.utcnow() + timedelta(minutes=10)
    )
    db.add(link_code)
    db.commit()

    return {
        "code": code,
        "expires_in_minutes": 10,
        "bot_username": "TopoiAppBot"
    }


@router.get("/link-status")
async def get_link_status(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Check if user has linked Telegram account"""
    telegram_link = db.query(models.TelegramLink).filter(
        models.TelegramLink.user_id == current_user.id
    ).first()

    if telegram_link:
        return {
            "linked": True,
            "telegram_username": telegram_link.telegram_username,
            "linked_at": telegram_link.created_at.isoformat()
        }

    return {"linked": False}


@router.delete("/unlink")
async def unlink_telegram(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Unlink Telegram account"""
    result = db.query(models.TelegramLink).filter(
        models.TelegramLink.user_id == current_user.id
    ).delete()

    if result == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No Telegram account linked"
        )

    db.commit()
    return {"message": "Telegram account unlinked successfully"}


@router.post("/webhook")
async def telegram_webhook(request: Request, db: Session = Depends(get_db)):
    """Handle incoming messages from Telegram bot"""
    try:
        update_data = await request.json()

        # Extract message data
        message = update_data.get("message", {})
        if not message:
            return {"ok": True}

        telegram_id = str(message.get("from", {}).get("id"))
        username = message.get("from", {}).get("username")
        text = message.get("text", "")
        chat_id = message.get("chat", {}).get("id")

        # Handle /start command with link code
        if text.startswith("/start "):
            code = text.split(" ", 1)[1].strip()

            print(f"Received /start with code: {code}")
            print(f"Current UTC time: {datetime.utcnow()}")

            # Find the link code
            link_code = db.query(models.TelegramLinkCode).filter(
                models.TelegramLinkCode.code == code,
                models.TelegramLinkCode.expires_at > datetime.utcnow()
            ).first()

            if link_code:
                print(f"Found valid code: {link_code.code}, expires: {link_code.expires_at}")
            else:
                # Check if code exists but is expired
                expired_code = db.query(models.TelegramLinkCode).filter(
                    models.TelegramLinkCode.code == code
                ).first()
                if expired_code:
                    print(f"Code exists but expired: {expired_code.code}, expired at: {expired_code.expires_at}")
                else:
                    print(f"Code not found: {code}")

            if not link_code:
                await send_telegram_message(chat_id, "❌ Invalid or expired code. Please generate a new code in the Topoi app.")
                return {"ok": True}

            # Check if telegram_id is already linked to another account
            existing_link = db.query(models.TelegramLink).filter(
                models.TelegramLink.telegram_id == telegram_id
            ).first()

            if existing_link:
                await send_telegram_message(chat_id, "❌ This Telegram account is already linked to another Topoi account.")
                return {"ok": True}

            # Create the link
            telegram_link = models.TelegramLink(
                user_id=link_code.user_id,
                telegram_id=telegram_id,
                telegram_username=username
            )
            db.add(telegram_link)

            # Delete the used code
            db.delete(link_code)
            db.commit()

            await send_telegram_message(
                chat_id,
                "✅ Your Telegram account has been successfully linked to Topoi!\n\n"
                "Now you can send me Google Maps links and I'll save them to your account."
            )
            return {"ok": True}

        # Handle Google Maps links
        if "maps.google.com" in text or "goo.gl/maps" in text or "maps.app.goo.gl" in text:
            # Find user by telegram_id
            telegram_link = db.query(models.TelegramLink).filter(
                models.TelegramLink.telegram_id == telegram_id
            ).first()

            if not telegram_link:
                await send_telegram_message(
                    chat_id,
                    "❌ Your Telegram account is not linked to Topoi.\n\n"
                    "Please link your account first by getting a code from the Topoi app settings."
                )
                return {"ok": True}

            # Extract place_id
            place_id = extract_place_id_from_url(text)
            if not place_id:
                await send_telegram_message(chat_id, "❌ Could not extract place information from this link.")
                return {"ok": True}

            # Get place details
            place_details = await get_place_details_from_google(place_id)
            if not place_details or not place_details.get("name"):
                await send_telegram_message(chat_id, "❌ Could not fetch place details from Google.")
                return {"ok": True}

            # Create the place
            new_place = models.Place(
                user_id=telegram_link.user_id,
                name=place_details["name"],
                address=place_details.get("address", ""),
                latitude=place_details.get("lat", 0.0),
                longitude=place_details.get("lng", 0.0),
                phone=place_details.get("phone"),
                website=place_details.get("website"),
                hours=place_details.get("hours"),
                notes="Added via Telegram",
                is_public=False
            )
            db.add(new_place)
            db.commit()

            await send_telegram_message(
                chat_id,
                f"✅ Saved: {place_details['name']}\n"
                f"📍 {place_details.get('address', 'No address')}"
            )
            return {"ok": True}

        # Default response for unknown commands
        if text.startswith("/"):
            await send_telegram_message(
                chat_id,
                "Welcome to Topoi! 🗺️\n\n"
                "To get started:\n"
                "1. Link your account using /start CODE\n"
                "2. Send me Google Maps links and I'll save them!"
            )

        return {"ok": True}

    except Exception as e:
        print(f"Error processing webhook: {e}")
        return {"ok": False, "error": str(e)}


async def send_telegram_message(chat_id: int, text: str):
    """Send a message via Telegram Bot API"""
    url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage"
    data = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "HTML"
    }

    async with httpx.AsyncClient() as client:
        await client.post(url, json=data)
