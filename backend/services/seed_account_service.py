"""Shared parsing and persistence for curated seed accounts."""

import csv
import io

from sqlalchemy.orm import Session

import models


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

TAG_COLORS = {
    "3 Stars": "#FFD700",
    "2 Stars": "#C0C0C0",
    "1 Star": "#CD7F32",
    "Bib Gourmand": "#E74C3C",
    "Selected Restaurants": "#3498DB",
    "Green Star": "#27AE60",
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

CUISINE_COLORS = [
    "#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#EC4899",
    "#14B8A6", "#F97316", "#0EA5E9", "#6366F1", "#84CC16",
    "#22D3EE", "#A855F7", "#059669", "#7C3AED", "#0284C7",
]


def parse_michelin_csv(content: str) -> list[dict]:
    """Parse Michelin CSV content into normalized place dictionaries."""
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

        notes_parts = []
        if row.get("Award"):
            notes_parts.append(f"🏆 {row['Award']}")
        if row.get("GreenStar") == "1":
            notes_parts.append("🌿 Green Star (Sustainability)")
        if row.get("Price") and row["Price"] != "none":
            notes_parts.append(f"💰 {row['Price']}")
        if row.get("Description"):
            notes_parts.extend(["", row["Description"]])

        tags = []
        if row.get("Award"):
            tags.append(row["Award"])
        if row.get("GreenStar") == "1":
            tags.append("Green Star")
        if row.get("Cuisine"):
            tags.extend(c.strip() for c in row["Cuisine"].split(",") if c.strip())

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


def create_seed_account(db: Session, account_type: str, places_data: list[dict]) -> dict:
    """Create or update a curated account with normalized place data."""
    config = SEED_ACCOUNT_CONFIGS[account_type]
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

    tag_names = {tag for place in places_data for tag in place.get("tags", [])}
    existing_tags = db.query(models.Tag).filter(models.Tag.user_id == user.id).all()
    tag_map = {tag.name: tag for tag in existing_tags}
    tags_created = 0
    cuisine_color_index = 0

    for name in tag_names:
        if name in tag_map:
            continue

        color = TAG_COLORS.get(name)
        if color is None:
            color = CUISINE_COLORS[cuisine_color_index % len(CUISINE_COLORS)]
            cuisine_color_index += 1

        tag = models.Tag(
            user_id=user.id,
            name=name,
            color=color,
            icon=TAG_ICONS.get(name),
        )
        db.add(tag)
        tag_map[name] = tag
        tags_created += 1

    db.flush()

    existing_places = db.query(models.Place).filter(models.Place.user_id == user.id).all()
    existing_keys = {(place.name.lower(), place.address.lower()) for place in existing_places}
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
        place.tags = [tag_map[name] for name in place_data.get("tags", []) if name in tag_map]
        existing_keys.add(key)
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
