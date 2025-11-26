from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    name: str


class UserCreate(UserBase):
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


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


class TokenData(BaseModel):
    email: Optional[str] = None


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


# Phase 1: Profile schemas
class UserProfileUpdate(BaseModel):
    """Schema for updating user profile settings"""
    name: Optional[str] = None
    username: Optional[str] = Field(None, min_length=3, max_length=30, pattern="^[a-zA-Z0-9_]+$")
    bio: Optional[str] = Field(None, max_length=500)
    is_public: Optional[bool] = None


class UserProfile(User):
    """Extended user schema with profile info"""
    follower_count: int = 0  # Future: Phase 4
    following_count: int = 0  # Future: Phase 4


# Tag Schemas
class TagBase(BaseModel):
    name: str


class TagCreate(TagBase):
    pass


class TagUpdate(TagBase):
    pass


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
    color: str = "#3B82F6"
    icon: Optional[str] = None
    is_public: bool = True


class ListCreate(ListBase):
    pass


class ListUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
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


# Place Schemas
class PlaceBase(BaseModel):
    name: str
    address: str
    latitude: float
    longitude: float
    notes: str = ""
    phone: Optional[str] = None
    website: Optional[str] = None
    hours: Optional[str] = None
    is_public: bool = True


class PlaceCreate(PlaceBase):
    list_ids: List[str] = []
    tag_ids: List[str] = []


class PlaceUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    notes: Optional[str] = None
    phone: Optional[str] = None
    website: Optional[str] = None
    hours: Optional[str] = None
    is_public: Optional[bool] = None
    list_ids: Optional[List[str]] = None
    tag_ids: Optional[List[str]] = None


class Place(PlaceBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime
    lists: List[ListModel] = []
    tags: List[Tag] = []

    class Config:
        from_attributes = True


# Nominatim Schemas
class NominatimSearchRequest(BaseModel):
    query: str
    limit: int = 5


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
    metadata: Optional[Dict[str, Any]] = Field(None, alias='data')


class NotificationCreate(NotificationBase):
    user_id: str


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


# Phase 4: User Follow Schemas
class UserSearchResult(BaseModel):
    """Minimal user info for search results"""
    id: str
    name: str
    username: Optional[str] = None
    profile_image_url: Optional[str] = None
    is_public: bool

    class Config:
        from_attributes = True


class UserFollowBase(BaseModel):
    follower_id: str
    following_id: str
    status: str  # 'pending', 'confirmed', 'declined'


class UserFollow(UserFollowBase):
    id: str
    created_at: datetime
    updated_at: datetime

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
    is_followed_by_me: bool
    follow_status: Optional[str] = None  # 'pending', 'confirmed', or None

    class Config:
        from_attributes = True
