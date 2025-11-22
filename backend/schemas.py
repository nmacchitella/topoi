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
    created_at: datetime

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
    is_public: bool = False


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
    category: str
    notes: str = ""
    phone: Optional[str] = None
    website: Optional[str] = None
    hours: Optional[str] = None
    is_public: bool = False


class PlaceCreate(PlaceBase):
    list_ids: List[str] = []
    tag_ids: List[str] = []


class PlaceUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    category: Optional[str] = None
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
    category: str
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
