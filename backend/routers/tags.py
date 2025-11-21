from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import models
import schemas
import auth

router = APIRouter(prefix="/tags", tags=["tags"])


@router.get("", response_model=List[schemas.TagWithUsage])
def get_tags(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Get all tags for the current user with usage count"""
    tags = db.query(models.Tag).filter(models.Tag.user_id == current_user.id).all()

    # Add usage count to each tag
    result = []
    for tag in tags:
        tag_dict = schemas.Tag.model_validate(tag).model_dump()
        tag_dict['usage_count'] = len(tag.places)
        result.append(schemas.TagWithUsage(**tag_dict))

    return result


@router.post("", response_model=schemas.Tag, status_code=status.HTTP_201_CREATED)
def create_tag(
    tag_data: schemas.TagCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new tag"""
    # Check if tag with same name already exists for this user
    existing_tag = db.query(models.Tag).filter(
        models.Tag.user_id == current_user.id,
        models.Tag.name == tag_data.name
    ).first()

    if existing_tag:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tag with this name already exists"
        )

    db_tag = models.Tag(
        user_id=current_user.id,
        name=tag_data.name
    )
    db.add(db_tag)
    db.commit()
    db.refresh(db_tag)
    return db_tag


@router.get("/{tag_id}", response_model=schemas.Tag)
def get_tag(
    tag_id: str,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Get a single tag by ID"""
    tag = db.query(models.Tag).filter(
        models.Tag.id == tag_id,
        models.Tag.user_id == current_user.id
    ).first()

    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")

    return tag


@router.put("/{tag_id}", response_model=schemas.Tag)
def update_tag(
    tag_id: str,
    tag_update: schemas.TagUpdate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Update a tag name (updates across all places)"""
    db_tag = db.query(models.Tag).filter(
        models.Tag.id == tag_id,
        models.Tag.user_id == current_user.id
    ).first()

    if not db_tag:
        raise HTTPException(status_code=404, detail="Tag not found")

    # Check if another tag with the new name already exists
    existing_tag = db.query(models.Tag).filter(
        models.Tag.user_id == current_user.id,
        models.Tag.name == tag_update.name,
        models.Tag.id != tag_id
    ).first()

    if existing_tag:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tag with this name already exists"
        )

    db_tag.name = tag_update.name
    db.commit()
    db.refresh(db_tag)
    return db_tag


@router.delete("/{tag_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tag(
    tag_id: str,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a tag (removes from all places)"""
    db_tag = db.query(models.Tag).filter(
        models.Tag.id == tag_id,
        models.Tag.user_id == current_user.id
    ).first()

    if not db_tag:
        raise HTTPException(status_code=404, detail="Tag not found")

    db.delete(db_tag)
    db.commit()
    return None


@router.get("/{tag_id}/places", response_model=List[schemas.Place])
def get_tag_places(
    tag_id: str,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Get all places using this tag"""
    tag = db.query(models.Tag).filter(
        models.Tag.id == tag_id,
        models.Tag.user_id == current_user.id
    ).first()

    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")

    return tag.places
