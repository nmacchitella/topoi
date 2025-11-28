"""
Script to create Michelin Guide account and populate its map from CSV.

Usage:
    cd backend
    source venv/bin/activate
    python -m scripts.seed_accounts.michelin_guide

    # Dry run (preview only):
    python -m scripts.seed_accounts.michelin_guide --dry-run

    # Custom CSV path (for Fly.io where CSV is in /data):
    python -m scripts.seed_accounts.michelin_guide --csv-path /data/michelin_my_maps.csv

    # For different environments, set DATABASE_URL:
    DATABASE_URL="sqlite:////data/topoi_dev.db" python -m scripts.seed_accounts.michelin_guide

Requires:
    - data/michelin_my_maps.csv in the same directory (or specify --csv-path)
"""

import csv
import sys
import os
from pathlib import Path

# Add backend to path for imports
backend_dir = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy.orm import Session
from database import SessionLocal, engine
from models import Base, User, Place, Tag, place_tags


# Account configuration
ACCOUNT_CONFIG = {
    "email": "michelin@topoi.app",
    "name": "Michelin Guide",
    "username": "michelin_guide",
    "bio": "Official Michelin Guide selections",
    "is_verified": True,
    "is_public": True,
}

# Tag colors
TAG_COLORS = {
    # Awards
    "3 Stars": "#FFD700",      # Gold
    "2 Stars": "#C0C0C0",      # Silver
    "1 Star": "#CD7F32",       # Bronze
    "Bib Gourmand": "#E74C3C", # Red
    "Selected Restaurants": "#3498DB",  # Blue
    "Green Star": "#27AE60",   # Green
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

# Tag icons
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
DEFAULT_TAG_COLOR = "#6B7280"  # Gray


def normalize_price(price: str) -> str | None:
    """Normalize price to symbol format (€, €€, €€€, €€€€)."""
    if not price or price == "none":
        return None

    # Already in symbol format
    symbol_prices = ["$", "$$", "$$$", "$$$$", "€", "€€", "€€€", "€€€€",
                     "£", "££", "£££", "££££", "¥", "¥¥", "¥¥¥", "¥¥¥¥",
                     "₩", "₩₩", "₩₩₩", "₩₩₩₩", "฿", "฿฿", "฿฿฿", "฿฿฿฿",
                     "₫", "₫₫", "₫₫₫", "₫₫₫₫", "₺", "₺₺", "₺₺₺", "₺₺₺₺",
                     "﷼", "﷼﷼", "﷼﷼﷼", "﷼﷼﷼﷼"]
    if price in symbol_prices:
        return price

    # Skip specific price ranges - too varied to normalize
    return None


def parse_cuisines(cuisine_str: str) -> list[str]:
    """Parse comma-separated cuisines into list."""
    if not cuisine_str:
        return []
    return [c.strip() for c in cuisine_str.split(",") if c.strip()]


def build_notes(row: dict) -> str:
    """Build notes from description and metadata."""
    parts = []

    if row.get("Award"):
        parts.append(f"🏆 {row['Award']}")

    if row.get("GreenStar") == "1":
        parts.append("🌿 Green Star (Sustainability)")

    if row.get("Price") and row["Price"] != "none":
        parts.append(f"💰 {row['Price']}")

    if row.get("Description"):
        parts.append("")
        parts.append(row["Description"])

    return "\n".join(parts)


def load_csv(csv_path: Path) -> list[dict]:
    """Load and dedupe CSV data by name+address."""
    seen = set()
    places = []

    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            # Skip rows without required data
            if not row.get("Name") or not row.get("Latitude") or not row.get("Longitude"):
                continue

            # Dedupe key
            key = (row["Name"].strip().lower(), row.get("Address", "").strip().lower())
            if key in seen:
                continue
            seen.add(key)

            places.append(row)

    return places


def create_or_get_user(db: Session, dry_run: bool = False) -> User | None:
    """Create the Michelin Guide user or get existing."""
    existing = db.query(User).filter(User.username == ACCOUNT_CONFIG["username"]).first()

    if existing:
        print(f"✓ User '{ACCOUNT_CONFIG['username']}' already exists (id: {existing.id})")
        return existing

    if dry_run:
        print(f"[DRY RUN] Would create user: {ACCOUNT_CONFIG['username']}")
        return None

    user = User(
        email=ACCOUNT_CONFIG["email"],
        name=ACCOUNT_CONFIG["name"],
        username=ACCOUNT_CONFIG["username"],
        bio=ACCOUNT_CONFIG["bio"],
        is_verified=ACCOUNT_CONFIG["is_verified"],
        is_public=ACCOUNT_CONFIG["is_public"],
        hashed_password=None,  # Display-only account
    )
    db.add(user)
    db.flush()  # Get the ID
    print(f"✓ Created user: {ACCOUNT_CONFIG['username']} (id: {user.id})")
    return user


def create_tags(db: Session, user: User, places_data: list[dict], dry_run: bool = False) -> dict[str, Tag]:
    """Create all needed tags and return mapping."""
    tag_map = {}

    # Collect all unique tag names needed
    tag_names = set()

    for row in places_data:
        # Award
        if row.get("Award"):
            tag_names.add(row["Award"])

        # Green Star
        if row.get("GreenStar") == "1":
            tag_names.add("Green Star")

        # Cuisines
        for cuisine in parse_cuisines(row.get("Cuisine", "")):
            tag_names.add(cuisine)

    print(f"Found {len(tag_names)} unique tags to create")

    if dry_run:
        print(f"[DRY RUN] Would create {len(tag_names)} tags")
        return {}

    # Get existing tags for this user
    existing_tags = db.query(Tag).filter(Tag.user_id == user.id).all()
    for tag in existing_tags:
        tag_map[tag.name] = tag

    # Create missing tags
    created = 0
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

            tag = Tag(user_id=user.id, name=name, color=color, icon=icon)
            db.add(tag)
            tag_map[name] = tag
            created += 1

    if created:
        db.flush()
        print(f"✓ Created {created} new tags")

    return tag_map


def create_places(db: Session, user: User, places_data: list[dict], tag_map: dict[str, Tag], dry_run: bool = False) -> int:
    """Create places from CSV data."""
    if dry_run:
        print(f"[DRY RUN] Would create {len(places_data)} places")
        return len(places_data)

    # Get existing places for this user to avoid duplicates
    existing_places = db.query(Place).filter(Place.user_id == user.id).all()
    existing_keys = {(p.name.lower(), p.address.lower()) for p in existing_places}

    created = 0
    skipped = 0

    for row in places_data:
        name = row["Name"].strip()
        address = row.get("Address", "").strip() or row.get("Location", "").strip()

        # Skip if already exists
        if (name.lower(), address.lower()) in existing_keys:
            skipped += 1
            continue

        # Create place
        place = Place(
            user_id=user.id,
            name=name,
            address=address,
            latitude=float(row["Latitude"]),
            longitude=float(row["Longitude"]),
            phone=row.get("PhoneNumber") or None,
            website=row.get("WebsiteUrl") or None,
            notes=build_notes(row),
            is_public=True,
        )
        db.add(place)
        db.flush()  # Get the ID

        # Assign tags
        tags_to_assign = []

        if row.get("Award") and row["Award"] in tag_map:
            tags_to_assign.append(tag_map[row["Award"]])

        if row.get("GreenStar") == "1" and "Green Star" in tag_map:
            tags_to_assign.append(tag_map["Green Star"])

        for cuisine in parse_cuisines(row.get("Cuisine", "")):
            if cuisine in tag_map:
                tags_to_assign.append(tag_map[cuisine])

        place.tags = tags_to_assign
        created += 1

        # Progress update every 1000 places
        if created % 1000 == 0:
            print(f"  ... created {created} places")

    print(f"✓ Created {created} places (skipped {skipped} existing)")
    return created


def main():
    dry_run = "--dry-run" in sys.argv

    if dry_run:
        print("=" * 50)
        print("DRY RUN MODE - No changes will be made")
        print("=" * 50)

    # Find CSV file - check for --csv-path argument
    csv_path = None
    for i, arg in enumerate(sys.argv):
        if arg == "--csv-path" and i + 1 < len(sys.argv):
            csv_path = Path(sys.argv[i + 1])
            break

    if csv_path is None:
        script_dir = Path(__file__).parent
        csv_path = script_dir / "data" / "michelin_my_maps.csv"

    if not csv_path.exists():
        print(f"ERROR: CSV file not found: {csv_path}")
        sys.exit(1)

    print(f"Loading CSV: {csv_path}")
    places_data = load_csv(csv_path)
    print(f"Loaded {len(places_data)} unique places (after deduplication)")

    # Create database session
    db = SessionLocal()

    try:
        # Create user
        user = create_or_get_user(db, dry_run)

        if not dry_run and user is None:
            print("ERROR: Failed to create user")
            sys.exit(1)

        # Create tags
        tag_map = create_tags(db, user, places_data, dry_run)

        # Create places
        if not dry_run:
            create_places(db, user, places_data, tag_map, dry_run)
        else:
            print(f"[DRY RUN] Would create {len(places_data)} places")

        # Commit
        if not dry_run:
            db.commit()
            print("\n✓ All changes committed successfully!")
        else:
            print("\n[DRY RUN] No changes made. Run without --dry-run to execute.")

    except Exception as e:
        db.rollback()
        print(f"\nERROR: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
