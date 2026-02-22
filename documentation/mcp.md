# Topoi MCP Server

An MCP (Model Context Protocol) server embedded in the Topoi backend that exposes 27 tools for Claude and other MCP-compatible AI clients. Direct database access — no HTTP hop.

## Architecture

```
Claude ←→ Topoi Backend (/mcp endpoint)
              ↑
         X-API-Key header ──→ api_keys table ──→ user context
```

The MCP server is mounted directly inside the FastAPI backend at `/mcp`. It uses the API key system to authenticate requests and then queries the database directly (same SQLAlchemy models, same process). No separate service needed.

## Setup

### 1. Generate an API Key

```bash
curl -X POST https://topoi-backend.fly.dev/api/auth/api-keys \
  -H "Authorization: Bearer <your-jwt>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Claude MCP"}'
```

Save the returned `key` value — it is only shown once.

### 2. Connect to Claude

#### Claude Code (CLI)

```bash
claude mcp add --transport http topoi https://topoi-backend.fly.dev/mcp \
  --header "X-API-Key: topoi_xxxxxxxx..."
```

#### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "topoi": {
      "transport": "http",
      "url": "https://topoi-backend.fly.dev/mcp",
      "headers": {
        "X-API-Key": "topoi_xxxxxxxx..."
      }
    }
  }
}
```

#### Local development

```bash
claude mcp add --transport http topoi http://localhost:8000/mcp \
  --header "X-API-Key: topoi_xxxxxxxx..."
```

## Available Tools (27)

### Places

| Tool | Description |
|------|-------------|
| `list_places` | List all places on your map |
| `get_place` | Get a specific place by ID |
| `create_place` | Create a new place (name, address, coordinates, tags, lists) |
| `update_place` | Update any place fields |
| `delete_place` | Delete a place |

### Lists

| Tool | Description |
|------|-------------|
| `list_lists` | Get all lists with place counts |
| `create_list` | Create a new list (name, color, icon) |
| `get_list_places` | Get all places in a list |
| `update_list` | Update list properties |
| `delete_list` | Delete a list (places are kept) |

### Tags

| Tool | Description |
|------|-------------|
| `list_tags` | Get all tags with usage counts |
| `create_tag` | Create a new tag (name, color, icon) |
| `update_tag` | Update tag properties |
| `delete_tag` | Delete a tag (removed from all places) |
| `get_tag_places` | Get all places with a specific tag |

### Search

| Tool | Description |
|------|-------------|
| `search_nominatim` | Search via OpenStreetMap (addresses, landmarks) |
| `search_google` | Google Places autocomplete (businesses, restaurants) |
| `get_google_place_details` | Get full details for a Google place ID |

### Users & Social

| Tool | Description |
|------|-------------|
| `search_users` | Search users by name or username |
| `get_user_profile` | View a user's public profile |
| `follow_user` | Follow a user (instant or pending) |
| `unfollow_user` | Unfollow a user |
| `get_my_followers` | List your followers (confirmed or pending) |
| `get_my_following` | List users you follow |

### Profile

| Tool | Description |
|------|-------------|
| `get_my_profile` | Get your profile info |
| `update_my_profile` | Update name, username, bio, privacy |

### Notifications

| Tool | Description |
|------|-------------|
| `get_notifications` | Get recent notifications |
| `get_unread_notification_count` | Get unread count |
| `mark_notifications_read` | Mark notifications as read |

### Explore

| Tool | Description |
|------|-------------|
| `explore_top_users` | Discover top users by place count |
| `explore_top_places` | Find popular places near a location |

### Import

| Tool | Description |
|------|-------------|
| `import_places` | Bulk import places (name, address, lat, lng, tags) |

## API Key Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/api-keys` | POST | Create a new key (returns raw key once) |
| `/api/auth/api-keys` | GET | List all your keys (prefix only) |
| `/api/auth/api-keys/{id}` | DELETE | Revoke a key |

Keys are prefixed with `topoi_` and hashed (SHA-256) before storage. Each user can have up to 10 active keys. The `last_used_at` timestamp is updated on every MCP request.

## Authentication Flow

1. Every request to `/mcp` must include `X-API-Key` header
2. The ASGI middleware hashes the key and looks it up in the `api_keys` table
3. If valid, the associated user is set as the context for all tool calls
4. If invalid or missing, returns `401`

## Technical Details

- **SDK**: `mcp` Python package v1.25+ (pinned below v2)
- **Transport**: Streamable HTTP (MCP spec 2025-03-26)
- **Server mode**: Stateless (`stateless_http=True`)
- **Response format**: JSON (`json_response=True`)
- **DB access**: Direct SQLAlchemy (same models as the REST API)
- **Auth**: ASGI middleware + `contextvars` for per-request user context
- **Endpoint**: Mounted at `/mcp` on the main FastAPI app

## File

All MCP logic lives in a single file:

```
backend/mcp_server.py    # FastMCP app, auth middleware, 27 tool definitions
```

Mounted in `backend/main.py` via:

```python
from mcp_server import get_mcp_app
app.mount("/mcp", get_mcp_app())
```
