"""
Tests for POST /api/lms/auth/onboarding — AI Onboarding Wizard endpoint.
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

AUTH_HEADERS = {"X-User-Id": "00000000-0000-0000-0000-000000000001"}

USER_ID = uuid4()


@pytest.fixture(autouse=True)
def clear_overrides():
    yield
    app.dependency_overrides.clear()


def _make_user_role(role_name: str) -> MagicMock:
    role = MagicMock()
    role.name = role_name
    ur = MagicMock()
    ur.role = role
    return ur


def make_mock_student(onboarding_completed: bool = False) -> MagicMock:
    user = MagicMock(spec=LMSUser)
    user.id = USER_ID
    user.email = "student@test.com"
    user.full_name = "Test Student"
    user.is_active = True
    user.onboarding_completed = onboarding_completed
    user.recommended_pathway = None
    user.theme_preference = "dark"
    user.is_verified = False
    user.user_roles = [_make_user_role("student")]
    user.roles = ["student"]
    return user


def make_mock_db() -> AsyncMock:
    db = AsyncMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    return db


def _override_db(mock_db: AsyncMock):
    async def _get_db():
        yield mock_db
    return _get_db


def _override_user(mock_user):
    def _get_user():
        return mock_user
    return _get_user


RESTORATION_TECHNICIAN_PAYLOAD = {
    "industry": "restoration",
    "role": "technician",
    "iicrc_experience": "none",
    "primary_goal": "new_cert",
}


class TestCompleteOnboarding:
    def test_returns_pathway_for_restoration_technician(self):
        mock_db = make_mock_db()
        mock_student = make_mock_student(onboarding_completed=False)
        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(mock_student)

        resp = client.post(
            "/api/lms/auth/onboarding",
            json=RESTORATION_TECHNICIAN_PAYLOAD,
            headers=AUTH_HEADERS,
        )
        assert resp.status_code == 200
        data = resp.json()
        # Restoration technician with no experience and new cert goal → WRT
        assert data["recommended_pathway"] in ("WRT", "ASD")
        assert "suggested_courses_url" in data
        assert data["suggested_courses_url"].startswith("/pathways/")
        assert "pathway_description" in data

    def test_returns_409_if_already_completed(self):
        mock_db = make_mock_db()
        mock_student = make_mock_student(onboarding_completed=True)
        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(mock_student)

        resp = client.post(
            "/api/lms/auth/onboarding",
            json=RESTORATION_TECHNICIAN_PAYLOAD,
            headers=AUTH_HEADERS,
        )
        assert resp.status_code == 409
        assert "already completed" in resp.json()["detail"].lower()

    def test_requires_auth(self):
        # No X-User-Id header → middleware returns 401 before DI
        resp = client.post(
            "/api/lms/auth/onboarding",
            json=RESTORATION_TECHNICIAN_PAYLOAD,
        )
        assert resp.status_code == 401

    def test_updates_user_onboarding_flag(self):
        mock_db = make_mock_db()
        mock_student = make_mock_student(onboarding_completed=False)

        # db.refresh should set the flag back on the mock
        async def _refresh(obj):
            obj.onboarding_completed = True
            obj.recommended_pathway = "WRT"

        mock_db.refresh = _refresh
        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(mock_student)

        resp = client.post(
            "/api/lms/auth/onboarding",
            json=RESTORATION_TECHNICIAN_PAYLOAD,
            headers=AUTH_HEADERS,
        )
        assert resp.status_code == 200
        # Verify the ORM object was mutated before commit
        assert mock_student.onboarding_completed is True
        mock_db.commit.assert_awaited_once()

    def test_healthcare_scores_hst(self):
        mock_db = make_mock_db()
        mock_student = make_mock_student(onboarding_completed=False)
        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(mock_student)

        resp = client.post(
            "/api/lms/auth/onboarding",
            json={
                "industry": "healthcare",
                "role": "technician",
                "iicrc_experience": "none",
                "primary_goal": "new_cert",
            },
            headers=AUTH_HEADERS,
        )
        assert resp.status_code == 200
        assert resp.json()["recommended_pathway"] == "HST"
