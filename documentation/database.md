# Database Schema

Topoi uses SQLAlchemy ORM with SQLite as the default database. The schema supports places, collections, tags, authentication, social features, and integrations.

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER                                            │
│  id (PK) │ email │ name │ hashed_password │ oauth_provider │ is_verified   │
│  is_admin │ is_public │ username │ bio │ profile_image_url                  │
└────────────────────────────────────┬────────────────────────────────────────┘
                                     │
          ┌──────────────────────────┼──────────────────────────┐
          │                          │                          │
          │ 1:N                      │ 1:N                      │ 1:N
          ▼                          ▼                          ▼
┌─────────────────┐        ┌─────────────────┐        ┌─────────────────┐
│      PLACE      │        │      LIST       │        │      TAG        │
│  id (PK)        │        │  id (PK)        │        │  id (PK)        │
│  user_id (FK)   │        │  user_id (FK)   │        │  user_id (FK)   │
│  name, address  │        │  name, color    │        │  name, color    │
│  lat, lng       │        │  icon, is_public│        │  icon           │
│  notes, phone   │        └────────┬────────┘        └────────┬────────┘
│  website, hours │                 │                          │
│  is_public      │                 │                          │
└────────┬────────┘                 │ M:N                      │ M:N
         │                          │                          │
         │         ┌────────────────┴──────────────────────────┘
         │         │
         │         ▼
         │  ┌─────────────────┐  ┌─────────────────┐
         │  │   PLACE_LISTS   │  │   PLACE_TAGS    │
         │  │  place_id (FK)  │  │  place_id (FK)  │
         │  │  list_id (FK)   │  │  tag_id (FK)    │
         │  └─────────────────┘  └─────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           AUTH & SOCIAL TABLES                               │
├─────────────────┬─────────────────┬─────────────────┬───────────────────────┤
│ REFRESH_TOKEN   │ VERIFICATION    │ TELEGRAM_LINK   │ TELEGRAM_LINK_CODE    │
│ id, token       │ TOKEN           │ user_id (FK,PK) │ code (PK)             │
│ user_id (FK)    │ token (PK)      │ telegram_id     │ user_id (FK)          │
│ expires_at      │ user_id (FK)    │ telegram_user   │ expires_at            │
│ revoked         │ type, expires   │                 │                       │
├─────────────────┴─────────────────┴─────────────────┴───────────────────────┤
│                                                                             │
│ NOTIFICATION        │ SHARE_TOKEN         │ USER_FOLLOW                     │
│ id, user_id (FK)    │ id, user_id (FK)    │ id, follower_id (FK)            │
│ type, title, msg    │ token (unique)      │ following_id (FK)               │
│ link, is_read       │                     │ status (pending/confirmed)      │
│ metadata (JSON)     │                     │                                 │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Models

### User

Primary user account model supporting both email/password and OAuth authentication.

```python
class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=True)  # Null for OAuth users
    oauth_provider = Column(String, nullable=True)   # 'google', etc.
    oauth_id = Column(String, nullable=True)
    is_admin = Column(Boolean, default=False, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Profile fields
    is_public = Column(Boolean, default=False, nullable=False)  # Public map visibility
    username = Column(String, unique=True, nullable=True, index=True)
    bio = Column(String, nullable=True)
    profile_image_url = Column(String, nullable=True)

    # Relationships
    places = relationship("Place", back_populates="owner", cascade="all, delete-orphan")
    lists = relationship("List", back_populates="owner", cascade="all, delete-orphan")
    tags = relationship("Tag", back_populates="owner", cascade="all, delete-orphan")
    refresh_tokens = relationship("RefreshToken", back_populates="owner", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="recipient", cascade="all, delete-orphan")
    share_token = relationship("ShareToken", back_populates="owner", uselist=False, cascade="all, delete-orphan")
    following = relationship("UserFollow", foreign_keys="UserFollow.follower_id", back_populates="follower", cascade="all, delete-orphan")
    followers = relationship("UserFollow", foreign_keys="UserFollow.following_id", back_populates="following_user", cascade="all, delete-orphan")
```

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | String (UUID) | PK | Unique identifier |
| email | String | Unique, Indexed | User's email address |
| name | String | Required | Display name |
| hashed_password | String | Nullable | bcrypt hash (null for OAuth) |
| oauth_provider | String | Nullable | 'google', 'github', etc. |
| oauth_id | String | Nullable | Provider's user ID |
| is_admin | Boolean | Default: false | Admin privileges |
| is_verified | Boolean | Default: false | Email verified |
| is_public | Boolean | Default: false | Public map visibility |
| username | String | Unique, Nullable | Custom username |
| bio | String | Nullable | Profile bio |

