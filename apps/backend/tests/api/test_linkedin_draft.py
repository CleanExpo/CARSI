"""
Tests for POST /api/lms/credentials/{credential_id}/linkedin-draft — C7 LinkedIn AI Draft.
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from src.api.main import app
from src.api.deps_lms import get_current_lms_user
from src.config.database import get_async_db
from src.db.lms_models import LMSCourse, LMSEnrollment, LMSUser

client = TestClient(app)

AUTH_HEADERS = {"X-User-Id": "00000000-0000-0000-0000-000000000001"}

STUDENT_ID = uuid4()
ENROLLMENT_ID = uuid4()
COURSE_ID = uuid4()


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


def make_mock_student() -> MagicMock:
    user = MagicMock(spec=LMSUser)
    user.id = STUDENT_ID
    user.email = "student@test.com"
    user.full_name = "James Wilson"
    user.is_active = True
    user.user_roles = [_make_user_role("student")]
    user.roles = ["student"]
    return user


def make_mock_course() -> MagicMock:
    course = MagicMock(spec=LMSCourse)
    course.id = COURSE_ID
    course.title = "Water Damage Restoration Technician"
    course.iicrc_discipline = "WRT"
    course.cec_hours = 8.0
    return course


def make_mock_enrollment() -> MagicMock:
    enrollment = MagicMock(spec=LMSEnrollment)
    enrollment.id = ENROLLMENT_ID
    enrollment.student_id = STUDENT_ID
    enrollment.course_id = COURSE_ID
    enrollment.status = "completed"
    enrollment.enrolled_at = datetime(2026, 1, 1, tzinfo=timezone.utc)
    enrollment.completed_at = datetime(2026, 2, 15, tzinfo=timezone.utc)
    enrollment.course = make_mock_course()
    enrollment.student = make_mock_student()
    return enrollment


def make_mock_db_with_enrollment(enrollment=None) -> AsyncMock:
    db = AsyncMock()
    result = MagicMock()
    result.scalar_one_or_none.return_value = enrollment
    db.execute = AsyncMock(return_value=result)
    return db


def _override_db(mock_db: AsyncMock):
    async def _get_db():
        yield mock_db
    return _get_db


def _override_user(mock_user):
    def _get_user():
        return mock_user
    return _get_user


class TestLinkedInDraft:
    def test_returns_template_when_no_api_key(self):
        mock_db = make_mock_db_with_enrollment(make_mock_enrollment())
        mock_student = make_mock_student()
        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(mock_student)

        # Patch settings to have no API key
        with patch("src.api.routes.lms_credentials.get_settings") as mock_settings:
            settings = MagicMock()
            settings.anthropic_api_key = ""
            mock_settings.return_value = settings

            resp = client.post(
                f"/api/lms/credentials/{ENROLLMENT_ID}/linkedin-draft",
                json={},
                headers=AUTH_HEADERS,
            )

        assert resp.status_code == 200
        data = resp.json()
        assert data["credential_id"] == str(ENROLLMENT_ID)
        assert "WRT" in data["draft"]
        assert "carsi.com.au/credentials" in data["draft"]
        assert "#IICRC" in data["draft"]

    def test_returns_404_for_unknown_credential(self):
        mock_db = make_mock_db_with_enrollment(None)
        mock_student = make_mock_student()
        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(mock_student)

        unknown_id = uuid4()
        resp = client.post(
            f"/api/lms/credentials/{unknown_id}/linkedin-draft",
            json={},
            headers=AUTH_HEADERS,
        )
        assert resp.status_code == 404

    def test_returns_404_for_invalid_uuid(self):
        mock_student = make_mock_student()
        mock_db = AsyncMock()
        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(mock_student)

        resp = client.post(
            "/api/lms/credentials/not-a-uuid/linkedin-draft",
            json={},
            headers=AUTH_HEADERS,
        )
        assert resp.status_code == 404

    def test_requires_auth(self):
        resp = client.post(
            f"/api/lms/credentials/{ENROLLMENT_ID}/linkedin-draft",
            json={},
        )
        assert resp.status_code == 401

    def test_includes_years_experience_when_provided(self):
        mock_db = make_mock_db_with_enrollment(make_mock_enrollment())
        mock_student = make_mock_student()
        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(mock_student)

        with patch("src.api.routes.lms_credentials.get_settings") as mock_settings:
            settings = MagicMock()
            settings.anthropic_api_key = ""
            mock_settings.return_value = settings

            resp = client.post(
                f"/api/lms/credentials/{ENROLLMENT_ID}/linkedin-draft",
                json={"years_experience": 5},
                headers=AUTH_HEADERS,
            )

        assert resp.status_code == 200
        assert "5 years" in resp.json()["draft"]
