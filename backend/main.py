from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers import auth_router, places, lists, tags, share, search, data_router, google_auth, telegram

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Topoi API",
    description="A personal map application for saving and organizing places",
    version="1.0.0"
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
