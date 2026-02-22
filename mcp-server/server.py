"""Topoi MCP Server — exposes Topoi API as MCP tools for Claude."""

import json
import os
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from dataclasses import dataclass
from typing import Optional

from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from mcp.server.fastmcp import Context, FastMCP
from mcp.server.session import ServerSession

from api_client import TopoiClient, TopoiAPIError

# ── Lifespan ─────────────────────────────────────────────────


@dataclass
class AppContext:
    client: TopoiClient


@asynccontextmanager
async def app_lifespan(server: FastMCP) -> AsyncIterator[AppContext]:
    base_url = os.environ["TOPOI_API_URL"]
    api_key = os.environ["TOPOI_API_KEY"]
    client = TopoiClient(base_url, api_key)
    try:
        yield AppContext(client=client)
    finally:
        await client.close()


# ── MCP Server ───────────────────────────────────────────────

mcp = FastMCP(
    "topoi",
    stateless_http=True,
    json_response=True,
    lifespan=app_lifespan,
)


def _client(ctx: Context[ServerSession, AppContext]) -> TopoiClient:
    return ctx.request_context.lifespan_context.client


def _fmt(data) -> str:
    """Format API response as readable JSON."""
    return json.dumps(data, indent=2, default=str)


# ── Places ───────────────────────────────────────────────────


@mcp.tool()
async def list_places(ctx: Context[ServerSession, AppContext]) -> str:
    """List all places on your map. Returns name, address, coordinates, tags, and lists for each place."""
    data = await _client(ctx).list_places()
    return _fmt(data)


@mcp.tool()
async def get_place(
    place_id: str,
    ctx: Context[ServerSession, AppContext],
) -> str:
    """Get details of a specific place by its ID.

    Args:
        place_id: The unique ID of the place
    """
    data = await _client(ctx).get_place(place_id)
    return _fmt(data)


