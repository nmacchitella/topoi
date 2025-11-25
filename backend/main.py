from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from starlette.middleware.sessions import SessionMiddleware
from database import engine, Base, get_settings
from routers import auth_router, places, lists, tags, share, search, data_router, google_auth, telegram, admin_router, notifications, users
from admin import create_admin
import secrets

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
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
