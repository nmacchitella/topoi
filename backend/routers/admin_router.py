from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from database import get_db
import schemas
import auth
import models

router = APIRouter(prefix="/admin", tags=["admin"])


def get_current_admin_user(current_user: schemas.User = Depends(auth.get_current_user)):
    """Dependency to ensure the current user is an admin"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user


@router.post("/promote-user/{user_id}")
def promote_user_to_admin(
    user_id: str,
    current_user: schemas.User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Promote a user to admin (requires admin privileges)"""
    target_user = db.query(models.User).filter(models.User.id == user_id).first()

    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    if target_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already an admin"
        )

    target_user.is_admin = True
    db.commit()
    db.refresh(target_user)

    return {
        "message": f"User {target_user.email} has been promoted to admin",
        "user": target_user
    }


@router.post("/demote-user/{user_id}")
def demote_user_from_admin(
    user_id: str,
    current_user: schemas.User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """Demote a user from admin (requires admin privileges)"""
    # Prevent self-demotion
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot demote yourself"
        )

    target_user = db.query(models.User).filter(models.User.id == user_id).first()

    if not target_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    if not target_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not an admin"
        )

    target_user.is_admin = False
    db.commit()
    db.refresh(target_user)

    return {
        "message": f"User {target_user.email} has been demoted from admin",
        "user": target_user
    }


@router.get("/users", response_model=list[schemas.User])
def list_all_users(
    skip: int = 0,
    limit: int = 100,
    current_user: schemas.User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """List all users (requires admin privileges)"""
    users = db.query(models.User).offset(skip).limit(limit).all()
    return users
