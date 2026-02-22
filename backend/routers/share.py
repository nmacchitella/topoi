"""
Phase 3: Share Router
API endpoints for map sharing with tokens
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from database import get_db
import auth
import models
import schemas
import uuid

router = APIRouter(prefix="/share", tags=["sharing"])


@router.get("/map/{user_id}", response_model=List[schemas.Place])
def get_shared_map(
    user_id: str,
    list_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get all public places for a user, optionally filtered by list"""
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not user.is_public:
        raise HTTPException(status_code=403, detail="This user's map is private")

    query = db.query(models.Place).options(
        joinedload(models.Place.tags),
        joinedload(models.Place.lists)
    ).filter(
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


@router.get("/list/{list_id}", response_model=schemas.SharedListData)
def get_shared_list(
    list_id: str,
    db: Session = Depends(get_db)
):
    """Get all places in a public list, including list metadata"""
    lst = db.query(models.List).filter(models.List.id == list_id).first()

    if not lst:
        raise HTTPException(status_code=404, detail="List not found")

    # Check if the list owner's account is public
    owner = db.query(models.User).filter(models.User.id == lst.user_id).first()
    if not owner or not owner.is_public:
        raise HTTPException(status_code=403, detail="This user's map is private")

    if not lst.is_public:
        raise HTTPException(status_code=403, detail="This list is not public")

    # Return only public places from the list (eager load to avoid N+1)
    places = db.query(models.Place).options(
        joinedload(models.Place.tags),
        joinedload(models.Place.lists)
    ).filter(
        models.Place.lists.any(models.List.id == list_id),
        models.Place.is_public == True
    ).all()

    # Build list metadata
    list_data = schemas.ListWithPlaceCount(
        id=lst.id,
        user_id=lst.user_id,
        name=lst.name,
        color=lst.color,
        icon=lst.icon,
        is_public=lst.is_public,
        created_at=lst.created_at,
        place_count=len(places)
    )

    # Build owner profile
    owner_profile = schemas.PublicUserProfile(
        id=owner.id,
        name=owner.name,
        username=owner.username,
        bio=owner.bio,
        profile_image_url=owner.profile_image_url
    )

    return schemas.SharedListData(
        list=list_data,
        owner=owner_profile,
        places=places
    )


@router.get("/place/{place_id}", response_model=schemas.Place)
def get_shared_place(
    place_id: str,
    db: Session = Depends(get_db)
):
    """Get a single public place"""
    place = db.query(models.Place).options(
        joinedload(models.Place.tags),
        joinedload(models.Place.lists)
    ).filter(models.Place.id == place_id).first()

    if not place:
        raise HTTPException(status_code=404, detail="Place not found")

    # Check if the place owner's account is public
    owner = db.query(models.User).filter(models.User.id == place.user_id).first()
    if not owner or not owner.is_public:
        raise HTTPException(status_code=403, detail="This user's map is private")

    if not place.is_public:
        raise HTTPException(status_code=403, detail="This place is not public")

    return place


# Phase 3: Share Token Endpoints

@router.post("/token", response_model=schemas.ShareToken)
async def create_or_get_share_token(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create or retrieve the user's share token.
    If token exists, return it. Otherwise, create new one.
    """
    # Check if user already has a token
    existing = db.query(models.ShareToken).filter(
        models.ShareToken.user_id == current_user.id
    ).first()

    if existing:
        return existing

    # Generate unique token
    while True:
        token = models.generate_share_token()
        if not db.query(models.ShareToken).filter(models.ShareToken.token == token).first():
            break

    # Create new token
    share_token = models.ShareToken(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        token=token
    )
    db.add(share_token)
    db.commit()
    db.refresh(share_token)
    return share_token


@router.delete("/token", response_model=dict)
async def delete_share_token(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Delete (revoke) the user's share token. A new one can be generated later."""
    existing = db.query(models.ShareToken).filter(
        models.ShareToken.user_id == current_user.id
    ).first()

    if not existing:
        raise HTTPException(status_code=404, detail="No share token found")

    db.delete(existing)
    db.commit()
    return {"message": "Share token revoked"}


@router.post("/token/regenerate", response_model=schemas.ShareToken)
async def regenerate_share_token(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Delete existing token and generate a new one."""
    # Delete existing
    existing = db.query(models.ShareToken).filter(
        models.ShareToken.user_id == current_user.id
    ).first()

    if existing:
        db.delete(existing)
        db.flush()

    # Generate new unique token
    while True:
        token = models.generate_share_token()
        if not db.query(models.ShareToken).filter(models.ShareToken.token == token).first():
            break

    share_token = models.ShareToken(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        token=token
    )
    db.add(share_token)
    db.commit()
    db.refresh(share_token)
    return share_token


@router.get("/{token}", response_model=schemas.SharedMapData)
async def get_shared_map_by_token(
    token: str,
    db: Session = Depends(get_db)
):
    """
    Public endpoint: Get shared map data by token (NO AUTH REQUIRED).

    Returns user profile + public places + lists + tags.

    Privacy enforcement:
    - Only works if user.is_public = True (user's map must be public)
    - Only returns places where place.is_public = True (non-secret)
    """
    # Find token
    share_token = db.query(models.ShareToken).filter(
        models.ShareToken.token == token
    ).first()

    if not share_token:
        raise HTTPException(status_code=404, detail="Share link not found")

    # Get user
    user = db.query(models.User).filter(
        models.User.id == share_token.user_id
    ).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check if user's map is public
    if not user.is_public:
        raise HTTPException(
            status_code=403,
            detail="This map is private. The owner must set their map to public in settings."
        )

    # Get public places with eager loading (avoid N+1)
    places = db.query(models.Place).options(
        joinedload(models.Place.tags),
        joinedload(models.Place.lists)
    ).filter(
        models.Place.user_id == user.id,
        models.Place.is_public == True
    ).all()

    # Build a set of public place IDs for counting
    public_place_ids = {p.id for p in places}

    # Get public lists with counts calculated from already-loaded places
    lists = db.query(models.List).filter(
        models.List.user_id == user.id,
        models.List.is_public == True
    ).all()

    lists_with_counts = []
    for lst in lists:
        # Count public places in this list from the already-loaded places
        public_place_count = sum(
            1 for p in places if any(l.id == lst.id for l in p.lists)
        )
        lists_with_counts.append(schemas.ListWithPlaceCount(
            id=lst.id,
            user_id=lst.user_id,
            name=lst.name,
            color=lst.color,
            icon=lst.icon,
            is_public=lst.is_public,
            created_at=lst.created_at,
            place_count=public_place_count
        ))

    # Get tags with usage counts calculated from already-loaded places
    tags = db.query(models.Tag).filter(
        models.Tag.user_id == user.id
    ).all()

    tags_with_usage = []
    for tag in tags:
        public_usage_count = sum(
            1 for p in places if any(t.id == tag.id for t in p.tags)
        )
        tags_with_usage.append(schemas.TagWithUsage(
            id=tag.id,
            user_id=tag.user_id,
            name=tag.name,
            color=tag.color,
            icon=tag.icon,
            created_at=tag.created_at,
            usage_count=public_usage_count
        ))

    # Build public user profile
    public_profile = schemas.PublicUserProfile(
        id=user.id,
        name=user.name,
        username=user.username,
        bio=user.bio,
        profile_image_url=user.profile_image_url
    )

    # Return complete shared map data
    return schemas.SharedMapData(
        user=public_profile,
        places=places,
        lists=lists_with_counts,
        tags=tags_with_usage
    )
