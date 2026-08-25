# Topoi Backend

FastAPI backend for the Topoi personal map application.

## Quick Start

```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env      # Edit with your credentials
uvicorn main:app --reload --port 8000
```

**Access:**
- API: http://localhost:8000
- Docs: http://localhost:8000/docs
- Admin: http://localhost:8000/admin

## Project Structure

```
backend/
├── main.py              # FastAPI app entry point
├── database.py          # SQLAlchemy engine & session
├── models.py            # Database models
├── schemas.py           # Pydantic schemas
├── auth.py              # JWT authentication
├── admin.py             # SQLAdmin configuration
├── routers/             # API endpoints
├── services/            # Email service
├── requirements.txt     # Python dependencies
├── Dockerfile           # Production container
└── fly.toml             # Fly.io config
```

Runtime configuration is documented in [`.env.example`](.env.example). Interactive
API documentation is available at `/docs` whenever the backend is running.
