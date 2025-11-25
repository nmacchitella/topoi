"""
Phase 4: Users Router
API endpoints for user discovery, search, and follow management
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from auth import get_current_user
import models
import schemas
from services.follow_service import FollowService

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/search", response_model=List[schemas.UserSearchResult])
async def search_users(
    q: str = Query(..., min_length=2, description="Search query (username or name)"),
    limit: int = Query(20, le=50),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Search for users by username or name.
    Returns basic profile info only.
    """
    query = db.query(models.User).filter(
        models.User.id != current_user.id  # Exclude self
    )

    # Search by username or name (case-insensitive)
    search_filter = (
        models.User.username.ilike(f"%{q}%") |
        models.User.name.ilike(f"%{q}%")
    )

    users = query.filter(search_filter).limit(limit).all()

    return [
        schemas.UserSearchResult(
            id=user.id,
            name=user.name,
            username=user.username,
            profile_image_url=user.profile_image_url,
            is_public=user.is_public
        )
        for user in users
    ]


@router.get("/{user_id}", response_model=schemas.UserProfilePublic)
async def get_user_profile(
    user_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get public profile of any user.
    Includes follow status relative to current user.
    """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Count followers and following
    follower_count = db.query(models.UserFollow).filter(
        models.UserFollow.following_id == user_id,
        models.UserFollow.status == 'confirmed'
    ).count()

    following_count = db.query(models.UserFollow).filter(
        models.UserFollow.follower_id == user_id,
        models.UserFollow.status == 'confirmed'
    ).count()

    # Check current user's relationship
    follow_rel = FollowService.get_follow_relationship(
        db, current_user.id, user_id
    )

    is_followed = follow_rel is not None and follow_rel.status == 'confirmed'
    follow_status = follow_rel.status if follow_rel else None

    return schemas.UserProfilePublic(
        id=user.id,
        name=user.name,
        username=user.username,
        bio=user.bio,
        profile_image_url=user.profile_image_url,
        is_public=user.is_public,
        follower_count=follower_count,
        following_count=following_count,
        is_followed_by_me=is_followed,
        follow_status=follow_status
    )


@router.post("/follow", response_model=schemas.FollowResponse)
async def follow_user(
    request: schemas.FollowRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Follow a user.
    - If target is public → instant follow (status='confirmed')
    - If target is private → request (status='pending')
    """
    if request.user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")

    target_user = db.query(models.User).filter(models.User.id == request.user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check if already following
    existing = FollowService.get_follow_relationship(db, current_user.id, request.user_id)
    if existing:
        if existing.status == 'confirmed':
            raise HTTPException(status_code=400, detail="Already following this user")
        elif existing.status == 'pending':
            raise HTTPException(status_code=400, detail="Follow request already sent")
        elif existing.status == 'declined':
            # Allow re-requesting after decline
            db.delete(existing)
            db.commit()

    # Create follow
    follow = FollowService.create_follow(
        db=db,
        follower_id=current_user.id,
        following_id=request.user_id,
        target_user=target_user
    )

    if follow.status == 'confirmed':
        return schemas.FollowResponse(
            status='confirmed',
            message=f"You are now following {target_user.name}"
        )
    else:
        return schemas.FollowResponse(
            status='pending',
            message=f"Follow request sent to {target_user.name}"
        )


@router.post("/unfollow/{user_id}")
async def unfollow_user(
    user_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Unfollow a user"""
    follow = FollowService.get_follow_relationship(db, current_user.id, user_id)
    if not follow:
        raise HTTPException(status_code=404, detail="Not following this user")

    FollowService.unfollow(db, follow)
    return {"message": "Unfollowed successfully"}


@router.get("/me/followers", response_model=List[schemas.UserSearchResult])
async def get_my_followers(
    status: str = Query('confirmed', pattern='^(pending|confirmed)$'),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get list of users following me.
    status='pending' returns follow requests.
    status='confirmed' returns actual followers.
    """
    follows = db.query(models.UserFollow).filter(
        models.UserFollow.following_id == current_user.id,
        models.UserFollow.status == status
    ).all()

    follower_ids = [f.follower_id for f in follows]
    users = db.query(models.User).filter(models.User.id.in_(follower_ids)).all()

    return [
        schemas.UserSearchResult(
            id=user.id,
            name=user.name,
            username=user.username,
            profile_image_url=user.profile_image_url,
            is_public=user.is_public
        )
        for user in users
    ]


@router.get("/me/following", response_model=List[schemas.UserSearchResult])
async def get_my_following(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of users I'm following (confirmed only)"""
    follows = db.query(models.UserFollow).filter(
        models.UserFollow.follower_id == current_user.id,
        models.UserFollow.status == 'confirmed'
    ).all()

    following_ids = [f.following_id for f in follows]
    users = db.query(models.User).filter(models.User.id.in_(following_ids)).all()

    return [
        schemas.UserSearchResult(
            id=user.id,
            name=user.name,
            username=user.username,
            profile_image_url=user.profile_image_url,
            is_public=user.is_public
        )
        for user in users
    ]


@router.post("/followers/{follower_id}/approve")
async def approve_follower(
    follower_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Approve a pending follow request"""
    follow = db.query(models.UserFollow).filter(
        models.UserFollow.follower_id == follower_id,
        models.UserFollow.following_id == current_user.id,
        models.UserFollow.status == 'pending'
    ).first()

    if not follow:
        raise HTTPException(status_code=404, detail="Follow request not found")

    FollowService.approve_follow(db, follow)
    return {"message": "Follow request approved"}


@router.post("/followers/{follower_id}/decline")
async def decline_follower(
    follower_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Decline a pending follow request"""
    follow = db.query(models.UserFollow).filter(
        models.UserFollow.follower_id == follower_id,
        models.UserFollow.following_id == current_user.id,
        models.UserFollow.status == 'pending'
    ).first()

    if not follow:
        raise HTTPException(status_code=404, detail="Follow request not found")

    FollowService.decline_follow(db, follow)
    return {"message": "Follow request declined"}
