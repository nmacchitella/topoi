# Topoi MCP Server

An MCP (Model Context Protocol) server embedded in the Topoi backend that exposes 27 tools for Claude and other MCP-compatible AI clients. Calls the backend API internally via httpx (localhost), reusing all existing validation and business logic.

## Architecture

```
Claude ←→ MCP Server (/mcp endpoint, Bearer token auth)
              ↑
         httpx (localhost) ──→ Topoi REST API ──→ Database
```

The MCP server is mounted inside the FastAPI backend at `/mcp`. It authenticates via a static bearer token (`MCP_AUTH_TOKEN` env var) and acts on behalf of a configured user (`MCP_USER_EMAIL`). Internally, it calls the backend's own REST API via httpx on localhost — no direct DB access.

## Setup

### 1. Set Environment Variables

On Fly.io (or in `.env` for local dev):

```bash
# A random token that MCP clients must provide
fly secrets set MCP_AUTH_TOKEN="your-random-secret-token"

# The email of the user the MCP acts on behalf of
fly secrets set MCP_USER_EMAIL="your-email@example.com"
```

If these are not set, the MCP server is gracefully disabled.

### 2. Connect to Claude

#### Claude Code (CLI)

```bash
claude mcp add --transport http topoi https://topoi-backend.fly.dev/mcp \
  --header "Authorization: Bearer your-random-secret-token"
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
        "Authorization": "Bearer your-random-secret-token"
      }
    }
  }
}
```

#### Local development

```bash
claude mcp add --transport http topoi http://localhost:8000/mcp \
  --header "Authorization: Bearer your-random-secret-token"
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
| `import_places` | Bulk import places (JSON array) |

## Authentication Flow

1. Every request to `/mcp` must include `Authorization: Bearer <MCP_AUTH_TOKEN>` header
2. The ASGI middleware compares the token against the `MCP_AUTH_TOKEN` env var
3. If valid, the request proceeds; tools call the API using a long-lived JWT for `MCP_USER_EMAIL`
4. If invalid or missing, returns `401`

## Technical Details

- **SDK**: `fastmcp` v2+
- **Transport**: Streamable HTTP
- **API access**: httpx calls to localhost REST API (reuses all validation)
- **Auth**: Bearer token via `MCP_AUTH_TOKEN` env var
- **User identity**: Long-lived JWT generated for `MCP_USER_EMAIL`
- **Conditional**: Server disabled if env vars not set
- **Endpoint**: Mounted at `/mcp` on the main FastAPI app

## File

All MCP logic lives in a single file:

```
backend/mcp_server.py    # FastMCP app, auth middleware, 27 tool definitions
```

Mounted in `backend/main.py` via:

```python
from mcp_server import create_mcp_app
_mcp_result = create_mcp_app()
if _mcp_result:
    app.mount("/mcp", _mcp_result[0])
```
