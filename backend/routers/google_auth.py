from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from authlib.integrations.starlette_client import OAuth
from pydantic import BaseModel
from database import get_db, get_settings
import auth
import models
import httpx
from datetime import timedelta


class GoogleMobileAuthRequest(BaseModel):
    """Request body for mobile Google authentication"""
    id_token: str

router = APIRouter(prefix="/auth/google", tags=["google-auth"])
settings = get_settings()

# Initialize OAuth
oauth = OAuth()
oauth.register(
    name='google',
    client_id=settings.google_client_id,
    client_secret=settings.google_client_secret,
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'}
)


@router.get("/login")
async def google_login():
    """Initiate Google OAuth flow"""
    if not settings.google_client_id or not settings.google_client_secret:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Google OAuth is not configured"
        )

    # Redirect to Google OAuth
    redirect_uri = f"{settings.backend_url}/api/auth/google/callback"
    authorization_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={settings.google_client_id}&"
        f"redirect_uri={redirect_uri}&"
        f"response_type=code&"
        f"scope=openid%20email%20profile&"
        f"access_type=offline"
    )

    return {"authorization_url": authorization_url}


@router.get("/callback")
async def google_callback(code: str, db: Session = Depends(get_db)):
    """Handle Google OAuth callback"""
    if not code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No authorization code provided"
        )

    try:
        # Exchange code for tokens
        token_url = "https://oauth2.googleapis.com/token"
        redirect_uri = f"{settings.backend_url}/api/auth/google/callback"

        async with httpx.AsyncClient() as client:
            token_response = await client.post(
                token_url,
                data={
                    "code": code,
                    "client_id": settings.google_client_id,
                    "client_secret": settings.google_client_secret,
                    "redirect_uri": redirect_uri,
                    "grant_type": "authorization_code",
                }
            )

            if token_response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to exchange code for token"
                )

            tokens = token_response.json()
            access_token = tokens.get("access_token")

            # Get user info from Google
            userinfo_response = await client.get(
                "https://www.googleapis.com/oauth2/v2/userinfo",
                headers={"Authorization": f"Bearer {access_token}"}
            )

            if userinfo_response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to get user info from Google"
                )

            user_info = userinfo_response.json()

            # Get or create user
            email = user_info.get("email")
            name = user_info.get("name", email.split("@")[0])
            google_id = user_info.get("id")

            # Check if user exists by email
            db_user = db.query(models.User).filter(models.User.email == email).first()

            if db_user:
                # User exists - link Google OAuth to existing account
                if not db_user.oauth_provider:
                    db_user.oauth_provider = "google"
                    db_user.oauth_id = google_id
                # Automatically verify OAuth users (Google has verified their email)
                if not db_user.is_verified:
                    db_user.is_verified = True
                db.commit()
                db.refresh(db_user)
            else:
                # User doesn't exist - create new OAuth-only user
                db_user = models.User(
                    email=email,
                    name=name,
                    hashed_password=None,  # No password for OAuth users
                    oauth_provider="google",
                    oauth_id=google_id,
                    is_verified=True  # OAuth users are auto-verified
                )
                db.add(db_user)
                db.commit()
                db.refresh(db_user)

            # Create token pair
            tokens = auth.create_token_pair(db_user, db)

            # Redirect to frontend with both tokens
            frontend_redirect = f"{settings.frontend_url}/auth/callback?token={tokens['access_token']}&refresh_token={tokens['refresh_token']}"
            return RedirectResponse(url=frontend_redirect)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"OAuth callback failed: {str(e)}"
        )


@router.post("/mobile")
async def google_mobile_auth(request: GoogleMobileAuthRequest, db: Session = Depends(get_db)):
    """
    Authenticate mobile app users with Google ID token.

    The mobile app obtains an ID token from Google using expo-auth-session,
    then sends it here. We verify the token with Google and return JWT tokens.
    """
    if not settings.google_client_id:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Google OAuth is not configured"
        )

    try:
        # Verify the ID token with Google
        async with httpx.AsyncClient() as client:
            # Google's tokeninfo endpoint verifies ID tokens
            verify_response = await client.get(
                f"https://oauth2.googleapis.com/tokeninfo?id_token={request.id_token}"
            )

            if verify_response.status_code != 200:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid Google ID token"
                )

            token_info = verify_response.json()

            # Verify the token was issued for our app (check audience)
            # The aud should match one of our client IDs (web or iOS)
            valid_client_ids = [
                settings.google_client_id,  # Web client ID
                "225541124646-uc53k8gb43olut5bab6keiksvtlri3ii.apps.googleusercontent.com",  # iOS client ID
            ]

            if token_info.get("aud") not in valid_client_ids:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Token was not issued for this application"
                )

            # Extract user info from the verified token
            email = token_info.get("email")
            name = token_info.get("name", email.split("@")[0] if email else "User")
            google_id = token_info.get("sub")  # Google's unique user ID

            if not email:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Email not available from Google token"
                )

            # Check if user exists by email
            db_user = db.query(models.User).filter(models.User.email == email).first()

            if db_user:
                # User exists - link Google OAuth to existing account if not already linked
                if not db_user.oauth_provider:
                    db_user.oauth_provider = "google"
                    db_user.oauth_id = google_id
                # Automatically verify OAuth users (Google has verified their email)
                if not db_user.is_verified:
                    db_user.is_verified = True
                db.commit()
                db.refresh(db_user)
            else:
                # User doesn't exist - create new OAuth-only user
                db_user = models.User(
                    email=email,
                    name=name,
                    hashed_password=None,  # No password for OAuth users
                    oauth_provider="google",
                    oauth_id=google_id,
                    is_verified=True  # OAuth users are auto-verified
                )
                db.add(db_user)
                db.commit()
                db.refresh(db_user)

            # Create token pair
            tokens = auth.create_token_pair(db_user, db)

            return {
                "access_token": tokens["access_token"],
                "refresh_token": tokens["refresh_token"],
                "token_type": "bearer",
                "user": {
                    "id": str(db_user.id),
                    "email": db_user.email,
                    "name": db_user.name,
                }
            }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Google mobile auth failed: {str(e)}"
        )
