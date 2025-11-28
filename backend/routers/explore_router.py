"""
Explore Router - Recommendations and discovery endpoints
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct
from typing import List, Optional
from database import get_db
from auth import get_current_user
import models
import schemas
from services.follow_service import FollowService
from math import radians, cos, sin, asin, sqrt

router = APIRouter(prefix="/explore", tags=["explore"])

# Manhattan coordinates as default
DEFAULT_LAT = 40.7580
DEFAULT_LNG = -73.9855

# 30 miles in kilometers
RADIUS_KM = 48.28


def haversine(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate distance between two points in km using Haversine formula."""
    R = 6371  # Earth's radius in km

    lat1, lng1, lat2, lng2 = map(radians, [lat1, lng1, lat2, lng2])

    dlat = lat2 - lat1
    dlng = lng2 - lng1

    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlng/2)**2
    c = 2 * asin(sqrt(a))

    return R * c


@router.get("/top-users", response_model=List[schemas.UserSearchResult])
async def get_top_users(
    limit: int = Query(5, le=20),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get top users by public place count.
    Returns users with the most public places on their maps.
    """
    # Subquery to count public places per user
    place_count_subq = (
        db.query(
            models.Place.user_id,
            func.count(models.Place.id).label('place_count')
        )
        .filter(models.Place.is_public == True)
        .group_by(models.Place.user_id)
        .subquery()
    )

    # Get users ordered by place count, excluding current user
    users = (
        db.query(models.User, place_count_subq.c.place_count)
        .join(place_count_subq, models.User.id == place_count_subq.c.user_id)
        .filter(models.User.id != current_user.id)
        .filter(models.User.is_public == True)  # Only public profiles
        .order_by(place_count_subq.c.place_count.desc())
        .limit(limit)
        .all()
    )

    results = []
    for user, place_count in users:
        # Check follow relationship
        follow_rel = FollowService.get_follow_relationship(
            db, current_user.id, user.id
        )
        is_followed = follow_rel is not None and follow_rel.status == 'confirmed'
        follow_status = follow_rel.status if follow_rel else None

        results.append(schemas.UserSearchResult(
            id=user.id,
            name=user.name,
            username=user.username,
            profile_image_url=user.profile_image_url,
            is_public=user.is_public,
            is_followed_by_me=is_followed,
            follow_status=follow_status,
            place_count=place_count
        ))

    return results


@router.get("/top-places")
async def get_top_places(
    lat: Optional[float] = Query(None, description="Latitude"),
    lng: Optional[float] = Query(None, description="Longitude"),
    limit: int = Query(10, le=50),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get top places near a location.
    Returns the most "popular" places - places that appear on multiple users' maps.
    Defaults to Manhattan if no location provided.
    """
    # Use provided coordinates or default to Manhattan
    center_lat = lat if lat is not None else DEFAULT_LAT
    center_lng = lng if lng is not None else DEFAULT_LNG

    # Calculate bounding box for initial filtering (rough estimate)
    # 1 degree latitude ≈ 111 km
    # 1 degree longitude varies by latitude
    lat_delta = RADIUS_KM / 111
    lng_delta = RADIUS_KM / (111 * cos(radians(center_lat)))

    min_lat = center_lat - lat_delta
    max_lat = center_lat + lat_delta
    min_lng = center_lng - lng_delta
    max_lng = center_lng + lng_delta

    # Get all public places within bounding box, excluding current user's places
    places = (
        db.query(models.Place)
        .filter(models.Place.is_public == True)
        .filter(models.Place.user_id != current_user.id)
        .filter(models.Place.latitude >= min_lat)
        .filter(models.Place.latitude <= max_lat)
        .filter(models.Place.longitude >= min_lng)
        .filter(models.Place.longitude <= max_lng)
        .all()
    )

    # Group places by approximate location (within ~100m) and name
    # to find places that appear on multiple users' maps
    place_groups = {}

    for place in places:
        # Verify actual distance using Haversine
        distance = haversine(center_lat, center_lng, place.latitude, place.longitude)
        if distance > RADIUS_KM:
            continue

        # Create a key based on rounded coordinates (~100m precision) and normalized name
        lat_key = round(place.latitude, 3)
        lng_key = round(place.longitude, 3)
        name_key = place.name.lower().strip()

        key = (lat_key, lng_key, name_key)

        if key not in place_groups:
            place_groups[key] = {
                'places': [],
                'user_ids': set(),
                'distance': distance
            }

        place_groups[key]['places'].append(place)
        place_groups[key]['user_ids'].add(place.user_id)

    # Sort by number of unique users (popularity) then by distance
    sorted_groups = sorted(
        place_groups.items(),
        key=lambda x: (-len(x[1]['user_ids']), x[1]['distance'])
    )

    # Build response with representative place from each group
    results = []
    for key, group in sorted_groups[:limit]:
        # Use the most recent place as representative
        representative = max(group['places'], key=lambda p: p.created_at)
        owner = db.query(models.User).filter(models.User.id == representative.user_id).first()

        results.append({
            'id': representative.id,
            'name': representative.name,
            'address': representative.address,
            'latitude': representative.latitude,
            'longitude': representative.longitude,
            'notes': representative.notes,
            'user_count': len(group['user_ids']),
            'distance_km': round(group['distance'], 1),
            'owner': {
                'id': owner.id,
                'name': owner.name,
                'username': owner.username
            } if owner else None,
            'tags': [{'id': t.id, 'name': t.name, 'color': t.color, 'icon': t.icon} for t in representative.tags[:3]]
        })

    return results
