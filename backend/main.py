import logging
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from database import engine, Base, get_settings
from routers import auth_router, places, lists, tags, share, search, data_router, google_auth, telegram, admin_router, notifications, users, explore_router
from admin import create_admin

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

limiter = Limiter(key_func=get_remote_address)

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Topoi API",
    description="A personal map application for saving and organizing places",
    version="1.0.0",
    # Trust proxy headers from Fly.io for proper HTTPS URL generation
    root_path="",
    servers=[
        {"url": "https://topoi-backend.fly.dev", "description": "Production"},
        {"url": "http://localhost:8000", "description": "Development"}
    ]
)

# Attach rate limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Add session middleware (required for SQLAdmin authentication)
settings = get_settings()
app.add_middleware(
    SessionMiddleware,
    secret_key=settings.secret_key,
    session_cookie="admin_session",
    max_age=3600,  # 1 hour
    same_site="lax",
    https_only=True  # Production uses HTTPS (Fly.io)
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Next.js development
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "https://topoi-frontend.fly.dev",  # Production frontend
        "https://topoi-frontend-dev.fly.dev",  # Dev frontend
    ],
    # Allow any local network IP (192.168.x.x) for mobile testing
    allow_origin_regex=r"^http://192\.168\.\d{1,3}\.\d{1,3}:3000$",
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)


# Request body size limit middleware (10MB)
MAX_BODY_SIZE = 10 * 1024 * 1024

@app.middleware("http")
async def limit_request_body(request: Request, call_next):
    content_length = request.headers.get("content-length")
    if content_length and int(content_length) > MAX_BODY_SIZE:
        return Response(status_code=413, content="Request body too large")
    return await call_next(request)

# Include routers
app.include_router(auth_router.router, prefix="/api")
app.include_router(google_auth.router, prefix="/api")
app.include_router(places.router, prefix="/api")
app.include_router(lists.router, prefix="/api")
app.include_router(tags.router, prefix="/api")
app.include_router(share.router, prefix="/api")
app.include_router(search.router, prefix="/api")
app.include_router(data_router.router, prefix="/api")
app.include_router(telegram.router, prefix="/api")
app.include_router(admin_router.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")  # Phase 2
app.include_router(users.router, prefix="/api")  # Phase 4
app.include_router(explore_router.router, prefix="/api")  # Explore recommendations

# Mount MCP server at /mcp (authenticated via X-API-Key)
from mcp_server import get_mcp_app
app.mount("/mcp", get_mcp_app())

# Mount static files (for admin favicon/logo)
app.mount("/static", StaticFiles(directory="static"), name="static")

# Mount admin panel
admin = create_admin(app)


@app.get("/")
def root():
    return {
        "message": "Topoi API",
        "docs": "/docs",
        "version": "1.0.0"
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    is_dev = settings.environment == "development"
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=is_dev)
