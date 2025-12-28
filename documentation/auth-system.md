# Authentication System

Topoi uses a JWT-based authentication system with support for email/password login, Google OAuth, and email verification.

## Overview

| Feature | Implementation |
|---------|----------------|
| Password Hashing | bcrypt via passlib |
| Access Tokens | JWT (python-jose), 15 min expiry |
| Refresh Tokens | Secure random, 7 day expiry, stored in DB |
| OAuth | Google OAuth 2.0 via authlib |
| Email Verification | 24-hour token, required for email accounts |
| Password Reset | 24-hour token, email-based |

## Token Architecture

### Access Token
- **Type**: JWT (JSON Web Token)
- **Lifetime**: 15 minutes
- **Storage**:
  - Web: In-memory (Zustand store)
  - Mobile: Expo SecureStore
- **Contains**: User email (`sub` claim), expiration (`exp`)
- **Algorithm**: HS256

### Refresh Token
- **Type**: Cryptographically secure random string (32 bytes, URL-safe)
- **Lifetime**: 7 days
- **Storage**:
  - Web: localStorage + cookie
  - Mobile: Expo SecureStore
  - Backend: Database (`refresh_tokens` table)
- **Features**: Revocable, one-time use (rotated on each refresh)

## Authentication Flows

### Email/Password Registration

```
1. User submits email, name, password
2. Backend validates input
3. Password hashed with bcrypt
4. User created with is_verified=false
5. Verification token created (24h expiry)
6. Verification email sent
7. User redirected to "verification pending" page
```

**Endpoint**: `POST /api/auth/register`

```json
// Request
{
  "email": "user@example.com",
  "name": "John Doe",
  "password": "securepassword123"
}

// Response
{
  "id": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "is_verified": false
}
```

### Email Verification

```
1. User clicks link in email: /verify-email?token=xxx
2. Frontend calls backend with token
3. Backend validates token (not expired, correct type)
4. User.is_verified set to true
5. Token deleted
6. User can now log in
```

**Endpoint**: `POST /api/auth/verify-email`

### Email/Password Login

```
1. User submits email + password
2. Backend finds user by email
3. Backend verifies password hash
4. Check: is_verified must be true (for email accounts)
5. Create access token (JWT)
6. Create refresh token (stored in DB)
7. Return both tokens to client
```

**Endpoint**: `POST /api/auth/login-json`

```json
// Request
{
  "email": "user@example.com",
  "password": "securepassword123"
}

// Response
{
  "access_token": "eyJ...",
  "refresh_token": "abc123...",
  "token_type": "bearer"
}
```

### Google OAuth (Web)

```
1. User clicks "Continue with Google"
2. Frontend redirects to /api/auth/google/login
3. Backend returns Google authorization URL
4. User completes Google consent flow
5. Google redirects to /api/auth/google/callback with code
6. Backend exchanges code for Google tokens
7. Backend fetches user info from Google
8. Backend creates/updates user (auto-verified)
9. Backend creates token pair
10. Redirect to frontend /auth/callback?token=xxx&refresh_token=yyy
11. Frontend stores tokens
```

**Endpoints**:
- `GET /api/auth/google/login` - Returns authorization URL
- `GET /api/auth/google/callback` - Handles OAuth callback

### Google OAuth (Mobile)

```
1. User taps "Continue with Google" in app
2. App uses expo-auth-session to get Google ID token
3. App sends ID token to /api/auth/google/mobile
4. Backend verifies ID token with Google
5. Backend validates audience (client ID)
6. Backend creates/updates user
7. Backend returns token pair
8. App stores tokens in SecureStore
```

**Endpoint**: `POST /api/auth/google/mobile`

```json
// Request
{
  "id_token": "eyJ..."
}

// Response
{
  "access_token": "eyJ...",
  "refresh_token": "abc123...",
  "token_type": "bearer",
  "user": {
    "id": "uuid",
    "email": "user@gmail.com",
    "name": "John Doe"
  }
}
```

### Token Refresh

```
1. Access token expires (401 response)
2. Client sends refresh token to /api/auth/refresh
3. Backend validates refresh token:
   - Exists in DB
   - Not revoked
   - Not expired
4. Backend creates new access token
5. Backend rotates refresh token (old revoked, new created)
6. Return new token pair
```

