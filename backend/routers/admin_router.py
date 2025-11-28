from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from database import get_db
import schemas
import auth
import models
import csv
import io
from typing import Literal

router = APIRouter(prefix="/admin", tags=["admin"])

# Seed account configurations
SEED_ACCOUNT_CONFIGS = {
    "michelin": {
        "email": "michelin@topoi.app",
        "name": "Michelin Guide",
        "username": "michelin_guide",
        "bio": "Official Michelin Guide selections",
    },
    "james_beard": {
        "email": "jamesbeard@topoi.app",
        "name": "James Beard Awards",
        "username": "james_beard_awards",
        "bio": "James Beard Award winners and nominees",
    },
}

# Tag colors and icons for Michelin
TAG_COLORS = {
    # Awards
    "3 Stars": "#FFD700",
    "2 Stars": "#C0C0C0",
    "1 Star": "#CD7F32",
    "Bib Gourmand": "#E74C3C",
    "Selected Restaurants": "#3498DB",
    "Green Star": "#27AE60",
    # Cuisines - varied palette
    "French": "#8B5CF6",
    "Italian": "#10B981",
    "Japanese": "#F59E0B",
    "Chinese": "#EF4444",
    "Korean": "#EC4899",
    "Thai": "#14B8A6",
    "Indian": "#F97316",
    "Spanish": "#DC2626",
    "Mediterranean": "#0EA5E9",
    "American": "#6366F1",
    "Mexican": "#84CC16",
    "Vietnamese": "#22D3EE",
    "Seafood": "#0284C7",
    "Steakhouse": "#B91C1C",
    "Contemporary": "#7C3AED",
    "Creative": "#A855F7",
    "Modern Cuisine": "#8B5CF6",
    "Classic Cuisine": "#6366F1",
    "Traditional Cuisine": "#059669",
}

TAG_ICONS = {
    "3 Stars": "⭐⭐⭐",
    "2 Stars": "⭐⭐",
    "1 Star": "⭐",
    "Bib Gourmand": "🍽️",
    "Green Star": "🌿",
}

# Color palette for unrecognized cuisines
CUISINE_COLORS = [
    "#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#EC4899",
    "#14B8A6", "#F97316", "#0EA5E9", "#6366F1", "#84CC16",
    "#22D3EE", "#A855F7", "#059669", "#7C3AED", "#0284C7",
]
DEFAULT_TAG_COLOR = "#6B7280"


def get_current_admin_user(current_user: schemas.User = Depends(auth.get_current_user)):
    """Dependency to ensure the current user is an admin"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user


@router.post("/promote-user/{user_id}")
def promote_user_to_admin(
    user_id: str,
    current_user: schemas.User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Promote a user to admin (requires admin privileges)"""
    target_user = db.query(models.User).filter(models.User.id == user_id).first()

    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    if target_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already an admin"
        )

    target_user.is_admin = True
    db.commit()
    db.refresh(target_user)

    return {
        "message": f"User {target_user.email} has been promoted to admin",
        "user": target_user
    }


