from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import httpx
from typing import List, Optional
import asyncio
from database import get_db, get_settings
import schemas
import auth

router = APIRouter(prefix="/search", tags=["search"])

settings = get_settings()

# Rate limiting: Nominatim allows 1 request per second
last_request_time = 0
MIN_REQUEST_INTERVAL = 1.0  # seconds


async def rate_limited_request(url: str, params: dict):
    """Make a rate-limited request to Nominatim API"""
    global last_request_time
    import time

    # Calculate time to wait
    current_time = time.time()
    time_since_last = current_time - last_request_time
    if time_since_last < MIN_REQUEST_INTERVAL:
        await asyncio.sleep(MIN_REQUEST_INTERVAL - time_since_last)

    # Make request
    async with httpx.AsyncClient() as client:
        headers = {
            'User-Agent': 'Topoi/1.0'  # Nominatim requires User-Agent
        }
        response = await client.get(url, params=params, headers=headers, timeout=10.0)
        last_request_time = time.time()
        return response


@router.get("/nominatim")
async def search_nominatim(
    q: str,
    limit: int = 5,
    current_user: schemas.User = Depends(auth.get_current_user)
):
    """Search for places using Nominatim API"""
    if not q or len(q.strip()) < 2:
        raise HTTPException(status_code=400, detail="Query must be at least 2 characters")

    try:
        url = "https://nominatim.openstreetmap.org/search"
        params = {
            "q": q,
            "format": "json",
            "limit": min(limit, 10),  # Cap at 10 results
            "addressdetails": 1
        }

        response = await rate_limited_request(url, params)
        response.raise_for_status()

        return response.json()

    except httpx.HTTPError as e:
        raise HTTPException(status_code=503, detail=f"Geocoding service unavailable: {str(e)}")


@router.post("/reverse")
async def reverse_geocode(
    request: schemas.NominatimReverseRequest,
    current_user: schemas.User = Depends(auth.get_current_user)
):
    """Reverse geocode coordinates to get address"""
    try:
        url = "https://nominatim.openstreetmap.org/reverse"
        params = {
            "lat": request.latitude,
            "lon": request.longitude,
            "format": "json",
            "addressdetails": 1
        }

        response = await rate_limited_request(url, params)
        response.raise_for_status()

        return response.json()

    except httpx.HTTPError as e:
        raise HTTPException(status_code=503, detail=f"Geocoding service unavailable: {str(e)}")


@router.get("/google/autocomplete")
async def google_places_autocomplete(
    q: str,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    current_user: schemas.User = Depends(auth.get_current_user)
):
    """Search for places using Google Places API (New)"""
    if not settings.google_places_api_key:
        raise HTTPException(status_code=503, detail="Google Places API not configured")

    if not q or len(q.strip()) < 2:
        raise HTTPException(status_code=400, detail="Query must be at least 2 characters")

    try:
        # Use Places API (New) - Autocomplete endpoint
        headers = {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": settings.google_places_api_key,
            "X-Goog-FieldMask": "suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat"
        }
        body = {"input": q}

        # Add location bias if coordinates provided
        if lat is not None and lng is not None:
            body["locationBias"] = {
                "circle": {
                    "center": {"latitude": lat, "longitude": lng},
                    "radius": 50000.0  # 50km
                }
            }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://places.googleapis.com/v1/places:autocomplete",
                headers=headers,
                json=body,
                timeout=10.0
            )
            response.raise_for_status()
            data = response.json()

            results = []
            for suggestion in data.get("suggestions", []):
                pred = suggestion.get("placePrediction", {})
                if pred:
                    results.append({
                        "place_id": pred.get("placeId", ""),
                        "description": pred.get("text", {}).get("text", ""),
                        "main_text": pred.get("structuredFormat", {}).get("mainText", {}).get("text", ""),
                        "secondary_text": pred.get("structuredFormat", {}).get("secondaryText", {}).get("text", ""),
                    })
            return results

    except httpx.HTTPError as e:
        raise HTTPException(status_code=503, detail=f"Google Places API unavailable: {str(e)}")


@router.get("/google/details/{place_id}")
async def google_place_details(
    place_id: str,
    current_user: schemas.User = Depends(auth.get_current_user)
):
    """Get place details (coordinates + metadata) from Google Places API (New)"""
    if not settings.google_places_api_key:
        raise HTTPException(status_code=503, detail="Google Places API not configured")

    try:
        headers = {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": settings.google_places_api_key,
            "X-Goog-FieldMask": "location,formattedAddress,googleMapsUri,types,websiteUri,nationalPhoneNumber,internationalPhoneNumber,regularOpeningHours,currentOpeningHours,businessStatus,displayName"
        }

        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"https://places.googleapis.com/v1/places/{place_id}",
                headers=headers,
                timeout=10.0
            )
            response.raise_for_status()
            data = response.json()

            location = data.get("location", {})
            if location:
                # Format opening hours if available
                hours_text = ""
                if data.get("regularOpeningHours", {}).get("weekdayDescriptions"):
                    hours_text = "\n".join(data["regularOpeningHours"]["weekdayDescriptions"])

                return {
                    "lat": location.get("latitude"),
                    "lng": location.get("longitude"),
                    "address": data.get("formattedAddress", ""),
                    "name": data.get("displayName", {}).get("text", ""),
                    "google_maps_uri": data.get("googleMapsUri", ""),
                    "types": data.get("types", []),
                    "website": data.get("websiteUri", ""),
                    "phone": data.get("internationalPhoneNumber") or data.get("nationalPhoneNumber", ""),
                    "hours": hours_text,
                    "business_status": data.get("businessStatus", ""),
                }
            raise HTTPException(status_code=404, detail="Place not found")

    except httpx.HTTPError as e:
        raise HTTPException(status_code=503, detail=f"Google Places API unavailable: {str(e)}")
