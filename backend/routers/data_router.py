from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from database import get_db
import auth
import models
import schemas
import json
from typing import Dict, List, Any

router = APIRouter(prefix="/data", tags=["data"])


def map_mapstr_icon_to_category(icon: str) -> str:
    """Map Mapstr icon to Topoi category"""
    mapping = {
        "restaurant": "restaurant",
        "cafe": "cafe",
        "bar": "bar",
        "shopping": "shop",
        "lodging": "other",
        "museum": "culture",
        "park": "park",
    }
    return mapping.get(icon, "other")


def get_or_create_tag(db: Session, user_id: str, tag_name: str) -> models.Tag:
    """Get existing tag or create new one (case-insensitive match)"""
    # Try to find existing tag (case-insensitive)
    existing_tag = db.query(models.Tag).filter(
        models.Tag.user_id == user_id,
        models.Tag.name.ilike(tag_name)
    ).first()

    if existing_tag:
        return existing_tag

    # Create new tag
    new_tag = models.Tag(
        user_id=user_id,
        name=tag_name
    )
    db.add(new_tag)
    db.flush()  # Get the ID without committing
    return new_tag


def is_duplicate_place(db: Session, user_id: str, lat: float, lng: float, name: str) -> bool:
    """Check if place already exists at approximately same location"""
    # Check within ~10 meters (0.0001 degrees)
    threshold = 0.0001

    existing = db.query(models.Place).filter(
        models.Place.user_id == user_id,
        models.Place.latitude.between(lat - threshold, lat + threshold),
        models.Place.longitude.between(lng - threshold, lng + threshold),
        models.Place.name.ilike(name)
    ).first()

    return existing is not None


def import_from_geojson(data: Dict[str, Any], user_id: str, db: Session) -> Dict[str, Any]:
    """Import places from Mapstr GeoJSON format"""

    if data.get("type") != "FeatureCollection":
        raise HTTPException(400, "Invalid GeoJSON: must be a FeatureCollection")

    features = data.get("features", [])
    if not features:
        raise HTTPException(400, "No features found in GeoJSON")

    results = {
        "places_imported": 0,
        "places_skipped": 0,
        "tags_created": 0,
        "tags_matched": 0,
        "errors": []
    }

    # Track tags to avoid duplicate lookups
    tag_cache = {}

    for idx, feature in enumerate(features):
        try:
            # Validate feature structure
            if feature.get("type") != "Feature":
                results["errors"].append(f"Feature {idx}: Not a valid Feature")
                continue

            geometry = feature.get("geometry", {})
            properties = feature.get("properties", {})

            # Extract required fields
            name = properties.get("name")
            address = properties.get("address")
            coordinates = geometry.get("coordinates", [])

            if not name or not address or len(coordinates) != 2:
                results["errors"].append(f"Feature {idx}: Missing required fields (name, address, or coordinates)")
                continue

            # GeoJSON uses [longitude, latitude]
            longitude = coordinates[0]
            latitude = coordinates[1]

            # Validate coordinates
            if not (-90 <= latitude <= 90) or not (-180 <= longitude <= 180):
                results["errors"].append(f"Feature {idx}: Invalid coordinates")
                continue

            # Check for duplicates
            if is_duplicate_place(db, user_id, latitude, longitude, name):
                results["places_skipped"] += 1
                continue

            # Map icon to category
            icon = properties.get("icon", "other")
            category = map_mapstr_icon_to_category(icon)

            # Get notes
            notes = properties.get("userComment", "")

            # Create place
            place = models.Place(
                user_id=user_id,
                name=name,
                address=address,
                latitude=latitude,
                longitude=longitude,
                category=category,
                notes=notes,
                phone="",
                website="",
                hours="",
                is_public=False
            )
            db.add(place)
            db.flush()  # Get place ID

            # Process tags
            tags_data = properties.get("tags", [])
            for tag_data in tags_data:
                tag_name = tag_data.get("name")
                if not tag_name:
                    continue

                # Use cache to avoid repeated lookups
                if tag_name.lower() in tag_cache:
                    tag = tag_cache[tag_name.lower()]
                else:
                    # Check if tag exists
                    existing_tag = db.query(models.Tag).filter(
                        models.Tag.user_id == user_id,
                        models.Tag.name.ilike(tag_name)
                    ).first()

                    if existing_tag:
                        tag = existing_tag
                        results["tags_matched"] += 1
                    else:
                        tag = models.Tag(user_id=user_id, name=tag_name)
                        db.add(tag)
                        db.flush()
                        results["tags_created"] += 1

                    tag_cache[tag_name.lower()] = tag

                # Link tag to place
                place.tags.append(tag)

            results["places_imported"] += 1

        except Exception as e:
            results["errors"].append(f"Feature {idx}: {str(e)}")
            continue

    # Commit all changes
    db.commit()

    return {
        "success": True,
        "summary": results
    }


@router.post("/import")
async def import_data(
    file: UploadFile = File(...),
    current_user: schemas.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Import places from GeoJSON (Mapstr format) or JSON (Topoi format)

    Supports:
    - Mapstr GeoJSON exports
    - Merge mode: adds to existing data, skips duplicates
    """

    try:
        # Read and parse file
        content = await file.read()
        data = json.loads(content)
    except json.JSONDecodeError:
        raise HTTPException(400, "Invalid JSON file")
    except Exception as e:
        raise HTTPException(400, f"Failed to read file: {str(e)}")

    # Detect format and import
    if data.get("type") == "FeatureCollection":
        # Mapstr GeoJSON format
        return import_from_geojson(data, current_user.id, db)
    else:
        raise HTTPException(400, "Unrecognized file format. Expected GeoJSON (Mapstr export)")
