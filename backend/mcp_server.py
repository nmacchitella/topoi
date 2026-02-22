"""Topoi MCP Server — embedded in the backend with direct DB access."""

import contextvars
import json
from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Optional

from starlette.responses import Response

from mcp.server.fastmcp import FastMCP

import models
from auth import _hash_token
from database import SessionLocal

# ── Per-request auth context ─────────────────────────────────

_current_user_id: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar(
    "mcp_user_id", default=None
)


@contextmanager
def _db():
    """Yield a DB session, auto-close on exit."""
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


def _user_id() -> str:
    uid = _current_user_id.get()
    if not uid:
        raise RuntimeError("No authenticated user in MCP context")
    return uid


# ── Serializers ──────────────────────────────────────────────


def _tag_dict(t):
    return {"id": t.id, "name": t.name, "color": t.color, "icon": t.icon}


def _list_dict(l):
    return {
        "id": l.id, "name": l.name, "color": l.color,
        "icon": l.icon, "is_public": l.is_public,
    }


def _place_dict(p):
    return {
        "id": p.id, "name": p.name, "address": p.address,
        "latitude": p.latitude, "longitude": p.longitude,
        "notes": p.notes, "phone": p.phone, "website": p.website,
        "hours": p.hours, "is_public": p.is_public,
        "created_at": str(p.created_at), "updated_at": str(p.updated_at),
        "lists": [_list_dict(l) for l in p.lists],
        "tags": [_tag_dict(t) for t in p.tags],
    }


def _user_dict(u):
    return {
        "id": u.id, "name": u.name, "email": u.email,
        "username": u.username, "bio": u.bio,
        "is_public": u.is_public, "is_admin": u.is_admin,
        "profile_image_url": u.profile_image_url,
        "created_at": str(u.created_at),
    }


def _notification_dict(n):
    return {
        "id": n.id, "type": n.type, "title": n.title,
        "message": n.message, "link": n.link,
        "is_read": n.is_read, "created_at": str(n.created_at),
    }


def _fmt(data) -> str:
    return json.dumps(data, indent=2, default=str)


# ── ASGI Auth Middleware ─────────────────────────────────────