### Place

Saved location with metadata and relationships to lists and tags.

```python
class Place(Base):
    __tablename__ = "places"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete='CASCADE'), nullable=False)
    name = Column(String, nullable=False)
    address = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    notes = Column(String, default="")
    phone = Column(String, nullable=True)
    website = Column(String, nullable=True)
    hours = Column(String, nullable=True)
    is_public = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    owner = relationship("User", back_populates="places")
    lists = relationship("List", secondary=place_lists, back_populates="places")
    tags = relationship("Tag", secondary=place_tags, back_populates="places")
```

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | String (UUID) | PK | Unique identifier |
| user_id | String | FK → users.id | Owner |
| name | String | Required | Place name |
| address | String | Required | Full address |
| latitude | Float | Required | Latitude coordinate |
| longitude | Float | Required | Longitude coordinate |
| notes | String | Default: "" | User notes |
| phone | String | Nullable | Phone number |
| website | String | Nullable | Website URL |
| hours | String | Nullable | Opening hours |
| is_public | Boolean | Default: true | Visibility |

### List (Collection)

User-defined collections for organizing places.

```python
class List(Base):
    __tablename__ = "lists"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete='CASCADE'), nullable=False)
    name = Column(String, nullable=False)
    color = Column(String, default="#3B82F6")
    icon = Column(String, nullable=True)
    is_public = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    owner = relationship("User", back_populates="lists")
    places = relationship("Place", secondary=place_lists, back_populates="lists")
```

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | String (UUID) | PK | Unique identifier |
| user_id | String | FK → users.id | Owner |
| name | String | Required | Collection name |
| color | String | Default: #3B82F6 | Hex color for markers |
| icon | String | Nullable | Emoji or icon ID |
| is_public | Boolean | Default: true | Visibility |

### Tag

Reusable labels for categorizing places.

```python
class Tag(Base):
    __tablename__ = "tags"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete='CASCADE'), nullable=False)
    name = Column(String, nullable=False)
    color = Column(String, default="#3B82F6")
    icon = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    owner = relationship("User", back_populates="tags")
    places = relationship("Place", secondary=place_tags, back_populates="tags")
```

### Association Tables

Many-to-many relationships between places and lists/tags.

```python
place_lists = Table(
    'place_lists',
    Base.metadata,
    Column('place_id', String, ForeignKey('places.id', ondelete='CASCADE')),
    Column('list_id', String, ForeignKey('lists.id', ondelete='CASCADE'))
)

place_tags = Table(
    'place_tags',
    Base.metadata,
    Column('place_id', String, ForeignKey('places.id', ondelete='CASCADE')),
    Column('tag_id', String, ForeignKey('tags.id', ondelete='CASCADE')),
    UniqueConstraint('place_id', 'tag_id', name='uq_place_tags')
)
```

### RefreshToken

Stores refresh tokens for JWT authentication.

```python
class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(String, primary_key=True, default=generate_uuid)
    token = Column(String, unique=True, index=True, nullable=False)
    user_id = Column(String, ForeignKey("users.id", ondelete='CASCADE'), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    revoked = Column(Boolean, default=False)

    owner = relationship("User", back_populates="refresh_tokens")
```

### VerificationToken

Handles email verification and password reset tokens.

```python
class VerificationToken(Base):
    __tablename__ = "verification_tokens"

    token = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id", ondelete='CASCADE'), nullable=False)
    type = Column(String, nullable=False)  # 'verify_email' or 'reset_password'
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
```

### TelegramLink

Links Telegram accounts to Topoi users.

