import re
from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime


def validate_password_complexity(value: str) -> str:
    """Apply the shared password policy to every password-setting request."""
    if not re.search(r'[a-z]', value):
        raise ValueError('Password must contain at least one lowercase letter')
    if not re.search(r'[A-Z]', value):
        raise ValueError('Password must contain at least one uppercase letter')
    if not re.search(r'\d', value):
        raise ValueError('Password must contain at least one digit')
    return value


# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    name: str


class UserCreate(UserBase):
    password: str = Field(..., min_length=8)

    @field_validator('password')
    @classmethod
    def password_complexity(cls, v: str) -> str:
        return validate_password_complexity(v)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResendVerificationRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)

    @field_validator('new_password')
    @classmethod
    def password_complexity(cls, v: str) -> str:
        return validate_password_complexity(v)


class User(UserBase):
    id: str
    is_admin: bool = False
    created_at: datetime
    username: Optional[str] = None
    bio: Optional[str] = None
    is_public: bool = False
    profile_image_url: Optional[str] = None

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)

    @field_validator('new_password')
    @classmethod
    def password_complexity(cls, v: str) -> str:
        return validate_password_complexity(v)


# Phase 1: Profile schemas
class UserProfileUpdate(BaseModel):
    """Schema for updating user profile settings"""
    name: Optional[str] = None
    username: Optional[str] = Field(None, min_length=3, max_length=30, pattern="^[a-zA-Z0-9_]+$")
    bio: Optional[str] = Field(None, max_length=500)
    is_public: Optional[bool] = None


class UserProfile(User):
    """Extended user schema with profile info"""
    follower_count: int = 0
    following_count: int = 0


# Tag Schemas
class TagBase(BaseModel):
    name: str
    color: str = Field("#3B82F6", pattern=r'^#[0-9A-Fa-f]{6}$')
    icon: Optional[str] = None


class TagCreate(TagBase):
    pass


class TagUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = Field(None, pattern=r'^#[0-9A-Fa-f]{6}$')
    icon: Optional[str] = None


class Tag(TagBase):
    id: str
    user_id: str
    created_at: datetime

    class Config:
        from_attributes = True


class TagWithUsage(Tag):
    usage_count: int = 0


# List Schemas
class ListBase(BaseModel):
    name: str
    color: str = Field("#3B82F6", pattern=r'^#[0-9A-Fa-f]{6}$')
    icon: Optional[str] = None
    is_public: bool = True


class ListCreate(ListBase):
    pass


class ListUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = Field(None, pattern=r'^#[0-9A-Fa-f]{6}$')
    icon: Optional[str] = None
    is_public: Optional[bool] = None


class ListModel(ListBase):
    id: str
    user_id: str
    created_at: datetime

    class Config:
        from_attributes = True


class ListWithPlaceCount(ListModel):
    place_count: int = 0
    owner_name: Optional[str] = None
    owner_username: Optional[str] = None


# Place Schemas
class PlaceBase(BaseModel):
    name: str = Field(..., max_length=200)
    address: str = Field(..., max_length=500)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    notes: str = Field("", max_length=5000)
    phone: Optional[str] = Field(None, max_length=50)
    website: Optional[str] = Field(None, max_length=500)
    hours: Optional[str] = Field(None, max_length=500)
    is_public: bool = True


class PlaceCreate(PlaceBase):
    list_ids: List[str] = []
    tag_ids: List[str] = []


class PlaceUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = Field(None, ge=-90, le=90)
    longitude: Optional[float] = Field(None, ge=-180, le=180)
    notes: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    hours: Optional[str] = None
    is_public: Optional[bool] = None
    list_ids: Optional[List[str]] = None
    tag_ids: Optional[List[str]] = None


class AdoptPlaceRequest(BaseModel):
    """Request to adopt a place from another user's map"""
    place_id: str
    list_id: Optional[str] = None  # Optional list to add the adopted place to


