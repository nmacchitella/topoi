from sqladmin import Admin, ModelView
from sqladmin.authentication import AuthenticationBackend
from starlette.requests import Request
from starlette.responses import RedirectResponse
from sqlalchemy.orm import Session
from database import engine, SessionLocal
from models import User, Place, List, Tag, RefreshToken, TelegramLink, TelegramLinkCode
from auth import verify_password
import secrets


class AdminAuth(AuthenticationBackend):
    async def login(self, request: Request) -> bool:
        form = await request.form()
        email = form.get("username")  # SQLAdmin uses 'username' field
        password = form.get("password")

        db: Session = SessionLocal()
        try:
            user = db.query(User).filter(User.email == email).first()
            if not user:
                return False

            # Check password
            if not user.hashed_password or not verify_password(password, user.hashed_password):
                return False

            # Check if user is admin
            if not user.is_admin:
                return False

            # Store user info in session
            request.session.update({"user_id": user.id, "user_email": user.email})
            return True
        finally:
            db.close()

    async def logout(self, request: Request) -> bool:
        request.session.clear()
        return True

    async def authenticate(self, request: Request) -> bool:
        user_id = request.session.get("user_id")
        if not user_id:
            return False

        # Verify user still exists and is still admin
        db: Session = SessionLocal()
        try:
            user = db.query(User).filter(User.id == user_id).first()
            if not user or not user.is_admin:
                request.session.clear()
                return False
            return True
        finally:
            db.close()


# Admin views for each model
class UserAdmin(ModelView, model=User):
    name = "User"
    name_plural = "Users"
    icon = "fa-solid fa-user"

    column_list = [User.id, User.email, User.name, User.is_admin, User.oauth_provider, User.created_at]
    column_searchable_list = [User.email, User.name]
    column_sortable_list = [User.email, User.name, User.created_at, User.is_admin]
    column_default_sort = [(User.created_at, True)]

    # Don't show password hash in forms
    form_excluded_columns = [User.hashed_password, User.places, User.lists, User.tags, User.refresh_tokens]

    can_create = True
    can_edit = True
    can_delete = True
    can_view_details = True


class PlaceAdmin(ModelView, model=Place):
    name = "Place"
    name_plural = "Places"
    icon = "fa-solid fa-location-dot"

    column_list = [Place.id, Place.name, Place.address, Place.owner, Place.is_public, Place.created_at]
    column_searchable_list = [Place.name, Place.address, Place.notes]
    column_sortable_list = [Place.name, Place.created_at, Place.is_public]
    column_default_sort = [(Place.created_at, True)]

    can_create = True
    can_edit = True
    can_delete = True
    can_view_details = True


class ListAdmin(ModelView, model=List):
    name = "List"
    name_plural = "Lists"
    icon = "fa-solid fa-list"

    column_list = [List.id, List.name, List.color, List.icon, List.owner, List.is_public, List.created_at]
    column_searchable_list = [List.name]
    column_sortable_list = [List.name, List.created_at, List.is_public]
    column_default_sort = [(List.created_at, True)]

    can_create = True
    can_edit = True
    can_delete = True
    can_view_details = True


class TagAdmin(ModelView, model=Tag):
    name = "Tag"
    name_plural = "Tags"
    icon = "fa-solid fa-tag"

    column_list = [Tag.id, Tag.name, Tag.owner, Tag.created_at]
    column_searchable_list = [Tag.name]
    column_sortable_list = [Tag.name, Tag.created_at]
    column_default_sort = [(Tag.created_at, True)]

    can_create = True
    can_edit = True
    can_delete = True
    can_view_details = True


class RefreshTokenAdmin(ModelView, model=RefreshToken):
    name = "Refresh Token"
    name_plural = "Refresh Tokens"
    icon = "fa-solid fa-key"

    column_list = [RefreshToken.id, RefreshToken.owner, RefreshToken.expires_at, RefreshToken.revoked, RefreshToken.created_at]
    column_searchable_list = [RefreshToken.token]
    column_sortable_list = [RefreshToken.created_at, RefreshToken.expires_at, RefreshToken.revoked]
    column_default_sort = [(RefreshToken.created_at, True)]

    can_create = False  # Tokens should be created through the API
    can_edit = True  # Allow revoking tokens
    can_delete = True
    can_view_details = True


class TelegramLinkAdmin(ModelView, model=TelegramLink):
    name = "Telegram Link"
    name_plural = "Telegram Links"
    icon = "fa-brands fa-telegram"

    column_list = [TelegramLink.user_id, TelegramLink.telegram_id, TelegramLink.telegram_username, TelegramLink.created_at]
    column_searchable_list = [TelegramLink.telegram_username]
    column_sortable_list = [TelegramLink.created_at]
    column_default_sort = [(TelegramLink.created_at, True)]

    can_create = True
    can_edit = True
    can_delete = True
    can_view_details = True


class TelegramLinkCodeAdmin(ModelView, model=TelegramLinkCode):
    name = "Telegram Link Code"
    name_plural = "Telegram Link Codes"
    icon = "fa-solid fa-code"

    column_list = [TelegramLinkCode.code, TelegramLinkCode.user_id, TelegramLinkCode.expires_at, TelegramLinkCode.created_at]
    column_sortable_list = [TelegramLinkCode.created_at, TelegramLinkCode.expires_at]
    column_default_sort = [(TelegramLinkCode.created_at, True)]

    can_create = False  # Codes should be created through the API
    can_edit = False
    can_delete = True
    can_view_details = True


def create_admin(app):
    """Create and configure the admin interface"""
    # Create authentication backend
    authentication_backend = AdminAuth(secret_key=secrets.token_urlsafe(32))

    # Create admin instance with base_url to ensure HTTPS URLs
    admin = Admin(
        app=app,
        engine=engine,
        title="Topoi Admin",
        authentication_backend=authentication_backend,
        templates_dir="templates",
        base_url="/admin"
    )

    # Register model views
    admin.add_view(UserAdmin)
    admin.add_view(PlaceAdmin)
    admin.add_view(ListAdmin)
    admin.add_view(TagAdmin)
    admin.add_view(RefreshTokenAdmin)
    admin.add_view(TelegramLinkAdmin)
    admin.add_view(TelegramLinkCodeAdmin)

    return admin
