"""Async HTTP client for the Topoi backend API."""

import json
from typing import Any, Optional

import httpx


class TopoiAPIError(Exception):
    def __init__(self, status_code: int, detail: str):
        self.status_code = status_code
        self.detail = detail
        super().__init__(f"API error {status_code}: {detail}")


class TopoiClient:
    """Wraps the Topoi REST API with async methods."""

    def __init__(self, base_url: str, api_key: str):
        self.base_url = base_url.rstrip("/")
        self._client = httpx.AsyncClient(
            base_url=self.base_url,
            headers={"X-API-Key": api_key},
            timeout=30.0,
        )

    async def close(self):
        await self._client.aclose()

    # ── helpers ──────────────────────────────────────────────

    async def _request(
        self,
        method: str,
        path: str,
        *,
        params: dict | None = None,
        json_body: dict | None = None,
    ) -> Any:
        resp = await self._client.request(method, path, params=params, json=json_body)
        if resp.status_code >= 400:
            try:
                detail = resp.json().get("detail", resp.text)
            except Exception:
                detail = resp.text
            raise TopoiAPIError(resp.status_code, str(detail))
        if resp.status_code == 204:
            return None
        return resp.json()

    async def _get(self, path: str, **params) -> Any:
        clean = {k: v for k, v in params.items() if v is not None}
        return await self._request("GET", path, params=clean)

    async def _post(self, path: str, body: dict | None = None) -> Any:
        return await self._request("POST", path, json_body=body)

    async def _put(self, path: str, body: dict | None = None) -> Any:
        return await self._request("PUT", path, json_body=body)

    async def _patch(self, path: str, body: dict | None = None) -> Any:
        return await self._request("PATCH", path, json_body=body)

    async def _delete(self, path: str) -> Any:
        return await self._request("DELETE", path)

    # ── Places ───────────────────────────────────────────────

    async def list_places(self) -> list[dict]:
        return await self._get("/api/places")

    async def get_place(self, place_id: str) -> dict:
        return await self._get(f"/api/places/{place_id}")

    async def create_place(self, data: dict) -> dict:
        return await self._post("/api/places", data)

    async def update_place(self, place_id: str, data: dict) -> dict:
        return await self._put(f"/api/places/{place_id}", data)

    async def delete_place(self, place_id: str) -> None:
        await self._delete(f"/api/places/{place_id}")

    # ── Lists ────────────────────────────────────────────────

    async def list_lists(self) -> list[dict]:
        return await self._get("/api/lists")

    async def create_list(self, data: dict) -> dict:
        return await self._post("/api/lists", data)

    async def get_list_places(self, list_id: str) -> list[dict]:
        return await self._get(f"/api/lists/{list_id}/places")

    async def update_list(self, list_id: str, data: dict) -> dict:
        return await self._put(f"/api/lists/{list_id}", data)

    async def delete_list(self, list_id: str) -> None:
        await self._delete(f"/api/lists/{list_id}")

    # ── Tags ─────────────────────────────────────────────────

    async def list_tags(self) -> list[dict]:
        return await self._get("/api/tags")

    async def create_tag(self, data: dict) -> dict:
        return await self._post("/api/tags", data)

    async def update_tag(self, tag_id: str, data: dict) -> dict:
        return await self._put(f"/api/tags/{tag_id}", data)

    async def delete_tag(self, tag_id: str) -> None:
        await self._delete(f"/api/tags/{tag_id}")

    async def get_tag_places(self, tag_id: str) -> list[dict]:
        return await self._get(f"/api/tags/{tag_id}/places")

    # ── Search ───────────────────────────────────────────────

    async def search_nominatim(self, query: str, limit: int = 5) -> Any:
        return await self._get("/api/search/nominatim", q=query, limit=limit)

    async def search_google_autocomplete(
        self, query: str, lat: float | None = None, lng: float | None = None
    ) -> Any:
        return await self._get("/api/search/google/autocomplete", q=query, lat=lat, lng=lng)

    async def get_google_place_details(self, place_id: str) -> dict:
        return await self._get(f"/api/search/google/details/{place_id}")

    # ── Users & Follows ──────────────────────────────────────

    async def search_users(self, query: str, limit: int = 20) -> list[dict]:
        return await self._get("/api/users/search", q=query, limit=limit)

    async def get_user_profile(self, user_id: str) -> dict:
        return await self._get(f"/api/users/{user_id}")

    async def follow_user(self, user_id: str) -> dict:
        return await self._post("/api/users/follow", {"user_id": user_id})

    async def unfollow_user(self, user_id: str) -> dict:
        return await self._post(f"/api/users/unfollow/{user_id}")

    async def get_my_followers(self, status: str = "confirmed") -> list[dict]:
        return await self._get("/api/users/me/followers", status=status)

    async def get_my_following(self) -> list[dict]:
        return await self._get("/api/users/me/following")

    # ── Profile ──────────────────────────────────────────────

    async def get_my_profile(self) -> dict:
        return await self._get("/api/auth/profile")

    async def update_my_profile(self, data: dict) -> dict:
        return await self._patch("/api/auth/profile", data)

    # ── Notifications ────────────────────────────────────────

    async def get_notifications(self, skip: int = 0, limit: int = 50) -> list[dict]:
        return await self._get("/api/notifications", skip=skip, limit=limit)

    async def get_unread_count(self) -> dict:
        return await self._get("/api/notifications/unread-count")

    async def mark_notifications_read(self, notification_ids: list[str]) -> dict:
        return await self._post("/api/notifications/mark-read", {"notification_ids": notification_ids})

    # ── Explore ──────────────────────────────────────────────

    async def get_top_users(self, limit: int = 5) -> list[dict]:
        return await self._get("/api/explore/top-users", limit=limit)

    async def get_top_places(
        self, lat: float | None = None, lng: float | None = None, limit: int = 10
    ) -> list[dict]:
        return await self._get("/api/explore/top-places", lat=lat, lng=lng, limit=limit)

    # ── Share ────────────────────────────────────────────────

    async def get_user_public_map(self, user_id: str) -> list[dict]:
        return await self._get(f"/api/share/map/{user_id}")

    async def get_shared_map_by_token(self, token: str) -> dict:
        return await self._get(f"/api/share/{token}")

    # ── Import ───────────────────────────────────────────────

    async def import_confirm(self, places: list[dict]) -> dict:
        return await self._post("/api/data/import/confirm", {"places": places})