class Place(PlaceBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime
    lists: List[ListModel] = []
    tags: List[Tag] = []

    class Config:
        from_attributes = True


class NominatimReverseRequest(BaseModel):
    latitude: float
    longitude: float


# Import Preview Schemas
class ImportPlacePreview(BaseModel):
    """Place data for import preview (before saving to DB)"""
    name: str
    address: str
    latitude: float
    longitude: float
    notes: str = ""
    phone: str = ""
    website: str = ""
    hours: str = ""
    tags: List[str] = []
    is_duplicate: bool = False
    error: Optional[str] = None


class ImportPreviewResponse(BaseModel):
    """Response for import preview"""
    places: List[ImportPlacePreview]
    summary: Dict[str, Any]


class ImportConfirmRequest(BaseModel):
    """Request to confirm and save import"""
    places: List[ImportPlacePreview]


# Phase 2: Notification Schemas
class NotificationBase(BaseModel):
    type: str
    title: str
    message: str
    link: Optional[str] = None
    data: Optional[Dict[str, Any]] = Field(None, serialization_alias='metadata')


class Notification(NotificationBase):
    id: str
    user_id: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True
        populate_by_name = True  # Allow both 'data' and 'metadata' field names


class NotificationMarkRead(BaseModel):
    notification_ids: List[str]


# Phase 3: Share Token Schemas
class ShareToken(BaseModel):
    id: str
    user_id: str
    token: str
    created_at: datetime

    class Config:
        from_attributes = True


class PublicUserProfile(BaseModel):
    """Public view of user profile (for shared map view)"""
    id: str
    name: str
    username: Optional[str] = None
    bio: Optional[str] = None
    profile_image_url: Optional[str] = None

    class Config:
        from_attributes = True


class SharedMapData(BaseModel):
    """Data for shared map view"""
    user: PublicUserProfile
    places: List[Place]
    lists: List[ListWithPlaceCount]
    tags: List[TagWithUsage]


class SharedListData(BaseModel):
    """Data for shared list/collection view"""
    list: ListWithPlaceCount
    owner: PublicUserProfile
    places: List[Place]


# Phase 4: User Follow Schemas
class UserSearchResult(BaseModel):
    """Minimal user info for search results"""
    id: str
    name: str
    username: Optional[str] = None
    profile_image_url: Optional[str] = None
    is_public: bool
    is_followed_by_me: bool = False
    follow_status: Optional[str] = None  # 'pending', 'confirmed', or None
    place_count: Optional[int] = None  # For explore top users

    class Config:
        from_attributes = True


class FollowRequest(BaseModel):
    """Request to follow a user"""
    user_id: str  # ID of user to follow


class FollowResponse(BaseModel):
    """Response after follow action"""
    status: str  # 'pending' or 'confirmed'
    message: str


class UserProfilePublic(BaseModel):
    """Public user profile (for viewing others)"""
    id: str
    name: str
    username: Optional[str] = None
    bio: Optional[str] = None
    profile_image_url: Optional[str] = None
    is_public: bool
    follower_count: int
    following_count: int
    place_count: int
    is_followed_by_me: bool
    follow_status: Optional[str] = None  # 'pending', 'confirmed', or None

    class Config:
        from_attributes = True


class PlacesInBoundsResponse(BaseModel):
    """Response for places within bounds"""
    places: List[Place]
    total_in_bounds: int
    truncated: bool  # True if there were more places than limit


class UserMapMetadata(BaseModel):
    """Metadata for a user's map (without places - for initial load)"""
    user: PublicUserProfile
    lists: List[ListWithPlaceCount]
    tags: List[TagWithUsage]
    total_places: int


# API Key Schemas
class ApiKeyCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)


class ApiKeyResponse(BaseModel):
    id: str
    name: str
    key_prefix: str
    is_active: bool
    created_at: datetime
    last_used_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ApiKeyCreatedResponse(ApiKeyResponse):
    """Returned only on creation — includes the raw key (shown once)"""
    key: str
