"""
Tests for LMS Module CRUD API — Phase 12 (GP-108)

Covers GET/POST /api/lms/courses/{slug}/modules
and PATCH/DELETE /api/lms/modules/{module_id}
"""

from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from src.api.main import app
from src.api.deps_lms import get_current_lms_user
from src.config.database import get_async_db
from src.db.lms_models import LMSCourse, LMSUser

client = TestClient(app)

AUTH_HEADERS = {"X-User-Id": "00000000-0000-0000-0000-000000000001"}

COURSE_ID = uuid4()
MODULE_ID = uuid4()
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


def make_mock_course() -> MagicMock:
    course = MagicMock(spec=LMSCourse)
    course.id = COURSE_ID
    course.slug = "water-damage-fundamentals"
    course.title = "Water Damage Fundamentals"
    course.instructor_id = INSTRUCTOR_ID
    course.modules = []
    return course


def make_mock_module() -> MagicMock:
    mod = MagicMock()
    mod.id = MODULE_ID
    mod.course_id = COURSE_ID
    mod.title = "Module 1: Introduction"
    mod.description = "Overview of water damage"
    mod.order_index = 1
    mod.is_preview = False
    mod.lessons = []
    return mod


def make_mock_db() -> AsyncMock:
    db = AsyncMock()
    result = MagicMock()
    result.scalar_one_or_none.return_value = None
    result.scalars.return_value.all.return_value = []
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


class TestListModules:
    def test_requires_auth(self):
        response = client.get("/api/lms/courses/some-slug/modules")
        assert response.status_code == 401

    def test_course_not_found_returns_404(self):
        mock_db = make_mock_db()
        mock_instructor = make_mock_instructor()

        result = MagicMock()
        result.scalar_one_or_none.return_value = None
        mock_db.execute = AsyncMock(return_value=result)

        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(mock_instructor)

        response = client.get(
            "/api/lms/courses/no-such-slug/modules",
            headers=AUTH_HEADERS,
        )
        assert response.status_code == 404

    def test_returns_module_list(self):
        mock_db = make_mock_db()
        mock_instructor = make_mock_instructor()
        mock_course = make_mock_course()
        mock_module = make_mock_module()
        mock_course.modules = [mock_module]

        result = MagicMock()
        result.scalar_one_or_none.return_value = mock_course
        mock_db.execute = AsyncMock(return_value=result)

        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(mock_instructor)

        response = client.get(
            f"/api/lms/courses/{mock_course.slug}/modules",
            headers=AUTH_HEADERS,
        )
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["title"] == "Module 1: Introduction"


class TestCreateModule:
    def test_requires_auth(self):
        response = client.post(
            "/api/lms/courses/some-slug/modules",
            json={"title": "New Module", "order_index": 1},
        )
        assert response.status_code == 401

    def test_course_not_found_returns_404(self):
        mock_db = make_mock_db()
        mock_instructor = make_mock_instructor()

        result = MagicMock()
        result.scalar_one_or_none.return_value = None
        mock_db.execute = AsyncMock(return_value=result)

        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(mock_instructor)

        response = client.post(
            "/api/lms/courses/no-such-slug/modules",
            json={"title": "New Module", "order_index": 1},
            headers=AUTH_HEADERS,
        )
        assert response.status_code == 404

    def test_creates_module_returns_201(self):
        mock_db = make_mock_db()
        mock_instructor = make_mock_instructor()
        mock_course = make_mock_course()
        mock_module = make_mock_module()

        result = MagicMock()
        result.scalar_one_or_none.return_value = mock_course
        mock_db.execute = AsyncMock(return_value=result)
        mock_db.refresh = AsyncMock(
            side_effect=lambda obj: _set_module_fields(obj, mock_module)
        )

        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(mock_instructor)

        response = client.post(
            f"/api/lms/courses/{mock_course.slug}/modules",
            json={"title": "Module 1: Introduction", "order_index": 1},
            headers=AUTH_HEADERS,
        )
        assert response.status_code == 201
        data = response.json()
        assert data["title"] == "Module 1: Introduction"


class TestUpdateModule:
    def test_requires_auth(self):
        response = client.patch(
            f"/api/lms/modules/{MODULE_ID}",
            json={"title": "Updated"},
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

        response = client.patch(
            f"/api/lms/modules/{MODULE_ID}",
            json={"title": "Updated"},
            headers=AUTH_HEADERS,
        )
        assert response.status_code == 404

    def test_updates_module_title(self):
        mock_db = make_mock_db()
        mock_instructor = make_mock_instructor()
        mock_module = make_mock_module()

        result = MagicMock()
        result.scalar_one_or_none.return_value = mock_module
        mock_db.execute = AsyncMock(return_value=result)

        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(mock_instructor)

        response = client.patch(
            f"/api/lms/modules/{MODULE_ID}",
            json={"title": "Updated Title"},
            headers=AUTH_HEADERS,
        )
        assert response.status_code == 200
        assert mock_module.title == "Updated Title"


class TestDeleteModule:
    def test_deletes_module_returns_204(self):
        mock_db = make_mock_db()
        mock_instructor = make_mock_instructor()
        mock_module = make_mock_module()

        result = MagicMock()
        result.scalar_one_or_none.return_value = mock_module
        mock_db.execute = AsyncMock(return_value=result)

        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(mock_instructor)

        response = client.delete(
            f"/api/lms/modules/{MODULE_ID}",
            headers=AUTH_HEADERS,
        )
        assert response.status_code == 204
        mock_db.delete.assert_called_once_with(mock_module)


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------


def _set_module_fields(obj, source: MagicMock) -> None:
    obj.id = source.id
    obj.course_id = source.course_id
    obj.title = source.title
    obj.description = source.description
    obj.order_index = source.order_index
    obj.is_preview = source.is_preview
    obj.lessons = source.lessons
