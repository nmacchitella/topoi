"""Fast application and authentication smoke tests."""

import asyncio
import os
import tempfile
import unittest
from pathlib import Path


_temp_dir = tempfile.TemporaryDirectory(prefix="topoi-tests-")
os.environ["DATABASE_URL"] = f"sqlite:///{Path(_temp_dir.name) / 'topoi.db'}"
os.environ["SECRET_KEY"] = "topoi-test-secret"

import auth  # noqa: E402
import httpx  # noqa: E402
import models  # noqa: E402
from database import Base, SessionLocal, engine  # noqa: E402
from main import MAX_BODY_SIZE, app  # noqa: E402


Base.metadata.create_all(bind=engine)


class ApplicationSmokeTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        asyncio.get_running_loop().slow_callback_duration = 1.0
        self.client = httpx.AsyncClient(
            transport=httpx.ASGITransport(app=app),
            base_url="http://testserver",
        )

    async def asyncTearDown(self):
        await self.client.aclose()

    async def test_health_and_root_endpoints(self):
        health = await self.client.get("/health")
        self.assertEqual(health.status_code, 200)
        self.assertEqual(health.json(), {"status": "healthy"})

        root = await self.client.get("/")
        self.assertEqual(root.status_code, 200)
        self.assertEqual(root.json()["message"], "Topoi API")

    async def test_openapi_contains_critical_routes(self):
        paths = (await self.client.get("/openapi.json")).json()["paths"]
        self.assertIn("/api/auth/login-json", paths)
        self.assertIn("/api/places", paths)
        self.assertIn("/api/share/{token}", paths)

    async def test_oversized_requests_are_rejected(self):
        response = await self.client.post(
            "/api/auth/login-json",
            content=b"{}",
            headers={"content-length": str(MAX_BODY_SIZE + 1)},
        )
        self.assertEqual(response.status_code, 413)


class AuthenticationSmokeTests(unittest.TestCase):
    def setUp(self):
        self.db = SessionLocal()

    def tearDown(self):
        self.db.rollback()
        self.db.close()

    def test_password_hash_round_trip(self):
        hashed = auth.get_password_hash("CorrectHorse7!")
        self.assertTrue(auth.verify_password("CorrectHorse7!", hashed))
        self.assertFalse(auth.verify_password("wrong-password", hashed))

    def test_oauth_only_user_cannot_use_password_login(self):
        user = models.User(
            email="oauth-only@example.test",
            name="OAuth User",
            hashed_password=None,
            oauth_provider="google",
            oauth_id="google-oauth-only",
            is_verified=True,
        )
        self.db.add(user)
        self.db.commit()

        self.assertFalse(
            auth.authenticate_user(self.db, user.email, "any-password")
        )

    def test_google_login_links_an_existing_user(self):
        user = models.User(
            email="existing@example.test",
            name="Existing User",
            hashed_password=auth.get_password_hash("CorrectHorse7!"),
            is_verified=False,
        )
        self.db.add(user)
        self.db.commit()
        user_id = user.id

        linked = auth.get_or_create_google_user(
            self.db,
            email=user.email,
            name=user.name,
            google_id="google-existing-user",
        )

        self.assertEqual(linked.id, user_id)
        self.assertEqual(linked.oauth_provider, "google")
        self.assertEqual(linked.oauth_id, "google-existing-user")
        self.assertTrue(linked.is_verified)


def tearDownModule():
    engine.dispose()
    _temp_dir.cleanup()


if __name__ == "__main__":
    unittest.main()
