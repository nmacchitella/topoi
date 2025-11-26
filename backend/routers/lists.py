from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models
import schemas
import auth

router = APIRouter(prefix="/lists", tags=["lists"])


@router.get("", response_model=List[schemas.ListWithPlaceCount])
def get_lists(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Get all lists for the current user"""
    lists = db.query(models.List).filter(models.List.user_id == current_user.id).all()

    # Add place count to each list
    result = []
    for lst in lists:
        list_dict = schemas.ListModel.model_validate(lst).model_dump()
        list_dict['place_count'] = len(lst.places)
        result.append(schemas.ListWithPlaceCount(**list_dict))

    return result


@router.post("", response_model=schemas.ListModel, status_code=status.HTTP_201_CREATED)
def create_list(
    list_data: schemas.ListCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new list"""
    db_list = models.List(
        user_id=current_user.id,
        name=list_data.name,
        color=list_data.color,
        icon=list_data.icon,
        is_public=list_data.is_public
    )
    db.add(db_list)
    db.commit()
    db.refresh(db_list)
    return db_list


@router.get("/{list_id}", response_model=schemas.ListModel)
def get_list(
    list_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Get a single list by ID"""
    lst = db.query(models.List).filter(models.List.id == list_id).first()
    if not lst:
        raise HTTPException(status_code=404, detail="List not found")

    # Check if user owns the list or if it's public
    if lst.user_id != current_user.id and not lst.is_public:
        raise HTTPException(status_code=403, detail="Not authorized to view this list")

    return lst


@router.put("/{list_id}", response_model=schemas.ListModel)
def update_list(
    list_id: str,
    list_update: schemas.ListUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Update a list"""
    db_list = db.query(models.List).filter(
        models.List.id == list_id,
        models.List.user_id == current_user.id
    ).first()

    if not db_list:
        raise HTTPException(status_code=404, detail="List not found")

    # Update fields
    update_data = list_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_list, field, value)

    db.commit()
    db.refresh(db_list)
    return db_list


@router.delete("/{list_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_list(
    list_id: str,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a list"""
    db_list = db.query(models.List).filter(
        models.List.id == list_id,
        models.List.user_id == current_user.id
    ).first()

    if not db_list:
        raise HTTPException(status_code=404, detail="List not found")

    db.delete(db_list)
    db.commit()
    return None


@router.get("/{list_id}/places", response_model=List[schemas.Place])
def get_list_places(
    list_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """Get all places in a list"""
    lst = db.query(models.List).filter(models.List.id == list_id).first()
    if not lst:
        raise HTTPException(status_code=404, detail="List not found")

    # Check if user owns the list or if it's public
    if lst.user_id != current_user.id and not lst.is_public:
        raise HTTPException(status_code=403, detail="Not authorized to view this list")

    return lst.places


@router.get("/search/public", response_model=List[schemas.ListWithPlaceCount])
def search_public_lists(
    q: str,
    limit: int = 20,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Search for public lists by name (excluding current user's own lists)"""
    if len(q) < 2:
        raise HTTPException(status_code=400, detail="Query must be at least 2 characters")

    # Search for public lists that don't belong to the current user
    lists = db.query(models.List).filter(
        models.List.is_public == True,
        models.List.user_id != current_user.id,
        models.List.name.ilike(f"%{q}%")
    ).limit(limit).all()

    # Add place count and user info to each list
    result = []
    for lst in lists:
        list_dict = schemas.ListModel.model_validate(lst).model_dump()
        list_dict['place_count'] = len(lst.places)
        # Add owner information
        owner = db.query(models.User).filter(models.User.id == lst.user_id).first()
        if owner:
            list_dict['owner_name'] = owner.name
            list_dict['owner_username'] = owner.username
        result.append(schemas.ListWithPlaceCount(**list_dict))

    return result
