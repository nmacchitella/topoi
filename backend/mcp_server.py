"""
Topoi MCP Server

Exposes map-management tools for Claude via the Model Context Protocol.
Mounted on the FastAPI app at /mcp. Tools call the backend API internally
via httpx (localhost), reusing all existing validation and business logic.
"""

import json
import secrets as secrets_mod
from contextvars import ContextVar
from datetime import timedelta
from typing import Optional

from fastmcp import FastMCP
from jose import jwt as jose_jwt
from starlette.responses import JSONResponse
from starlette.types import ASGIApp, Receive, Scope, Send
import httpx

from database import get_settings
from auth import create_access_token

settings = get_settings()

# Per-request JWT for the current MCP user
_current_mcp_token: ContextVar[str | None] = ContextVar("_current_mcp_token", default=None)

# ---------------------------------------------------------------------------
# MCP instance
# ---------------------------------------------------------------------------

mcp = FastMCP(
    "Topoi",
    instructions=(
        "You are a map assistant for the Topoi app. "
        "Use these tools to manage places, lists, tags, and social features "
        "on the user's personal map."
    ),
)


# ---------------------------------------------------------------------------
# Auth middleware — protects the /mcp endpoint with a bearer token
# ---------------------------------------------------------------------------

class MCPAuthMiddleware:
    """ASGI middleware supporting two auth modes:
    - Static token: matches MCP_AUTH_TOKEN, uses MCP_USER_EMAIL (CLI)
    - JWT token: decoded as JWT from OAuth 2.1 flow (claude.ai)
    """

    def __init__(self, app: ASGIApp, static_token: str = ""):
        self.app = app
        self.static_token = static_token

    async def __call__(self, scope: Scope, receive: Receive, send: Send):
        if scope["type"] == "http":
            headers = dict(scope.get("headers", []))
            auth_header = headers.get(b"authorization", b"").decode()
            bearer = auth_header.removeprefix("Bearer ").strip()

            if not bearer:
                resp = JSONResponse(status_code=401, content={"error": "Unauthorized"})
                await resp(scope, receive, send)
                return

            # Mode 1: Legacy static token (CLI)
            if self.static_token and secrets_mod.compare_digest(bearer, self.static_token):
                token = _get_api_token()
                ctx = _current_mcp_token.set(token)
                try:
                    await self.app(scope, receive, send)
                finally:
                    _current_mcp_token.reset(ctx)
                return

            # Mode 2: JWT token (OAuth 2.1)
            try:
                payload = jose_jwt.decode(
                    bearer, settings.secret_key, algorithms=[settings.algorithm]
                )
                if not payload.get("sub"):
                    raise ValueError("No sub claim")
                ctx = _current_mcp_token.set(bearer)
                try:
                    await self.app(scope, receive, send)
                finally:
                    _current_mcp_token.reset(ctx)
                return
            except Exception:
                resp = JSONResponse(status_code=401, content={"error": "Invalid token"})
                await resp(scope, receive, send)
                return

        await self.app(scope, receive, send)


# ---------------------------------------------------------------------------
# Internal API client — calls the backend's own REST API via localhost
# ---------------------------------------------------------------------------

_client: httpx.AsyncClient | None = None


def _get_api_token() -> str:
    """Generate a long-lived JWT for the legacy MCP user."""
    return create_access_token(
        data={"sub": settings.mcp_user_email},
        expires_delta=timedelta(days=3650),
    )


async def _get_client() -> httpx.AsyncClient:
    """Shared httpx client (connection pool). Auth is per-request."""
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(
            base_url=f"{settings.backend_url}/api",
            timeout=30.0,
        )
    return _client


def _auth_headers() -> dict:
    """Get Authorization header for the current request's user."""
    token = _current_mcp_token.get() or _get_api_token()
    return {"Authorization": f"Bearer {token}"}


async def api_get(path: str, params: dict | None = None) -> dict | list:
    c = await _get_client()
    resp = await c.get(path, params=params, headers=_auth_headers())
    resp.raise_for_status()
    return resp.json()


