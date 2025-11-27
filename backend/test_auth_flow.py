import sys
import os
import requests
import time
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add backend directory to path to import models
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
from backend import models

# Database setup
SQLALCHEMY_DATABASE_URL = "sqlite:///./backend/topoi.db"
engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

BASE_URL = "http://localhost:8000/api"

def get_db_token(email, token_type):
    db = SessionLocal()
    try:
        user = db.query(models.User).filter(models.User.email == email).first()
        if not user:
            return None
        token = db.query(models.VerificationToken).filter(
            models.VerificationToken.user_id == user.id,
            models.VerificationToken.type == token_type
        ).first()
        return token.token if token else None
    finally:
        db.close()

def test_auth_flow():
    print("🚀 Starting Auth Flow Test")
    
    # 1. Register new user
    email = f"test_{int(time.time())}@example.com"
    password = "password123"
    print(f"\n📝 Registering user: {email}")
    
    response = requests.post(f"{BASE_URL}/auth/register", json={
        "email": email,
        "password": password,
        "name": "Test User"
    })
    
    if response.status_code != 200:
        print(f"❌ Registration failed: {response.text}")
        return
    
    print(f"✅ Registered successfully")
    
    # 2. Try to login (should fail)
    print("\n🔐 Attempting login (should fail)...")
    response = requests.post(f"{BASE_URL}/auth/login-json", json={
        "email": email,
        "password": password
    })
    
    if response.status_code == 403:
        print("✅ Login blocked as expected (Email not verified)")
    else:
        print(f"❌ Login should have failed with 403, got {response.status_code}")
        return

    # 3. Verify Email
    print("\n📧 Verifying email...")
    token = get_db_token(email, "verify_email")
    if not token:
        print("❌ Could not find verification token in DB")
        return
        
    print(f"   Found token: {token}")
    
    response = requests.post(f"{BASE_URL}/auth/verify-email?token={token}")
    if response.status_code == 200:
        print("✅ Email verified successfully")
    else:
        print(f"❌ Verification failed: {response.text}")
        return

    # 4. Login again (should succeed)
    print("\n🔓 Attempting login (should succeed)...")
    response = requests.post(f"{BASE_URL}/auth/login-json", json={
        "email": email,
        "password": password
    })
    
    if response.status_code == 200:
        print("✅ Login successful")
    else:
        print(f"❌ Login failed: {response.text}")
        return

    # 5. Forgot Password
    print("\n❓ Requesting password reset...")
    response = requests.post(f"{BASE_URL}/auth/forgot-password?email={email}")
    if response.status_code == 200:
        print("✅ Password reset email request sent")
    else:
        print(f"❌ Failed to request password reset: {response.text}")
        return

    # 6. Reset Password
    print("\n🔄 Resetting password...")
    reset_token = get_db_token(email, "reset_password")
    if not reset_token:
        print("❌ Could not find reset token in DB")
        return
        
    print(f"   Found reset token: {reset_token}")
    
    new_password = "newpassword123"
    response = requests.post(f"{BASE_URL}/auth/reset-password?token={reset_token}&new_password={new_password}")
    
    if response.status_code == 200:
        print("✅ Password reset successfully")
    else:
        print(f"❌ Password reset failed: {response.text}")
        return

    # 7. Login with new password
    print("\n🔑 Logging in with new password...")
    response = requests.post(f"{BASE_URL}/auth/login-json", json={
        "email": email,
        "password": new_password
    })
    
    if response.status_code == 200:
        print("✅ Login with new password successful")
    else:
        print(f"❌ Login with new password failed: {response.text}")
        return

    print("\n✨ All tests passed!")

if __name__ == "__main__":
    test_auth_flow()
