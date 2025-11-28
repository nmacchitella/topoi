from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from database import get_db, get_settings
import auth
import models
import schemas
import json
import csv
import io
import re
import httpx
from typing import Dict, List, Any

router = APIRouter(prefix="/data", tags=["data"])
settings = get_settings()


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


def extract_place_id_from_url(url: str) -> str | None:
    """Extract place_id from Google Maps URL"""
    # Pattern 1: /place/NAME/data=...!1s0x... (place_id in CID format)
    # Pattern 2: place_id parameter
    # Pattern 3: cid parameter (convert to place_id)

    # Try to find place_id directly
    place_id_match = re.search(r'place_id=([a-zA-Z0-9_-]+)', url)
    if place_id_match:
        return place_id_match.group(1)

    # Try to extract from /data=!4m2!3m1!1s format (ChIJ...)
    data_match = re.search(r'/data=.*?1s([a-zA-Z0-9_-]+)', url)
    if data_match:
        potential_id = data_match.group(1)
        # Google place IDs typically start with ChIJ
        if len(potential_id) > 10:  # Basic validation
            return potential_id

    return None


async def get_place_details_from_google(place_id: str) -> Dict[str, Any] | None:
    """Fetch place details from Google Places API"""
    if not settings.google_places_api_key:
        return None

    url = "https://places.googleapis.com/v1/places/" + place_id
    headers = {
        "X-Goog-Api-Key": settings.google_places_api_key,
        "X-Goog-FieldMask": "id,displayName,formattedAddress,location,internationalPhoneNumber,websiteUri,regularOpeningHours,types,businessStatus"
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, headers=headers)

            if response.status_code == 200:
                return response.json()
            else:
                print(f"Google Places API error: {response.status_code} - {response.text}")
                return None
    except Exception as e:
        print(f"Error fetching place details: {e}")
        return None


async def search_place_by_name(place_name: str) -> Dict[str, Any] | None:
    """Search for a place by name using Google Places Text Search"""
    if not settings.google_places_api_key:
        return None

    url = "https://places.googleapis.com/v1/places:searchText"
    headers = {
        "X-Goog-Api-Key": settings.google_places_api_key,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.internationalPhoneNumber,places.websiteUri,places.regularOpeningHours,places.types"
    }
    body = {
        "textQuery": place_name
    }

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(url, headers=headers, json=body)

            if response.status_code == 200:
                data = response.json()
                places = data.get('places', [])
                if places:
                    return places[0]  # Return first match
                return None
            else:
                print(f"Google Places Search error: {response.status_code} - {response.text}")
                return None
    except Exception as e:
        print(f"Error searching place: {e}")
        return None


# Category mapping removed - categories no longer used


