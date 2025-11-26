from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models
import schemas
import auth

router = APIRouter(prefix="/places", tags=["places"])


@router.get("", response_model=List[schemas.Place])
def get_places(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Get all places for the current user"""
    places = db.query(models.Place).filter(models.Place.user_id == current_user.id).all()
    return places


@router.post("", response_model=schemas.Place, status_code=status.HTTP_201_CREATED)
def create_place(
    place: schemas.PlaceCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new place"""
    # Create place
    db_place = models.Place(
        user_id=current_user.id,
        name=place.name,
        address=place.address,
        latitude=place.latitude,
        longitude=place.longitude,
        notes=place.notes,
        phone=place.phone,
        website=place.website,
        hours=place.hours,
        is_public=place.is_public
    )

    # Add lists
    if place.list_ids:
        lists = db.query(models.List).filter(
            models.List.id.in_(place.list_ids),
            models.List.user_id == current_user.id
        ).all()
        db_place.lists = lists

    # Add tags
    if place.tag_ids:
        tags = db.query(models.Tag).filter(
            models.Tag.id.in_(place.tag_ids),
            models.Tag.user_id == current_user.id
        ).all()
        db_place.tags = tags

    db.add(db_place)
    db.commit()
    db.refresh(db_place)
    return db_place


@router.get("/{place_id}", response_model=schemas.Place)
def get_place(
    place_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Get a single place by ID"""
    place = db.query(models.Place).filter(models.Place.id == place_id).first()
    if not place:
        raise HTTPException(status_code=404, detail="Place not found")

    auth.check_place_access(place, current_user)
    return place


@router.put("/{place_id}", response_model=schemas.Place)
def update_place(
    place_id: str,
    place_update: schemas.PlaceUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Update a place"""
    db_place = db.query(models.Place).filter(
        models.Place.id == place_id,
        models.Place.user_id == current_user.id
    ).first()

    if not db_place:
        raise HTTPException(status_code=404, detail="Place not found")

    # Update fields
    update_data = place_update.model_dump(exclude_unset=True)

    # Handle lists separately
    if "list_ids" in update_data:
        list_ids = update_data.pop("list_ids")
        lists = db.query(models.List).filter(
            models.List.id.in_(list_ids),
            models.List.user_id == current_user.id
        ).all()
        db_place.lists = lists

    # Handle tags separately
    if "tag_ids" in update_data:
        tag_ids = update_data.pop("tag_ids")
        tags = db.query(models.Tag).filter(
            models.Tag.id.in_(tag_ids),
            models.Tag.user_id == current_user.id
        ).all()
        db_place.tags = tags

    # Update other fields
    for field, value in update_data.items():
        setattr(db_place, field, value)

    db.commit()
    db.refresh(db_place)
    return db_place


@router.delete("/{place_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_place(
    place_id: str,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a place"""
    db_place = db.query(models.Place).filter(
        models.Place.id == place_id,
        models.Place.user_id == current_user.id
    ).first()

    if not db_place:
        raise HTTPException(status_code=404, detail="Place not found")

    db.delete(db_place)
    db.commit()
    return None


@router.patch("/{place_id}/public", response_model=schemas.Place)
def toggle_place_public(
    place_id: str,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Toggle public status of a place"""
    db_place = db.query(models.Place).filter(
        models.Place.id == place_id,
        models.Place.user_id == current_user.id
    ).first()

    if not db_place:
        raise HTTPException(status_code=404, detail="Place not found")

    db_place.is_public = not db_place.is_public
    db.commit()
    db.refresh(db_place)
    return db_place


@router.post("/adopt", response_model=schemas.Place, status_code=status.HTTP_201_CREATED)
def adopt_place(
    request: schemas.AdoptPlaceRequest,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Adopt a place from another user's map.
    Creates a copy of the place on the current user's map.

    Requirements:
    - Source place must be public
    - Source user must be public OR current user must be a confirmed follower
    """
    # Get source place
    source_place = db.query(models.Place).filter(models.Place.id == request.place_id).first()
    if not source_place:
        raise HTTPException(status_code=404, detail="Place not found")

    # Check if trying to adopt own place
    if source_place.user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot adopt your own place")

    # Check if source place is public
    if not source_place.is_public:
        raise HTTPException(status_code=403, detail="This place is not public")

    # Get source user
    source_user = db.query(models.User).filter(models.User.id == source_place.user_id).first()
    if not source_user:
        raise HTTPException(status_code=404, detail="Source user not found")

    # Check permissions
    if not source_user.is_public:
        # Private user - check if current user is a confirmed follower
        from services.follow_service import FollowService
        follow_rel = FollowService.get_follow_relationship(db, current_user.id, source_user.id)
        if not follow_rel or follow_rel.status != 'confirmed':
            raise HTTPException(
                status_code=403,
                detail="You must be a confirmed follower to adopt places from this user"
            )

    # Check if user already has this place (check by lat/lng to avoid duplicates)
    existing = db.query(models.Place).filter(
        models.Place.user_id == current_user.id,
        models.Place.latitude == source_place.latitude,
        models.Place.longitude == source_place.longitude
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="You already have a place at this location")

    # Create new place (copy of source)
    adopted_place = models.Place(
        user_id=current_user.id,
        name=source_place.name,
        address=source_place.address,
        latitude=source_place.latitude,
        longitude=source_place.longitude,
        notes=f"Adopted from {source_user.name}'s map",
        phone=source_place.phone,
        website=source_place.website,
        hours=source_place.hours,
        is_public=False  # Adopted places start as private
    )

    # Optionally assign to a list if specified
    if request.list_id:
        target_list = db.query(models.List).filter(
            models.List.id == request.list_id,
            models.List.user_id == current_user.id
        ).first()
        if target_list:
            adopted_place.lists = [target_list]

    db.add(adopted_place)
    db.commit()
    db.refresh(adopted_place)

    return adopted_place
