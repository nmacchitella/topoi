from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import httpx
from typing import List
import asyncio
from database import get_db
import schemas
import auth

router = APIRouter(prefix="/search", tags=["search"])

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