class MCPAuthMiddleware:
    """Validates X-API-Key on every MCP request and sets user context."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        # Extract X-API-Key header
        headers = dict(scope.get("headers", []))
        api_key = headers.get(b"x-api-key", b"").decode()

        if not api_key:
            r = Response("X-API-Key header required", status_code=401)
            await r(scope, receive, send)
            return

        # Validate against DB
        key_hash = _hash_token(api_key)
        with _db() as db:
            db_key = db.query(models.ApiKey).filter(
                models.ApiKey.key_hash == key_hash,
                models.ApiKey.is_active == True,
            ).first()
            if not db_key:
                r = Response("Invalid API key", status_code=401)
                await r(scope, receive, send)
                return
            user_id = db_key.user_id
            db_key.last_used_at = datetime.now(timezone.utc)
            db.commit()

        # Set per-request user context
        token = _current_user_id.set(user_id)
        try:
            await self.app(scope, receive, send)
        finally:
            _current_user_id.reset(token)


# ── MCP Instance ─────────────────────────────────────────────

mcp = FastMCP("topoi", stateless_http=True, json_response=True)


# ── Places ───────────────────────────────────────────────────


@mcp.tool()
async def list_places() -> str:
    """List all places on your map with their tags and lists."""
    with _db() as db:
        places = db.query(models.Place).filter(
            models.Place.user_id == _user_id()
        ).all()
        return _fmt([_place_dict(p) for p in places])


@mcp.tool()
async def get_place(place_id: str) -> str:
    """Get a specific place by ID.

    Args:
        place_id: The place's unique ID
    """
    with _db() as db:
        p = db.query(models.Place).filter(
            models.Place.id == place_id,
            models.Place.user_id == _user_id(),
        ).first()
        if not p:
            return "Place not found."
        return _fmt(_place_dict(p))


@mcp.tool()
async def create_place(
    name: str,
    address: str,
    latitude: float,
    longitude: float,
    notes: str = "",
    phone: Optional[str] = None,
    website: Optional[str] = None,
    hours: Optional[str] = None,
    is_public: bool = True,
    list_ids: Optional[list[str]] = None,
    tag_ids: Optional[list[str]] = None,
) -> str:
    """Create a new place on your map.

    Args:
        name: Place name (e.g. "Joe's Pizza")
        address: Full street address
        latitude: Latitude (-90 to 90)
        longitude: Longitude (-180 to 180)
        notes: Optional notes
        phone: Optional phone number
        website: Optional website URL
        hours: Optional opening hours
        is_public: Visible to others (default true)
        list_ids: List IDs to add the place to
        tag_ids: Tag IDs to attach
    """
    uid = _user_id()
    with _db() as db:
        place = models.Place(
            user_id=uid, name=name, address=address,
            latitude=latitude, longitude=longitude,
            notes=notes, phone=phone, website=website,
            hours=hours, is_public=is_public,
        )
        if list_ids:
            lists = db.query(models.List).filter(
                models.List.id.in_(list_ids), models.List.user_id == uid
            ).all()
            place.lists = lists
        if tag_ids:
            tags = db.query(models.Tag).filter(
                models.Tag.id.in_(tag_ids), models.Tag.user_id == uid
            ).all()
            place.tags = tags
        db.add(place)
        db.commit()
        db.refresh(place)
        return _fmt(_place_dict(place))


@mcp.tool()
async def update_place(
    place_id: str,
    name: Optional[str] = None,
    address: Optional[str] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    notes: Optional[str] = None,
    phone: Optional[str] = None,
    website: Optional[str] = None,
    hours: Optional[str] = None,
    is_public: Optional[bool] = None,
    list_ids: Optional[list[str]] = None,
    tag_ids: Optional[list[str]] = None,
) -> str:
    """Update an existing place. Only provide fields you want to change.

    Args:
        place_id: The place ID
        name: New name
        address: New address
        latitude: New latitude
        longitude: New longitude
        notes: New notes
        phone: New phone
        website: New website
        hours: New hours
        is_public: New visibility
        list_ids: Replace list assignments
        tag_ids: Replace tag assignments
    """
    uid = _user_id()
    with _db() as db:
        place = db.query(models.Place).filter(
            models.Place.id == place_id, models.Place.user_id == uid
        ).first()
        if not place:
            return "Place not found."
        for field in ["name", "address", "latitude", "longitude", "notes", "phone", "website", "hours", "is_public"]:
            val = locals()[field]
            if val is not None:
                setattr(place, field, val)
        if list_ids is not None:
            place.lists = db.query(models.List).filter(
                models.List.id.in_(list_ids), models.List.user_id == uid
            ).all()
        if tag_ids is not None:
            place.tags = db.query(models.Tag).filter(
                models.Tag.id.in_(tag_ids), models.Tag.user_id == uid
            ).all()
        db.commit()
        db.refresh(place)
        return _fmt(_place_dict(place))


@mcp.tool()
async def delete_place(place_id: str) -> str:
    """Delete a place from your map.

    Args:
        place_id: The place ID
    """
    with _db() as db:
        place = db.query(models.Place).filter(
            models.Place.id == place_id, models.Place.user_id == _user_id()
        ).first()
        if not place:
            return "Place not found."
        db.delete(place)
        db.commit()
        return "Place deleted."


# ── Lists ────────────────────────────────────────────────────


@mcp.tool()
async def list_lists() -> str:
    """Get all your lists with place counts."""
    with _db() as db:
        lists = db.query(models.List).filter(
            models.List.user_id == _user_id()
        ).all()
        result = []
        for l in lists:
            d = _list_dict(l)
            d["place_count"] = len(l.places)
            result.append(d)
        return _fmt(result)


@mcp.tool()
async def create_list(
    name: str,
    color: str = "#3B82F6",
    icon: Optional[str] = None,
    is_public: bool = True,
) -> str:
    """Create a new list to organize places.

    Args:
        name: List name (e.g. "Best Coffee Shops")
        color: Hex color (default #3B82F6)
        icon: Optional emoji
        is_public: Visible to others
    """
    with _db() as db:
        lst = models.List(
            user_id=_user_id(), name=name, color=color,
            icon=icon, is_public=is_public,
        )
        db.add(lst)
        db.commit()
        db.refresh(lst)
        return _fmt(_list_dict(lst))


@mcp.tool()
async def get_list_places(list_id: str) -> str:
    """Get all places in a list.

    Args:
        list_id: The list ID
    """
    with _db() as db:
        lst = db.query(models.List).filter(
            models.List.id == list_id, models.List.user_id == _user_id()
        ).first()
        if not lst:
            return "List not found."
        return _fmt([_place_dict(p) for p in lst.places])


@mcp.tool()
async def update_list(
    list_id: str,
    name: Optional[str] = None,
    color: Optional[str] = None,
    icon: Optional[str] = None,
    is_public: Optional[bool] = None,
) -> str:
    """Update a list.

    Args:
        list_id: The list ID
        name: New name
        color: New hex color
        icon: New emoji
        is_public: New visibility
    """
    with _db() as db:
        lst = db.query(models.List).filter(
            models.List.id == list_id, models.List.user_id == _user_id()
        ).first()
        if not lst:
            return "List not found."
        for field in ["name", "color", "icon", "is_public"]:
            val = locals()[field]
            if val is not None:
                setattr(lst, field, val)
        db.commit()
        db.refresh(lst)
        return _fmt(_list_dict(lst))


@mcp.tool()
async def delete_list(list_id: str) -> str:
    """Delete a list (places in it are NOT deleted).

    Args:
        list_id: The list ID
    """
    with _db() as db:
        lst = db.query(models.List).filter(
            models.List.id == list_id, models.List.user_id == _user_id()
        ).first()
        if not lst:
            return "List not found."
        db.delete(lst)
        db.commit()
        return "List deleted."


# ── Tags ─────────────────────────────────────────────────────


@mcp.tool()
async def list_tags() -> str:
    """Get all your tags with usage counts."""
    with _db() as db:
        tags = db.query(models.Tag).filter(
            models.Tag.user_id == _user_id()
        ).all()
        result = []
        for t in tags:
            d = _tag_dict(t)
            d["usage_count"] = len(t.places)
            result.append(d)
        return _fmt(result)


@mcp.tool()
async def create_tag(
    name: str,
    color: str = "#3B82F6",
    icon: Optional[str] = None,
) -> str:
    """Create a new tag for categorizing places.

    Args:
        name: Tag name (e.g. "Italian", "Date Night")
        color: Hex color
        icon: Optional emoji
    """
    uid = _user_id()
    with _db() as db:
        existing = db.query(models.Tag).filter(
            models.Tag.user_id == uid, models.Tag.name == name
        ).first()
        if existing:
            return f"Tag '{name}' already exists."
        tag = models.Tag(user_id=uid, name=name, color=color, icon=icon)
        db.add(tag)
        db.commit()
        db.refresh(tag)
        return _fmt(_tag_dict(tag))


@mcp.tool()
async def update_tag(
    tag_id: str,
    name: Optional[str] = None,
    color: Optional[str] = None,
    icon: Optional[str] = None,
) -> str:
    """Update a tag.

    Args:
        tag_id: The tag ID
        name: New name
        color: New hex color
        icon: New emoji
    """
    with _db() as db:
        tag = db.query(models.Tag).filter(
            models.Tag.id == tag_id, models.Tag.user_id == _user_id()
        ).first()
        if not tag:
            return "Tag not found."
        for field in ["name", "color", "icon"]:
            val = locals()[field]
            if val is not None:
                setattr(tag, field, val)
        db.commit()
        db.refresh(tag)
        return _fmt(_tag_dict(tag))


@mcp.tool()
async def delete_tag(tag_id: str) -> str:
    """Delete a tag (removes it from all places).

    Args:
        tag_id: The tag ID
    """
    with _db() as db:
        tag = db.query(models.Tag).filter(
            models.Tag.id == tag_id, models.Tag.user_id == _user_id()
        ).first()
        if not tag:
            return "Tag not found."
        db.delete(tag)
        db.commit()
        return "Tag deleted."


@mcp.tool()
async def get_tag_places(tag_id: str) -> str:
    """Get all places with a specific tag.

    Args:
        tag_id: The tag ID
    """
    with _db() as db:
        tag = db.query(models.Tag).filter(
            models.Tag.id == tag_id, models.Tag.user_id == _user_id()
        ).first()
        if not tag:
            return "Tag not found."
        return _fmt([_place_dict(p) for p in tag.places])


# ── Search (external APIs) ──────────────────────────────────


@mcp.tool()
async def search_nominatim(query: str, limit: int = 5) -> str:
    """Search for places via OpenStreetMap/Nominatim. Good for addresses and landmarks.

    Args:
        query: Search text (e.g. "Eiffel Tower" or "123 Main St, NYC")
        limit: Max results (1-10)
    """
    import httpx
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://nominatim.openstreetmap.org/search",
            params={"q": query, "format": "geojson", "limit": min(limit, 10)},
            headers={"User-Agent": "Topoi/1.0"},
        )
        return _fmt(resp.json())


@mcp.tool()
async def search_google(
    query: str,
    lat: Optional[float] = None,
    lng: Optional[float] = None,
) -> str:
    """Search for places via Google Places autocomplete. Best for businesses and restaurants.

    Args:
        query: Search text (e.g. "best pizza near me")
        lat: Optional latitude to bias results
        lng: Optional longitude to bias results
    """
    from database import get_settings
    settings = get_settings()
    if not settings.google_places_api_key:
        return "Google Places API key not configured."

    import httpx
    params = {
        "input": query,
        "key": settings.google_places_api_key,
    }
    if lat is not None and lng is not None:
        params["location"] = f"{lat},{lng}"
        params["radius"] = "50000"

    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://maps.googleapis.com/maps/api/place/autocomplete/json",
            params=params,
        )
        data = resp.json()
        results = [
            {"place_id": p["place_id"], "description": p["description"]}
            for p in data.get("predictions", [])
        ]
        return _fmt(results)


@mcp.tool()
async def get_google_place_details(google_place_id: str) -> str:
    """Get full details for a Google place (address, phone, website, hours).

    Args:
        google_place_id: The Google Place ID from search results
    """
    from database import get_settings
    settings = get_settings()
    if not settings.google_places_api_key:
        return "Google Places API key not configured."

    import httpx
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            "https://maps.googleapis.com/maps/api/place/details/json",
            params={
                "place_id": google_place_id,
                "fields": "name,formatted_address,geometry,formatted_phone_number,website,opening_hours,business_status",
                "key": settings.google_places_api_key,
            },
        )
        result = resp.json().get("result", {})
        geo = result.get("geometry", {}).get("location", {})
        return _fmt({
            "name": result.get("name"),
            "address": result.get("formatted_address"),
            "latitude": geo.get("lat"),
            "longitude": geo.get("lng"),
            "phone": result.get("formatted_phone_number"),
            "website": result.get("website"),
            "hours": result.get("opening_hours", {}).get("weekday_text"),
            "business_status": result.get("business_status"),
        })


# ── Users & Social ───────────────────────────────────────────


@mcp.tool()
async def search_users(query: str, limit: int = 20) -> str:
    """Search for Topoi users by name or username.

    Args:
        query: Search text (min 2 chars)
        limit: Max results
    """
    with _db() as db:
        users = db.query(models.User).filter(
            models.User.id != _user_id(),
            (models.User.name.ilike(f"%{query}%")) | (models.User.username.ilike(f"%{query}%")),
        ).limit(limit).all()
        return _fmt([{
            "id": u.id, "name": u.name, "username": u.username,
            "is_public": u.is_public,
        } for u in users])


@mcp.tool()
async def get_user_profile(user_id: str) -> str:
    """Get a user's public profile.

    Args:
        user_id: The user's ID
    """
    with _db() as db:
        u = db.query(models.User).filter(models.User.id == user_id).first()
        if not u:
            return "User not found."
        follower_count = db.query(models.UserFollow).filter(
            models.UserFollow.following_id == user_id,
            models.UserFollow.status == "confirmed",
        ).count()
        following_count = db.query(models.UserFollow).filter(
            models.UserFollow.follower_id == user_id,
            models.UserFollow.status == "confirmed",
        ).count()
        place_count = db.query(models.Place).filter(
            models.Place.user_id == user_id, models.Place.is_public == True
        ).count()
        return _fmt({
            "id": u.id, "name": u.name, "username": u.username,
            "bio": u.bio, "is_public": u.is_public,
            "follower_count": follower_count,
            "following_count": following_count,
            "place_count": place_count,
        })


@mcp.tool()
async def follow_user(user_id: str) -> str:
    """Follow another user. Public users are followed instantly; private users get a request.

    Args:
        user_id: The user to follow
    """
    uid = _user_id()
    with _db() as db:
        target = db.query(models.User).filter(models.User.id == user_id).first()
        if not target:
            return "User not found."
        existing = db.query(models.UserFollow).filter(
            models.UserFollow.follower_id == uid,
            models.UserFollow.following_id == user_id,
        ).first()
        if existing:
            return f"Already following (status: {existing.status})."
        status = "confirmed" if target.is_public else "pending"
        follow = models.UserFollow(
            follower_id=uid, following_id=user_id, status=status,
        )
        db.add(follow)
        db.commit()
        return _fmt({"status": status, "message": f"Follow {'confirmed' if status == 'confirmed' else 'request sent'}."})


@mcp.tool()
async def unfollow_user(user_id: str) -> str:
    """Unfollow a user.

    Args:
        user_id: The user to unfollow
    """
    with _db() as db:
        follow = db.query(models.UserFollow).filter(
            models.UserFollow.follower_id == _user_id(),
            models.UserFollow.following_id == user_id,
        ).first()
        if not follow:
            return "Not following this user."
        db.delete(follow)
        db.commit()
        return "Unfollowed."


@mcp.tool()
async def get_my_followers(status: str = "confirmed") -> str:
    """Get your followers.

    Args:
        status: "confirmed" or "pending"
    """
    with _db() as db:
        follows = db.query(models.UserFollow).filter(
            models.UserFollow.following_id == _user_id(),
            models.UserFollow.status == status,
        ).all()
        user_ids = [f.follower_id for f in follows]
        users = db.query(models.User).filter(models.User.id.in_(user_ids)).all()
        return _fmt([{"id": u.id, "name": u.name, "username": u.username} for u in users])


@mcp.tool()
async def get_my_following() -> str:
    """Get users you are following."""
    with _db() as db:
        follows = db.query(models.UserFollow).filter(
            models.UserFollow.follower_id == _user_id(),
            models.UserFollow.status == "confirmed",
        ).all()
        user_ids = [f.following_id for f in follows]
        users = db.query(models.User).filter(models.User.id.in_(user_ids)).all()
        return _fmt([{"id": u.id, "name": u.name, "username": u.username} for u in users])


# ── Profile ──────────────────────────────────────────────────


@mcp.tool()
async def get_my_profile() -> str:
    """Get your profile info (name, username, bio, privacy, stats)."""
    with _db() as db:
        u = db.query(models.User).filter(models.User.id == _user_id()).first()
        d = _user_dict(u)
        d["follower_count"] = db.query(models.UserFollow).filter(
            models.UserFollow.following_id == u.id, models.UserFollow.status == "confirmed"
        ).count()
        d["following_count"] = db.query(models.UserFollow).filter(
            models.UserFollow.follower_id == u.id, models.UserFollow.status == "confirmed"
        ).count()
        d["place_count"] = db.query(models.Place).filter(models.Place.user_id == u.id).count()
        return _fmt(d)


@mcp.tool()
async def update_my_profile(
    name: Optional[str] = None,
    username: Optional[str] = None,
    bio: Optional[str] = None,
    is_public: Optional[bool] = None,
) -> str:
    """Update your profile settings.

    Args:
        name: New display name
        username: New username (3-30 chars, alphanumeric + underscore)
        bio: New bio (max 500 chars)
        is_public: true = public, false = private
    """
    with _db() as db:
        u = db.query(models.User).filter(models.User.id == _user_id()).first()
        if name is not None:
            u.name = name
        if username is not None:
            existing = db.query(models.User).filter(
                models.User.username.ilike(username), models.User.id != u.id
            ).first()
            if existing:
                return "Username already taken."
            u.username = username
        if bio is not None:
            u.bio = bio
        if is_public is not None:
            u.is_public = is_public
        db.commit()
        db.refresh(u)
        return _fmt(_user_dict(u))


# ── Notifications ────────────────────────────────────────────


@mcp.tool()
async def get_notifications(limit: int = 20) -> str:
    """Get your recent notifications.

    Args:
        limit: Max notifications (default 20)
    """
    with _db() as db:
        notifs = db.query(models.Notification).filter(
            models.Notification.user_id == _user_id()
        ).order_by(models.Notification.created_at.desc()).limit(limit).all()
        return _fmt([_notification_dict(n) for n in notifs])


@mcp.tool()
async def get_unread_notification_count() -> str:
    """Get your unread notification count."""
    with _db() as db:
        count = db.query(models.Notification).filter(
            models.Notification.user_id == _user_id(),
            models.Notification.is_read == False,
        ).count()
        return _fmt({"count": count})


@mcp.tool()
async def mark_notifications_read(notification_ids: list[str]) -> str:
    """Mark notifications as read.

    Args:
        notification_ids: List of notification IDs
    """
    with _db() as db:
        updated = db.query(models.Notification).filter(
            models.Notification.id.in_(notification_ids),
            models.Notification.user_id == _user_id(),
        ).update({"is_read": True}, synchronize_session="fetch")
        db.commit()
        return _fmt({"marked_read": updated})


# ── Explore ──────────────────────────────────────────────────


@mcp.tool()
async def explore_top_users(limit: int = 5) -> str:
    """Discover top users by public place count.

    Args:
        limit: Number of users (max 20)
    """
    from sqlalchemy import func
    with _db() as db:
        results = db.query(
            models.User,
            func.count(models.Place.id).label("place_count"),
        ).join(models.Place).filter(
            models.User.is_public == True,
            models.Place.is_public == True,
            models.User.id != _user_id(),
        ).group_by(models.User.id).order_by(
            func.count(models.Place.id).desc()
        ).limit(min(limit, 20)).all()
        return _fmt([{
            "id": u.id, "name": u.name, "username": u.username,
            "place_count": cnt,
        } for u, cnt in results])


@mcp.tool()
async def explore_top_places(
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    limit: int = 10,
) -> str:
    """Discover popular places near a location (saved by multiple users).

    Args:
        lat: Latitude (defaults to Manhattan)
        lng: Longitude
        limit: Max results (max 50)
    """
    from sqlalchemy import func
    lat = lat or 40.7580
    lng = lng or -73.9855
    with _db() as db:
        results = db.query(
            models.Place.name,
            models.Place.address,
            models.Place.latitude,
            models.Place.longitude,
            func.count(models.Place.id).label("user_count"),
        ).filter(
            models.Place.is_public == True,
            models.Place.user_id != _user_id(),
        ).group_by(
            func.round(models.Place.latitude, 3),
            func.round(models.Place.longitude, 3),
            models.Place.name,
        ).having(
            func.count(models.Place.id) > 1
        ).order_by(
            func.count(models.Place.id).desc()
        ).limit(min(limit, 50)).all()
        return _fmt([{
            "name": r.name, "address": r.address,
            "latitude": r.latitude, "longitude": r.longitude,
            "user_count": r.user_count,
        } for r in results])


# ── Import ───────────────────────────────────────────────────


@mcp.tool()
async def import_places(places: list[dict]) -> str:
    """Bulk import places. Each item needs: name, address, latitude, longitude. Optional: notes, phone, website, hours, tags (list of tag names).

    Args:
        places: List of place dicts
    """
    uid = _user_id()
    imported = 0
    errors = []
    with _db() as db:
        existing_tags = {t.name.lower(): t for t in db.query(models.Tag).filter(models.Tag.user_id == uid).all()}
        for i, p in enumerate(places):
            try:
                place = models.Place(
                    user_id=uid,
                    name=p["name"],
                    address=p["address"],
                    latitude=p["latitude"],
                    longitude=p["longitude"],
                    notes=p.get("notes", ""),
                    phone=p.get("phone"),
                    website=p.get("website"),
                    hours=p.get("hours"),
                )
                # Handle tags by name
                for tag_name in p.get("tags", []):
                    key = tag_name.lower()
                    if key not in existing_tags:
                        new_tag = models.Tag(user_id=uid, name=tag_name)
                        db.add(new_tag)
                        db.flush()
                        existing_tags[key] = new_tag
                    place.tags.append(existing_tags[key])
                db.add(place)
                imported += 1
            except Exception as e:
                errors.append(f"Row {i}: {str(e)}")
        db.commit()
    return _fmt({"imported": imported, "errors": errors})


# ── Export ───────────────────────────────────────────────────


def get_mcp_app():
    """Return the MCP ASGI app wrapped with auth middleware."""
    return MCPAuthMiddleware(mcp.asgi)