async def api_post(path: str, body: dict | None = None) -> dict:
    c = await _get_client()
    resp = await c.post(path, json=body, headers=_auth_headers())
    resp.raise_for_status()
    return resp.json() if resp.status_code != 204 else {"status": "ok"}


async def api_put(path: str, body: dict | None = None) -> dict:
    c = await _get_client()
    resp = await c.put(path, json=body, headers=_auth_headers())
    resp.raise_for_status()
    return resp.json()


async def api_patch(path: str, body: dict | None = None) -> dict:
    c = await _get_client()
    resp = await c.patch(path, json=body, headers=_auth_headers())
    resp.raise_for_status()
    return resp.json()


async def api_delete(path: str) -> dict:
    c = await _get_client()
    resp = await c.delete(path, headers=_auth_headers())
    resp.raise_for_status()
    return resp.json() if resp.status_code != 204 else {"status": "deleted"}


def _fmt(data) -> str:
    return json.dumps(data, indent=2, default=str)


# ---------------------------------------------------------------------------
# Places
# ---------------------------------------------------------------------------

@mcp.tool()
async def list_places() -> str:
    """List all places on your map with their tags and lists."""
    data = await api_get("/places")
    if not data:
        return "No places found."
    return _fmt(data)


@mcp.tool()
async def get_place(place_id: str) -> str:
    """Get a specific place by ID.

    Args:
        place_id: The place's unique ID
    """
    data = await api_get(f"/places/{place_id}")
    return _fmt(data)


