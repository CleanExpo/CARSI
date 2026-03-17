"""
Tests for LMS Lesson detail API — Phase 10 (GP-106)

Covers GET /api/lms/lessons/{lesson_id}
"""

from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from src.api.main import app
from src.api.deps_lms import get_current_lms_user
from src.config.database import get_async_db
from src.db.lms_models import LMSLesson, LMSUser

client = TestClient(app)

AUTH_HEADERS = {"X-User-Id": "00000000-0000-0000-0000-000000000001"}

LESSON_ID = uuid4()
MODULE_ID = uuid4()
COURSE_ID = uuid4()
STUDENT_ID = uuid4()


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


def make_mock_lesson(content_type: str = "text") -> MagicMock:
    module = MagicMock()
    module.id = MODULE_ID
    module.course_id = COURSE_ID

    lesson = MagicMock(spec=LMSLesson)
    lesson.id = LESSON_ID
    lesson.title = "Introduction to Water Damage"
    lesson.content_type = content_type
    lesson.content_body = "<p>Lesson content here.</p>"
    lesson.drive_file_id = None
    lesson.duration_minutes = 15
    lesson.is_preview = False
    lesson.order_index = 1
    lesson.module = module
    return lesson


def make_mock_db() -> AsyncMock:
    db = AsyncMock()
    result = MagicMock()
    result.scalar_one_or_none.return_value = None
    db.execute = AsyncMock(return_value=result)
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


class TestGetLesson:
    def test_requires_auth(self):
        response = client.get(f"/api/lms/lessons/{LESSON_ID}")
        assert response.status_code == 401

    def test_lesson_not_found_returns_404(self):
        mock_db = make_mock_db()
        mock_student = make_mock_student()

        result = MagicMock()
        result.scalar_one_or_none.return_value = None
        mock_db.execute = AsyncMock(return_value=result)

        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(mock_student)

        response = client.get(
            f"/api/lms/lessons/{LESSON_ID}",
            headers=AUTH_HEADERS,
        )
        assert response.status_code == 404

    def test_returns_text_lesson(self):
        mock_db = make_mock_db()
        mock_student = make_mock_student()
        mock_lesson = make_mock_lesson("text")

        r_lesson = MagicMock()
        r_lesson.scalar_one_or_none.return_value = mock_lesson
        r_sub = MagicMock()
        r_sub.scalar_one_or_none.return_value = MagicMock()  # truthy subscription
        r_quiz = MagicMock()
        r_quiz.scalar_one_or_none.return_value = None  # no quiz attached
        mock_db.execute = AsyncMock(side_effect=[r_lesson, r_sub, r_quiz])

        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(mock_student)

        response = client.get(
            f"/api/lms/lessons/{LESSON_ID}",
            headers=AUTH_HEADERS,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == str(LESSON_ID)
        assert data["title"] == "Introduction to Water Damage"
        assert data["content_type"] == "text"
        assert data["content_body"] == "<p>Lesson content here.</p>"
        assert data["course_id"] == str(COURSE_ID)
        assert data["quiz_id"] is None

    def test_returns_drive_file_lesson(self):
        mock_db = make_mock_db()
        mock_student = make_mock_student()
        mock_lesson = make_mock_lesson("drive_file")
        mock_lesson.drive_file_id = "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
        mock_lesson.content_body = None

        r_lesson = MagicMock()
        r_lesson.scalar_one_or_none.return_value = mock_lesson
        r_sub = MagicMock()
        r_sub.scalar_one_or_none.return_value = MagicMock()  # truthy subscription
        r_quiz = MagicMock()
        r_quiz.scalar_one_or_none.return_value = None
        mock_db.execute = AsyncMock(side_effect=[r_lesson, r_sub, r_quiz])

        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(mock_student)

        response = client.get(
            f"/api/lms/lessons/{LESSON_ID}",
            headers=AUTH_HEADERS,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["content_type"] == "drive_file"
        assert data["drive_file_id"] == "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"

    def test_returns_duration_and_preview_flag(self):
        mock_db = make_mock_db()
        mock_student = make_mock_student()
        mock_lesson = make_mock_lesson("video")
        mock_lesson.is_preview = True
        mock_lesson.duration_minutes = 30

        r_lesson = MagicMock()
        r_lesson.scalar_one_or_none.return_value = mock_lesson
        r_quiz = MagicMock()
        r_quiz.scalar_one_or_none.return_value = None  # preview lesson — no subscription check
        mock_db.execute = AsyncMock(side_effect=[r_lesson, r_quiz])

        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(mock_student)

        response = client.get(
            f"/api/lms/lessons/{LESSON_ID}",
            headers=AUTH_HEADERS,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["is_preview"] is True
        assert data["duration_minutes"] == 30