@mcp.tool()
async def create_place(
    name: str,
    address: str,
    latitude: float,
    longitude: float,
    ctx: Context[ServerSession, AppContext],
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
        latitude: Latitude coordinate (-90 to 90)
        longitude: Longitude coordinate (-180 to 180)
        notes: Optional notes about the place
        phone: Optional phone number
        website: Optional website URL
        hours: Optional opening hours
        is_public: Whether the place is visible to others (default true)
        list_ids: Optional list of list IDs to add the place to
        tag_ids: Optional list of tag IDs to attach
    """
    body = {
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
        body["list_ids"] = list_ids
    if tag_ids:
        body["tag_ids"] = tag_ids
    data = await _client(ctx).create_place(body)
    return _fmt(data)


@mcp.tool()
async def update_place(
    place_id: str,
    ctx: Context[ServerSession, AppContext],
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
        place_id: The ID of the place to update
        name: New name
        address: New address
        latitude: New latitude
        longitude: New longitude
        notes: New notes
        phone: New phone number
        website: New website
        hours: New opening hours
        is_public: New visibility setting
        list_ids: Replace list assignments
        tag_ids: Replace tag assignments
    """
    body = {}
    for field in ["name", "address", "latitude", "longitude", "notes", "phone", "website", "hours", "is_public", "list_ids", "tag_ids"]:
        val = locals()[field]
        if val is not None:
            body[field] = val
    data = await _client(ctx).update_place(place_id, body)
    return _fmt(data)


@mcp.tool()
async def delete_place(
    place_id: str,
    ctx: Context[ServerSession, AppContext],
) -> str:
    """Delete a place from your map.

    Args:
        place_id: The ID of the place to delete
    """
    await _client(ctx).delete_place(place_id)
    return "Place deleted successfully."


# ── Lists ────────────────────────────────────────────────────


@mcp.tool()
async def list_lists(ctx: Context[ServerSession, AppContext]) -> str:
    """List all your place lists with place counts."""
    data = await _client(ctx).list_lists()
    return _fmt(data)


@mcp.tool()
async def create_list(
    name: str,
    ctx: Context[ServerSession, AppContext],
    color: str = "#3B82F6",
    icon: Optional[str] = None,
    is_public: bool = True,
) -> str:
    """Create a new list to organize places.

    Args:
        name: List name (e.g. "Best Coffee Shops")
        color: Hex color code (default blue #3B82F6)
        icon: Optional emoji or icon
        is_public: Whether the list is visible to others
    """
    body = {"name": name, "color": color, "is_public": is_public}
    if icon:
        body["icon"] = icon
    data = await _client(ctx).create_list(body)
    return _fmt(data)


@mcp.tool()
async def get_list_places(
    list_id: str,
    ctx: Context[ServerSession, AppContext],
) -> str:
    """Get all places in a specific list.

    Args:
        list_id: The ID of the list
    """
    data = await _client(ctx).get_list_places(list_id)
    return _fmt(data)


@mcp.tool()
async def update_list(
    list_id: str,
    ctx: Context[ServerSession, AppContext],
    name: Optional[str] = None,
    color: Optional[str] = None,
    icon: Optional[str] = None,
    is_public: Optional[bool] = None,
) -> str:
    """Update a list's properties.

    Args:
        list_id: The ID of the list to update
        name: New name
        color: New hex color
        icon: New emoji/icon
        is_public: New visibility
    """
    body = {}
    for field in ["name", "color", "icon", "is_public"]:
        val = locals()[field]
        if val is not None:
            body[field] = val
    data = await _client(ctx).update_list(list_id, body)
    return _fmt(data)


@mcp.tool()
async def delete_list(
    list_id: str,
    ctx: Context[ServerSession, AppContext],
) -> str:
    """Delete a list (places in it are NOT deleted).

    Args:
        list_id: The ID of the list to delete
    """
    await _client(ctx).delete_list(list_id)
    return "List deleted successfully."


# ── Tags ─────────────────────────────────────────────────────


@mcp.tool()
async def list_tags(ctx: Context[ServerSession, AppContext]) -> str:
    """List all your tags with usage counts."""
    data = await _client(ctx).list_tags()
    return _fmt(data)


@mcp.tool()
async def create_tag(
    name: str,
    ctx: Context[ServerSession, AppContext],
    color: str = "#3B82F6",
    icon: Optional[str] = None,
) -> str:
    """Create a new tag for categorizing places.

    Args:
        name: Tag name (e.g. "Italian", "Date Night")
        color: Hex color code
        icon: Optional emoji
    """
    body = {"name": name, "color": color}
    if icon:
        body["icon"] = icon
    data = await _client(ctx).create_tag(body)
    return _fmt(data)


@mcp.tool()
async def update_tag(
    tag_id: str,
    ctx: Context[ServerSession, AppContext],
    name: Optional[str] = None,
    color: Optional[str] = None,
    icon: Optional[str] = None,
) -> str:
    """Update a tag.

    Args:
        tag_id: The ID of the tag
        name: New name
        color: New hex color
        icon: New emoji
    """
    body = {}
    for field in ["name", "color", "icon"]:
        val = locals()[field]
        if val is not None:
            body[field] = val
    data = await _client(ctx).update_tag(tag_id, body)
    return _fmt(data)


@mcp.tool()
async def delete_tag(
    tag_id: str,
    ctx: Context[ServerSession, AppContext],
) -> str:
    """Delete a tag (removes it from all places).

    Args:
        tag_id: The ID of the tag to delete
    """
    await _client(ctx).delete_tag(tag_id)
    return "Tag deleted successfully."


@mcp.tool()
async def get_tag_places(
    tag_id: str,
    ctx: Context[ServerSession, AppContext],
) -> str:
    """Get all places with a specific tag.

    Args:
        tag_id: The ID of the tag
    """
    data = await _client(ctx).get_tag_places(tag_id)
    return _fmt(data)


# ── Search ───────────────────────────────────────────────────


@mcp.tool()
async def search_nominatim(
    query: str,
    ctx: Context[ServerSession, AppContext],
    limit: int = 5,
) -> str:
    """Search for places using OpenStreetMap/Nominatim. Good for finding addresses and locations worldwide.

    Args:
        query: Search text (e.g. "Eiffel Tower" or "123 Main St, NYC")
        limit: Max results (1-10, default 5)
    """
    data = await _client(ctx).search_nominatim(query, limit)
    return _fmt(data)


@mcp.tool()
async def search_google(
    query: str,
    ctx: Context[ServerSession, AppContext],
    lat: Optional[float] = None,
    lng: Optional[float] = None,
) -> str:
    """Search for places using Google Places autocomplete. Best for businesses, restaurants, shops.

    Args:
        query: Search text (e.g. "best pizza near me")
        lat: Optional latitude to bias results
        lng: Optional longitude to bias results
    """
    data = await _client(ctx).search_google_autocomplete(query, lat, lng)
    return _fmt(data)


@mcp.tool()
async def get_google_place_details(
    google_place_id: str,
    ctx: Context[ServerSession, AppContext],
) -> str:
    """Get full details for a Google place (address, phone, website, hours).

    Args:
        google_place_id: The Google Place ID from search results
    """
    data = await _client(ctx).get_google_place_details(google_place_id)
    return _fmt(data)


# ── Users & Social ───────────────────────────────────────────


@mcp.tool()
async def search_users(
    query: str,
    ctx: Context[ServerSession, AppContext],
    limit: int = 20,
) -> str:
    """Search for other Topoi users by name or username.

    Args:
        query: Search text (min 2 characters)
        limit: Max results (default 20)
    """
    data = await _client(ctx).search_users(query, limit)
    return _fmt(data)


@mcp.tool()
async def get_user_profile(
    user_id: str,
    ctx: Context[ServerSession, AppContext],
) -> str:
    """Get a user's public profile including follower counts and place count.

    Args:
        user_id: The user's ID
    """
    data = await _client(ctx).get_user_profile(user_id)
    return _fmt(data)


@mcp.tool()
async def follow_user(
    user_id: str,
    ctx: Context[ServerSession, AppContext],
) -> str:
    """Follow another user. Public users are followed instantly; private users receive a follow request.

    Args:
        user_id: The ID of the user to follow
    """
    data = await _client(ctx).follow_user(user_id)
    return _fmt(data)


@mcp.tool()
async def unfollow_user(
    user_id: str,
    ctx: Context[ServerSession, AppContext],
) -> str:
    """Unfollow a user.

    Args:
        user_id: The ID of the user to unfollow
    """
    data = await _client(ctx).unfollow_user(user_id)
    return _fmt(data)


@mcp.tool()
async def get_my_followers(
    ctx: Context[ServerSession, AppContext],
    status: str = "confirmed",
) -> str:
    """Get your followers list.

    Args:
        status: Filter by status — "confirmed" or "pending" (default confirmed)
    """
    data = await _client(ctx).get_my_followers(status)
    return _fmt(data)


@mcp.tool()
async def get_my_following(ctx: Context[ServerSession, AppContext]) -> str:
    """Get the list of users you are following."""
    data = await _client(ctx).get_my_following()
    return _fmt(data)


# ── Profile ──────────────────────────────────────────────────


@mcp.tool()
async def get_my_profile(ctx: Context[ServerSession, AppContext]) -> str:
    """Get your own profile information including username, bio, and privacy settings."""
    data = await _client(ctx).get_my_profile()
    return _fmt(data)


@mcp.tool()
async def update_my_profile(
    ctx: Context[ServerSession, AppContext],
    name: Optional[str] = None,
    username: Optional[str] = None,
    bio: Optional[str] = None,
    is_public: Optional[bool] = None,
) -> str:
    """Update your profile settings.

    Args:
        name: New display name
        username: New username (3-30 chars, alphanumeric + underscore)
        bio: New bio text (max 500 chars)
        is_public: Set profile visibility (true = public, false = private)
    """
    body = {}
    for field in ["name", "username", "bio", "is_public"]:
        val = locals()[field]
        if val is not None:
            body[field] = val
    data = await _client(ctx).update_my_profile(body)
    return _fmt(data)


# ── Notifications ────────────────────────────────────────────


@mcp.tool()
async def get_notifications(
    ctx: Context[ServerSession, AppContext],
    limit: int = 20,
) -> str:
    """Get your recent notifications (follow requests, new followers, etc.).

    Args:
        limit: Max notifications to return (default 20)
    """
    data = await _client(ctx).get_notifications(limit=limit)
    return _fmt(data)


@mcp.tool()
async def get_unread_notification_count(ctx: Context[ServerSession, AppContext]) -> str:
    """Get the number of unread notifications."""
    data = await _client(ctx).get_unread_count()
    return _fmt(data)


@mcp.tool()
async def mark_notifications_read(
    notification_ids: list[str],
    ctx: Context[ServerSession, AppContext],
) -> str:
    """Mark specific notifications as read.

    Args:
        notification_ids: List of notification IDs to mark as read
    """
    data = await _client(ctx).mark_notifications_read(notification_ids)
    return _fmt(data)


# ── Explore ──────────────────────────────────────────────────


@mcp.tool()
async def explore_top_users(
    ctx: Context[ServerSession, AppContext],
    limit: int = 5,
) -> str:
    """Discover top Topoi users ranked by number of public places.

    Args:
        limit: Number of users to return (default 5, max 20)
    """
    data = await _client(ctx).get_top_users(limit)
    return _fmt(data)


@mcp.tool()
async def explore_top_places(
    ctx: Context[ServerSession, AppContext],
    lat: Optional[float] = None,
    lng: Optional[float] = None,
    limit: int = 10,
) -> str:
    """Discover popular places near a location (places saved by multiple users).

    Args:
        lat: Latitude (defaults to Manhattan if not provided)
        lng: Longitude
        limit: Max results (default 10, max 50)
    """
    data = await _client(ctx).get_top_places(lat, lng, limit)
    return _fmt(data)


# ── Import ───────────────────────────────────────────────────


@mcp.tool()
async def import_places(
    places: list[dict],
    ctx: Context[ServerSession, AppContext],
) -> str:
    """Import multiple places at once. Each place needs at minimum: name, address, latitude, longitude.

    Args:
        places: List of place objects, each with keys: name, address, latitude, longitude, and optionally: notes, phone, website, hours, tags (list of tag names)
    """
    data = await _client(ctx).import_confirm(places)
    return _fmt(data)


# ── FastAPI wrapper ──────────────────────────────────────────

app = FastAPI(title="Topoi MCP Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["Mcp-Session-Id"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}


# Mount MCP at /mcp
app.mount("/mcp", mcp.asgi)
