# Topoi MCP Server

An MCP (Model Context Protocol) server that exposes the Topoi API as tools for Claude and other MCP-compatible AI clients.

## Architecture

```
Claude ←→ MCP Server (streamable-http) ←→ Topoi Backend API
              ↑                                    ↑
         TOPOI_API_KEY                       X-API-Key header
```

The MCP server is a standalone Python service that proxies requests to the Topoi backend using an API key for authentication. It uses the official Python MCP SDK with streamable HTTP transport.

## Prerequisites

- Python 3.12+
- A Topoi account with a valid API key
- Access to the Topoi backend (local or production)

## Setup

### 1. Generate an API Key

Log in to Topoi and create an API key:

```bash
curl -X POST https://topoi-backend.fly.dev/api/auth/api-keys \
  -H "Authorization: Bearer <your-jwt>" \
  -H "Content-Type: application/json" \
  -d '{"name": "MCP Server"}'
```

Save the returned `key` value — it is only shown once.

### 2. Install Dependencies

```bash
cd mcp-server
pip install -r requirements.txt
```

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env with your values:
#   TOPOI_API_URL=https://topoi-backend.fly.dev
#   TOPOI_API_KEY=topoi_xxxxxxxx...
```

### 4. Run the Server

```bash
cd mcp-server
uvicorn server:app --host 0.0.0.0 --port 8080
```

The MCP endpoint will be available at `http://localhost:8080/mcp` and a health check at `http://localhost:8080/health`.

## Connecting to Claude

### Claude Code (CLI)

```bash
claude mcp add --transport http topoi http://localhost:8080/mcp
```

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "topoi": {
      "transport": "http",
      "url": "http://localhost:8080/mcp"
    }
  }
}
```

### Remote (production deployment)

```bash
claude mcp add --transport http topoi https://your-mcp-server.fly.dev/mcp
```

## Available Tools

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

## Production Deployment

### Docker

```bash
cd mcp-server
docker build -t topoi-mcp .
docker run -p 8080:8080 \
  -e TOPOI_API_URL=https://topoi-backend.fly.dev \
  -e TOPOI_API_KEY=topoi_xxx \
  topoi-mcp
```

### Fly.io

```bash
cd mcp-server
fly launch --name topoi-mcp
fly secrets set TOPOI_API_URL=https://topoi-backend.fly.dev TOPOI_API_KEY=topoi_xxx
fly deploy
```

## API Key Management

API keys are managed through the Topoi backend:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/api-keys` | POST | Create a new key (returns raw key once) |
| `/api/auth/api-keys` | GET | List all your keys (prefix only) |
| `/api/auth/api-keys/{id}` | DELETE | Revoke a key |

Keys are prefixed with `topoi_` and hashed (SHA-256) before storage. Each user can have up to 10 active keys. The `last_used_at` timestamp is updated on every authenticated request.

## Technical Details

- **SDK**: `mcp` Python package v1.25+ (pinned below v2)
- **Transport**: Streamable HTTP (MCP spec 2025-03-26)
- **Server mode**: Stateless (`stateless_http=True`) for horizontal scaling
- **Response format**: JSON (`json_response=True`)
- **HTTP client**: `httpx` async
- **ASGI**: FastAPI + uvicorn, MCP mounted at `/mcp`

## Files

```
mcp-server/
├── server.py          # FastMCP app, tool definitions, FastAPI wrapper
├── api_client.py      # Async HTTP client for Topoi API
├── requirements.txt   # Python dependencies
├── Dockerfile         # Production container
└── .env.example       # Environment variable template
```
