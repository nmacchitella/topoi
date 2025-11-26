from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Float, DateTime, Table, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import uuid
import secrets


def generate_uuid():
    return str(uuid.uuid4())


def generate_share_token():
    """Generate a short, URL-safe token (8 characters)"""
    return secrets.token_urlsafe(6)  # ~8 chars


# Association table for many-to-many relationship between places and lists
place_lists = Table(
    'place_lists',
    Base.metadata,
    Column('place_id', String, ForeignKey('places.id', ondelete='CASCADE')),
    Column('list_id', String, ForeignKey('lists.id', ondelete='CASCADE'))
)

# Association table for many-to-many relationship between places and tags
place_tags = Table(
    'place_tags',
    Base.metadata,
    Column('place_id', String, ForeignKey('places.id', ondelete='CASCADE')),
    Column('tag_id', String, ForeignKey('tags.id', ondelete='CASCADE'))
)


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=True)  # Nullable for OAuth users
    oauth_provider = Column(String, nullable=True)  # 'google', 'github', etc.
    oauth_id = Column(String, nullable=True)  # Provider-specific user ID
    is_admin = Column(Boolean, default=False, nullable=False)  # Admin privileges
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Phase 1: Profile and Privacy fields
    is_public = Column(Boolean, default=False, nullable=False)  # Map visibility (Private by default)
    username = Column(String, unique=True, nullable=True, index=True)  # Optional unique username
    bio = Column(String, nullable=True)  # Profile bio
    profile_image_url = Column(String, nullable=True)  # Future: profile photos

    # Relationships
    places = relationship("Place", back_populates="owner", cascade="all, delete-orphan")
    lists = relationship("List", back_populates="owner", cascade="all, delete-orphan")
    tags = relationship("Tag", back_populates="owner", cascade="all, delete-orphan")
    refresh_tokens = relationship("RefreshToken", back_populates="owner", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="recipient", cascade="all, delete-orphan")  # Phase 2
    share_token = relationship("ShareToken", back_populates="owner", uselist=False, cascade="all, delete-orphan")  # Phase 3
    following = relationship("UserFollow", foreign_keys="UserFollow.follower_id", back_populates="follower", cascade="all, delete-orphan")  # Phase 4
    followers = relationship("UserFollow", foreign_keys="UserFollow.following_id", back_populates="following_user", cascade="all, delete-orphan")  # Phase 4


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


class List(Base):
    __tablename__ = "lists"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete='CASCADE'), nullable=False)
    name = Column(String, nullable=False)
    color = Column(String, default="#3B82F6")  # hex color
    icon = Column(String, nullable=True)  # emoji or icon identifier
    is_public = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    owner = relationship("User", back_populates="lists")
    places = relationship("Place", secondary=place_lists, back_populates="lists")


class Tag(Base):
    __tablename__ = "tags"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete='CASCADE'), nullable=False)
    name = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    owner = relationship("User", back_populates="tags")
    places = relationship("Place", secondary=place_tags, back_populates="tags")


class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(String, primary_key=True, default=generate_uuid)
    token = Column(String, unique=True, index=True, nullable=False)
    user_id = Column(String, ForeignKey("users.id", ondelete='CASCADE'), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    revoked = Column(Boolean, default=False)

    # Relationships
    owner = relationship("User", back_populates="refresh_tokens")


class TelegramLink(Base):
    __tablename__ = "telegram_links"

    user_id = Column(String, ForeignKey("users.id", ondelete='CASCADE'), primary_key=True)
    telegram_id = Column(String, unique=True, nullable=False, index=True)
    telegram_username = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class TelegramLinkCode(Base):
    __tablename__ = "telegram_link_codes"

    code = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id", ondelete='CASCADE'), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


# Phase 2: Notifications
class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete='CASCADE'), nullable=False)
    type = Column(String, nullable=False)  # 'follow_request', 'follow_accepted', 'new_follower'
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    link = Column(String, nullable=True)  # Optional deep link
    is_read = Column(Boolean, default=False)
    data = Column('metadata', JSON, nullable=True)  # JSON for extensibility, stored as 'metadata' in DB
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship
    recipient = relationship("User", back_populates="notifications")


# Phase 3: Share Tokens
class ShareToken(Base):
    __tablename__ = "share_tokens"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete='CASCADE'), unique=True, nullable=False)
    token = Column(String, unique=True, index=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship
    owner = relationship("User", back_populates="share_token")


# Phase 4: User Follows
class UserFollow(Base):
    __tablename__ = "user_follows"

    id = Column(String, primary_key=True, default=generate_uuid)
    follower_id = Column(String, ForeignKey("users.id", ondelete='CASCADE'), nullable=False)
    following_id = Column(String, ForeignKey("users.id", ondelete='CASCADE'), nullable=False)
    status = Column(String, nullable=False)  # 'pending', 'confirmed', 'declined'
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    follower = relationship("User", foreign_keys=[follower_id], back_populates="following")
    following_user = relationship("User", foreign_keys=[following_id], back_populates="followers")
