"""
Tests for PATCH /api/lms/auth/me — theme preference update (Phase 15, GP-111)
"""

from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from src.api.main import app
from src.api.deps_lms import get_current_lms_user
from src.config.database import get_async_db
from src.db.lms_models import LMSUser

client = TestClient(app)

USER_ID = uuid4()
AUTH_HEADERS = {"X-User-Id": str(USER_ID)}


def make_mock_user(theme: str = "light") -> MagicMock:
    user = MagicMock(spec=LMSUser)
    user.id = USER_ID
    user.email = "student@test.com"
    user.full_name = "Test Student"
    user.is_active = True
    user.is_verified = False
    user.theme_preference = theme
    user.roles = ["student"]
    user.user_roles = []
    user.onboarding_completed = False
    user.recommended_pathway = None
    return user


def _make_db(user: MagicMock) -> AsyncMock:
    db = AsyncMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    return db


@pytest.fixture(autouse=True)
def override_deps():
    mock_user = make_mock_user("light")
    mock_db = _make_db(mock_user)

    async def _user():
        return mock_user

    async def _db():
        yield mock_db

    app.dependency_overrides[get_current_lms_user] = _user
    app.dependency_overrides[get_async_db] = _db
    yield mock_user
    app.dependency_overrides.clear()


def test_patch_theme_to_dark(override_deps):
    mock_user = override_deps
    response = client.patch(
        "/api/lms/auth/me",
        json={"theme_preference": "dark"},
        headers=AUTH_HEADERS,
    )
    assert response.status_code == 200
    assert mock_user.theme_preference == "dark"


def test_patch_theme_to_light(override_deps):
    mock_user = override_deps
    mock_user.theme_preference = "dark"
    response = client.patch(
        "/api/lms/auth/me",
        json={"theme_preference": "light"},
        headers=AUTH_HEADERS,
    )
    assert response.status_code == 200
    assert mock_user.theme_preference == "light"


def test_patch_theme_invalid_value(override_deps):
    response = client.patch(
        "/api/lms/auth/me",
        json={"theme_preference": "rainbow"},
        headers=AUTH_HEADERS,
    )
    assert response.status_code == 422


def test_patch_requires_auth():
    app.dependency_overrides.clear()
    response = client.patch(
        "/api/lms/auth/me",
        json={"theme_preference": "dark"},
    )
    assert response.status_code in (401, 422)
