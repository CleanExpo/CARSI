"""
Tests for push subscription endpoints — Phase D4 (PWA Push Notifications)

Covers:
- test_push_subscribe_requires_auth          — no auth → 401
- test_push_subscribe_creates_record         — valid body → 201, db.add called
- test_push_subscribe_upserts_on_duplicate_endpoint — same endpoint twice → updates
- test_push_unsubscribe_requires_auth        — no auth → 401
"""

from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from src.api.main import app
from src.api.deps_lms import get_current_lms_user
from src.config.database import get_async_db
from src.db.lms_models import LMSUser

client = TestClient(app)

AUTH_HEADERS = {"X-User-Id": "00000000-0000-0000-0000-000000000001"}

STUDENT_ID = uuid4()

VALID_PUSH_BODY = {
    "endpoint": "https://fcm.googleapis.com/fcm/send/example-token",
    "p256dh": "BGyi8z1nr14LL80SbG5HlP7PdUnHqkF8ej-dCa9GFMRcYBmYNlJm9dG1TIw3R",
    "auth": "HN9xXGFjGpB3aBo0qDg",
}


def _make_mock_student() -> MagicMock:
    user = MagicMock(spec=LMSUser)
    user.id = STUDENT_ID
    user.email = "student@test.com"
    user.full_name = "Test Student"
    user.is_active = True
    role = MagicMock()
    role.name = "student"
    ur = MagicMock()
    ur.role = role
    user.user_roles = [ur]
    return user


def _override_db(mock_db: AsyncMock):
    async def _dep():
        yield mock_db

    return _dep


def _override_user(mock_user: MagicMock):
    async def _dep():
        return mock_user

    return _dep


@pytest.fixture(autouse=True)
def clear_overrides():
    yield
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Auth guard tests
# ---------------------------------------------------------------------------


class TestPushSubscribeRequiresAuth:
    def test_push_subscribe_requires_auth(self):
        """POST /me/push-subscribe with no auth header returns 401."""
        response = client.post(
            "/api/lms/notifications/me/push-subscribe",
            json=VALID_PUSH_BODY,
            # deliberately omit AUTH_HEADERS
        )
        assert response.status_code == 401

    def test_push_unsubscribe_requires_auth(self):
        """DELETE /me/push-subscribe with no auth header returns 401."""
        response = client.delete(
            "/api/lms/notifications/me/push-subscribe",
            params={"endpoint": VALID_PUSH_BODY["endpoint"]},
        )
        assert response.status_code == 401


# ---------------------------------------------------------------------------
# Subscribe — creates new record
# ---------------------------------------------------------------------------


class TestPushSubscribeCreatesRecord:
    def test_push_subscribe_creates_record(self):
        """POST /me/push-subscribe with valid body → 201, db.add called once."""
        mock_db = AsyncMock()
        mock_student = _make_mock_student()

        # No existing subscription
        no_existing = MagicMock()
        no_existing.scalar_one_or_none.return_value = None
        mock_db.execute = AsyncMock(return_value=no_existing)

        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(mock_student)

        response = client.post(
            "/api/lms/notifications/me/push-subscribe",
            json=VALID_PUSH_BODY,
            headers=AUTH_HEADERS,
        )

        assert response.status_code == 201
        assert response.json() == {"subscribed": True}
        mock_db.add.assert_called_once()
        mock_db.commit.assert_awaited_once()


# ---------------------------------------------------------------------------
# Subscribe — upserts on duplicate endpoint
# ---------------------------------------------------------------------------


class TestPushSubscribeUpsertsOnDuplicate:
    def test_push_subscribe_upserts_on_duplicate_endpoint(self):
        """POST same endpoint twice → updates p256dh and auth, does not call db.add."""
        mock_db = AsyncMock()
        mock_student = _make_mock_student()

        # Simulate an existing subscription in the database
        existing_sub = MagicMock()
        existing_sub.p256dh = "old_p256dh"
        existing_sub.auth = "old_auth"

        existing_result = MagicMock()
        existing_result.scalar_one_or_none.return_value = existing_sub
        mock_db.execute = AsyncMock(return_value=existing_result)

        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(mock_student)

        updated_body = {**VALID_PUSH_BODY, "p256dh": "new_p256dh", "auth": "new_auth"}

        response = client.post(
            "/api/lms/notifications/me/push-subscribe",
            json=updated_body,
            headers=AUTH_HEADERS,
        )

        assert response.status_code == 201
        assert response.json() == {"subscribed": True}
        # Should update fields in-place, not add a new row
        mock_db.add.assert_not_called()
        assert existing_sub.p256dh == "new_p256dh"
        assert existing_sub.auth == "new_auth"
        mock_db.commit.assert_awaited_once()
