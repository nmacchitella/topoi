# Admin Panel Guide

This guide explains how to use the admin functionality in Topoi.

## Features

- **SQLAdmin Panel**: Web-based admin interface at `/admin`
- **Admin API Endpoints**: RESTful API for admin operations
- **Database Agnostic**: Works with both SQLite and PostgreSQL
- **Secure Authentication**: Admin-only access with session management
- **Comprehensive Management**: Manage all models (Users, Places, Lists, Tags, etc.)

## Getting Started

### 1. Create Your First Admin User

Use the provided script to create an admin user:

```bash
cd backend
source venv/bin/activate
python create_admin.py your-email@example.com
```

The script will:
- Check if the user exists
- If exists, promote them to admin
- If not exists, create a new admin user with password

### 2. Access the Admin Panel

1. Start the backend server:
   ```bash
   cd backend
   source venv/bin/activate
   python main.py
   ```

2. Navigate to: `http://localhost:8000/admin`

3. Login with your admin credentials

### 3. Using the Admin Panel

The admin panel provides:

#### User Management
- View all users
- Edit user details
- Promote/demote admin status
- Delete users

#### Place Management
- View all places
- Edit place details
- Change ownership
- Delete places

#### List Management
- View all lists
- Edit list details
- Manage list-place associations
- Delete lists

#### Tag Management
- View all tags
- Edit tag names
- Manage tag-place associations
- Delete tags

#### Token Management
- View refresh tokens
- Revoke tokens
- Clean up expired tokens

#### Telegram Integration
- View linked Telegram accounts
- Manage link codes
- Unlink accounts

## Admin API Endpoints

### List All Users
```bash
GET /api/admin/users?skip=0&limit=100
Authorization: Bearer <your-access-token>
```

### Promote User to Admin
```bash
POST /api/admin/promote-user/{user_id}
Authorization: Bearer <your-access-token>
```

### Demote User from Admin
```bash
POST /api/admin/demote-user/{user_id}
Authorization: Bearer <your-access-token>
```

**Note**: You cannot demote yourself. This prevents accidentally locking yourself out.

## Database Migration

### Migrating to PostgreSQL

When you're ready to migrate from SQLite to PostgreSQL:

1. Update your `.env` file:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/topoi"
   ```

2. Restart the server:
   ```bash
   python main.py
   ```

3. The admin panel will work seamlessly with PostgreSQL!

### No Migration Scripts Needed

Since you're already using SQLAlchemy ORM, the migration is straightforward:
- All models use SQLAlchemy Core types
- The `is_admin` field is a standard Boolean column
- SQLAdmin works identically with both databases

## Security Best Practices

1. **Use Strong Passwords**: Enforce strong passwords for admin accounts
2. **HTTPS in Production**: Set `https_only=True` in SessionMiddleware for production
3. **Secret Key**: Use a strong, random secret key in production
4. **Regular Audits**: Periodically review admin users and revoke unnecessary privileges
5. **Token Management**: Clean up expired refresh tokens regularly

## Troubleshooting

### Cannot Access Admin Panel
- Ensure the server is running
- Check that you're using the correct URL: `http://localhost:8000/admin`
- Verify your user has `is_admin=True`

### Login Fails
- Verify your email and password
- Check that your user account has `is_admin=True`
- Look at server logs for authentication errors

### Database Errors
- Ensure the database file exists (for SQLite)
- Check database connection string (for PostgreSQL)
- Verify all migrations have been applied

## Development Tips

### Check Admin Status
```python
from database import SessionLocal
from models import User

db = SessionLocal()
user = db.query(User).filter(User.email == "your@email.com").first()
print(f"Is Admin: {user.is_admin}")
db.close()
```

### Manually Set Admin Status
```python
from database import SessionLocal
from models import User

db = SessionLocal()
user = db.query(User).filter(User.email == "your@email.com").first()
user.is_admin = True
db.commit()
db.close()
```

## Files Added/Modified

### New Files
- `backend/admin.py` - SQLAdmin configuration and model views
- `backend/routers/admin_router.py` - Admin API endpoints
- `backend/create_admin.py` - CLI script to create admin users
- `backend/ADMIN_README.md` - This documentation

### Modified Files
- `backend/models.py` - Added `is_admin` field to User model
- `backend/schemas.py` - Added `is_admin` field to User schema
- `backend/main.py` - Mounted admin panel and admin router
- `backend/requirements.txt` - Added sqladmin and wtforms dependencies

## Support

For issues or questions:
- Check server logs for detailed error messages
- Review the SQLAdmin documentation: https://aminalaee.dev/sqladmin/
- Check your database connection and credentials
