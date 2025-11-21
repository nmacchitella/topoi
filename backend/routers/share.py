from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
import models
import schemas

router = APIRouter(prefix="/share", tags=["sharing"])


@router.get("/map/{user_id}", response_model=List[schemas.Place])
def get_shared_map(
    user_id: str,
    list_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get all public places for a user, optionally filtered by list"""
    query = db.query(models.Place).filter(
        models.Place.user_id == user_id,
        models.Place.is_public == True
    )

    # If list_id is provided, filter by that list
    if list_id:
        # First check if the list is public
        lst = db.query(models.List).filter(
            models.List.id == list_id,
            models.List.user_id == user_id
        ).first()

        if not lst:
            raise HTTPException(status_code=404, detail="List not found")

        if not lst.is_public:
            raise HTTPException(status_code=403, detail="List is not public")

        # Filter places by the list
        query = query.filter(models.Place.lists.any(models.List.id == list_id))

    places = query.all()
    return places


@router.get("/list/{list_id}", response_model=List[schemas.Place])
def get_shared_list(
    list_id: str,
    db: Session = Depends(get_db)
):
    """Get all places in a public list"""
    lst = db.query(models.List).filter(models.List.id == list_id).first()

    if not lst:
        raise HTTPException(status_code=404, detail="List not found")

    if not lst.is_public:
        raise HTTPException(status_code=403, detail="This list is not public")

    # Return only public places from the list
    places = [place for place in lst.places if place.is_public]
    return places


@router.get("/place/{place_id}", response_model=schemas.Place)
def get_shared_place(
    place_id: str,
    db: Session = Depends(get_db)
):
    """Get a single public place"""
    place = db.query(models.Place).filter(models.Place.id == place_id).first()

    if not place:
        raise HTTPException(status_code=404, detail="Place not found")

    if not place.is_public:
        raise HTTPException(status_code=403, detail="This place is not public")

    return place
