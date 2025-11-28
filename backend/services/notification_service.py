"""
Phase 2: Notification Service
Centralized service for creating and managing notifications
"""

from sqlalchemy.orm import Session
from models import Notification, User
import uuid
from datetime import datetime
from typing import Optional, Dict, Any


class NotificationService:
    """Centralized service for creating notifications"""

    @staticmethod
    def create_notification(
        db: Session,
        user_id: str,
        notification_type: str,
        title: str,
        message: str,
        link: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Notification:
        """
        Create and save a notification.

        Args:
            db: Database session
            user_id: ID of user to notify
            notification_type: Type of notification (follow_request, new_follower, etc.)
            title: Notification title
            message: Notification message
            link: Optional link (e.g., to user profile)
            metadata: Optional metadata dictionary

        Returns:
            Created Notification object
        """
        notification = Notification(
            id=str(uuid.uuid4()),
            user_id=user_id,
            type=notification_type,
            title=title,
            message=message,
            link=link,
            data=metadata
        )
        db.add(notification)
        db.commit()
        db.refresh(notification)
        return notification

    @staticmethod
    def notify_new_follower(
        db: Session,
        followed_user_id: str,
        follower_name: str,
        follower_id: str
    ) -> Notification:
        """
        Notify user about a new follower (auto-approved, public map).

        Used when someone follows a user with a public map.
        """
        return NotificationService.create_notification(
            db=db,
            user_id=followed_user_id,
            notification_type="new_follower",
            title="New Follower",
            message=f"{follower_name} started following you",
            link=f"/users/{follower_id}",
            metadata={"actor_id": follower_id, "actor_name": follower_name}
        )

    @staticmethod
    def notify_follow_request(
        db: Session,
        target_user_id: str,
        requester_name: str,
        requester_id: str
    ) -> Notification:
        """
        Notify user about a follow request (private map).

        Used when someone requests to follow a user with a private map.
        """
        return NotificationService.create_notification(
            db=db,
            user_id=target_user_id,
            notification_type="follow_request",
            title="Follow Request",
            message=f"{requester_name} wants to follow you",
            link="/notifications",  # Will show in activity tab
            metadata={"actor_id": requester_id, "actor_name": requester_name}
        )

    @staticmethod
    def notify_request_accepted(
        db: Session,
        requester_id: str,
        accepter_name: str,
        accepter_id: str
    ) -> Notification:
        """
        Notify requester that their follow request was accepted.

        Used when a user accepts a follow request.
        """
        return NotificationService.create_notification(
            db=db,
            user_id=requester_id,
            notification_type="follow_accepted",
            title="Follow Request Accepted",
            message=f"{accepter_name} accepted your follow request",
            link=f"/users/{accepter_id}",
            metadata={"actor_id": accepter_id, "actor_name": accepter_name}
        )
