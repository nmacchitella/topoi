from sqladmin import Admin, ModelView, BaseView, expose
from sqladmin.authentication import AuthenticationBackend
from starlette.requests import Request
from starlette.responses import RedirectResponse
from sqlalchemy.orm import Session
from database import engine, SessionLocal
from models import User, Place, List, Tag, RefreshToken, TelegramLink, TelegramLinkCode, Notification, ShareToken, UserFollow
from auth import verify_password
import secrets
import csv
import io


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

    column_list = [User.id, User.email, User.name, User.username, User.is_public, User.is_admin, User.oauth_provider, User.created_at]
    column_searchable_list = [User.email, User.name, User.username]
    column_sortable_list = [User.email, User.name, User.username, User.created_at, User.is_admin, User.is_public]
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


class NotificationAdmin(ModelView, model=Notification):
    name = "Notification"
    name_plural = "Notifications"
    icon = "fa-solid fa-bell"

    column_list = [Notification.id, Notification.recipient, Notification.type, Notification.title, Notification.is_read, Notification.created_at]
    column_searchable_list = [Notification.title, Notification.message, Notification.type]
    column_sortable_list = [Notification.created_at, Notification.is_read, Notification.type]
    column_default_sort = [(Notification.created_at, True)]

    can_create = True
    can_edit = True
    can_delete = True
    can_view_details = True


class ShareTokenAdmin(ModelView, model=ShareToken):
    name = "Share Token"
    name_plural = "Share Tokens"
    icon = "fa-solid fa-share-nodes"

    column_list = [ShareToken.id, ShareToken.owner, ShareToken.token, ShareToken.created_at]
    column_searchable_list = [ShareToken.token]
    column_sortable_list = [ShareToken.created_at]
    column_default_sort = [(ShareToken.created_at, True)]

    can_create = False  # Tokens should be created through the API
    can_edit = False  # Tokens should not be manually edited
    can_delete = True  # Allow deleting tokens
    can_view_details = True


class UserFollowAdmin(ModelView, model=UserFollow):
    name = "User Follow"
    name_plural = "User Follows"
    icon = "fa-solid fa-user-group"

    column_list = [UserFollow.id, UserFollow.follower, UserFollow.following_user, UserFollow.status, UserFollow.created_at]
    column_searchable_list = [UserFollow.status]
    column_sortable_list = [UserFollow.created_at, UserFollow.updated_at, UserFollow.status]
    column_default_sort = [(UserFollow.created_at, True)]

    can_create = False  # Follows should be created through the API
    can_edit = True  # Allow editing status
    can_delete = True  # Allow deleting follows
    can_view_details = True


# Seed account configurations
SEED_ACCOUNT_CONFIGS = {
    "michelin": {
        "email": "michelin@topoi.app",
        "name": "Michelin Guide",
        "username": "michelin_guide",
        "bio": "Official Michelin Guide selections",
    },
    "james_beard": {
        "email": "jamesbeard@topoi.app",
        "name": "James Beard Awards",
        "username": "james_beard_awards",
        "bio": "James Beard Award winners and nominees",
    },
}

TAG_COLORS = {
    "3 Stars": "#FFD700",
    "2 Stars": "#C0C0C0",
    "1 Star": "#CD7F32",
    "Bib Gourmand": "#E74C3C",
    "Selected Restaurants": "#3498DB",
    "Green Star": "#27AE60",
}
DEFAULT_TAG_COLOR = "#6B7280"


def parse_michelin_csv(content: str) -> list[dict]:
    """Parse Michelin CSV and return place data."""
    reader = csv.DictReader(io.StringIO(content))
    seen = set()
    places = []

    for row in reader:
        if not row.get("Name") or not row.get("Latitude") or not row.get("Longitude"):
            continue

        key = (row["Name"].strip().lower(), row.get("Address", "").strip().lower())
        if key in seen:
            continue
        seen.add(key)

        notes_parts = []
        if row.get("Award"):
            notes_parts.append(f"🏆 {row['Award']}")
        if row.get("GreenStar") == "1":
            notes_parts.append("🌿 Green Star (Sustainability)")
        if row.get("Price") and row["Price"] != "none":
            notes_parts.append(f"💰 {row['Price']}")
        if row.get("Description"):
            notes_parts.append("")
            notes_parts.append(row["Description"])

        tags = []
        if row.get("Award"):
            tags.append(row["Award"])
        if row.get("GreenStar") == "1":
            tags.append("Green Star")
        if row.get("Cuisine"):
            tags.extend([c.strip() for c in row["Cuisine"].split(",") if c.strip()])

        places.append({
            "name": row["Name"].strip(),
            "address": row.get("Address", "").strip() or row.get("Location", "").strip(),
            "latitude": float(row["Latitude"]),
            "longitude": float(row["Longitude"]),
            "phone": row.get("PhoneNumber") or None,
            "website": row.get("WebsiteUrl") or None,
            "notes": "\n".join(notes_parts),
            "tags": tags,
        })

    return places