**Endpoint**: `POST /api/auth/refresh`

```json
// Request
{
  "refresh_token": "abc123..."
}

// Response
{
  "access_token": "eyJ...",
  "refresh_token": "xyz789...",
  "token_type": "bearer"
}
```

### Password Reset

```
1. User requests reset: POST /api/auth/forgot-password
2. Backend creates reset token (24h expiry)
3. Reset email sent with link
4. User clicks link: /reset-password?token=xxx
5. User submits new password
6. Backend validates token
7. Password updated, token deleted
8. User can log in with new password
```

**Endpoints**:
- `POST /api/auth/forgot-password` - Request reset email
- `POST /api/auth/reset-password` - Submit new password

### Logout

```
1. Client calls POST /api/auth/logout
2. Backend revokes refresh token in DB
3. Client clears stored tokens
```

**Endpoint**: `POST /api/auth/logout`

### Additional Endpoints

#### Get Current User
**Endpoint**: `GET /api/auth/me`
- Returns authenticated user's profile
- Requires Bearer token

#### Update Current User
**Endpoint**: `PUT /api/auth/me`
```json
// Request
{
  "name": "New Name",        // optional
  "email": "new@example.com" // optional
}
```

#### Change Password
**Endpoint**: `PUT /api/auth/me/password`
```json
// Request
{
  "current_password": "old_password",
  "new_password": "new_password"
}
```

#### Delete Account
**Endpoint**: `DELETE /api/auth/me`
- Deletes user and all associated data (cascade)

#### Logout All Devices
**Endpoint**: `POST /api/auth/logout-all`
- Revokes ALL refresh tokens for current user
- Useful for security breach response

#### Resend Verification Email
**Endpoint**: `POST /api/auth/resend-verification?email=user@example.com`
- Generates new verification token
- Sends new verification email

#### Get User Profile
**Endpoint**: `GET /api/auth/profile`
- Returns extended profile with follower/following counts

#### Update User Profile
**Endpoint**: `PATCH /api/auth/profile`
```json
// Request
{
  "name": "Display Name",     // optional
  "username": "username_123", // optional, 3-30 chars, alphanumeric+underscore
  "bio": "My bio text",       // optional, max 500 chars
  "is_public": true           // optional
}
```

## Code Reference

### Password Hashing (backend/auth.py)

```python
def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(
        password.encode('utf-8'),
        bcrypt.gensalt()
    ).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(
        plain_password.encode('utf-8'),
        hashed_password.encode('utf-8')
    )
```

### Access Token Creation (backend/auth.py)

```python
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (
        expires_delta or
        timedelta(minutes=settings.access_token_expire_minutes)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
```

### Refresh Token Creation (backend/auth.py)

```python
def create_refresh_token(user_id: str, db: Session, expires_delta: timedelta = None) -> str:
    if expires_delta is None:
        expires_delta = timedelta(days=7)

    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + expires_delta

    db_refresh_token = models.RefreshToken(
        token=token,
        user_id=user_id,
        expires_at=expires_at
    )
    db.add(db_refresh_token)
    db.commit()

    return token
```

### Protected Route Dependency (backend/auth.py)

```python
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = get_user_by_email(db, email=email)
    if user is None:
        raise credentials_exception
    return user
```

## Frontend Implementation

### API Interceptor (frontend/src/lib/api.ts)

The Axios client automatically handles token refresh:

```typescript
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = getRefreshToken();
        const response = await axios.post('/api/auth/refresh', {
          refresh_token: refreshToken
        });

        const { access_token, refresh_token } = response.data;
        setTokens(access_token, refresh_token);

        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, logout user
        logout();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
```

**Note**: The actual implementation includes a request queue mechanism to handle concurrent requests during token refresh. Failed requests are queued and retried once the new token is available.

### Token Storage (frontend/src/lib/auth-storage.ts)

