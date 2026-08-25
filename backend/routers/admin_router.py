from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from database import get_db
import schemas
import auth
import models
from typing import Literal
from services.seed_account_service import (
    SEED_ACCOUNT_CONFIGS,
    create_seed_account,
    parse_michelin_csv,
)

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


@router.post("/seed-account")
async def seed_account(
    account_type: Literal["michelin", "james_beard"] = Form(...),
    file: UploadFile = File(...),
    current_user: schemas.User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    """
    Seed a curated account from CSV file.

    - **account_type**: Type of account (michelin, james_beard)
    - **file**: CSV file with place data

    Requires admin privileges.
    """
    if account_type not in SEED_ACCOUNT_CONFIGS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown account type: {account_type}"
        )

    # Read file content
    content = await file.read()
    try:
        content_str = content.decode("utf-8")
    except UnicodeDecodeError:
        content_str = content.decode("latin-1")

    # Parse CSV based on account type
    if account_type == "michelin":
        places_data = parse_michelin_csv(content_str)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"CSV parser not implemented for: {account_type}"
        )

    if not places_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid places found in CSV"
        )

    # Create account and places
    result = create_seed_account(db, account_type, places_data)

    return {
        "message": "Seed account created successfully",
        "account_type": account_type,
        "total_rows_parsed": len(places_data),
        **result
    }
