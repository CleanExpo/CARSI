"""
Tests for LMS Progress API — Phase 8 (GP-104)

Covers lesson completion endpoint and course progress endpoint.
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from src.api.main import app
from src.api.deps_lms import get_current_lms_user
from src.config.database import get_async_db
from src.db.lms_models import LMSLesson, LMSModule, LMSUser

client = TestClient(app)

AUTH_HEADERS = {"X-User-Id": "00000000-0000-0000-0000-000000000001"}

STUDENT_ID = uuid4()
COURSE_ID = uuid4()
LESSON_ID = uuid4()
MODULE_ID = uuid4()
ENROLLMENT_ID = uuid4()


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
    user.full_name = "Test Student"
    user.is_active = True
    user.user_roles = [_make_user_role("student")]
    return user


def make_mock_lesson() -> MagicMock:
    module = MagicMock()
    module.course_id = COURSE_ID
    lesson = MagicMock(spec=LMSLesson)
    lesson.id = LESSON_ID
    lesson.module = module
    return lesson


def make_mock_enrollment(status: str = "active") -> MagicMock:
    e = MagicMock()
    e.id = ENROLLMENT_ID
    e.student_id = STUDENT_ID
    e.course_id = COURSE_ID
    e.status = status
    return e


def make_mock_progress() -> MagicMock:
    p = MagicMock()
    p.lesson_id = LESSON_ID
    p.completed_at = datetime(2026, 3, 3, 10, 0, 0, tzinfo=timezone.utc)
    p.time_spent_seconds = 300
    return p


def make_mock_db() -> AsyncMock:
    db = AsyncMock()
    result = MagicMock()
    result.scalar_one_or_none.return_value = None
    result.scalar.return_value = 0
    db.execute = AsyncMock(return_value=result)
    db.add = MagicMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    return db


def _override_db(mock_db: AsyncMock):
    async def _dep():
        yield mock_db

    return _dep


def _override_user(mock_user):
    async def _dep():
        return mock_user

    return _dep


@pytest.fixture(autouse=True)
def clear_overrides():
    yield
    app.dependency_overrides.clear()


class TestLessonComplete:
    def test_requires_auth(self):
        response = client.post(
            f"/api/lms/lessons/{LESSON_ID}/complete",
            json={"time_spent_seconds": 300},
        )
        assert response.status_code == 401

    def test_lesson_not_found_returns_404(self):
        mock_db = make_mock_db()
        mock_student = make_mock_student()

        result = MagicMock()
        result.scalar_one_or_none.return_value = None
        mock_db.execute = AsyncMock(return_value=result)

        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(mock_student)

        response = client.post(
            f"/api/lms/lessons/{LESSON_ID}/complete",
            json={"time_spent_seconds": 300},
            headers=AUTH_HEADERS,
        )
        assert response.status_code == 404

    def test_not_enrolled_returns_403(self):
        mock_db = make_mock_db()
        mock_student = make_mock_student()
        mock_lesson = make_mock_lesson()

        result_lesson = MagicMock()
        result_lesson.scalar_one_or_none.return_value = mock_lesson
        result_no_enrollment = MagicMock()
        result_no_enrollment.scalar_one_or_none.return_value = None

        mock_db.execute = AsyncMock(side_effect=[result_lesson, result_no_enrollment])

        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(mock_student)

        response = client.post(
            f"/api/lms/lessons/{LESSON_ID}/complete",
            json={"time_spent_seconds": 300},
            headers=AUTH_HEADERS,
        )
        assert response.status_code == 403

    def test_marks_lesson_complete_returns_200(self):
        mock_db = make_mock_db()
        mock_student = make_mock_student()
        mock_lesson = make_mock_lesson()
        mock_enrollment = make_mock_enrollment()
        mock_progress = make_mock_progress()

        result_lesson = MagicMock()
        result_lesson.scalar_one_or_none.return_value = mock_lesson
        result_enrollment = MagicMock()
        result_enrollment.scalar_one_or_none.return_value = mock_enrollment
        result_no_progress = MagicMock()
        result_no_progress.scalar_one_or_none.return_value = None
        # Nexus connector completion check: total lessons + completed lessons
        result_total = MagicMock()
        result_total.scalar.return_value = 5
        result_completed = MagicMock()
        result_completed.scalar.return_value = 1

        mock_db.execute = AsyncMock(
            side_effect=[result_lesson, result_enrollment, result_no_progress,
                         result_total, result_completed]
        )
        mock_db.refresh = AsyncMock(
            side_effect=lambda obj: _set_progress_fields(obj, mock_progress)
        )

        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(mock_student)

        with patch("src.worker.tasks.handle_lesson_completed.delay"):
            response = client.post(
                f"/api/lms/lessons/{LESSON_ID}/complete",
                json={"time_spent_seconds": 300},
                headers=AUTH_HEADERS,
            )

        assert response.status_code == 200
        data = response.json()
        assert data["lesson_id"] == str(LESSON_ID)
        assert data["time_spent_seconds"] == 300


class TestCourseProgress:
    def test_requires_auth(self):
        response = client.get(f"/api/lms/courses/{COURSE_ID}/progress")
        assert response.status_code == 401

    def test_not_enrolled_returns_404(self):
        mock_db = make_mock_db()
        mock_student = make_mock_student()

        result = MagicMock()
        result.scalar_one_or_none.return_value = None
        mock_db.execute = AsyncMock(return_value=result)

        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(mock_student)

        response = client.get(
            f"/api/lms/courses/{COURSE_ID}/progress",
            headers=AUTH_HEADERS,
        )
        assert response.status_code == 404

    def test_returns_progress_data(self):
        mock_db = make_mock_db()
        mock_student = make_mock_student()
        mock_enrollment = make_mock_enrollment()

        result_enrollment = MagicMock()
        result_enrollment.scalar_one_or_none.return_value = mock_enrollment
        result_total = MagicMock()
        result_total.scalar.return_value = 5
        result_completed = MagicMock()
        result_completed.scalar.return_value = 3

        mock_db.execute = AsyncMock(
            side_effect=[result_enrollment, result_total, result_completed]
        )

        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(mock_student)

        response = client.get(
            f"/api/lms/courses/{COURSE_ID}/progress",
            headers=AUTH_HEADERS,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total_lessons"] == 5
        assert data["completed_lessons"] == 3
        assert data["completion_percentage"] == 60.0
        assert data["enrollment_status"] == "active"


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------


def _set_progress_fields(obj, source: MagicMock) -> None:
    obj.lesson_id = source.lesson_id
    obj.completed_at = source.completed_at
    obj.time_spent_seconds = source.time_spent_seconds
