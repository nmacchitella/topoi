# Topoi - Social Features Development Plan

> Implementation roadmap for Mapstr-inspired social features: user following, map sharing, and place discovery.

**Status**: Planning Phase
**Last Updated**: November 25, 2025
**Epic**: Social Features MVP

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Decisions](#architecture-decisions)
3. [Database Schema Changes](#database-schema-changes)
4. [Development Phases](#development-phases)
5. [Phase 1: User Profile Settings](#phase-1-user-profile-settings-public--private-maps)
6. [Phase 2: Notification System](#phase-2-notification-system-in-app-activity-feed)
7. [Phase 3: Map Sharing](#phase-3-map-sharing-external-links)
8. [Phase 4: User Discovery & Following](#phase-4-user-discovery--following)
9. [Phase 5: Map Consumption & Pin Adoption](#phase-5-map-consumption--pin-adoption)
10. [Testing Strategy](#testing-strategy)
11. [Deployment Strategy](#deployment-strategy)
12. [Future Enhancements](#future-enhancements)

---

## Overview

### Goals
Enable users to build and leverage a network of trusted place recommendations by:
- Following friends and viewing their maps
- Sharing their own curated map publicly or privately
- Adopting recommended places from friends
- Receiving notifications for social interactions

### Success Metrics
- User engagement: % of users who follow at least one other user
- Sharing adoption: % of users who enable public maps
- Pin adoption: Average pins adopted per user per month
- Notification engagement: Click-through rate on notifications

### Design Principles
1. **Privacy-first**: Users control their visibility (Private by default)
2. **Simple & focused**: One-way following model (like Twitter/Instagram)
3. **Incremental delivery**: Each phase delivers standalone value
4. **Data ownership**: Users always own their places, even if adopted from others

---

## Architecture Decisions

### Privacy Model
- **User-level privacy**: New `is_public` field on User model (default: `False`)
- **Pin-level privacy**: Existing `is_public` on Places (default: `True`)
  - When `place.is_public = False`, the pin is considered "Secret"
  - Secret pins are NEVER visible to followers, regardless of user privacy
- **Effective visibility**: Follower sees a pin only if:
  - `user.is_public = True` (or follower is confirmed)
  - AND `place.is_public = True`

### Following Model
- **One-way relationships**: User A follows User B (not mutual)
- **Request-based for Private maps**:
  - If target user has `is_public = False` → Creates pending follow request
  - If target user has `is_public = True` → Creates confirmed follow immediately
- **Auto-confirmation on Privacy Change**:
  - When user changes from Private → Public, all pending requests auto-confirm

### Notification System
- **In-app only** (Phase 2): Notifications stored in database, displayed in UI
- **Push notifications** (Future): Can be added via FCM/APNs integration
- **Email notifications** (Future): Digest emails for weekly activity

### Sharing Model
- **User-level share tokens**: One link per user, shares entire public map
- **Token lifecycle**: User can regenerate/invalidate tokens
- **Web view fallback**: Non-app users see responsive web interface
- **Deep link support**: App users open directly in app (Future)

---

## Database Schema Changes

### New Tables

#### 1. `user_follows` (Many-to-Many with Status)
```python
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

    # Constraints
    __table_args__ = (
        UniqueConstraint('follower_id', 'following_id', name='unique_follow'),
        CheckConstraint('follower_id != following_id', name='no_self_follow'),
    )
```

**Indexes**:
- `follower_id` (for "who I'm following" queries)
- `following_id` (for "my followers" queries)
- Composite: `(follower_id, following_id)` (unique constraint + lookups)
- `status` (for filtering pending requests)

#### 2. `notifications` (In-App Activity Feed)
```python
class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete='CASCADE'), nullable=False)
    type = Column(String, nullable=False)  # 'follow_request', 'follow_accepted', 'new_follower'
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    link = Column(String, nullable=True)  # Optional deep link (e.g., to user profile)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Metadata (JSON for extensibility)
    metadata = Column(JSON, nullable=True)  # e.g., {"actor_id": "uuid", "actor_name": "John"}

    # Relationships
    recipient = relationship("User", back_populates="notifications")
```

**Indexes**:
- `user_id` (for user's notification feed)
- `(user_id, is_read)` (for unread count queries)
- `created_at` (for chronological ordering)

#### 3. `share_tokens` (Public Map Sharing)
```python
class ShareToken(Base):
    __tablename__ = "share_tokens"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete='CASCADE'), unique=True, nullable=False)
    token = Column(String, unique=True, index=True, nullable=False)  # Short, URL-safe token
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_accessed = Column(DateTime(timezone=True), nullable=True)
    access_count = Column(Integer, default=0)

    # Relationships
    owner = relationship("User", back_populates="share_token")
```

**Indexes**:
- `token` (unique index for lookups via share URL)
- `user_id` (unique constraint, one token per user)

### Modified Tables

#### `users` Table - Add Fields
```python
# Add to User model:
is_public = Column(Boolean, default=False, nullable=False)  # Map visibility (Private by default)
username = Column(String, unique=True, nullable=True, index=True)  # Optional unique username for search
bio = Column(String, nullable=True)  # Optional profile bio
profile_image_url = Column(String, nullable=True)  # Future: profile photos

# Add relationships:
following = relationship("UserFollow", foreign_keys="UserFollow.follower_id", back_populates="follower", cascade="all, delete-orphan")
followers = relationship("UserFollow", foreign_keys="UserFollow.following_id", back_populates="following_user", cascade="all, delete-orphan")
notifications = relationship("Notification", back_populates="recipient", cascade="all, delete-orphan")
share_token = relationship("ShareToken", back_populates="owner", uselist=False, cascade="all, delete-orphan")
```

**Indexes**:
- `username` (unique index for username search)
- `email` (already exists)
- `is_public` (for filtering public profiles in discovery)

### Migration Strategy

**Phase 1 Migration**:
```sql
-- Add new fields to users table
ALTER TABLE users ADD COLUMN is_public BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE users ADD COLUMN username TEXT;
ALTER TABLE users ADD COLUMN bio TEXT;
ALTER TABLE users ADD COLUMN profile_image_url TEXT;

-- Create index on username
CREATE UNIQUE INDEX idx_users_username ON users(username) WHERE username IS NOT NULL;
```

**Phase 2 Migration**:
```sql
-- Create notifications table
CREATE TABLE notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    metadata TEXT,  -- JSON stored as TEXT in SQLite
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
```

**Phase 3 Migration**:
```sql
-- Create share_tokens table
CREATE TABLE share_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_accessed TIMESTAMP WITH TIME ZONE,
    access_count INTEGER DEFAULT 0
);

-- Create indexes
CREATE UNIQUE INDEX idx_share_tokens_token ON share_tokens(token);
CREATE UNIQUE INDEX idx_share_tokens_user_id ON share_tokens(user_id);
```

**Phase 4 Migration**:
```sql
-- Create user_follows table
CREATE TABLE user_follows (
    id TEXT PRIMARY KEY,
    follower_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK(status IN ('pending', 'confirmed', 'declined')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_follow UNIQUE(follower_id, following_id),
    CONSTRAINT no_self_follow CHECK(follower_id != following_id)
);

-- Create indexes
CREATE INDEX idx_user_follows_follower ON user_follows(follower_id);
CREATE INDEX idx_user_follows_following ON user_follows(following_id);
CREATE INDEX idx_user_follows_status ON user_follows(status);
```

---

## Development Phases

### Branch Strategy

**Main Development Branch**: `feature/social-features`
- All phases merge into this branch first
- Testing and integration happen here
- Only stable, tested code merges to `main`

**Phase Branches** (created from `feature/social-features`):
- `feature/social-features/phase-1-user-settings`
- `feature/social-features/phase-2-notifications`
- `feature/social-features/phase-3-sharing`
- `feature/social-features/phase-4-following`
- `feature/social-features/phase-5-adoption`

**Workflow**:
```
main
 └── feature/social-features
      ├── feature/social-features/phase-1-user-settings → merge back
      ├── feature/social-features/phase-2-notifications → merge back
      ├── feature/social-features/phase-3-sharing → merge back
      ├── feature/social-features/phase-4-following → merge back
      └── feature/social-features/phase-5-adoption → merge back
```

After all phases complete and testing passes:
```
feature/social-features → main (via PR)
```

### Phase Timeline Estimates

| Phase | Backend | Frontend | Testing | Total |
|-------|---------|----------|---------|-------|
| Phase 1 | 4 hours | 6 hours | 2 hours | 12 hours |
| Phase 2 | 6 hours | 8 hours | 3 hours | 17 hours |
| Phase 3 | 5 hours | 7 hours | 3 hours | 15 hours |
| Phase 4 | 8 hours | 10 hours | 4 hours | 22 hours |
| Phase 5 | 6 hours | 8 hours | 3 hours | 17 hours |
| **Total** | **29 hours** | **39 hours** | **15 hours** | **83 hours** |

---

## Phase 1: User Profile Settings (Public / Private Maps)

**Goal**: Allow users to control their map visibility with a public/private toggle.

**User Stories**:
- US-3.1: As a user, I want to clearly see and change my Map's visibility status between Public and Private in my Profile Settings.

**Priority**: HIGH
**Estimated Duration**: 12 hours

### Backend Tasks

#### 1.1 Database Migration
**File**: `backend/migrations/001_add_user_privacy.py` (or manual SQL)

```sql
ALTER TABLE users ADD COLUMN is_public BOOLEAN DEFAULT FALSE NOT NULL;
ALTER TABLE users ADD COLUMN username TEXT;
ALTER TABLE users ADD COLUMN bio TEXT;
ALTER TABLE users ADD COLUMN profile_image_url TEXT;

CREATE UNIQUE INDEX idx_users_username ON users(username) WHERE username IS NOT NULL;
```

**Deliverable**: Migration script + documentation

#### 1.2 Update Models
**File**: `backend/models.py`

Add fields to `User` model:
```python
is_public = Column(Boolean, default=False, nullable=False)
username = Column(String, unique=True, nullable=True, index=True)
bio = Column(String, nullable=True)
profile_image_url = Column(String, nullable=True)
```

**Deliverable**: Updated model with new fields

#### 1.3 Update Schemas
**File**: `backend/schemas.py`

Add new schemas:
```python
class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    username: Optional[str] = None
    bio: Optional[str] = None
    is_public: Optional[bool] = None

class UserProfile(User):
    username: Optional[str] = None
    bio: Optional[str] = None
    is_public: bool
    profile_image_url: Optional[str] = None
    follower_count: int = 0  # Future
    following_count: int = 0  # Future
```

**Deliverable**: Updated Pydantic schemas

#### 1.4 API Endpoints
**File**: `backend/routers/auth_router.py`

**New/Modified Endpoints**:

```python
# GET /api/auth/profile - Get current user's profile
@router.get("/profile", response_model=schemas.UserProfile)
async def get_current_user_profile(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's profile with counts"""
    # Return user with is_public, username, bio
    # Future: Add follower/following counts
    pass

# PATCH /api/auth/profile - Update profile settings
@router.patch("/profile", response_model=schemas.UserProfile)
async def update_user_profile(
    profile_update: schemas.UserProfileUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Update user profile settings.

    Business Logic:
    - Validate username uniqueness (if provided)
    - Update fields
    - If is_public changes from False → True:
      - Future: Auto-confirm pending follow requests
    """
    pass
```

**Validation Requirements**:
- Username: 3-30 characters, alphanumeric + underscores, unique
- Bio: Max 500 characters
- Prevent duplicate usernames (case-insensitive check)

**Deliverable**: Working API endpoints with validation

#### 1.5 Admin Panel Updates
**File**: `backend/admin.py`

Update `UserAdmin` to include new fields:
```python
column_list = [User.id, User.email, User.name, User.username, User.is_public, User.is_admin, User.created_at]
column_searchable_list = [User.email, User.name, User.username]
form_excluded_columns = [User.hashed_password, User.places, User.lists, User.tags, User.refresh_tokens, User.following, User.followers, User.notifications, User.share_token]
```

**Deliverable**: Admin panel supports new user fields

### Frontend Tasks

#### 1.6 Update Types
**File**: `frontend/src/types/index.ts`

```typescript
export interface User {
  id: string;
  email: string;
  name: string;
  username?: string;
  bio?: string;
  is_public: boolean;
  is_admin: boolean;
  profile_image_url?: string;
  created_at: string;
  follower_count?: number;  // Future
  following_count?: number; // Future
}

export interface UserProfileUpdate {
  name?: string;
  username?: string;
  bio?: string;
  is_public?: boolean;
}
```

**Deliverable**: Updated TypeScript interfaces

#### 1.7 API Client
**File**: `frontend/src/lib/api.ts`

```typescript
// Get current user profile
export const getCurrentUserProfile = async (): Promise<User> => {
  const response = await api.get('/auth/profile');
  return response.data;
};

// Update user profile
export const updateUserProfile = async (updates: UserProfileUpdate): Promise<User> => {
  const response = await api.patch('/auth/profile', updates);
  return response.data;
};
```

**Deliverable**: API client methods

#### 1.8 Zustand Store Updates
**File**: `frontend/src/store/useStore.ts`

Add to store:
```typescript
interface AppState {
  // ... existing fields
  userProfile: User | null;

  // Actions
  fetchUserProfile: () => Promise<void>;
  updateUserProfile: (updates: UserProfileUpdate) => Promise<void>;
}

// Implementation
fetchUserProfile: async () => {
  const profile = await getCurrentUserProfile();
  set({ userProfile: profile, user: profile });
},

updateUserProfile: async (updates) => {
  const updated = await updateUserProfile(updates);
  set({ userProfile: updated, user: updated });
},
```

**Deliverable**: Store actions for profile management

#### 1.9 Settings Page UI
**File**: `frontend/src/app/settings/page.tsx`

**New Sections**:

1. **Profile Information**:
   - Name (text input)
   - Username (text input with validation)
   - Bio (textarea, 500 char limit)

2. **Privacy Settings** (prominent):
   - Toggle switch: "Make my map public"
   - Help text:
     - Private: "Only approved followers can see your map"
     - Public: "Anyone can see your map (except secret places)"

3. **Existing Sections**:
   - Email (read-only)
   - Password change (existing)
   - Telegram link (existing)

**Design Requirements**:
- Clear visual distinction between Public/Private states
- Confirmation dialog when switching to Public
- Success toast on save
- Inline validation for username (debounced availability check)

**Deliverable**: Complete settings UI with privacy toggle

#### 1.10 Profile Page (Future Preview)
**File**: `frontend/src/app/profile/[userId]/page.tsx` (placeholder)

**Note**: Create basic structure for Phase 4, leave mostly empty:
```typescript
// This will be fully implemented in Phase 4
export default function UserProfilePage({ params }: { params: { userId: string } }) {
  return <div>User Profile - Coming Soon</div>;
}
```

**Deliverable**: Placeholder profile page

### Testing Checklist

**Backend Tests**:
- [ ] Migration applies cleanly on fresh DB
- [ ] Migration applies cleanly on existing DB with users
- [ ] Username uniqueness constraint works (case-insensitive)
- [ ] Profile update validation (username format, bio length)
- [ ] GET /api/auth/profile returns correct fields
- [ ] PATCH /api/auth/profile updates fields correctly
- [ ] Privacy toggle persists correctly

**Frontend Tests**:
- [ ] Settings page loads with current values
- [ ] Privacy toggle changes state
- [ ] Username validation shows inline errors
- [ ] Bio character counter works
- [ ] Save button updates profile
- [ ] Success/error messages display correctly
- [ ] Changes persist after page reload

**Manual Testing**:
- [ ] Test with OAuth user (no password)
- [ ] Test with regular user (has password)
- [ ] Test username conflicts
- [ ] Test very long bio (500+ chars)
- [ ] Test special characters in username

### Definition of Done
- [ ] All database migrations applied successfully
- [ ] Backend endpoints tested and working
- [ ] Frontend UI complete and responsive
- [ ] Admin panel updated
- [ ] No console errors or warnings
- [ ] Code reviewed and approved
- [ ] Branch merged into `feature/social-features`
- [ ] Documentation updated

---

## Phase 2: Notification System (In-App Activity Feed)

**Goal**: Build infrastructure for in-app notifications to support follow requests, new followers, and future social interactions.

**User Stories**:
- US-1.4: As a user, I want to receive a notification when someone requests to follow me (Private Map) or starts following me (Public Map).
- FR-4.1: Trigger notifications for: New Follower (Public Map) and New Follow Request (Private Map).
- FR-4.2: Implement UI for viewing and managing pending follow requests.

**Priority**: HIGH
**Estimated Duration**: 17 hours

### Backend Tasks

#### 2.1 Database Migration
**File**: `backend/migrations/002_add_notifications.py`

```sql
CREATE TABLE notifications (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    link TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    metadata TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);
```

**Deliverable**: Migration script for notifications table

#### 2.2 Update Models
**File**: `backend/models.py`

```python
class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete='CASCADE'), nullable=False)
    type = Column(String, nullable=False)
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    link = Column(String, nullable=True)
    is_read = Column(Boolean, default=False)
    metadata = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    recipient = relationship("User", back_populates="notifications")

# Add to User model:
notifications = relationship("Notification", back_populates="recipient", cascade="all, delete-orphan")
```

**Deliverable**: Notification model added

#### 2.3 Update Schemas
**File**: `backend/schemas.py`

```python
class NotificationBase(BaseModel):
    type: str
    title: str
    message: str
    link: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class NotificationCreate(NotificationBase):
    user_id: str

class Notification(NotificationBase):
    id: str
    user_id: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

class NotificationMarkRead(BaseModel):
    notification_ids: List[str]
```

**Deliverable**: Notification schemas

#### 2.4 Notification Service
**File**: `backend/services/notification_service.py` (new file)

```python
from sqlalchemy.orm import Session
from models import Notification, User
import uuid
from datetime import datetime

class NotificationService:
    """Centralized service for creating notifications"""

    @staticmethod
    def create_notification(
        db: Session,
        user_id: str,
        notification_type: str,
        title: str,
        message: str,
        link: str = None,
        metadata: dict = None
    ) -> Notification:
        """Create and save a notification"""
        notification = Notification(
            id=str(uuid.uuid4()),
            user_id=user_id,
            type=notification_type,
            title=title,
            message=message,
            link=link,
            metadata=metadata
        )
        db.add(notification)
        db.commit()
        db.refresh(notification)
        return notification

    @staticmethod
    def notify_new_follower(db: Session, followed_user_id: str, follower_name: str, follower_id: str):
        """Notify user about a new follower (auto-approved, public map)"""
        return NotificationService.create_notification(
            db=db,
            user_id=followed_user_id,
            notification_type="new_follower",
            title="New Follower",
            message=f"{follower_name} started following you",
            link=f"/profile/{follower_id}",
            metadata={"actor_id": follower_id, "actor_name": follower_name}
        )

    @staticmethod
    def notify_follow_request(db: Session, target_user_id: str, requester_name: str, requester_id: str):
        """Notify user about a follow request (private map)"""
        return NotificationService.create_notification(
            db=db,
            user_id=target_user_id,
            notification_type="follow_request",
            title="Follow Request",
            message=f"{requester_name} wants to follow you",
            link=f"/notifications",  # Will show in activity tab
            metadata={"actor_id": requester_id, "actor_name": requester_name}
        )

    @staticmethod
    def notify_request_accepted(db: Session, requester_id: str, accepter_name: str, accepter_id: str):
        """Notify requester that their follow request was accepted"""
        return NotificationService.create_notification(
            db=db,
            user_id=requester_id,
            notification_type="follow_accepted",
            title="Follow Request Accepted",
            message=f"{accepter_name} accepted your follow request",
            link=f"/profile/{accepter_id}",
            metadata={"actor_id": accepter_id, "actor_name": accepter_name}
        )
```

**Deliverable**: Notification service with helper methods

#### 2.5 API Endpoints
**File**: `backend/routers/notifications.py` (new file)

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from auth import get_current_user
import models
import schemas

router = APIRouter(prefix="/notifications", tags=["notifications"])

@router.get("/", response_model=List[schemas.Notification])
async def get_notifications(
    skip: int = 0,
    limit: int = 50,
    unread_only: bool = False,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current user's notifications (chronological, newest first).

    Query params:
    - skip: Pagination offset
    - limit: Max results (default 50)
    - unread_only: If true, only return unread notifications
    """
    query = db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id
    )

    if unread_only:
        query = query.filter(models.Notification.is_read == False)

    notifications = query.order_by(
        models.Notification.created_at.desc()
    ).offset(skip).limit(limit).all()

    return notifications

@router.get("/unread-count", response_model=int)
async def get_unread_count(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get count of unread notifications"""
    count = db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id,
        models.Notification.is_read == False
    ).count()
    return count

@router.post("/mark-read")
async def mark_notifications_read(
    data: schemas.NotificationMarkRead,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark one or more notifications as read"""
    db.query(models.Notification).filter(
        models.Notification.id.in_(data.notification_ids),
        models.Notification.user_id == current_user.id
    ).update({"is_read": True}, synchronize_session=False)

    db.commit()
    return {"message": f"Marked {len(data.notification_ids)} notifications as read"}

@router.post("/mark-all-read")
async def mark_all_read(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark all notifications as read for current user"""
    updated = db.query(models.Notification).filter(
        models.Notification.user_id == current_user.id,
        models.Notification.is_read == False
    ).update({"is_read": True}, synchronize_session=False)

    db.commit()
    return {"message": f"Marked {updated} notifications as read"}

@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a specific notification"""
    notification = db.query(models.Notification).filter(
        models.Notification.id == notification_id,
        models.Notification.user_id == current_user.id
    ).first()

    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")

    db.delete(notification)
    db.commit()
    return {"message": "Notification deleted"}
```

**Deliverable**: Complete notification API

#### 2.6 Register Router
**File**: `backend/main.py`

```python
from routers import notifications

app.include_router(notifications.router, prefix="/api")
```

**Deliverable**: Router registered in main app

#### 2.7 Admin Panel Updates
**File**: `backend/admin.py`

```python
class NotificationAdmin(ModelView, model=Notification):
    name = "Notification"
    name_plural = "Notifications"
    icon = "fa-solid fa-bell"

    column_list = [Notification.id, Notification.recipient, Notification.type, Notification.title, Notification.is_read, Notification.created_at]
    column_searchable_list = [Notification.title, Notification.message]
    column_sortable_list = [Notification.created_at, Notification.type, Notification.is_read]
    column_default_sort = [(Notification.created_at, True)]

    can_create = True  # For testing
    can_edit = True
    can_delete = True
    can_view_details = True

# In create_admin():
admin.add_view(NotificationAdmin)
```

**Deliverable**: Admin interface for notifications

### Frontend Tasks

#### 2.8 Update Types
**File**: `frontend/src/types/index.ts`

```typescript
export interface Notification {
  id: string;
  user_id: string;
  type: 'new_follower' | 'follow_request' | 'follow_accepted';
  title: string;
  message: string;
  link?: string;
  is_read: boolean;
  metadata?: {
    actor_id?: string;
    actor_name?: string;
    [key: string]: any;
  };
  created_at: string;
}
```

**Deliverable**: Notification TypeScript types

#### 2.9 API Client
**File**: `frontend/src/lib/api.ts`

```typescript
export const getNotifications = async (
  skip = 0,
  limit = 50,
  unreadOnly = false
): Promise<Notification[]> => {
  const response = await api.get('/notifications', {
    params: { skip, limit, unread_only: unreadOnly }
  });
  return response.data;
};

export const getUnreadCount = async (): Promise<number> => {
  const response = await api.get('/notifications/unread-count');
  return response.data;
};

export const markNotificationsRead = async (notificationIds: string[]): Promise<void> => {
  await api.post('/notifications/mark-read', { notification_ids: notificationIds });
};

export const markAllNotificationsRead = async (): Promise<void> => {
  await api.post('/notifications/mark-all-read');
};

export const deleteNotification = async (notificationId: string): Promise<void> => {
  await api.delete(`/notifications/${notificationId}`);
};
```

**Deliverable**: API client for notifications

#### 2.10 Zustand Store
**File**: `frontend/src/store/useStore.ts`

```typescript
interface AppState {
  // ... existing
  notifications: Notification[];
  unreadCount: number;

  // Actions
  fetchNotifications: (unreadOnly?: boolean) => Promise<void>;
  fetchUnreadCount: () => Promise<void>;
  markNotificationsRead: (ids: string[]) => Promise<void>;
  markAllRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
}

// Implementation
fetchNotifications: async (unreadOnly = false) => {
  const notifications = await getNotifications(0, 50, unreadOnly);
  set({ notifications });
},

fetchUnreadCount: async () => {
  const count = await getUnreadCount();
  set({ unreadCount: count });
},

markNotificationsRead: async (ids) => {
  await markNotificationsRead(ids);
  const { notifications, unreadCount } = get();
  const updatedNotifications = notifications.map(n =>
    ids.includes(n.id) ? { ...n, is_read: true } : n
  );
  set({
    notifications: updatedNotifications,
    unreadCount: Math.max(0, unreadCount - ids.length)
  });
},

markAllRead: async () => {
  await markAllNotificationsRead();
  const { notifications } = get();
  const updatedNotifications = notifications.map(n => ({ ...n, is_read: true }));
  set({ notifications: updatedNotifications, unreadCount: 0 });
},

deleteNotification: async (id) => {
  await deleteNotification(id);
  const { notifications } = get();
  set({ notifications: notifications.filter(n => n.id !== id) });
},
```

**Deliverable**: Store methods for notifications

#### 2.11 Notification Bell Icon
**File**: `frontend/src/components/NotificationBell.tsx` (new)

```typescript
'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { BellIcon } from '@heroicons/react/24/outline';
import { BellIcon as BellSolidIcon } from '@heroicons/react/24/solid';
import { useStore } from '@/store/useStore';

export default function NotificationBell() {
  const { unreadCount, fetchUnreadCount } = useStore();

  useEffect(() => {
    fetchUnreadCount();
    // Poll every 30 seconds
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  return (
    <Link href="/notifications" className="relative">
      {unreadCount > 0 ? (
        <BellSolidIcon className="h-6 w-6 text-blue-500" />
      ) : (
        <BellIcon className="h-6 w-6" />
      )}
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
          {unreadCount > 9 ? '9+' : unreadCount}
        </span>
      )}
    </Link>
  );
}
```

**Deliverable**: Notification bell component with badge

#### 2.12 Update Navbar
**File**: `frontend/src/components/Navbar.tsx`

Add `<NotificationBell />` to the navbar next to settings/profile icons.

**Deliverable**: Navbar includes notification bell

#### 2.13 Notifications Page
**File**: `frontend/src/app/notifications/page.tsx` (new)

**Features**:
- List all notifications (newest first)
- Visual distinction for unread (bold, blue accent)
- Click notification → mark as read + navigate to link
- "Mark all as read" button
- Swipe to delete (mobile) or delete button (desktop)
- Empty state when no notifications
- Tabs: "All" / "Unread"

**Design**:
```typescript
'use client';

import { useEffect, useState } from 'react';
import { useStore } from '@/store/useStore';
import { formatDistanceToNow } from 'date-fns';

export default function NotificationsPage() {
  const { notifications, fetchNotifications, markNotificationsRead, markAllRead, deleteNotification } = useStore();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    fetchNotifications(filter === 'unread');
  }, [filter, fetchNotifications]);

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      await markNotificationsRead([notification.id]);
    }
    if (notification.link) {
      window.location.href = notification.link;
    }
  };

  const filteredNotifications = filter === 'unread'
    ? notifications.filter(n => !n.is_read)
    : notifications;

  return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Notifications</h1>
        <button onClick={markAllRead} className="text-blue-500">
          Mark all as read
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-4 border-b">
        <button
          onClick={() => setFilter('all')}
          className={`pb-2 ${filter === 'all' ? 'border-b-2 border-blue-500' : ''}`}
        >
          All
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`pb-2 ${filter === 'unread' ? 'border-b-2 border-blue-500' : ''}`}
        >
          Unread
        </button>
      </div>

      {/* Notification List */}
      <div className="space-y-2">
        {filteredNotifications.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No notifications</p>
        ) : (
          filteredNotifications.map(notification => (
            <div
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className={`p-4 rounded-lg cursor-pointer flex justify-between items-start ${
                notification.is_read ? 'bg-gray-50' : 'bg-blue-50 border-l-4 border-blue-500'
              }`}
            >
              <div className="flex-1">
                <h3 className={`${notification.is_read ? '' : 'font-bold'}`}>
                  {notification.title}
                </h3>
                <p className="text-sm text-gray-600">{notification.message}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteNotification(notification.id);
                }}
                className="text-red-500 hover:text-red-700"
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
```

**Deliverable**: Full notifications page

#### 2.14 Update Bottom Navigation (Mobile)
**File**: `frontend/src/components/BottomNav.tsx`

Add notification icon to mobile bottom nav (if not already there).

**Deliverable**: Mobile navigation includes notifications

### Testing Checklist

**Backend Tests**:
- [ ] Notification creation works
- [ ] GET /api/notifications returns user's notifications only
- [ ] Unread count is accurate
- [ ] Mark as read updates correctly
- [ ] Mark all as read works
- [ ] Delete notification works
- [ ] Notifications are deleted when user is deleted (cascade)

**Frontend Tests**:
- [ ] Notification bell shows correct count
- [ ] Notification bell updates in real-time (polling)
- [ ] Notifications page loads
- [ ] Tabs filter correctly (All/Unread)
- [ ] Clicking notification marks as read
- [ ] Mark all as read works
- [ ] Delete notification works
- [ ] Empty state displays correctly

**Manual Testing**:
- [ ] Create test notification via admin panel
- [ ] Verify notification appears in UI
- [ ] Test on mobile and desktop
- [ ] Test with 0, 1, and 10+ notifications

### Definition of Done
- [ ] Database migration applied
- [ ] Backend endpoints working
- [ ] Frontend UI complete and responsive
- [ ] Notification service documented
- [ ] Admin panel updated
- [ ] No console errors
- [ ] Code reviewed
- [ ] Branch merged into `feature/social-features`

---

## Phase 3: Map Sharing (External Links)

**Goal**: Enable users to share their public map via a unique link that works in-app and on web.

**User Stories**:
- US-2.1: As a user, I want to generate a unique, trackable link that directs users to my public Map page.
- FR-2.1: Create an endpoint to generate a short, unique token linked to User ID.
- FR-2.3: Develop a responsive web interface that renders the user's public profile and non-secret pins.
- FR-2.5: The shared view must only display pins if the sharing user's map is currently set to Public.

**Priority**: HIGH
**Estimated Duration**: 15 hours

### Backend Tasks

#### 3.1 Database Migration
**File**: `backend/migrations/003_add_share_tokens.py`

```sql
CREATE TABLE share_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_accessed TIMESTAMP WITH TIME ZONE,
    access_count INTEGER DEFAULT 0
);

CREATE UNIQUE INDEX idx_share_tokens_token ON share_tokens(token);
CREATE UNIQUE INDEX idx_share_tokens_user_id ON share_tokens(user_id);
```

**Deliverable**: Share tokens table migration

#### 3.2 Update Models
**File**: `backend/models.py`

```python
import secrets

class ShareToken(Base):
    __tablename__ = "share_tokens"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete='CASCADE'), unique=True, nullable=False)
    token = Column(String, unique=True, index=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_accessed = Column(DateTime(timezone=True), nullable=True)
    access_count = Column(Integer, default=0)

    owner = relationship("User", back_populates="share_token")

# Add to User model:
share_token = relationship("ShareToken", back_populates="owner", uselist=False, cascade="all, delete-orphan")

def generate_share_token():
    """Generate a short, URL-safe token (8 characters)"""
    return secrets.token_urlsafe(6)  # ~8 chars
```

**Deliverable**: ShareToken model

#### 3.3 Update Schemas
**File**: `backend/schemas.py`

```python
class ShareToken(BaseModel):
    id: str
    user_id: str
    token: str
    created_at: datetime
    access_count: int

    class Config:
        from_attributes = True

class ShareTokenCreate(BaseModel):
    pass  # No fields needed, user comes from auth

class PublicUserProfile(BaseModel):
    """Public view of user profile (for shared map view)"""
    id: str
    name: str
    username: Optional[str] = None
    bio: Optional[str] = None
    profile_image_url: Optional[str] = None
    # Do NOT include email, is_public, etc.

class SharedMapData(BaseModel):
    """Data for shared map view"""
    user: PublicUserProfile
    places: List[Place]
    lists: List[ListWithPlaceCount]
    tags: List[TagWithUsage]
```

**Deliverable**: Share token schemas

#### 3.4 API Endpoints
**File**: `backend/routers/share.py` (update existing or create new)

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from auth import get_current_user
import models
import schemas
from datetime import datetime

router = APIRouter(prefix="/share", tags=["sharing"])

@router.post("/token", response_model=schemas.ShareToken)
async def create_or_get_share_token(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Create or retrieve the user's share token.
    If token exists, return it. Otherwise, create new one.
    """
    existing = db.query(models.ShareToken).filter(
        models.ShareToken.user_id == current_user.id
    ).first()

    if existing:
        return existing

    # Generate unique token
    while True:
        token = models.generate_share_token()
        if not db.query(models.ShareToken).filter(models.ShareToken.token == token).first():
            break

    share_token = models.ShareToken(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        token=token
    )
    db.add(share_token)
    db.commit()
    db.refresh(share_token)
    return share_token

@router.post("/token/regenerate", response_model=schemas.ShareToken)
async def regenerate_share_token(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Regenerate (invalidate old, create new) share token.
    Useful if user wants to revoke access to old link.
    """
    # Delete existing token
    db.query(models.ShareToken).filter(
        models.ShareToken.user_id == current_user.id
    ).delete()

    # Create new token
    while True:
        token = models.generate_share_token()
        if not db.query(models.ShareToken).filter(models.ShareToken.token == token).first():
            break

    share_token = models.ShareToken(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        token=token
    )
    db.add(share_token)
    db.commit()
    db.refresh(share_token)
    return share_token

@router.get("/{token}", response_model=schemas.SharedMapData)
async def get_shared_map(
    token: str,
    db: Session = Depends(get_db)
):
    """
    Public endpoint: Get shared map data by token (NO AUTH REQUIRED).

    Returns user profile + public places.

    Privacy enforcement:
    - Only works if user.is_public = True
    - Only returns places where place.is_public = True (non-secret)
    """
    # Find token
    share_token = db.query(models.ShareToken).filter(
        models.ShareToken.token == token
    ).first()

    if not share_token:
        raise HTTPException(status_code=404, detail="Share link not found")

    # Get user
    user = db.query(models.User).filter(models.User.id == share_token.user_id).first()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check if map is public
    if not user.is_public:
        raise HTTPException(
            status_code=403,
            detail="This map is private. The owner must make it public to share."
        )

    # Update access stats
    share_token.last_accessed = datetime.utcnow()
    share_token.access_count += 1
    db.commit()

    # Get public places only (exclude secrets)
    places = db.query(models.Place).filter(
        models.Place.user_id == user.id,
        models.Place.is_public == True
    ).all()

    # Get lists and tags (with counts from public places only)
    lists = db.query(models.List).filter(models.List.user_id == user.id).all()
    tags = db.query(models.Tag).filter(models.Tag.user_id == user.id).all()

    # Calculate counts for lists/tags
    lists_with_counts = [
        schemas.ListWithPlaceCount(
            **{**list_.__dict__, "place_count": len([p for p in list_.places if p.is_public])}
        )
        for list_ in lists
    ]

    tags_with_counts = [
        schemas.TagWithUsage(
            **{**tag.__dict__, "usage_count": len([p for p in tag.places if p.is_public])}
        )
        for tag in tags
    ]

    # Build public profile
    public_profile = schemas.PublicUserProfile(
        id=user.id,
        name=user.name,
        username=user.username,
        bio=user.bio,
        profile_image_url=user.profile_image_url
    )

    return schemas.SharedMapData(
        user=public_profile,
        places=places,
        lists=lists_with_counts,
        tags=tags_with_counts
    )
```

**Deliverable**: Share token API endpoints

#### 3.5 Admin Panel
**File**: `backend/admin.py`

```python
class ShareTokenAdmin(ModelView, model=ShareToken):
    name = "Share Token"
    name_plural = "Share Tokens"
    icon = "fa-solid fa-share-nodes"

    column_list = [ShareToken.id, ShareToken.owner, ShareToken.token, ShareToken.access_count, ShareToken.last_accessed, ShareToken.created_at]
    column_sortable_list = [ShareToken.created_at, ShareToken.access_count, ShareToken.last_accessed]
    column_default_sort = [(ShareToken.created_at, True)]

    can_create = False
    can_edit = False
    can_delete = True
    can_view_details = True

# In create_admin():
admin.add_view(ShareTokenAdmin)
```

**Deliverable**: Admin panel for share tokens

### Frontend Tasks

#### 3.6 Update Types
**File**: `frontend/src/types/index.ts`

```typescript
export interface ShareToken {
  id: string;
  user_id: string;
  token: string;
  created_at: string;
  access_count: number;
}

export interface PublicUserProfile {
  id: string;
  name: string;
  username?: string;
  bio?: string;
  profile_image_url?: string;
}

export interface SharedMapData {
  user: PublicUserProfile;
  places: Place[];
  lists: ListWithPlaceCount[];
  tags: TagWithUsage[];
}
```

**Deliverable**: Share-related types

#### 3.7 API Client
**File**: `frontend/src/lib/api.ts`

```typescript
export const createOrGetShareToken = async (): Promise<ShareToken> => {
  const response = await api.post('/share/token');
  return response.data;
};

export const regenerateShareToken = async (): Promise<ShareToken> => {
  const response = await api.post('/share/token/regenerate');
  return response.data;
};

export const getSharedMap = async (token: string): Promise<SharedMapData> => {
  // Note: This is a public endpoint, no auth header needed
  const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/share/${token}`);
  return response.data;
};
```

**Deliverable**: API methods for sharing

#### 3.8 Share Button in Settings
**File**: `frontend/src/app/settings/page.tsx`

Add new section:

```typescript
const [shareToken, setShareToken] = useState<ShareToken | null>(null);
const [shareUrl, setShareUrl] = useState<string>('');

useEffect(() => {
  if (userProfile?.is_public) {
    loadShareToken();
  }
}, [userProfile]);

const loadShareToken = async () => {
  const token = await createOrGetShareToken();
  setShareToken(token);
  setShareUrl(`${window.location.origin}/shared/${token.token}`);
};

const handleRegenerateToken = async () => {
  if (confirm('Regenerate link? The old link will stop working.')) {
    const token = await regenerateShareToken();
    setShareToken(token);
    setShareUrl(`${window.location.origin}/shared/${token.token}`);
  }
};

const handleCopyLink = () => {
  navigator.clipboard.writeText(shareUrl);
  toast.success('Link copied!');
};

// In JSX:
{userProfile?.is_public && (
  <div className="mt-6 p-4 bg-blue-50 rounded-lg">
    <h3 className="font-semibold mb-2">Share Your Map</h3>
    <p className="text-sm text-gray-600 mb-3">
      Anyone with this link can view your public places
    </p>
    <div className="flex gap-2">
      <input
        type="text"
        value={shareUrl}
        readOnly
        className="flex-1 p-2 border rounded"
      />
      <button onClick={handleCopyLink} className="px-4 py-2 bg-blue-500 text-white rounded">
        Copy
      </button>
    </div>
    <button onClick={handleRegenerateToken} className="text-sm text-red-500 mt-2">
      Regenerate Link
    </button>
    <p className="text-xs text-gray-500 mt-1">
      Accessed {shareToken?.access_count || 0} times
    </p>
  </div>
)}

{!userProfile?.is_public && (
  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
    <p className="text-sm text-gray-600">
      Make your map public to enable sharing
    </p>
  </div>
)}
```

**Deliverable**: Share UI in settings

#### 3.9 Shared Map Page
**File**: `frontend/src/app/shared/[token]/page.tsx` (new)

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Map from '@/components/Map';
import { getSharedMap } from '@/lib/api';
import type { SharedMapData } from '@/types';

export default function SharedMapPage() {
  const params = useParams();
  const token = params.token as string;

  const [data, setData] = useState<SharedMapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSharedMap();
  }, [token]);

  const loadSharedMap = async () => {
    try {
      setLoading(true);
      const mapData = await getSharedMap(token);
      setData(mapData);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load shared map');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h1 className="text-2xl font-bold mb-2">Map Not Available</h1>
        <p className="text-gray-600">{error}</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="bg-white border-b p-4">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-2xl font-bold">{data.user.name}'s Map</h1>
          {data.user.username && (
            <p className="text-gray-600">@{data.user.username}</p>
          )}
          {data.user.bio && (
            <p className="text-sm text-gray-500 mt-1">{data.user.bio}</p>
          )}
          <p className="text-sm text-gray-400 mt-2">
            {data.places.length} places · {data.lists.length} collections
          </p>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1">
        <Map
          places={data.places}
          selectedPlaceId={null}
          onPlaceClick={() => {}}
          onMapClick={() => {}}
        />
      </div>

      {/* Sidebar (optional, for desktop) */}
      <div className="hidden md:block w-80 bg-white border-l overflow-y-auto">
        <div className="p-4">
          <h2 className="font-semibold mb-3">Places</h2>
          {data.places.map(place => (
            <div key={place.id} className="mb-3 p-3 bg-gray-50 rounded">
              <h3 className="font-medium">{place.name}</h3>
              <p className="text-sm text-gray-600">{place.address}</p>
              {place.notes && (
                <p className="text-sm text-gray-500 mt-1">{place.notes}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

**Deliverable**: Shared map public page

#### 3.10 Meta Tags for Sharing
**File**: `frontend/src/app/shared/[token]/layout.tsx` (new)

Add Open Graph meta tags for rich link previews:

```typescript
import { Metadata } from 'next';

export async function generateMetadata({ params }: { params: { token: string } }): Promise<Metadata> {
  // In production, you might fetch user data here for dynamic meta tags
  return {
    title: "Shared Map on Topoi",
    description: "View my favorite places on Topoi",
    openGraph: {
      title: "Shared Map on Topoi",
      description: "View my favorite places",
      type: 'website',
    },
  };
}
```

**Deliverable**: SEO-friendly shared pages

### Testing Checklist

**Backend Tests**:
- [ ] Token generation creates unique tokens
- [ ] Token regeneration invalidates old token
- [ ] GET /share/{token} works for public maps
- [ ] GET /share/{token} returns 403 for private maps
- [ ] Only public places are returned (secrets excluded)
- [ ] Access count increments correctly
- [ ] Invalid token returns 404

**Frontend Tests**:
- [ ] Share button appears only for public maps
- [ ] Copy link works
- [ ] Regenerate link works and updates URL
- [ ] Shared map page loads correctly
- [ ] Shared map displays all public places
- [ ] Error states display correctly
- [ ] Mobile responsive layout

**Manual Testing**:
- [ ] Share link in WhatsApp/Telegram/SMS
- [ ] Test link preview (Open Graph)
- [ ] Test with private map (should show error)
- [ ] Test with public map
- [ ] Test regenerated link (old should fail)

### Definition of Done
- [ ] Database migration applied
- [ ] Backend endpoints complete
- [ ] Frontend UI complete
- [ ] Share functionality works end-to-end
- [ ] SEO meta tags added
- [ ] Admin panel updated
- [ ] Code reviewed
- [ ] Branch merged

---

## Phase 4: User Discovery & Following

**Goal**: Enable users to search for friends, send follow requests, and manage their following/followers.

**User Stories**:
- US-1.1: As a user, I want to search for and find my friends on Mapstr using their username or email.
- FR-1.1: Implement follower/following system with pending requests.
- FR-1.2: Develop user search API.
- FR-1.3: Enforce privacy (auto-follow for public, request for private).

**Priority**: HIGH
**Estimated Duration**: 22 hours

### Backend Tasks

#### 4.1 Database Migration
**File**: `backend/migrations/004_add_user_follows.py`

```sql
CREATE TABLE user_follows (
    id TEXT PRIMARY KEY,
    follower_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK(status IN ('pending', 'confirmed', 'declined')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_follow UNIQUE(follower_id, following_id),
    CONSTRAINT no_self_follow CHECK(follower_id != following_id)
);

CREATE INDEX idx_user_follows_follower ON user_follows(follower_id);
CREATE INDEX idx_user_follows_following ON user_follows(following_id);
CREATE INDEX idx_user_follows_status ON user_follows(status);
```

**Deliverable**: User follows table

#### 4.2 Update Models
**File**: `backend/models.py`

```python
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

    __table_args__ = (
        UniqueConstraint('follower_id', 'following_id', name='unique_follow'),
        CheckConstraint('follower_id != following_id', name='no_self_follow'),
    )

# Add to User model:
following = relationship("UserFollow", foreign_keys="UserFollow.follower_id", back_populates="follower", cascade="all, delete-orphan")
followers = relationship("UserFollow", foreign_keys="UserFollow.following_id", back_populates="following_user", cascade="all, delete-orphan")
```

**Deliverable**: UserFollow model

#### 4.3 Update Schemas
**File**: `backend/schemas.py`

```python
class UserSearchResult(BaseModel):
    """Minimal user info for search results"""
    id: str
    name: str
    username: Optional[str] = None
    profile_image_url: Optional[str] = None
    is_public: bool

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
```

**Deliverable**: Follow-related schemas

#### 4.4 Helper Service
**File**: `backend/services/follow_service.py` (new)

```python
from sqlalchemy.orm import Session
from models import User, UserFollow
from services.notification_service import NotificationService

class FollowService:
    @staticmethod
    def get_follow_relationship(db: Session, follower_id: str, following_id: str):
        """Get existing follow relationship"""
        return db.query(UserFollow).filter(
            UserFollow.follower_id == follower_id,
            UserFollow.following_id == following_id
        ).first()

    @staticmethod
    def create_follow(db: Session, follower_id: str, following_id: str, target_user: User):
        """
        Create a follow relationship.

        Logic:
        - If target user is public → status='confirmed'
        - If target user is private → status='pending'
        - Send appropriate notification
        """
        if target_user.is_public:
            status = 'confirmed'
        else:
            status = 'pending'

        follow = UserFollow(
            id=str(uuid.uuid4()),
            follower_id=follower_id,
            following_id=following_id,
            status=status
        )
        db.add(follow)
        db.commit()
        db.refresh(follow)

        # Send notification
        follower = db.query(User).filter(User.id == follower_id).first()
        if status == 'confirmed':
            NotificationService.notify_new_follower(
                db=db,
                followed_user_id=following_id,
                follower_name=follower.name,
                follower_id=follower_id
            )
        else:
            NotificationService.notify_follow_request(
                db=db,
                target_user_id=following_id,
                requester_name=follower.name,
                requester_id=follower_id
            )

        return follow

    @staticmethod
    def approve_follow(db: Session, follow: UserFollow):
        """Approve a pending follow request"""
        follow.status = 'confirmed'
        db.commit()

        # Notify requester
        approver = db.query(User).filter(User.id == follow.following_id).first()
        NotificationService.notify_request_accepted(
            db=db,
            requester_id=follow.follower_id,
            accepter_name=approver.name,
            accepter_id=approver.id
        )

    @staticmethod
    def decline_follow(db: Session, follow: UserFollow):
        """Decline a follow request"""
        follow.status = 'declined'
        db.commit()

    @staticmethod
    def unfollow(db: Session, follow: UserFollow):
        """Remove a follow relationship"""
        db.delete(follow)
        db.commit()

    @staticmethod
    def auto_confirm_pending_follows(db: Session, user_id: str):
        """
        Auto-confirm all pending follow requests when user goes public.
        Called when user changes is_public from False → True.
        """
        pending_follows = db.query(UserFollow).filter(
            UserFollow.following_id == user_id,
            UserFollow.status == 'pending'
        ).all()

        for follow in pending_follows:
            FollowService.approve_follow(db, follow)
```

**Deliverable**: Follow service with business logic

#### 4.5 API Endpoints
**File**: `backend/routers/users.py` (new)

```python
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from auth import get_current_user
import models
import schemas
from services.follow_service import FollowService

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/search", response_model=List[schemas.UserSearchResult])
async def search_users(
    q: str = Query(..., min_length=2, description="Search query (username or name)"),
    limit: int = Query(20, le=50),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Search for users by username or name.
    Returns basic profile info only.
    """
    query = db.query(models.User).filter(
        models.User.id != current_user.id  # Exclude self
    )

    # Search by username or name (case-insensitive)
    search_filter = (
        models.User.username.ilike(f"%{q}%") |
        models.User.name.ilike(f"%{q}%")
    )

    users = query.filter(search_filter).limit(limit).all()

    return [
        schemas.UserSearchResult(
            id=user.id,
            name=user.name,
            username=user.username,
            profile_image_url=user.profile_image_url,
            is_public=user.is_public
        )
        for user in users
    ]

@router.get("/{user_id}", response_model=schemas.UserProfilePublic)
async def get_user_profile(
    user_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get public profile of any user.
    Includes follow status relative to current user.
    """
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Count followers and following
    follower_count = db.query(models.UserFollow).filter(
        models.UserFollow.following_id == user_id,
        models.UserFollow.status == 'confirmed'
    ).count()

    following_count = db.query(models.UserFollow).filter(
        models.UserFollow.follower_id == user_id,
        models.UserFollow.status == 'confirmed'
    ).count()

    # Check current user's relationship
    follow_rel = FollowService.get_follow_relationship(
        db, current_user.id, user_id
    )

    is_followed = follow_rel is not None and follow_rel.status == 'confirmed'
    follow_status = follow_rel.status if follow_rel else None

    return schemas.UserProfilePublic(
        id=user.id,
        name=user.name,
        username=user.username,
        bio=user.bio,
        profile_image_url=user.profile_image_url,
        is_public=user.is_public,
        follower_count=follower_count,
        following_count=following_count,
        is_followed_by_me=is_followed,
        follow_status=follow_status
    )

@router.post("/follow", response_model=schemas.FollowResponse)
async def follow_user(
    request: schemas.FollowRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Follow a user.
    - If target is public → instant follow (status='confirmed')
    - If target is private → request (status='pending')
    """
    if request.user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot follow yourself")

    target_user = db.query(models.User).filter(models.User.id == request.user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check if already following
    existing = FollowService.get_follow_relationship(db, current_user.id, request.user_id)
    if existing:
        if existing.status == 'confirmed':
            raise HTTPException(status_code=400, detail="Already following this user")
        elif existing.status == 'pending':
            raise HTTPException(status_code=400, detail="Follow request already sent")
        elif existing.status == 'declined':
            # Allow re-requesting after decline
            db.delete(existing)
            db.commit()

    # Create follow
    follow = FollowService.create_follow(
        db=db,
        follower_id=current_user.id,
        following_id=request.user_id,
        target_user=target_user
    )

    if follow.status == 'confirmed':
        return schemas.FollowResponse(
            status='confirmed',
            message=f"You are now following {target_user.name}"
        )
    else:
        return schemas.FollowResponse(
            status='pending',
            message=f"Follow request sent to {target_user.name}"
        )

@router.post("/unfollow/{user_id}")
async def unfollow_user(
    user_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Unfollow a user"""
    follow = FollowService.get_follow_relationship(db, current_user.id, user_id)
    if not follow:
        raise HTTPException(status_code=404, detail="Not following this user")

    FollowService.unfollow(db, follow)
    return {"message": "Unfollowed successfully"}

@router.get("/me/followers", response_model=List[schemas.UserSearchResult])
async def get_my_followers(
    status: str = Query('confirmed', regex='^(pending|confirmed)$'),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get list of users following me.
    status='pending' returns follow requests.
    status='confirmed' returns actual followers.
    """
    follows = db.query(models.UserFollow).filter(
        models.UserFollow.following_id == current_user.id,
        models.UserFollow.status == status
    ).all()

    follower_ids = [f.follower_id for f in follows]
    users = db.query(models.User).filter(models.User.id.in_(follower_ids)).all()

    return [
        schemas.UserSearchResult(
            id=user.id,
            name=user.name,
            username=user.username,
            profile_image_url=user.profile_image_url,
            is_public=user.is_public
        )
        for user in users
    ]

@router.get("/me/following", response_model=List[schemas.UserSearchResult])
async def get_my_following(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of users I'm following (confirmed only)"""
    follows = db.query(models.UserFollow).filter(
        models.UserFollow.follower_id == current_user.id,
        models.UserFollow.status == 'confirmed'
    ).all()

    following_ids = [f.following_id for f in follows]
    users = db.query(models.User).filter(models.User.id.in_(following_ids)).all()

    return [
        schemas.UserSearchResult(
            id=user.id,
            name=user.name,
            username=user.username,
            profile_image_url=user.profile_image_url,
            is_public=user.is_public
        )
        for user in users
    ]

@router.post("/followers/{follower_id}/approve")
async def approve_follower(
    follower_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Approve a pending follow request"""
    follow = db.query(models.UserFollow).filter(
        models.UserFollow.follower_id == follower_id,
        models.UserFollow.following_id == current_user.id,
        models.UserFollow.status == 'pending'
    ).first()

    if not follow:
        raise HTTPException(status_code=404, detail="Follow request not found")

    FollowService.approve_follow(db, follow)
    return {"message": "Follow request approved"}

@router.post("/followers/{follower_id}/decline")
async def decline_follower(
    follower_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Decline a pending follow request"""
    follow = db.query(models.UserFollow).filter(
        models.UserFollow.follower_id == follower_id,
        models.UserFollow.following_id == current_user.id,
        models.UserFollow.status == 'pending'
    ).first()

    if not follow:
        raise HTTPException(status_code=404, detail="Follow request not found")

    FollowService.decline_follow(db, follow)
    return {"message": "Follow request declined"}
```

**Deliverable**: Complete user & follow API

#### 4.6 Update Profile Endpoint
**File**: `backend/routers/auth_router.py`

Modify the `update_user_profile` endpoint to handle privacy changes:

```python
@router.patch("/profile", response_model=schemas.UserProfile)
async def update_user_profile(
    profile_update: schemas.UserProfileUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # ... existing validation code ...

    # Check if privacy is changing from Private → Public
    privacy_changed_to_public = (
        profile_update.is_public is not None and
        profile_update.is_public == True and
        current_user.is_public == False
    )

    # Update fields
    # ... existing update logic ...

    # Auto-confirm pending follows if going public
    if privacy_changed_to_public:
        from services.follow_service import FollowService
        FollowService.auto_confirm_pending_follows(db, current_user.id)

    db.commit()
    db.refresh(current_user)

    # ... return response ...
```

**Deliverable**: Privacy change triggers auto-confirmation

#### 4.7 Register Router
**File**: `backend/main.py`

```python
from routers import users

app.include_router(users.router, prefix="/api")
```

**Deliverable**: Users router registered

#### 4.8 Admin Panel
**File**: `backend/admin.py`

```python
class UserFollowAdmin(ModelView, model=UserFollow):
    name = "User Follow"
    name_plural = "User Follows"
    icon = "fa-solid fa-user-group"

    column_list = [UserFollow.id, UserFollow.follower, UserFollow.following_user, UserFollow.status, UserFollow.created_at]
    column_searchable_list = []
    column_sortable_list = [UserFollow.created_at, UserFollow.status]
    column_default_sort = [(UserFollow.created_at, True)]
    column_filters = [UserFollow.status]

    can_create = False
    can_edit = True  # For testing: manually approve/decline
    can_delete = True
    can_view_details = True

# In create_admin():
admin.add_view(UserFollowAdmin)
```

**Deliverable**: Admin panel for follows

### Frontend Tasks

#### 4.9 Update Types
**File**: `frontend/src/types/index.ts`

```typescript
export interface UserSearchResult {
  id: string;
  name: string;
  username?: string;
  profile_image_url?: string;
  is_public: boolean;
}

export interface UserProfilePublic {
  id: string;
  name: string;
  username?: string;
  bio?: string;
  profile_image_url?: string;
  is_public: boolean;
  follower_count: number;
  following_count: number;
  is_followed_by_me: boolean;
  follow_status?: 'pending' | 'confirmed';
}
```

**Deliverable**: User-related types

#### 4.10 API Client
**File**: `frontend/src/lib/api.ts`

```typescript
export const searchUsers = async (query: string): Promise<UserSearchResult[]> => {
  const response = await api.get('/users/search', { params: { q: query } });
  return response.data;
};

export const getUserProfile = async (userId: string): Promise<UserProfilePublic> => {
  const response = await api.get(`/users/${userId}`);
  return response.data;
};

export const followUser = async (userId: string): Promise<{ status: string; message: string }> => {
  const response = await api.post('/users/follow', { user_id: userId });
  return response.data;
};

export const unfollowUser = async (userId: string): Promise<void> => {
  await api.post(`/users/unfollow/${userId}`);
};

export const getMyFollowers = async (status: 'pending' | 'confirmed' = 'confirmed'): Promise<UserSearchResult[]> => {
  const response = await api.get('/users/me/followers', { params: { status } });
  return response.data;
};

export const getMyFollowing = async (): Promise<UserSearchResult[]> => {
  const response = await api.get('/users/me/following');
  return response.data;
};

export const approveFollower = async (followerId: string): Promise<void> => {
  await api.post(`/users/followers/${followerId}/approve`);
};

export const declineFollower = async (followerId: string): Promise<void> => {
  await api.post(`/users/followers/${followerId}/decline`);
};
```

**Deliverable**: API client methods

#### 4.11 User Search Page
**File**: `frontend/src/app/search/users/page.tsx` (new)

```typescript
'use client';

import { useState } from 'react';
import { searchUsers } from '@/lib/api';
import type { UserSearchResult } from '@/types';
import Link from 'next/link';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

export default function UserSearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (searchQuery: string) => {
    setQuery(searchQuery);
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      const users = await searchUsers(searchQuery);
      setResults(users);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Find Friends</h1>

      {/* Search Input */}
      <div className="relative mb-6">
        <MagnifyingGlassIcon className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name or username..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Results */}
      {loading && <p className="text-center text-gray-500">Searching...</p>}

      {!loading && results.length === 0 && query.length >= 2 && (
        <p className="text-center text-gray-500">No users found</p>
      )}

      <div className="space-y-2">
        {results.map(user => (
          <Link
            key={user.id}
            href={`/profile/${user.id}`}
            className="block p-4 bg-white border rounded-lg hover:bg-gray-50"
          >
            <div className="flex items-center gap-3">
              {/* Profile Image Placeholder */}
              <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                {user.name.charAt(0).toUpperCase()}
              </div>

              <div className="flex-1">
                <h3 className="font-semibold">{user.name}</h3>
                {user.username && (
                  <p className="text-sm text-gray-600">@{user.username}</p>
                )}
              </div>

              {user.is_public ? (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                  Public
                </span>
              ) : (
                <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                  Private
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

**Deliverable**: User search page

#### 4.12 User Profile Page
**File**: `frontend/src/app/profile/[userId]/page.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getUserProfile, followUser, unfollowUser } from '@/lib/api';
import type { UserProfilePublic } from '@/types';

export default function UserProfilePage() {
  const params = useParams();
  const userId = params.userId as string;

  const [profile, setProfile] = useState<UserProfilePublic | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const data = await getUserProfile(userId);
      setProfile(data);
    } catch (error) {
      console.error('Failed to load profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    try {
      const result = await followUser(userId);
      alert(result.message);
      loadProfile(); // Refresh to update button state
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to follow');
    }
  };

  const handleUnfollow = async () => {
    if (confirm('Unfollow this user?')) {
      try {
        await unfollowUser(userId);
        loadProfile();
      } catch (error) {
        alert('Failed to unfollow');
      }
    }
  };

  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  if (!profile) {
    return <div className="p-4">User not found</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      {/* Profile Header */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-start gap-4">
          {/* Profile Image */}
          <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center text-2xl">
            {profile.name.charAt(0).toUpperCase()}
          </div>

          <div className="flex-1">
            <h1 className="text-2xl font-bold">{profile.name}</h1>
            {profile.username && (
              <p className="text-gray-600">@{profile.username}</p>
            )}
            {profile.bio && (
              <p className="text-gray-700 mt-2">{profile.bio}</p>
            )}

            {/* Stats */}
            <div className="flex gap-6 mt-3 text-sm">
              <div>
                <span className="font-semibold">{profile.follower_count}</span>
                <span className="text-gray-600"> followers</span>
              </div>
              <div>
                <span className="font-semibold">{profile.following_count}</span>
                <span className="text-gray-600"> following</span>
              </div>
            </div>
          </div>

          {/* Follow Button */}
          <div>
            {profile.follow_status === 'confirmed' ? (
              <button
                onClick={handleUnfollow}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                Following
              </button>
            ) : profile.follow_status === 'pending' ? (
              <button
                disabled
                className="px-4 py-2 bg-gray-100 text-gray-500 rounded-lg cursor-not-allowed"
              >
                Request Sent
              </button>
            ) : (
              <button
                onClick={handleFollow}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Follow
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Map Section (Future: Phase 5) */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Map</h2>
        {profile.is_followed_by_me ? (
          <p className="text-gray-600">Map view coming in Phase 5!</p>
        ) : (
          <p className="text-gray-500">Follow this user to see their map</p>
        )}
      </div>
    </div>
  );
}
```

**Deliverable**: User profile page with follow button

#### 4.13 Followers/Following Pages
**File**: `frontend/src/app/followers/page.tsx` (new)
**File**: `frontend/src/app/following/page.tsx` (new)

Similar list views showing followers and following, with approve/decline buttons for pending requests.

**Deliverable**: Followers/following management pages

#### 4.14 Navigation Updates
**Files**: `frontend/src/components/Navbar.tsx`, `frontend/src/components/BottomNav.tsx`

Add link to user search page (e.g., "Find Friends" button).

**Deliverable**: Navigation includes search access

### Testing Checklist

**Backend**:
- [ ] User search works (username, name)
- [ ] Follow public user → instant confirm
- [ ] Follow private user → pending request
- [ ] Approve request works
- [ ] Decline request works
- [ ] Unfollow works
- [ ] Cannot follow self
- [ ] Privacy change auto-confirms pending
- [ ] Notifications sent correctly

**Frontend**:
- [ ] Search finds users
- [ ] Profile loads correctly
- [ ] Follow button states correct
- [ ] Followers/following lists work
- [ ] Approve/decline buttons work
- [ ] Mobile responsive

### Definition of Done
- [ ] All migrations applied
- [ ] Backend complete
- [ ] Frontend complete
- [ ] Notifications integrated
- [ ] Admin panel updated
- [ ] Code reviewed
- [ ] Branch merged

---

## Phase 5: Map Consumption & Pin Adoption

**Goal**: Allow confirmed followers to view maps and adopt places ("Add to My Map").

**User Stories**:
- US-1.6: As a user, I want to see an "Add to My Map" button on any place pin from a friend's map.
- FR-1.4: Only allow confirmed followers to load and display non-secret pins.
- FR-1.5: Pin duplication logic - copy place data into new pin for current user.

**Priority**: MEDIUM
**Estimated Duration**: 17 hours

### Backend Tasks

#### 5.1 API Endpoint - Get User's Map
**File**: `backend/routers/users.py`

```python
@router.get("/{user_id}/map", response_model=schemas.SharedMapData)
async def get_user_map(
    user_id: str,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a user's map (places, lists, tags).

    Permission checks:
    - If target user is public → anyone can view
    - If target user is private → only confirmed followers can view
    - Always exclude secret places (is_public=False)
    """
    target_user = db.query(models.User).filter(models.User.id == user_id).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Check permissions
    if not target_user.is_public:
        # Check if current user is a confirmed follower
        follow = db.query(models.UserFollow).filter(
            models.UserFollow.follower_id == current_user.id,
            models.UserFollow.following_id == user_id,
            models.UserFollow.status == 'confirmed'
        ).first()

        if not follow:
            raise HTTPException(
                status_code=403,
                detail="You must be a confirmed follower to view this map"
            )

    # Get public places only
    places = db.query(models.Place).filter(
        models.Place.user_id == user_id,
        models.Place.is_public == True
    ).all()

    # Get lists and tags
    lists = db.query(models.List).filter(models.List.user_id == user_id).all()
    tags = db.query(models.Tag).filter(models.Tag.user_id == user_id).all()

    # Build response (similar to share endpoint)
    # ... (same as Phase 3 share endpoint logic) ...

    return schemas.SharedMapData(...)
```

**Deliverable**: Map viewing endpoint with permissions

#### 5.2 API Endpoint - Adopt Place
**File**: `backend/routers/places.py`

```python
from pydantic import BaseModel

class AdoptPlaceRequest(BaseModel):
    source_place_id: str
    list_ids: List[str] = []
    tag_ids: List[str] = []
    notes: str = ""  # Allow custom notes

@router.post("/adopt", response_model=schemas.Place)
async def adopt_place(
    request: AdoptPlaceRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Adopt a place from another user's map.

    Creates a NEW place object for current user with:
    - Same: name, address, lat, lng, phone, website, hours
    - Different: user_id (current user), notes (custom), lists, tags

    Permissions:
    - Source place must be is_public=True
    - Source user must be public OR current user must be confirmed follower
    """
    source_place = db.query(models.Place).filter(
        models.Place.id == request.source_place_id
    ).first()

    if not source_place:
        raise HTTPException(status_code=404, detail="Place not found")

    if not source_place.is_public:
        raise HTTPException(status_code=403, detail="This place is private")

    # Check permission to view source user's map
    source_user = source_place.owner
    if not source_user.is_public:
        follow = db.query(models.UserFollow).filter(
            models.UserFollow.follower_id == current_user.id,
            models.UserFollow.following_id == source_user.id,
            models.UserFollow.status == 'confirmed'
        ).first()

        if not follow:
            raise HTTPException(status_code=403, detail="Permission denied")

    # Check if user already has a place at this exact location
    existing = db.query(models.Place).filter(
        models.Place.user_id == current_user.id,
        models.Place.latitude == source_place.latitude,
        models.Place.longitude == source_place.longitude,
        models.Place.name == source_place.name
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="You already have this place")

    # Validate lists and tags belong to current user
    if request.list_ids:
        lists = db.query(models.List).filter(
            models.List.id.in_(request.list_ids),
            models.List.user_id == current_user.id
        ).all()
        if len(lists) != len(request.list_ids):
            raise HTTPException(status_code=400, detail="Invalid list IDs")
    else:
        lists = []

    if request.tag_ids:
        tags = db.query(models.Tag).filter(
            models.Tag.id.in_(request.tag_ids),
            models.Tag.user_id == current_user.id
        ).all()
        if len(tags) != len(request.tag_ids):
            raise HTTPException(status_code=400, detail="Invalid tag IDs")
    else:
        tags = []

    # Create new place for current user
    new_place = models.Place(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        name=source_place.name,
        address=source_place.address,
        latitude=source_place.latitude,
        longitude=source_place.longitude,
        phone=source_place.phone,
        website=source_place.website,
        hours=source_place.hours,
        notes=request.notes,  # User's custom notes
        is_public=True,
        lists=lists,
        tags=tags
    )

    db.add(new_place)
    db.commit()
    db.refresh(new_place)

    return new_place
```

**Deliverable**: Place adoption endpoint

### Frontend Tasks

#### 5.3 Update User Profile Page
**File**: `frontend/src/app/profile/[userId]/page.tsx`

Replace placeholder map section with actual map:

```typescript
import Map from '@/components/Map';
import { getUserMap } from '@/lib/api';
import type { SharedMapData } from '@/types';

// Add state
const [mapData, setMapData] = useState<SharedMapData | null>(null);
const [mapError, setMapError] = useState<string | null>(null);

// Load map if following
useEffect(() => {
  if (profile?.is_followed_by_me) {
    loadMap();
  }
}, [profile]);

const loadMap = async () => {
  try {
    const data = await getUserMap(userId);
    setMapData(data);
    setMapError(null);
  } catch (error: any) {
    setMapError(error.response?.data?.detail || 'Failed to load map');
  }
};

// Render map
{profile.is_followed_by_me && mapData && (
  <div className="bg-white rounded-lg shadow overflow-hidden">
    <div className="h-96">
      <Map
        places={mapData.places}
        selectedPlaceId={selectedPlaceId}
        onPlaceClick={setSelectedPlaceId}
        onMapClick={() => setSelectedPlaceId(null)}
      />
    </div>
  </div>
)}
```

**Deliverable**: Profile page shows map for followers

#### 5.4 "Add to My Map" Modal
**File**: `frontend/src/components/AdoptPlaceModal.tsx` (new)

```typescript
'use client';

import { useState } from 'react';
import { adoptPlace } from '@/lib/api';
import { useStore } from '@/store/useStore';
import type { Place } from '@/types';

interface Props {
  place: Place;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AdoptPlaceModal({ place, onClose, onSuccess }: Props) {
  const { lists, tags, fetchPlaces } = useStore();
  const [selectedListIds, setSelectedListIds] = useState<string[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [customNotes, setCustomNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdopt = async () => {
    setLoading(true);
    try {
      await adoptPlace({
        source_place_id: place.id,
        list_ids: selectedListIds,
        tag_ids: selectedTagIds,
        notes: customNotes
      });

      await fetchPlaces(); // Refresh user's places
      onSuccess();
      alert('Place added to your map!');
      onClose();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to add place');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-screen overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Add to My Map</h2>

        {/* Place Info */}
        <div className="mb-4 p-3 bg-gray-50 rounded">
          <h3 className="font-semibold">{place.name}</h3>
          <p className="text-sm text-gray-600">{place.address}</p>
        </div>

        {/* Collections */}
        <div className="mb-4">
          <label className="block font-medium mb-2">Add to Collections</label>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {lists.map(list => (
              <label key={list.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedListIds.includes(list.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedListIds([...selectedListIds, list.id]);
                    } else {
                      setSelectedListIds(selectedListIds.filter(id => id !== list.id));
                    }
                  }}
                />
                <span>{list.name}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div className="mb-4">
          <label className="block font-medium mb-2">Add Tags</label>
          <div className="flex flex-wrap gap-2">
            {tags.map(tag => (
              <button
                key={tag.id}
                onClick={() => {
                  if (selectedTagIds.includes(tag.id)) {
                    setSelectedTagIds(selectedTagIds.filter(id => id !== tag.id));
                  } else {
                    setSelectedTagIds([...selectedTagIds, tag.id]);
                  }
                }}
                className={`px-3 py-1 rounded-full text-sm ${
                  selectedTagIds.includes(tag.id)
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                {tag.name}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Notes */}
        <div className="mb-4">
          <label className="block font-medium mb-2">Personal Notes (Optional)</label>
          <textarea
            value={customNotes}
            onChange={(e) => setCustomNotes(e.target.value)}
            placeholder="Add your own notes..."
            className="w-full p-2 border rounded"
            rows={3}
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Cancel
          </button>
          <button
            onClick={handleAdopt}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Adding...' : 'Add to My Map'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Deliverable**: Adopt place modal component

#### 5.5 Integrate Adopt Button
**File**: `frontend/src/app/profile/[userId]/page.tsx`

Add "Add to My Map" button on place markers/details:

```typescript
const [adoptingPlace, setAdoptingPlace] = useState<Place | null>(null);

// In place detail view:
<button
  onClick={() => setAdoptingPlace(selectedPlace)}
  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
>
  Add to My Map
</button>

{/* Modal */}
{adoptingPlace && (
  <AdoptPlaceModal
    place={adoptingPlace}
    onClose={() => setAdoptingPlace(null)}
    onSuccess={() => {
      // Optionally refresh map or show success message
    }}
  />
)}
```

**Deliverable**: Adopt button integrated into UI

#### 5.6 API Client Method
**File**: `frontend/src/lib/api.ts`

```typescript
export const getUserMap = async (userId: string): Promise<SharedMapData> => {
  const response = await api.get(`/users/${userId}/map`);
  return response.data;
};

export const adoptPlace = async (data: {
  source_place_id: string;
  list_ids: string[];
  tag_ids: string[];
  notes: string;
}): Promise<Place> => {
  const response = await api.post('/places/adopt', data);
  return response.data;
};
```

**Deliverable**: API methods for adoption

### Testing Checklist

**Backend**:
- [ ] Confirmed followers can view map
- [ ] Non-followers cannot view private maps
- [ ] Adopt place creates new place
- [ ] Adopt place validates permissions
- [ ] Adopt place prevents duplicates
- [ ] Secret places are excluded from map view

**Frontend**:
- [ ] Map loads for confirmed followers
- [ ] "Add to My Map" button appears
- [ ] Modal allows list/tag selection
- [ ] Custom notes work
- [ ] Success message appears
- [ ] Place appears in user's map after adoption

**Manual Testing**:
- [ ] Follow a friend
- [ ] View their map
- [ ] Adopt a place
- [ ] Verify place in "My Places"
- [ ] Test with private/public maps
- [ ] Test duplicate prevention

### Definition of Done
- [ ] Backend endpoints complete
- [ ] Frontend UI complete
- [ ] Adoption flow tested
- [ ] Code reviewed
- [ ] Branch merged
- [ ] Documentation updated

---

## Testing Strategy

### Unit Testing

**Backend**:
- Model validation (constraints, defaults)
- Business logic in services
- Notification service methods
- Follow service methods

**Frontend**:
- Component rendering
- API client methods
- Store actions
- Utility functions

### Integration Testing

**API Tests**:
- Authentication flows
- Follow request flows
- Notification delivery
- Map sharing permissions
- Place adoption

**E2E Tests** (Manual for MVP):
- User registration → profile setup → share map
- User search → follow request → approval → view map
- Adopt place flow

### Performance Testing

- Load test with 1000+ places
- Concurrent follow requests
- Notification delivery latency
- Share link response time

---

## Deployment Strategy

### Pre-Deployment Checklist

- [ ] All migrations tested on staging
- [ ] Database backup created
- [ ] Environment variables updated
- [ ] Frontend build tested
- [ ] API documentation updated

### Deployment Steps

1. **Database Migrations**:
   ```bash
   # SSH into Fly.io backend
   flyctl ssh console -a topoi-backend

   # Run migrations
   python -c "from database import engine; ..."
   ```

2. **Backend Deployment**:
   ```bash
   cd backend
   flyctl deploy
   ```

3. **Frontend Deployment**:
   ```bash
   cd frontend
   flyctl deploy
   ```

4. **Post-Deployment Verification**:
   - Test critical user flows
   - Check error logs
   - Verify notification delivery
   - Test share links

### Rollback Plan

- Keep previous Docker images
- Revert database migrations if needed
- Monitor error rates for 24h

---

## Future Enhancements

### Phase 6+: Advanced Features

**Push Notifications**:
- Integrate FCM (Firebase Cloud Messaging)
- Add device token storage
- Send push on follow events

**Deep Links**:
- Firebase Dynamic Links or Branch.io
- Open shared maps in app
- Smart routing for installed vs non-installed

**Social Features**:
- Like/comment on places
- Collaborative collections
- Place recommendations algorithm
- Activity feed (friends' recent places)

**Discovery**:
- Suggested users to follow
- Trending places
- Location-based user discovery

**Analytics**:
- Track adoption rates
- Popular places analytics
- User engagement metrics

---

## Glossary

**Terms**:
- **Pin**: A saved place on the map
- **Secret Pin**: A place with `is_public=False`, never visible to followers
- **Public Map**: User profile with `is_public=True`
- **Private Map**: User profile with `is_public=False`
- **Follow Request**: Pending follow when target user is private
- **Confirmed Follow**: Approved follow relationship
- **Adopt**: Copy a place from another user's map to your own

---

## Contributors

**Primary Developer**: Nicola Macchitella
**Last Updated**: November 25, 2025
**Version**: 1.0

---

## Questions & Decisions Log

| Date | Question | Decision | Rationale |
|------|----------|----------|-----------|
| Nov 25 | Privacy default? | Private (`is_public=False`) | User control, opt-in sharing |
| Nov 25 | Follow model? | One-way (Twitter-style) | Simpler UX, no friend requests |
| Nov 25 | Notification type? | In-app first, push later | Faster MVP, avoid infra complexity |
| Nov 25 | Phase order? | Settings → Notifications → Sharing → Following → Adoption | Dependencies optimized |

---

**End of Development Plan**