async def preview_google_maps_csv(content: bytes, user_id: str, db: Session) -> Dict[str, Any]:
    """Preview places from Google Maps CSV export (no DB save)"""

    places_preview = []
    results = {
        "total": 0,
        "successful": 0,
        "duplicates": 0,
        "failed": 0,
        "errors": []
    }

    # Parse CSV
    try:
        csv_text = content.decode('utf-8')
        csv_reader = csv.DictReader(io.StringIO(csv_text))
    except Exception as e:
        raise HTTPException(400, f"Failed to parse CSV: {str(e)}")

    for idx, row in enumerate(csv_reader):
        results["total"] += 1
        place_preview = {
            "name": "",
            "address": "",
            "latitude": 0.0,
            "longitude": 0.0,
            "notes": "",
            "phone": "",
            "website": "",
            "hours": "",
            "tags": [],
            "is_duplicate": False,
            "error": None
        }

        try:
            # Get fields (Google Maps CSV format)
            name = row.get('Note', '').strip() or row.get('Title', '').strip()
            url = row.get('URL', '').strip()
            tags_str = row.get('Tags', '').strip()
            comment = row.get('Comment', '').strip()

            if not name or not url:
                place_preview["name"] = name or "Unknown"
                place_preview["error"] = "Missing name or URL"
                results["failed"] += 1
                places_preview.append(place_preview)
                continue

            place_preview["name"] = name
            place_preview["notes"] = comment

            # Parse tags
            if tags_str:
                place_preview["tags"] = [t.strip() for t in tags_str.split(',') if t.strip()]

            # Try to extract place_id from URL first
            place_id = extract_place_id_from_url(url)
            place_details = None

            if place_id:
                place_details = await get_place_details_from_google(place_id)

            # If place_id didn't work, fall back to text search
            if not place_details:
                place_details = await search_place_by_name(name)

            if not place_details:
                place_preview["error"] = f"Could not find place via Google Places API"
                results["failed"] += 1
                places_preview.append(place_preview)
                continue

            # Extract details
            location = place_details.get('location', {})
            latitude = location.get('latitude')
            longitude = location.get('longitude')

            if not latitude or not longitude:
                place_preview["error"] = "No coordinates found"
                results["failed"] += 1
                places_preview.append(place_preview)
                continue

            place_preview["latitude"] = latitude
            place_preview["longitude"] = longitude

            # Check for duplicates
            if is_duplicate_place(db, user_id, latitude, longitude, name):
                place_preview["is_duplicate"] = True
                results["duplicates"] += 1

            # Get address
            place_preview["address"] = place_details.get('formattedAddress', '')

            # Get optional fields
            place_preview["phone"] = place_details.get('internationalPhoneNumber', '')
            place_preview["website"] = place_details.get('websiteUri', '')

            # Get hours (simplified)
            hours_data = place_details.get('regularOpeningHours', {})
            if hours_data:
                weekday_descriptions = hours_data.get('weekdayDescriptions', [])
                if weekday_descriptions:
                    place_preview["hours"] = '; '.join(weekday_descriptions[:3])

            results["successful"] += 1

        except Exception as e:
            place_preview["error"] = str(e)
            results["failed"] += 1

        places_preview.append(place_preview)

    return {
        "places": places_preview,
        "summary": results
    }


async def import_from_google_maps_csv(content: bytes, user_id: str, db: Session) -> Dict[str, Any]:
    """Import places from Google Maps CSV export"""

    results = {
        "places_imported": 0,
        "places_skipped": 0,
        "places_failed": 0,
        "tags_created": 0,
        "tags_matched": 0,
        "errors": []
    }

    # Parse CSV
    try:
        csv_text = content.decode('utf-8')
        csv_reader = csv.DictReader(io.StringIO(csv_text))
    except Exception as e:
        raise HTTPException(400, f"Failed to parse CSV: {str(e)}")

    # Track tags to avoid duplicate lookups
    tag_cache = {}

    for idx, row in enumerate(csv_reader):
        try:
            # Get fields (Google Maps CSV format)
            name = row.get('Note', '').strip() or row.get('Title', '').strip()
            url = row.get('URL', '').strip()
            tags_str = row.get('Tags', '').strip()
            comment = row.get('Comment', '').strip()

            if not name or not url:
                results["errors"].append(f"Row {idx + 2}: Missing name or URL")
                results["places_failed"] += 1
                continue

            # Try to extract place_id from URL first
            place_id = extract_place_id_from_url(url)
            place_details = None

            if place_id:
                # Try getting details with place_id
                place_details = await get_place_details_from_google(place_id)

            # If place_id didn't work, fall back to text search
            if not place_details:
                place_details = await search_place_by_name(name)

            if not place_details:
                results["errors"].append(f"Row {idx + 2}: Could not find place '{name}' via Google Places API")
                results["places_failed"] += 1
                continue

            # Extract details
            location = place_details.get('location', {})
            latitude = location.get('latitude')
            longitude = location.get('longitude')

            if not latitude or not longitude:
                results["errors"].append(f"Row {idx + 2}: No coordinates found")
                results["places_failed"] += 1
                continue

            # Check for duplicates
            if is_duplicate_place(db, user_id, latitude, longitude, name):
                results["places_skipped"] += 1
                continue

            # Get address
            address = place_details.get('formattedAddress', '')

            # Get optional fields
            phone = place_details.get('internationalPhoneNumber', '')
            website = place_details.get('websiteUri', '')

            # Get hours (simplified)
            hours_data = place_details.get('regularOpeningHours', {})
            hours = ''
            if hours_data:
                weekday_descriptions = hours_data.get('weekdayDescriptions', [])
                if weekday_descriptions:
                    hours = '; '.join(weekday_descriptions[:3])  # First 3 days to keep it short

            # Create place
            place = models.Place(
                user_id=user_id,
                name=name,
                address=address,
                latitude=latitude,
                longitude=longitude,
                notes=comment,
                phone=phone,
                website=website,
                hours=hours,
                is_public=True
            )
            db.add(place)
            db.flush()  # Get place ID

            # Process tags
            if tags_str:
                tag_names = [t.strip() for t in tags_str.split(',') if t.strip()]

                for tag_name in tag_names:
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
            results["errors"].append(f"Row {idx + 2}: {str(e)}")
            results["places_failed"] += 1
            continue

    # Commit all changes
    db.commit()

    return {
        "success": True,
        "summary": results
    }


