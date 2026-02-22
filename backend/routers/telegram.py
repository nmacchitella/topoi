import logging
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

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/telegram", tags=["telegram"])
settings = get_settings()

# Helper function to expand shortened URLs
async def expand_url(url: str) -> str:
    """Expand shortened URLs by following redirects"""
    try:
        async with httpx.AsyncClient(follow_redirects=True) as client:
            response = await client.get(url, timeout=10.0)
            return str(response.url)
    except Exception as e:
        logger.error("Error expanding URL: %s", e)
        return url

# Helper function to extract place name from Google Maps URL
async def extract_place_info_from_url(url: str) -> Optional[dict]:
    """Extract place information from Google Maps URL"""
    # Expand shortened URLs first
    if "goo.gl" in url or "maps.app.goo.gl" in url:
        logger.debug("Expanding shortened URL: %s", url)
        url = await expand_url(url)
        logger.debug("Expanded to: %s", url)

    # Pattern 1: place_id parameter (most reliable - ChIJ format)
    place_id_match = re.search(r'place_id=(ChIJ[a-zA-Z0-9_-]+)', url)
    if place_id_match:
        place_id = place_id_match.group(1)
        logger.debug("Extracted place_id from parameter: %s", place_id)
        return {"type": "place_id", "value": place_id}

    # Pattern 2: Extract place name from URL path (e.g., /place/Lovely+Day/)
    place_name_match = re.search(r'/place/([^/@]+)', url)
    if place_name_match:
        place_name = place_name_match.group(1).replace('+', ' ').strip()
        logger.debug("Extracted place name from URL: %s", place_name)
        # Also try to get coordinates for more accurate search
        coords_match = re.search(r'@(-?\d+\.\d+),(-?\d+\.\d+)', url)
        if coords_match:
            lat, lng = coords_match.groups()
            logger.debug("Extracted coordinates: %s, %s", lat, lng)
            return {"type": "name_with_coords", "name": place_name, "lat": float(lat), "lng": float(lng)}
        return {"type": "name", "value": place_name}

    logger.debug("Could not extract place information from URL: %s", url)
    return None


# Helper function to get place details from Google Places API (New)
async def get_place_by_id(place_id: str) -> Optional[dict]:
    """Fetch place details by place_id using new Google Places API"""
    if not settings.google_places_api_key:
        logger.error("Error: Google Places API key not configured")
        return None

    logger.debug("Fetching place details for place_id: %s", place_id)
    url = f"https://places.googleapis.com/v1/places/{place_id}"
    headers = {
        "X-Goog-Api-Key": settings.google_places_api_key,
        "X-Goog-FieldMask": "id,displayName,formattedAddress,location,internationalPhoneNumber,websiteUri,regularOpeningHours"
    }

    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers)
        logger.debug("Google API response status: %s", response.status_code)
        if response.status_code == 200:
            result = response.json()
            logger.debug("Google API response: %s", result)
            hours = []
            if "regularOpeningHours" in result and "weekdayDescriptions" in result["regularOpeningHours"]:
                hours = result["regularOpeningHours"]["weekdayDescriptions"]

            place_info = {
                "name": result.get("displayName", {}).get("text"),
                "address": result.get("formattedAddress"),
                "lat": result.get("location", {}).get("latitude"),
                "lng": result.get("location", {}).get("longitude"),
                "phone": result.get("internationalPhoneNumber"),
                "website": result.get("websiteUri"),
                "hours": "\n".join(hours)
            }
            logger.debug("Extracted place info: %s", place_info)
            return place_info
        else:
            logger.error("HTTP error: %s, body: %s", response.status_code, response.text)
            return None

# Helper function to search place by name and coordinates
async def search_place_by_name(place_name: str, lat: Optional[float] = None, lng: Optional[float] = None) -> Optional[dict]:
    """Search for a place by name using new Google Places API"""
    if not settings.google_places_api_key:
        logger.error("Error: Google Places API key not configured")
        return None

    logger.debug("Searching for place: %s%s", place_name, (f" near {lat},{lng}" if lat and lng else ""))
    url = "https://places.googleapis.com/v1/places:searchText"
    headers = {
        "X-Goog-Api-Key": settings.google_places_api_key,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.internationalPhoneNumber,places.websiteUri,places.regularOpeningHours"
    }
    body = {
        "textQuery": place_name
    }

    # Add location bias if coordinates are provided
    if lat is not None and lng is not None:
        body["locationBias"] = {
            "circle": {
                "center": {"latitude": lat, "longitude": lng},
                "radius": 500.0  # 500 meter radius
            }
        }

    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=headers, json=body)
        logger.debug("Google API response status: %s", response.status_code)
        if response.status_code == 200:
            data = response.json()
            logger.debug("Google API response: %s", data)
            places = data.get("places", [])
            if places:
                result = places[0]  # Get first result
                hours = []
                if "regularOpeningHours" in result and "weekdayDescriptions" in result["regularOpeningHours"]:
                    hours = result["regularOpeningHours"]["weekdayDescriptions"]

                place_info = {
                    "name": result.get("displayName", {}).get("text"),
                    "address": result.get("formattedAddress"),
                    "lat": result.get("location", {}).get("latitude"),
                    "lng": result.get("location", {}).get("longitude"),
                    "phone": result.get("internationalPhoneNumber"),
                    "website": result.get("websiteUri"),
                    "hours": "\n".join(hours)
                }
                logger.debug("Extracted place info: %s", place_info)
                return place_info
            else:
                logger.debug("No places found in search results")
                return None
        else:
            logger.error("HTTP error: %s, body: %s", response.status_code, response.text)
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

            logger.debug("Received /start with code: %s", code)
            logger.debug("Current UTC time: %s", datetime.utcnow())

            # Find the link code
            link_code = db.query(models.TelegramLinkCode).filter(
                models.TelegramLinkCode.code == code,
                models.TelegramLinkCode.expires_at > datetime.utcnow()
            ).first()

            if link_code:
                logger.debug("Found valid code: %s, expires: %s", link_code.code, link_code.expires_at)
            else:
                # Check if code exists but is expired
                expired_code = db.query(models.TelegramLinkCode).filter(
                    models.TelegramLinkCode.code == code
                ).first()
                if expired_code:
                    logger.debug("Code exists but expired: %s, expired at: %s", expired_code.code, expired_code.expires_at)
                else:
                    logger.debug("Code not found: %s", code)

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

            # Extract place information
            place_info = await extract_place_info_from_url(text)
            if not place_info:
                await send_telegram_message(chat_id, "❌ Could not extract place information from this link.")
                return {"ok": True}

            # Get place details based on extraction type
            place_details = None
            if place_info["type"] == "place_id":
                place_details = await get_place_by_id(place_info["value"])
            elif place_info["type"] == "name_with_coords":
                place_details = await search_place_by_name(place_info["name"], place_info["lat"], place_info["lng"])
            elif place_info["type"] == "name":
                place_details = await search_place_by_name(place_info["value"])

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
                is_public=True
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
        logger.error("Error processing webhook: %s", e)
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
