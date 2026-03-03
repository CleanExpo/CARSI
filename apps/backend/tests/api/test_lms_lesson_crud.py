"""
Tests for LMS Lesson CRUD (create/update/delete) — Phase 12 (GP-108)

Covers POST /api/lms/modules/{module_id}/lessons,
PATCH /api/lms/lessons/{lesson_id}, DELETE /api/lms/lessons/{lesson_id}
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

MODULE_ID = uuid4()
LESSON_ID = uuid4()
COURSE_ID = uuid4()
INSTRUCTOR_ID = uuid4()


def _make_user_role(role_name: str) -> MagicMock:
    role = MagicMock()
    role.name = role_name
    ur = MagicMock()
    ur.role = role
    return ur


def make_mock_instructor() -> MagicMock:
    user = MagicMock(spec=LMSUser)
    user.id = INSTRUCTOR_ID
    user.email = "instructor@test.com"
    user.full_name = "Test Instructor"
    user.is_active = True
    user.user_roles = [_make_user_role("instructor")]
    return user


def make_mock_module() -> MagicMock:
    mod = MagicMock()
    mod.id = MODULE_ID
    mod.course_id = COURSE_ID
    return mod


def make_mock_lesson() -> MagicMock:
    lesson = MagicMock()
    lesson.id = LESSON_ID
    lesson.module_id = MODULE_ID
    lesson.title = "Intro Lesson"
    lesson.content_type = "text"
    lesson.content_body = "<p>Hello</p>"
    lesson.drive_file_id = None
    lesson.duration_minutes = 10
    lesson.is_preview = False
    lesson.order_index = 1
    lesson.module = make_mock_module()
    return lesson


def make_mock_db() -> AsyncMock:
    db = AsyncMock()
    result = MagicMock()
    result.scalar_one_or_none.return_value = None
    db.execute = AsyncMock(return_value=result)
    db.add = MagicMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    db.delete = AsyncMock()
    return db


def _override_db(mock_db):
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


class TestCreateLesson:
    def test_requires_auth(self):
        response = client.post(
            f"/api/lms/modules/{MODULE_ID}/lessons",
            json={"title": "New Lesson", "order_index": 1, "content_type": "text"},
        )
        assert response.status_code == 401

    def test_module_not_found_returns_404(self):
        mock_db = make_mock_db()
        mock_instructor = make_mock_instructor()

        result = MagicMock()
        result.scalar_one_or_none.return_value = None
        mock_db.execute = AsyncMock(return_value=result)

        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(mock_instructor)

        response = client.post(
            f"/api/lms/modules/{MODULE_ID}/lessons",
            json={"title": "New Lesson", "order_index": 1, "content_type": "text"},
            headers=AUTH_HEADERS,
        )
        assert response.status_code == 404

    def test_creates_lesson_returns_201(self):
        mock_db = make_mock_db()
        mock_instructor = make_mock_instructor()
        mock_module = make_mock_module()
        mock_lesson = make_mock_lesson()

        result = MagicMock()
        result.scalar_one_or_none.return_value = mock_module
        mock_db.execute = AsyncMock(return_value=result)
        mock_db.refresh = AsyncMock(
            side_effect=lambda obj: _set_lesson_fields(obj, mock_lesson)
        )

        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(mock_instructor)

        response = client.post(
            f"/api/lms/modules/{MODULE_ID}/lessons",
            json={"title": "Intro Lesson", "order_index": 1, "content_type": "text"},
            headers=AUTH_HEADERS,
        )
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "Intro Lesson"
        assert data["content_type"] == "text"


class TestUpdateLesson:
    def test_requires_auth(self):
        response = client.patch(
            f"/api/lms/lessons/{LESSON_ID}",
            json={"title": "Updated"},
        )
        assert response.status_code == 401

    def test_lesson_not_found_returns_404(self):
        mock_db = make_mock_db()
        mock_instructor = make_mock_instructor()

        result = MagicMock()
        result.scalar_one_or_none.return_value = None
        mock_db.execute = AsyncMock(return_value=result)

        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(mock_instructor)

        response = client.patch(
            f"/api/lms/lessons/{LESSON_ID}",
            json={"title": "Updated"},
            headers=AUTH_HEADERS,
        )
        assert response.status_code == 404

    def test_updates_lesson_fields(self):
        mock_db = make_mock_db()
        mock_instructor = make_mock_instructor()
        mock_lesson = make_mock_lesson()

        result = MagicMock()
        result.scalar_one_or_none.return_value = mock_lesson
        mock_db.execute = AsyncMock(return_value=result)

        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(mock_instructor)

        response = client.patch(
            f"/api/lms/lessons/{LESSON_ID}",
            json={"title": "New Title", "content_type": "video"},
            headers=AUTH_HEADERS,
        )
        assert response.status_code == 200
        assert mock_lesson.title == "New Title"
        assert mock_lesson.content_type == "video"


class TestDeleteLesson:
    def test_deletes_lesson_returns_204(self):
        mock_db = make_mock_db()
        mock_instructor = make_mock_instructor()
        mock_lesson = make_mock_lesson()

        result = MagicMock()
        result.scalar_one_or_none.return_value = mock_lesson
        mock_db.execute = AsyncMock(return_value=result)

        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(mock_instructor)

        response = client.delete(
            f"/api/lms/lessons/{LESSON_ID}",
            headers=AUTH_HEADERS,
        )
        assert response.status_code == 204
        mock_db.delete.assert_called_once_with(mock_lesson)


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------


def _set_lesson_fields(obj, source: MagicMock) -> None:
    obj.id = source.id
    obj.module_id = source.module_id
    obj.title = source.title
    obj.content_type = source.content_type
    obj.content_body = source.content_body
    obj.drive_file_id = source.drive_file_id
    obj.duration_minutes = source.duration_minutes
    obj.is_preview = source.is_preview
    obj.order_index = source.order_index
    obj.module = source.module
