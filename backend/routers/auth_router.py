from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from database import get_db, get_settings
import schemas
import auth

router = APIRouter(prefix="/auth", tags=["authentication"])
settings = get_settings()


@router.post("/register", response_model=schemas.User)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    """Register a new user"""
    db_user = auth.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    return auth.create_user(db=db, user=user)


@router.post("/login", response_model=schemas.Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """Login and get access token"""
    user = auth.authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = auth.create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/login-json", response_model=schemas.Token)
def login_json(user_login: schemas.UserLogin, db: Session = Depends(get_db)):
    """Login with JSON payload (alternative to form data)"""
    user = auth.authenticate_user(db, user_login.email, user_login.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=settings.access_token_expire_minutes)
    access_token = auth.create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=schemas.User)
def get_current_user_info(current_user: schemas.User = Depends(auth.get_current_user)):
    """Get current user information"""
    return current_user


@router.put("/me", response_model=schemas.User)
def update_current_user(
    user_update: schemas.UserUpdate,
    current_user: schemas.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Update current user information"""
    db_user = db.query(auth.models.User).filter(auth.models.User.id == current_user.id).first()

    if user_update.name is not None:
        db_user.name = user_update.name

    if user_update.email is not None:
        # Check if email is already taken by another user
        existing_user = auth.get_user_by_email(db, user_update.email)
        if existing_user and existing_user.id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already in use"
            )
        db_user.email = user_update.email

    db.commit()
    db.refresh(db_user)
    return db_user


@router.put("/me/password")
def change_password(
    password_change: schemas.PasswordChange,
    current_user: schemas.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Change current user password"""
    db_user = db.query(auth.models.User).filter(auth.models.User.id == current_user.id).first()

    # Verify current password
    if not auth.verify_password(password_change.current_password, db_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect"
        )

    # Update password
    db_user.hashed_password = auth.get_password_hash(password_change.new_password)
    db.commit()

    return {"message": "Password updated successfully"}


@router.delete("/me")
def delete_current_user(
    current_user: schemas.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Delete current user account"""
    db_user = db.query(auth.models.User).filter(auth.models.User.id == current_user.id).first()
    db.delete(db_user)
    db.commit()
    return {"message": "Account deleted successfully"}
