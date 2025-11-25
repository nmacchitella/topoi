"""
Phase 4: Follow Service
Centralized service for managing user follow relationships
"""

from sqlalchemy.orm import Session
from models import User, UserFollow
from services.notification_service import NotificationService
import uuid


class FollowService:
    """Centralized service for follow relationship management"""

    @staticmethod
    def get_follow_relationship(db: Session, follower_id: str, following_id: str):
        """Get existing follow relationship"""
        return db.query(UserFollow).filter(
            UserFollow.follower_id == follower_id,
            UserFollow.following_id == following_id
        ).first()

    @staticmethod
    def create_follow(db: Session, follower_id: str, following_id: str, target_user: User):
        """
        Create a follow relationship.

        Logic:
        - If target user is public → status='confirmed'
        - If target user is private → status='pending'
        - Send appropriate notification
        """
        if target_user.is_public:
            status = 'confirmed'
        else:
            status = 'pending'

        follow = UserFollow(
            id=str(uuid.uuid4()),
            follower_id=follower_id,
            following_id=following_id,
            status=status
        )
        db.add(follow)
        db.commit()
        db.refresh(follow)

        # Send notification
        follower = db.query(User).filter(User.id == follower_id).first()
        if status == 'confirmed':
            NotificationService.notify_new_follower(
                db=db,
                followed_user_id=following_id,
                follower_name=follower.name,
                follower_id=follower_id
            )
        else:
            NotificationService.notify_follow_request(
                db=db,
                target_user_id=following_id,
                requester_name=follower.name,
                requester_id=follower_id
            )

        return follow

    @staticmethod
    def approve_follow(db: Session, follow: UserFollow):
        """Approve a pending follow request"""
        follow.status = 'confirmed'
        db.commit()

        # Notify requester
        approver = db.query(User).filter(User.id == follow.following_id).first()
        NotificationService.notify_request_accepted(
            db=db,
            requester_id=follow.follower_id,
            accepter_name=approver.name,
            accepter_id=approver.id
        )

    @staticmethod
    def decline_follow(db: Session, follow: UserFollow):
        """Decline a follow request"""
        follow.status = 'declined'
        db.commit()

    @staticmethod
    def unfollow(db: Session, follow: UserFollow):
        """Remove a follow relationship"""
        db.delete(follow)
        db.commit()

    @staticmethod
    def auto_confirm_pending_follows(db: Session, user_id: str):
        """
        Auto-confirm all pending follow requests when user goes public.
        Called when user changes is_public from False → True.
        """
        pending_follows = db.query(UserFollow).filter(
            UserFollow.following_id == user_id,
            UserFollow.status == 'pending'
        ).all()

        for follow in pending_follows:
            FollowService.approve_follow(db, follow)