```python
class TelegramLink(Base):
    __tablename__ = "telegram_links"

    user_id = Column(String, ForeignKey("users.id", ondelete='CASCADE'), primary_key=True)
    telegram_id = Column(String, unique=True, nullable=False, index=True)
    telegram_username = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
```

### TelegramLinkCode

Temporary codes for linking Telegram accounts.

```python
class TelegramLinkCode(Base):
    __tablename__ = "telegram_link_codes"

    code = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id", ondelete='CASCADE'), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
```

### Notification

User notifications for social features.

```python
class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete='CASCADE'), nullable=False)
    type = Column(String, nullable=False)  # 'follow_request', 'follow_accepted', etc.
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    link = Column(String, nullable=True)
    is_read = Column(Boolean, default=False)
    data = Column('metadata', JSON, nullable=True)  # Extensible data
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    recipient = relationship("User", back_populates="notifications")
```

### ShareToken

Unique tokens for sharing user's public map.

```python
class ShareToken(Base):
    __tablename__ = "share_tokens"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete='CASCADE'), unique=True, nullable=False)
    token = Column(String, unique=True, index=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    owner = relationship("User", back_populates="share_token")
```

### UserFollow

User follow relationships with approval workflow.

```python
class UserFollow(Base):
    __tablename__ = "user_follows"

    id = Column(String, primary_key=True, default=generate_uuid)
    follower_id = Column(String, ForeignKey("users.id", ondelete='CASCADE'), nullable=False)
    following_id = Column(String, ForeignKey("users.id", ondelete='CASCADE'), nullable=False)
    status = Column(String, nullable=False)  # 'pending', 'confirmed', 'declined'
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    follower = relationship("User", foreign_keys=[follower_id], back_populates="following")
    following_user = relationship("User", foreign_keys=[following_id], back_populates="followers")
```

## Database Operations

### Initialization

Tables are created automatically on first run:

```python
# main.py
Base.metadata.create_all(bind=engine)
```

### Reset Database

```bash
# Local development
cd backend
rm topoi.db
# Restart server - tables recreate automatically

# Production (Fly.io)
fly ssh console -a topoi-backend
rm /data/topoi.db
# Restart: fly apps restart topoi-backend
```

### Migrations

Currently using auto-create. For manual migrations:

```python
# Add new column
from sqlalchemy import text

with engine.connect() as conn:
    conn.execute(text("ALTER TABLE users ADD COLUMN new_field TEXT"))
    conn.commit()
```

### Common Queries

```python
# Get all places for a user with lists and tags loaded
places = db.query(Place).options(
    joinedload(Place.lists),
    joinedload(Place.tags)
).filter(Place.user_id == user_id).all()

# Get places in a specific list
places = db.query(Place).join(
    place_lists
).filter(
    place_lists.c.list_id == list_id
).all()

# Count places per tag
from sqlalchemy import func
tag_counts = db.query(
    Tag.id,
    Tag.name,
    func.count(place_tags.c.place_id).label('count')
).outerjoin(place_tags).group_by(Tag.id).all()

# Get users following someone
followers = db.query(UserFollow).filter(
    UserFollow.following_id == user_id,
    UserFollow.status == 'confirmed'
).all()
```

## Indexes

Key indexes for query performance:

| Table | Column(s) | Purpose |
|-------|-----------|---------|
| users | email | Login lookup |
| users | username | Profile lookup |
| refresh_tokens | token | Token validation |
| telegram_links | telegram_id | Bot user lookup |
| share_tokens | token | Share link lookup |

## Cascade Deletes

All child records are deleted when parent is deleted:

- `User` deletion → all places, lists, tags, tokens, notifications
- `Place` deletion → removed from all lists and tags (association only)
- `List` deletion → places remain, associations removed
- `Tag` deletion → places remain, associations removed

## Data Types

| SQLAlchemy Type | SQLite Type | Usage |
|-----------------|-------------|-------|
| String | TEXT | UUIDs, names, emails |
| Float | REAL | Coordinates |
| Boolean | INTEGER (0/1) | Flags |
| DateTime | TEXT (ISO 8601) | Timestamps |
| JSON | TEXT | Metadata storage |
