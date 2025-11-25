#!/usr/bin/env python3
"""
Script to create the first admin user or promote an existing user to admin.
Usage:
    python create_admin.py <email>
"""
import sys
from sqlalchemy.orm import Session
from database import SessionLocal
from models import User
from auth import get_password_hash
import getpass


def create_or_promote_admin(email: str, db: Session):
    """Create a new admin user or promote existing user to admin"""
    user = db.query(User).filter(User.email == email).first()

    if user:
        # User exists, promote to admin
        if user.is_admin:
            print(f"✓ User {email} is already an admin!")
            return user
        else:
            user.is_admin = True
            db.commit()
            db.refresh(user)
            print(f"✓ User {email} has been promoted to admin!")
            return user
    else:
        # User doesn't exist, create new admin user
        print(f"User {email} not found. Creating new admin user...")
        name = input("Enter name: ")
        password = getpass.getpass("Enter password: ")
        password_confirm = getpass.getpass("Confirm password: ")

        if password != password_confirm:
            print("✗ Passwords don't match!")
            sys.exit(1)

        if len(password) < 8:
            print("✗ Password must be at least 8 characters long!")
            sys.exit(1)

        new_user = User(
            email=email,
            name=name,
            hashed_password=get_password_hash(password),
            is_admin=True
        )

        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        print(f"✓ Admin user {email} created successfully!")
        return new_user


def main():
    if len(sys.argv) != 2:
        print("Usage: python create_admin.py <email>")
        sys.exit(1)

    email = sys.argv[1]

    if "@" not in email:
        print("✗ Invalid email address!")
        sys.exit(1)

    db = SessionLocal()
    try:
        user = create_or_promote_admin(email, db)
        print(f"\nAdmin user details:")
        print(f"  ID: {user.id}")
        print(f"  Email: {user.email}")
        print(f"  Name: {user.name}")
        print(f"  Is Admin: {user.is_admin}")
        print(f"\nYou can now login to the admin panel at http://localhost:8000/admin")
    except Exception as e:
        print(f"✗ Error: {e}")
        sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