@router.post("/demote-user/{user_id}")
def demote_user_from_admin(
    user_id: str,
    current_user: schemas.User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Demote a user from admin (requires admin privileges)"""
    # Prevent self-demotion
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot demote yourself"
        )

    target_user = db.query(models.User).filter(models.User.id == user_id).first()

    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    if not target_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not an admin"
        )

    target_user.is_admin = False
    db.commit()
    db.refresh(target_user)

    return {
        "message": f"User {target_user.email} has been demoted from admin",
        "user": target_user
    }


@router.get("/users", response_model=list[schemas.User])
def list_all_users(
    skip: int = 0,
    limit: int = 100,
    current_user: schemas.User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """List all users (requires admin privileges)"""
    users = db.query(models.User).offset(skip).limit(limit).all()
    return users


def parse_michelin_csv(content: str) -> list[dict]:
    """Parse Michelin CSV and return place data."""
    reader = csv.DictReader(io.StringIO(content))
    seen = set()
    places = []

    for row in reader:
        if not row.get("Name") or not row.get("Latitude") or not row.get("Longitude"):
            continue

        key = (row["Name"].strip().lower(), row.get("Address", "").strip().lower())
        if key in seen:
            continue
        seen.add(key)

        # Build notes
        notes_parts = []
        if row.get("Award"):
            notes_parts.append(f"🏆 {row['Award']}")
        if row.get("GreenStar") == "1":
            notes_parts.append("🌿 Green Star (Sustainability)")
        if row.get("Price") and row["Price"] != "none":
            notes_parts.append(f"💰 {row['Price']}")
        if row.get("Description"):
            notes_parts.append("")
            notes_parts.append(row["Description"])

        # Collect tags
        tags = []
        if row.get("Award"):
            tags.append(row["Award"])
        if row.get("GreenStar") == "1":
            tags.append("Green Star")
        if row.get("Cuisine"):
            tags.extend([c.strip() for c in row["Cuisine"].split(",") if c.strip()])

        places.append({
            "name": row["Name"].strip(),
            "address": row.get("Address", "").strip() or row.get("Location", "").strip(),
            "latitude": float(row["Latitude"]),
            "longitude": float(row["Longitude"]),
            "phone": row.get("PhoneNumber") or None,
            "website": row.get("WebsiteUrl") or None,
            "notes": "\n".join(notes_parts),
            "tags": tags,
        })

    return places


def create_seed_account(
    db: Session,
    account_type: str,
    places_data: list[dict]
) -> dict:
    """Create seed account with places and tags."""
    config = SEED_ACCOUNT_CONFIGS[account_type]

    # Create or get user
    user = db.query(models.User).filter(models.User.username == config["username"]).first()
    user_created = False

    if not user:
        user = models.User(
            email=config["email"],
            name=config["name"],
            username=config["username"],
            bio=config["bio"],
            is_verified=True,
            is_public=True,
            hashed_password=None,
        )
        db.add(user)
        db.flush()
        user_created = True

    # Collect all unique tag names
    tag_names = set()
    for place_data in places_data:
        tag_names.update(place_data.get("tags", []))

    # Create missing tags
    existing_tags = db.query(models.Tag).filter(models.Tag.user_id == user.id).all()
    tag_map = {tag.name: tag for tag in existing_tags}
    tags_created = 0
    cuisine_color_index = 0

    for name in tag_names:
        if name not in tag_map:
            # Get color - use defined color, or cycle through cuisine palette
            if name in TAG_COLORS:
                color = TAG_COLORS[name]
            else:
                color = CUISINE_COLORS[cuisine_color_index % len(CUISINE_COLORS)]
                cuisine_color_index += 1

            # Get icon if available
            icon = TAG_ICONS.get(name)

            tag = models.Tag(user_id=user.id, name=name, color=color, icon=icon)
            db.add(tag)
            tag_map[name] = tag
            tags_created += 1

    db.flush()

    # Get existing places to avoid duplicates
    existing_places = db.query(models.Place).filter(models.Place.user_id == user.id).all()
    existing_keys = {(p.name.lower(), p.address.lower()) for p in existing_places}

    # Create places
    places_created = 0
    places_skipped = 0

    for place_data in places_data:
        key = (place_data["name"].lower(), place_data["address"].lower())
        if key in existing_keys:
            places_skipped += 1
            continue

        place = models.Place(
            user_id=user.id,
            name=place_data["name"],
            address=place_data["address"],
            latitude=place_data["latitude"],
            longitude=place_data["longitude"],
            phone=place_data.get("phone"),
            website=place_data.get("website"),
            notes=place_data.get("notes", ""),
            is_public=True,
        )
        db.add(place)
        db.flush()

        # Assign tags
        place.tags = [tag_map[t] for t in place_data.get("tags", []) if t in tag_map]
        places_created += 1

    db.commit()

    return {
        "user_id": user.id,
        "username": user.username,
        "user_created": user_created,
        "tags_created": tags_created,
        "places_created": places_created,
        "places_skipped": places_skipped,
    }


@router.post("/seed-account")
async def seed_account(
    account_type: Literal["michelin", "james_beard"] = Form(...),
    file: UploadFile = File(...),
    current_user: schemas.User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Seed a curated account from CSV file.

    - **account_type**: Type of account (michelin, james_beard)
    - **file**: CSV file with place data

    Requires admin privileges.
    """
    if account_type not in SEED_ACCOUNT_CONFIGS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown account type: {account_type}"
        )

    # Read file content
    content = await file.read()
    try:
        content_str = content.decode("utf-8")
    except UnicodeDecodeError:
        content_str = content.decode("latin-1")

    # Parse CSV based on account type
    if account_type == "michelin":
        places_data = parse_michelin_csv(content_str)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"CSV parser not implemented for: {account_type}"
        )

    if not places_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid places found in CSV"
        )

    # Create account and places
    result = create_seed_account(db, account_type, places_data)

    return {
        "message": "Seed account created successfully",
        "account_type": account_type,
        "total_rows_parsed": len(places_data),
        **result
    }
