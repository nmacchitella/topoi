#!/usr/bin/env python3
"""Test Phase 1 Profile API endpoints"""

import requests
import json

BASE_URL = "http://localhost:8000/api"

def test_profile_api():
    # Login
    login_data = {
        "email": "testuser@example.com",
        "password": "test1234"
    }

    response = requests.post(f"{BASE_URL}/auth/login-json", json=login_data)
    if response.status_code != 200:
        print(f"❌ Login failed: {response.json()}")
        return

    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    print("✅ Login successful")

    # Test GET /auth/profile
    print("\n📋 Testing GET /auth/profile:")
    response = requests.get(f"{BASE_URL}/auth/profile", headers=headers)
    if response.status_code == 200:
        profile = response.json()
        print(f"✅ Profile retrieved successfully:")
        print(f"   Name: {profile['name']}")
        print(f"   Email: {profile['email']}")
        print(f"   Username: {profile.get('username', 'None')}")
        print(f"   Bio: {profile.get('bio', 'None')}")
        print(f"   Is Public: {profile['is_public']}")
    else:
        print(f"❌ GET profile failed: {response.json()}")
        return

    # Test PATCH /auth/profile - Update username, bio, and privacy
    print("\n✏️  Testing PATCH /auth/profile:")
    update_data = {
        "username": "testuser123",
        "bio": "This is my test bio! 🚀",
        "is_public": True
    }

    response = requests.patch(f"{BASE_URL}/auth/profile", json=update_data, headers=headers)
    if response.status_code == 200:
        updated_profile = response.json()
        print(f"✅ Profile updated successfully:")
        print(f"   Username: {updated_profile.get('username')}")
        print(f"   Bio: {updated_profile.get('bio')}")
        print(f"   Is Public: {updated_profile['is_public']}")
    else:
        print(f"❌ PATCH profile failed: {response.json()}")
        return

    # Test username uniqueness
    print("\n🔒 Testing username uniqueness:")
    duplicate_data = {"username": "testuser123"}

    # Create another user
    register_data = {
        "email": "testuser2@example.com",
        "password": "test1234",
        "name": "Test User 2"
    }
    response = requests.post(f"{BASE_URL}/auth/register", json=register_data)
    if response.status_code == 200:
        print("✅ Created second test user")

        # Login as second user
        login_data2 = {
            "email": "testuser2@example.com",
            "password": "test1234"
        }
        response = requests.post(f"{BASE_URL}/auth/login-json", json=login_data2)
        token2 = response.json()["access_token"]
        headers2 = {"Authorization": f"Bearer {token2}"}

        # Try to use same username
        response = requests.patch(f"{BASE_URL}/auth/profile", json=duplicate_data, headers=headers2)
        if response.status_code == 400:
            print(f"✅ Username uniqueness enforced: {response.json()['detail']}")
        else:
            print(f"❌ Username uniqueness NOT enforced")

    print("\n✅ All tests passed!")

if __name__ == "__main__":
    test_profile_api()