def preview_geojson(data: Dict[str, Any], user_id: str, db: Session) -> Dict[str, Any]:
    """Preview places from Mapstr GeoJSON format (no DB save)"""

    if data.get("type") != "FeatureCollection":
        raise HTTPException(400, "Invalid GeoJSON: must be a FeatureCollection")

    features = data.get("features", [])
    if not features:
        raise HTTPException(400, "No features found in GeoJSON")

    places_preview = []
    results = {
        "total": 0,
        "successful": 0,
        "duplicates": 0,
        "failed": 0,
        "errors": []
    }

    for idx, feature in enumerate(features):
        results["total"] += 1
        place_preview = {
            "name": "",
            "address": "",
            "latitude": 0.0,
            "longitude": 0.0,
            "notes": "",
            "phone": "",
            "website": "",
            "hours": "",
            "tags": [],
            "is_duplicate": False,
            "error": None
        }

        try:
            # Validate feature structure
            if feature.get("type") != "Feature":
                place_preview["error"] = "Not a valid Feature"
                results["failed"] += 1
                places_preview.append(place_preview)
                continue

            geometry = feature.get("geometry", {})
            properties = feature.get("properties", {})

            # Extract required fields
            name = properties.get("name")
            address = properties.get("address")
            coordinates = geometry.get("coordinates", [])

            if not name or not address or len(coordinates) != 2:
                place_preview["name"] = name or "Unknown"
                place_preview["error"] = "Missing required fields (name, address, or coordinates)"
                results["failed"] += 1
                places_preview.append(place_preview)
                continue

            # GeoJSON uses [longitude, latitude]
            longitude = coordinates[0]
            latitude = coordinates[1]

            # Validate coordinates
            if not (-90 <= latitude <= 90) or not (-180 <= longitude <= 180):
                place_preview["name"] = name
                place_preview["error"] = "Invalid coordinates"
                results["failed"] += 1
                places_preview.append(place_preview)
                continue

            place_preview["name"] = name
            place_preview["address"] = address
            place_preview["latitude"] = latitude
            place_preview["longitude"] = longitude
            place_preview["notes"] = properties.get("userComment", "")

            # Parse tags
            tags_data = properties.get("tags", [])
            place_preview["tags"] = [tag.get("name") for tag in tags_data if tag.get("name")]

            # Check for duplicates
            if is_duplicate_place(db, user_id, latitude, longitude, name):
                place_preview["is_duplicate"] = True
                results["duplicates"] += 1

            results["successful"] += 1

        except Exception as e:
            place_preview["error"] = str(e)
            results["failed"] += 1

        places_preview.append(place_preview)

    return {
        "places": places_preview,
        "summary": results
    }


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

            # Get notes
            notes = properties.get("userComment", "")

            # Create place
            place = models.Place(
                user_id=user_id,
                name=name,
                address=address,
                latitude=latitude,
                longitude=longitude,
                notes=notes,
                phone="",
                website="",
                hours="",
                is_public=True
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


@router.post("/import/preview", response_model=schemas.ImportPreviewResponse)
async def preview_import(
    file: UploadFile = File(...),
    current_user: schemas.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Preview places from import file without saving to database

    Supports:
    - Google Maps CSV exports
    - Mapstr GeoJSON exports

    Returns preview data with validation, duplicate detection, and errors
    """

    try:
        content = await file.read()
    except Exception as e:
        raise HTTPException(400, f"Failed to read file: {str(e)}")

    filename = file.filename.lower() if file.filename else ""

    if filename.endswith('.csv'):
        return await preview_google_maps_csv(content, current_user.id, db)
    elif filename.endswith('.json') or filename.endswith('.geojson'):
        # Parse GeoJSON
        try:
            data = json.loads(content)
            return preview_geojson(data, current_user.id, db)
        except json.JSONDecodeError as e:
            raise HTTPException(400, f"Invalid JSON format: {str(e)}")
    else:
        raise HTTPException(400, "Supported formats: CSV (Google Maps) or GeoJSON (Mapstr)")


@router.post("/import/confirm")
async def confirm_import(
    confirm_request: schemas.ImportConfirmRequest,
    current_user: schemas.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Confirm and save previewed import data to database

    Accepts edited place data from preview and creates places with tags
    """

    results = {
        "places_imported": 0,
        "places_skipped": 0,
        "tags_created": 0,
        "tags_matched": 0,
        "errors": []
    }

    # Track tags to avoid duplicate lookups
    tag_cache = {}

    for place_data in confirm_request.places:
        try:
            # Skip places with errors or marked as duplicates (unless user edited them)
            if place_data.error and not place_data.name:
                results["places_skipped"] += 1
                continue

            # Skip if missing required fields
            if not place_data.latitude or not place_data.longitude or not place_data.name:
                results["places_skipped"] += 1
                results["errors"].append(f"Skipped '{place_data.name}': missing required fields")
                continue

            # Check for duplicates again (in case data changed)
            if is_duplicate_place(db, current_user.id, place_data.latitude, place_data.longitude, place_data.name):
                results["places_skipped"] += 1
                results["errors"].append(f"Skipped '{place_data.name}': duplicate")
                continue

            # Create place
            new_place = models.Place(
                user_id=current_user.id,
                name=place_data.name,
                address=place_data.address,
                latitude=place_data.latitude,
                longitude=place_data.longitude,
                notes=place_data.notes,
                phone=place_data.phone or None,
                website=place_data.website or None,
                hours=place_data.hours or None,
                is_public=True
            )
            db.add(new_place)
            db.flush()

            # Handle tags
            for tag_name in place_data.tags:
                if not tag_name:
                    continue

                # Check cache first
                if tag_name.lower() in tag_cache:
                    tag = tag_cache[tag_name.lower()]
                    results["tags_matched"] += 1
                else:
                    # Get or create tag
                    tag = get_or_create_tag(db, current_user.id, tag_name)
                    if tag.name == tag_name:  # New tag
                        results["tags_created"] += 1
                    else:  # Existing tag
                        results["tags_matched"] += 1
                    tag_cache[tag_name.lower()] = tag

                # Associate tag with place
                new_place.tags.append(tag)

            results["places_imported"] += 1

        except Exception as e:
            results["errors"].append(f"Failed to import '{place_data.name}': {str(e)}")
            continue

    # Commit all changes
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        raise HTTPException(500, f"Failed to save import: {str(e)}")

    return {
        "message": f"Successfully imported {results['places_imported']} places",
        "summary": results
    }


@router.post("/import")
async def import_data(
    file: UploadFile = File(...),
    current_user: schemas.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Import places from multiple formats

    Supports:
    - Google Maps CSV exports
    - Mapstr GeoJSON exports
    - Merge mode: adds to existing data, skips duplicates
    """

    try:
        # Read file content
        content = await file.read()
    except Exception as e:
        raise HTTPException(400, f"Failed to read file: {str(e)}")

    # Detect file format
    filename = file.filename.lower() if file.filename else ""

    # Try CSV first (Google Maps format)
    if filename.endswith('.csv'):
        return await import_from_google_maps_csv(content, current_user.id, db)

    # Try JSON/GeoJSON
    try:
        data = json.loads(content)

        if data.get("type") == "FeatureCollection":
            # Mapstr GeoJSON format
            return import_from_geojson(data, current_user.id, db)
        else:
            raise HTTPException(400, "Unrecognized JSON format")
    except json.JSONDecodeError:
        # Not JSON, might be CSV without .csv extension
        try:
            return await import_from_google_maps_csv(content, current_user.id, db)
        except:
            raise HTTPException(400, "Unrecognized file format. Expected CSV (Google Maps) or GeoJSON (Mapstr)")