```typescript
// Web: localStorage + cookie for SSR/middleware compatibility
export function setAccessToken(token: string) {
  localStorage.setItem('access_token', token);
  document.cookie = `access_token=${token}; path=/; max-age=900; SameSite=Lax`; // 15 min
}

export function setRefreshToken(token: string) {
  localStorage.setItem('refresh_token', token);
  document.cookie = `refresh_token=${token}; path=/; max-age=604800; SameSite=Lax`; // 7 days
}

export function clearTokens() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  document.cookie = 'access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  document.cookie = 'refresh_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
}

export function hasAccessTokenCookie(): boolean {
  return document.cookie.includes('access_token=');
}
```

**Note**: Next.js middleware (`middleware.ts`) checks for the `access_token` cookie to protect routes. The cookie is NOT httpOnly to allow JavaScript access for Bearer auth headers.

### Mobile Token Storage (mobile/src/lib/auth-storage.ts)

```typescript
import * as SecureStore from 'expo-secure-store';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

export async function setTokens(accessToken: string, refreshToken: string) {
  await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
  await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
}

export async function getAccessToken(): Promise<string | null> {
  return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function clearTokens() {
  await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}
```

**Note**: The mobile API client (`api.ts`) also maintains an in-memory cached token to avoid repeated SecureStore async calls in the request interceptor.

## Security Considerations

### Password Requirements
- Minimum length enforced by frontend (8 characters recommended)
- bcrypt handles salt generation automatically
- No password stored in plain text

### Token Security
- Access tokens are short-lived (15 min) to limit exposure
- Refresh tokens are rotated on each use
- Refresh tokens can be revoked server-side
- All tokens use cryptographically secure random generation

### OAuth Security
- Server-side token exchange (authorization code flow)
- Client secrets never exposed to frontend
- ID token audience validation for mobile
- OAuth users auto-verified (Google has already verified email)

### Protection Against Common Attacks
- **CSRF**: Token-based auth with `SameSite=Lax` cookies
- **XSS**: Tokens stored in localStorage and cookies (cookies are NOT httpOnly to allow Bearer auth)
- **Token Theft**: Short expiry (15 min), revocation capability, token rotation
- **Brute Force**: Rate limiting recommended (not currently implemented)

## Database Models

### User

```python
class User(Base):
    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=True)  # Null for OAuth users
    oauth_provider = Column(String, nullable=True)   # 'google', etc.
    oauth_id = Column(String, nullable=True)
    is_verified = Column(Boolean, default=False, nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Profile fields
    is_public = Column(Boolean, default=False, nullable=False)
    username = Column(String, unique=True, nullable=True, index=True)
    bio = Column(String, nullable=True)
    profile_image_url = Column(String, nullable=True)
```

### RefreshToken

```python
class RefreshToken(Base):
    id = Column(String, primary_key=True, default=generate_uuid)
    token = Column(String, unique=True, index=True, nullable=False)
    user_id = Column(String, ForeignKey("users.id", ondelete='CASCADE'), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    revoked = Column(Boolean, default=False)
```

### VerificationToken

```python
class VerificationToken(Base):
    token = Column(String, primary_key=True)
    user_id = Column(String, ForeignKey("users.id", ondelete='CASCADE'), nullable=False)
    type = Column(String, nullable=False)  # 'verify_email' or 'reset_password'
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
```

## Configuration

Required environment variables:

```env
# JWT Configuration
SECRET_KEY=<32-byte-hex-string>  # Generate with: openssl rand -hex 32
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15

# Google OAuth
GOOGLE_CLIENT_ID=<from-google-cloud-console>
GOOGLE_CLIENT_SECRET=<from-google-cloud-console>

# URLs (for OAuth redirects and email links)
FRONTEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:8000
```

## Troubleshooting

### "Token expired" errors
- Check system time is synchronized
- Verify ACCESS_TOKEN_EXPIRE_MINUTES is reasonable
- Ensure frontend token refresh logic is working

### OAuth redirect mismatch
- Verify BACKEND_URL matches Google Cloud Console redirect URI
- Must be exact match: `{BACKEND_URL}/api/auth/google/callback`

### Email verification not working
- Check SMTP configuration (see integrations.md)
- Verify FRONTEND_URL is correct for email links
- Check spam folder

### "Could not validate credentials"
- Token may be malformed or expired
- Check SECRET_KEY is consistent between restarts
- Verify ALGORITHM matches token encoding