@mcp.tool()
async def create_place(
    name: str,
    address: str,
    latitude: float,
    longitude: float,
    notes: str = "",
    phone: str = "",
    website: str = "",
    hours: str = "",
    is_public: bool = True,
    list_ids: str = "",
    tag_ids: str = "",
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
        list_ids: Comma-separated list IDs to add the place to
        tag_ids: Comma-separated tag IDs to attach
    """
    body: dict = {
        "name": name,
        "address": address,
        "latitude": latitude,
        "longitude": longitude,
        "notes": notes,
        "is_public": is_public,
    }
    if phone:
        body["phone"] = phone
    if website:
        body["website"] = website
    if hours:
        body["hours"] = hours
    if list_ids:
        body["list_ids"] = [i.strip() for i in list_ids.split(",")]
    if tag_ids:
        body["tag_ids"] = [i.strip() for i in tag_ids.split(",")]
    data = await api_post("/places", body)
    return f"Place created: **{data['name']}** (ID: {data['id']})"


@mcp.tool()
async def update_place(
    place_id: str,
    name: str = "",
    address: str = "",
    latitude: float | None = None,
    longitude: float | None = None,
    notes: str = "",
    phone: str = "",
    website: str = "",
    hours: str = "",
    is_public: bool | None = None,
    list_ids: str = "",
    tag_ids: str = "",
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
        list_ids: Comma-separated list IDs (replaces all)
        tag_ids: Comma-separated tag IDs (replaces all)
    """
    body: dict = {}
    if name:
        body["name"] = name
    if address:
        body["address"] = address
    if latitude is not None:
        body["latitude"] = latitude
    if longitude is not None:
        body["longitude"] = longitude
    if notes:
        body["notes"] = notes
    if phone:
        body["phone"] = phone
    if website:
        body["website"] = website
    if hours:
        body["hours"] = hours
    if is_public is not None:
        body["is_public"] = is_public
    if list_ids:
        body["list_ids"] = [i.strip() for i in list_ids.split(",")]
    if tag_ids:
        body["tag_ids"] = [i.strip() for i in tag_ids.split(",")]
    data = await api_put(f"/places/{place_id}", body)
    return f"Place updated: **{data['name']}** (ID: {data['id']})"


@mcp.tool()
async def nearby_places(
    lat: float,
    lng: float,
    radius_km: float = 5.0,
) -> str:
    """Find your saved places within a radius of a coordinate.

    Args:
        lat: Center latitude (-90 to 90)
        lng: Center longitude (-180 to 180)
        radius_km: Search radius in kilometers (default 5, max 500)
    """
    params: dict = {"lat": lat, "lng": lng, "radius_km": min(radius_km, 500)}
    data = await api_get("/places/nearby", params=params)
    if not data:
        return "No saved places found within that radius."
    return _fmt(data)


@mcp.tool()
async def delete_place(place_id: str) -> str:
    """Delete a place from your map.

    Args:
        place_id: The place ID
    """
    await api_delete(f"/places/{place_id}")
    return f"Place {place_id} deleted."


# ---------------------------------------------------------------------------
# Lists
# ---------------------------------------------------------------------------

@mcp.tool()
async def list_lists() -> str:
    """Get all your lists with place counts."""
    data = await api_get("/lists")
    if not data:
        return "No lists found."
    return _fmt(data)


@mcp.tool()
async def create_list(
    name: str,
    color: str = "#3B82F6",
    icon: str = "",
    is_public: bool = True,
) -> str:
    """Create a new list to organize places.

    Args:
        name: List name (e.g. "Best Coffee Shops")
        color: Hex color (default #3B82F6)
        icon: Optional emoji
        is_public: Visible to others
    """
    body: dict = {"name": name, "color": color, "is_public": is_public}
    if icon:
        body["icon"] = icon
    data = await api_post("/lists", body)
    return f"List created: **{data['name']}** (ID: {data['id']})"


@mcp.tool()
async def get_list_places(list_id: str) -> str:
    """Get all places in a list.

    Args:
        list_id: The list ID
    """
    data = await api_get(f"/lists/{list_id}/places")
    if not data:
        return "No places in this list."
    return _fmt(data)


@mcp.tool()
async def update_list(
    list_id: str,
    name: str = "",
    color: str = "",
    icon: str = "",
    is_public: bool | None = None,
) -> str:
    """Update a list.

    Args:
        list_id: The list ID
        name: New name
        color: New hex color
        icon: New emoji
        is_public: New visibility
    """
    body: dict = {}
    if name:
        body["name"] = name
    if color:
        body["color"] = color
    if icon:
        body["icon"] = icon
    if is_public is not None:
        body["is_public"] = is_public
    data = await api_put(f"/lists/{list_id}", body)
    return f"List updated: **{data['name']}** (ID: {data['id']})"


@mcp.tool()
async def delete_list(list_id: str) -> str:
    """Delete a list (places in it are NOT deleted).

    Args:
        list_id: The list ID
    """
    await api_delete(f"/lists/{list_id}")
    return f"List {list_id} deleted."


# ---------------------------------------------------------------------------
# Tags
# ---------------------------------------------------------------------------

@mcp.tool()
async def list_tags() -> str:
    """Get all your tags with usage counts."""
    data = await api_get("/tags")
    if not data:
        return "No tags found."
    return _fmt(data)


@mcp.tool()
async def create_tag(
    name: str,
    color: str = "#3B82F6",
    icon: str = "",
) -> str:
    """Create a new tag for categorizing places.

    Args:
        name: Tag name (e.g. "Italian", "Date Night")
        color: Hex color
        icon: Optional emoji
    """
    body: dict = {"name": name, "color": color}
    if icon:
        body["icon"] = icon
    data = await api_post("/tags", body)
    return f"Tag created: **{data['name']}** (ID: {data['id']})"


@mcp.tool()
async def update_tag(
    tag_id: str,
    name: str = "",
    color: str = "",
    icon: str = "",
) -> str:
    """Update a tag.

    Args:
        tag_id: The tag ID
        name: New name
        color: New hex color
        icon: New emoji
    """
    body: dict = {}
    if name:
        body["name"] = name
    if color:
        body["color"] = color
    if icon:
        body["icon"] = icon
    data = await api_put(f"/tags/{tag_id}", body)
    return f"Tag updated: **{data['name']}** (ID: {data['id']})"


@mcp.tool()
async def delete_tag(tag_id: str) -> str:
    """Delete a tag (removes it from all places).

    Args:
        tag_id: The tag ID
    """
    await api_delete(f"/tags/{tag_id}")
    return f"Tag {tag_id} deleted."


@mcp.tool()
async def get_tag_places(tag_id: str) -> str:
    """Get all places with a specific tag.

    Args:
        tag_id: The tag ID
    """
    data = await api_get(f"/tags/{tag_id}/places")
    if not data:
        return "No places with this tag."
    return _fmt(data)


# ---------------------------------------------------------------------------
# Search (external APIs)
# ---------------------------------------------------------------------------

@mcp.tool()
async def search_nominatim(query: str, limit: int = 5) -> str:
    """Search for places via OpenStreetMap/Nominatim. Good for addresses and landmarks.

    Args:
        query: Search text (e.g. "Eiffel Tower" or "123 Main St, NYC")
        limit: Max results (1-10)
    """
    data = await api_get("/search/nominatim", params={"q": query, "limit": min(limit, 10)})
    return _fmt(data)


@mcp.tool()
async def search_google(
    query: str,
    lat: float | None = None,
    lng: float | None = None,
) -> str:
    """Search for places via Google Places autocomplete. Best for businesses and restaurants.

    Args:
        query: Search text (e.g. "best pizza near me")
        lat: Optional latitude to bias results
        lng: Optional longitude to bias results
    """
    params: dict = {"input": query}
    if lat is not None:
        params["lat"] = lat
    if lng is not None:
        params["lng"] = lng
    data = await api_get("/search/google/autocomplete", params=params)
    return _fmt(data)


@mcp.tool()
async def get_google_place_details(google_place_id: str) -> str:
    """Get full details for a Google place (address, phone, website, hours).

    Args:
        google_place_id: The Google Place ID from search results
    """
    data = await api_get(f"/search/google/details/{google_place_id}")
    return _fmt(data)


# ---------------------------------------------------------------------------
# Users & Social
# ---------------------------------------------------------------------------

@mcp.tool()
async def search_users(query: str, limit: int = 20) -> str:
    """Search for Topoi users by name or username.

    Args:
        query: Search text (min 2 chars)
        limit: Max results
    """
    data = await api_get("/users/search", params={"q": query, "limit": min(limit, 50)})
    return _fmt(data)


@mcp.tool()
async def get_user_profile(user_id: str) -> str:
    """Get a user's public profile.

    Args:
        user_id: The user's ID
    """
    data = await api_get(f"/users/{user_id}")
    return _fmt(data)


@mcp.tool()
async def follow_user(user_id: str) -> str:
    """Follow another user. Public users are followed instantly; private users get a request.

    Args:
        user_id: The user to follow
    """
    data = await api_post("/users/follow", {"user_id": user_id})
    return _fmt(data)


@mcp.tool()
async def unfollow_user(user_id: str) -> str:
    """Unfollow a user.

    Args:
        user_id: The user to unfollow
    """
    data = await api_post(f"/users/unfollow/{user_id}")
    return _fmt(data)


@mcp.tool()
async def get_my_followers(status: str = "confirmed") -> str:
    """Get your followers.

    Args:
        status: "confirmed" or "pending"
    """
    data = await api_get("/users/me/followers", params={"status": status})
    return _fmt(data)


@mcp.tool()
async def get_my_following() -> str:
    """Get users you are following."""
    data = await api_get("/users/me/following")
    return _fmt(data)


# ---------------------------------------------------------------------------
# Profile
# ---------------------------------------------------------------------------

@mcp.tool()
async def get_my_profile() -> str:
    """Get your profile info (name, username, bio, privacy, stats)."""
    data = await api_get("/auth/profile")
    return _fmt(data)


@mcp.tool()
async def update_my_profile(
    name: str = "",
    username: str = "",
    bio: str = "",
    is_public: bool | None = None,
) -> str:
    """Update your profile settings.

    Args:
        name: New display name
        username: New username (3-30 chars, alphanumeric + underscore)
        bio: New bio (max 500 chars)
        is_public: true = public, false = private
    """
    body: dict = {}
    if name:
        body["name"] = name
    if username:
        body["username"] = username
    if bio:
        body["bio"] = bio
    if is_public is not None:
        body["is_public"] = is_public
    data = await api_patch("/auth/profile", body)
    return _fmt(data)


# ---------------------------------------------------------------------------
# Notifications
# ---------------------------------------------------------------------------

@mcp.tool()
async def get_notifications(limit: int = 20) -> str:
    """Get your recent notifications.

    Args:
        limit: Max notifications (default 20)
    """
    data = await api_get("/notifications", params={"limit": limit})
    return _fmt(data)


@mcp.tool()
async def get_unread_notification_count() -> str:
    """Get your unread notification count."""
    data = await api_get("/notifications/unread-count")
    return _fmt(data)


@mcp.tool()
async def mark_notifications_read(notification_ids: str) -> str:
    """Mark notifications as read.

    Args:
        notification_ids: Comma-separated notification IDs
    """
    ids = [i.strip() for i in notification_ids.split(",")]
    data = await api_post("/notifications/mark-read", {"notification_ids": ids})
    return _fmt(data)


# ---------------------------------------------------------------------------
# Explore
# ---------------------------------------------------------------------------

@mcp.tool()
async def explore_top_users(limit: int = 5) -> str:
    """Discover top users by public place count.

    Args:
        limit: Number of users (max 20)
    """
    data = await api_get("/explore/top-users", params={"limit": min(limit, 20)})
    return _fmt(data)


@mcp.tool()
async def explore_top_places(
    lat: float | None = None,
    lng: float | None = None,
    limit: int = 10,
) -> str:
    """Discover popular places near a location (saved by multiple users).

    Args:
        lat: Latitude (defaults to Manhattan)
        lng: Longitude
        limit: Max results (max 50)
    """
    params: dict = {"limit": min(limit, 50)}
    if lat is not None:
        params["lat"] = lat
    if lng is not None:
        params["lng"] = lng
    data = await api_get("/explore/top-places", params=params)
    return _fmt(data)


# ---------------------------------------------------------------------------
# Import
# ---------------------------------------------------------------------------

@mcp.tool()
async def import_places(places: str) -> str:
    """Bulk import places. Provide a JSON array of place objects.
    Each object needs: name, address, latitude, longitude.
    Optional: notes, phone, website, hours, tag_ids (list of tag IDs), list_ids (list of list IDs).

    Args:
        places: JSON array of place objects
    """
    items = json.loads(places)
    imported = 0
    errors = []
    for i, p in enumerate(items):
        try:
            body = {
                "name": p["name"],
                "address": p["address"],
                "latitude": p["latitude"],
                "longitude": p["longitude"],
                "notes": p.get("notes", ""),
                "is_public": p.get("is_public", True),
            }
            if p.get("phone"):
                body["phone"] = p["phone"]
            if p.get("website"):
                body["website"] = p["website"]
            if p.get("hours"):
                body["hours"] = p["hours"]
            if p.get("tag_ids"):
                body["tag_ids"] = p["tag_ids"]
            if p.get("list_ids"):
                body["list_ids"] = p["list_ids"]
            await api_post("/places", body)
            imported += 1
        except Exception as e:
            errors.append(f"Row {i}: {str(e)}")
    return _fmt({"imported": imported, "errors": errors})


# ---------------------------------------------------------------------------
# Build the mountable ASGI app
# ---------------------------------------------------------------------------

def create_mcp_app():
    """Create the MCP ASGI app with auth middleware.

    Enabled if either:
    - MCP_AUTH_TOKEN + MCP_USER_EMAIL are set (legacy static token), OR
    - MCP_OAUTH_CLIENT_ID is set (OAuth 2.1 for claude.ai)
    """
    import logging
    logger = logging.getLogger(__name__)

    has_legacy = bool(settings.mcp_auth_token and settings.mcp_user_email)
    has_oauth = bool(settings.mcp_oauth_client_id)

    if not has_legacy and not has_oauth:
        logger.info("MCP server disabled (need MCP_AUTH_TOKEN+MCP_USER_EMAIL or MCP_OAUTH_CLIENT_ID)")
        return None

    mcp_app = mcp.http_app(path="/")
    authed_app = MCPAuthMiddleware(
        mcp_app,
        static_token=settings.mcp_auth_token if has_legacy else "",
    )
    logger.info(f"MCP server enabled (legacy={has_legacy}, oauth={has_oauth})")
    return authed_app, mcp_app