def create_seed_account(db: Session, account_type: str, places_data: list[dict]) -> dict:
    """Create seed account with places and tags."""
    config = SEED_ACCOUNT_CONFIGS[account_type]

    user = db.query(User).filter(User.username == config["username"]).first()
    user_created = False

    if not user:
        user = User(
            email=config["email"],
            name=config["name"],
            username=config["username"],
            bio=config["bio"],
            is_verified=True,
            is_public=True,
            hashed_password=None,
        )
        db.add(user)
        db.flush()
        user_created = True

    tag_names = set()
    for place_data in places_data:
        tag_names.update(place_data.get("tags", []))

    existing_tags = db.query(Tag).filter(Tag.user_id == user.id).all()
    tag_map = {tag.name: tag for tag in existing_tags}
    tags_created = 0

    for name in tag_names:
        if name not in tag_map:
            color = TAG_COLORS.get(name, DEFAULT_TAG_COLOR)
            tag = Tag(user_id=user.id, name=name, color=color)
            db.add(tag)
            tag_map[name] = tag
            tags_created += 1

    db.flush()

    existing_places = db.query(Place).filter(Place.user_id == user.id).all()
    existing_keys = {(p.name.lower(), p.address.lower()) for p in existing_places}

    places_created = 0
    places_skipped = 0

    for place_data in places_data:
        key = (place_data["name"].lower(), place_data["address"].lower())
        if key in existing_keys:
            places_skipped += 1
            continue

        place = Place(
            user_id=user.id,
            name=place_data["name"],
            address=place_data["address"],
            latitude=place_data["latitude"],
            longitude=place_data["longitude"],
            phone=place_data.get("phone"),
            website=place_data.get("website"),
            notes=place_data.get("notes", ""),
            is_public=True,
        )
        db.add(place)
        db.flush()

        place.tags = [tag_map[t] for t in place_data.get("tags", []) if t in tag_map]
        places_created += 1

    db.commit()

    return {
        "user_id": user.id,
        "username": user.username,
        "user_created": user_created,
        "tags_created": tags_created,
        "places_created": places_created,
        "places_skipped": places_skipped,
    }


class SeedAccountView(BaseView):
    name = "Seed Account"
    icon = "fa-solid fa-seedling"

    @expose("/seed-account", methods=["GET", "POST"])
    async def seed_account(self, request: Request):
        result = None
        error = None

        if request.method == "POST":
            form = await request.form()
            account_type = form.get("account_type")
            file = form.get("file")

            if not account_type or not file:
                error = "Please select an account type and upload a CSV file"
            elif account_type not in SEED_ACCOUNT_CONFIGS:
                error = f"Unknown account type: {account_type}"
            else:
                try:
                    content = await file.read()
                    try:
                        content_str = content.decode("utf-8")
                    except UnicodeDecodeError:
                        content_str = content.decode("latin-1")

                    if account_type == "michelin":
                        places_data = parse_michelin_csv(content_str)
                    else:
                        error = f"CSV parser not implemented for: {account_type}"
                        places_data = []

                    if places_data and not error:
                        db = SessionLocal()
                        try:
                            result = create_seed_account(db, account_type, places_data)
                            result["total_rows_parsed"] = len(places_data)
                        finally:
                            db.close()
                    elif not error:
                        error = "No valid places found in CSV"
                except Exception as e:
                    error = f"Error processing CSV: {str(e)}"

        return await self.templates.TemplateResponse(
            request,
            "seed_account.html",
            context={
                "account_types": list(SEED_ACCOUNT_CONFIGS.keys()),
                "result": result,
                "error": error,
            },
        )


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
        base_url="/admin",
        logo_url="/static/favicon.ico"
    )

    # Register model views
    admin.add_view(UserAdmin)
    admin.add_view(PlaceAdmin)
    admin.add_view(ListAdmin)
    admin.add_view(TagAdmin)
    admin.add_view(RefreshTokenAdmin)
    admin.add_view(TelegramLinkAdmin)
    admin.add_view(TelegramLinkCodeAdmin)
    admin.add_view(NotificationAdmin)
    admin.add_view(ShareTokenAdmin)
    admin.add_view(UserFollowAdmin)

    # Register custom views
    admin.add_view(SeedAccountView)

    return admin
