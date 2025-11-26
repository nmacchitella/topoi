"""
Phase 2: Notifications Router
API endpoints for notification management
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
import auth
import models
import schemas

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=List[schemas.Notification])
async def get_notifications(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Get user's notifications, ordered by most recent first.

    Query Parameters:
    - skip: Number of notifications to skip (for pagination)
    - limit: Maximum number of notifications to return (default: 50, max: 100)
    """
    if limit > 100:
        limit = 100

    notifications = db.query(models.Notification)\
        .filter(models.Notification.user_id == current_user.id)\
        .order_by(models.Notification.created_at.desc())\
        .offset(skip)\
        .limit(limit)\
        .all()

    return notifications


@router.get("/unread-count", response_model=dict)
async def get_unread_count(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Get count of unread notifications for current user.

    Returns:
    {
        "count": 5
    }
    """
    count = db.query(models.Notification)\
        .filter(
            models.Notification.user_id == current_user.id,
            models.Notification.is_read == False
        )\
        .count()

    return {"count": count}


@router.post("/mark-read", response_model=dict)
async def mark_notifications_read(
    request: schemas.NotificationMarkRead,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Mark specific notifications as read.

    Body:
    {
        "notification_ids": ["id1", "id2", "id3"]
    }

    Returns:
    {
        "marked_read": 3
    }
    """
    # Verify all notifications belong to current user
    notifications = db.query(models.Notification)\
        .filter(
            models.Notification.id.in_(request.notification_ids),
            models.Notification.user_id == current_user.id
        )\
        .all()

    if len(notifications) != len(request.notification_ids):
        raise HTTPException(
            status_code=404,
            detail="One or more notifications not found or do not belong to you"
        )

    # Mark as read
    for notification in notifications:
        notification.is_read = True

    db.commit()

    return {"marked_read": len(notifications)}


@router.post("/mark-all-read", response_model=dict)
async def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Mark all user's notifications as read.

    Returns:
    {
        "marked_read": 10
    }
    """
    count = db.query(models.Notification)\
        .filter(
            models.Notification.user_id == current_user.id,
            models.Notification.is_read == False
        )\
        .update({"is_read": True})

    db.commit()

    return {"marked_read": count}


@router.delete("/{notification_id}", response_model=dict)
async def delete_notification(
    notification_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Delete a specific notification.

    Returns:
    {
        "message": "Notification deleted successfully"
    }
    """
    notification = db.query(models.Notification)\
        .filter(
            models.Notification.id == notification_id,
            models.Notification.user_id == current_user.id
        )\
        .first()

    if not notification:
        raise HTTPException(
            status_code=404,
            detail="Notification not found"
        )

    db.delete(notification)
    db.commit()

    return {"message": "Notification deleted successfully"}
