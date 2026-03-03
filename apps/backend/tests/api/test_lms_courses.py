"""
Tests for LMS Course CRUD API — Phase 4 (GP-100)

Covers:
- Schema validation (slug pattern, required fields)
- Role-based access control (403 for students on protected routes)
- HTTP contract for course CRUD operations
- Public access to course listing and detail
"""

from datetime import datetime
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from src.api.main import app
from src.api.deps_lms import get_current_lms_user
from src.config.database import get_async_db
from src.db.lms_models import LMSCourse, LMSUser

client = TestClient(app)

# Auth header that satisfies the AuthMiddleware (X-User-Id bypass)
AUTH_HEADERS = {"X-User-Id": "00000000-0000-0000-0000-000000000001"}

INSTRUCTOR_ID = uuid4()
STUDENT_ID = uuid4()
COURSE_ID = uuid4()

COURSE_PAYLOAD = {
    "title": "Water Damage Restoration Fundamentals",
    "slug": "water-damage-restoration-fundamentals",
    "description": "IICRC WRT-aligned course covering water damage restoration basics.",
    "price_aud": "349.00",
    "is_free": False,
    "level": "beginner",
    "category": "Water Damage Restoration",
    "tags": ["WRT", "restoration"],
    "iicrc_discipline": "WRT",
    "cec_hours": "14.0",
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


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
    user.roles = ["instructor"]
    return user


def make_mock_student() -> MagicMock:
    user = MagicMock(spec=LMSUser)
    user.id = STUDENT_ID
    user.email = "student@test.com"
    user.full_name = "Test Student"
    user.is_active = True
    user.user_roles = [_make_user_role("student")]
    user.roles = ["student"]
    return user


def make_mock_admin() -> MagicMock:
    user = MagicMock(spec=LMSUser)
    user.id = uuid4()
    user.email = "admin@test.com"
    user.full_name = "Test Admin"
    user.is_active = True
    user.user_roles = [_make_user_role("admin")]
    user.roles = ["admin"]
    return user


def make_mock_course(status: str = "draft") -> MagicMock:
    course = MagicMock(spec=LMSCourse)
    course.id = COURSE_ID
    course.slug = "water-damage-restoration-fundamentals"
    course.title = "Water Damage Restoration Fundamentals"
    course.description = "IICRC WRT-aligned course."
    course.short_description = None
    course.price_aud = Decimal("349.00")
    course.is_free = False
    course.duration_hours = None
    course.level = "beginner"
    course.category = "Water Damage Restoration"
    course.tags = ["WRT", "restoration"]
    course.iicrc_discipline = "WRT"
    course.cec_hours = Decimal("14.0")
    course.cppp40421_unit_code = None
    course.cppp40421_unit_name = None
    course.instructor_id = INSTRUCTOR_ID
    course.status = status
    course.created_at = datetime(2026, 3, 3, 10, 0, 0)
    course.updated_at = datetime(2026, 3, 3, 10, 0, 0)
    return course


def make_mock_db() -> AsyncMock:
    db = AsyncMock()
    result = MagicMock()
    result.scalar_one_or_none.return_value = None
    result.scalar.return_value = 0
    result.scalars.return_value.all.return_value = []
    db.execute = AsyncMock(return_value=result)
    db.add = MagicMock()
    db.flush = AsyncMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    db.delete = AsyncMock()
    return db


def _override_db(mock_db: AsyncMock):
    async def _dep():
        yield mock_db

    return _dep


def _override_user(mock_user):
    async def _dep():
        return mock_user

    return _dep


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(autouse=True)
def clear_overrides():
    """Reset dependency overrides after each test."""
    yield
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Schema validation (no HTTP layer needed)
# ---------------------------------------------------------------------------


class TestCourseSchemaValidation:
    """Test Pydantic schema validation for course creation."""

    def test_valid_payload_passes(self):
        from src.api.schemas.lms_courses import CourseCreate

        schema = CourseCreate(**COURSE_PAYLOAD)
        assert schema.slug == "water-damage-restoration-fundamentals"
        assert schema.iicrc_discipline == "WRT"
        assert schema.cec_hours == Decimal("14.0")

    def test_slug_with_uppercase_rejected(self):
        from src.api.schemas.lms_courses import CourseCreate
        from pydantic import ValidationError

        with pytest.raises(ValidationError):
            CourseCreate(**{**COURSE_PAYLOAD, "slug": "Water-Damage"})

    def test_slug_with_spaces_rejected(self):
        from src.api.schemas.lms_courses import CourseCreate
        from pydantic import ValidationError

        with pytest.raises(ValidationError):
            CourseCreate(**{**COURSE_PAYLOAD, "slug": "water damage restoration"})

    def test_negative_price_rejected(self):
        from src.api.schemas.lms_courses import CourseCreate
        from pydantic import ValidationError

        with pytest.raises(ValidationError):
            CourseCreate(**{**COURSE_PAYLOAD, "price_aud": "-1.00"})

    def test_title_required(self):
        from src.api.schemas.lms_courses import CourseCreate
        from pydantic import ValidationError

        payload = {k: v for k, v in COURSE_PAYLOAD.items() if k != "title"}
        with pytest.raises(ValidationError):
            CourseCreate(**payload)


# ---------------------------------------------------------------------------
# Role-based access control
# ---------------------------------------------------------------------------


class TestCourseRoleAccess:
    """Test that endpoints enforce role-based access correctly."""

    def test_student_cannot_create_course(self):
        mock_db = make_mock_db()
        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(make_mock_student())

        response = client.post("/api/lms/courses", json=COURSE_PAYLOAD, headers=AUTH_HEADERS)

        assert response.status_code == 403

    def test_instructor_can_create_course(self):
        mock_db = make_mock_db()
        mock_course = make_mock_course()

        def _populate(obj):
            obj.id = COURSE_ID
            obj.status = "draft"
            obj.instructor_id = INSTRUCTOR_ID
            obj.created_at = datetime(2026, 3, 3, 10, 0, 0)
            obj.updated_at = datetime(2026, 3, 3, 10, 0, 0)
            obj.description = COURSE_PAYLOAD["description"]
            obj.short_description = None
            obj.duration_hours = None
            obj.cppp40421_unit_code = None
            obj.cppp40421_unit_name = None

        mock_db.refresh.side_effect = _populate
        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(make_mock_instructor())

        response = client.post("/api/lms/courses", json=COURSE_PAYLOAD, headers=AUTH_HEADERS)

        assert response.status_code == 201
        data = response.json()
        assert data["status"] == "draft"
        assert data["iicrc_discipline"] == "WRT"

    def test_student_cannot_delete_course(self):
        mock_db = make_mock_db()
        mock_course = make_mock_course()
        result = MagicMock()
        result.scalar_one_or_none.return_value = mock_course
        mock_db.execute = AsyncMock(return_value=result)

        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(make_mock_student())

        response = client.delete("/api/lms/courses/water-damage-restoration-fundamentals", headers=AUTH_HEADERS)

        assert response.status_code == 403

    def test_student_cannot_publish_course(self):
        mock_db = make_mock_db()
        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(make_mock_student())

        response = client.post(
            "/api/lms/courses/water-damage-restoration-fundamentals/publish",
            headers=AUTH_HEADERS,
        )

        assert response.status_code == 403


# ---------------------------------------------------------------------------
# Public endpoints (no auth required)
# ---------------------------------------------------------------------------


class TestPublicCourseEndpoints:
    """Public course listing and detail require no authentication."""

    def test_list_courses_public_no_auth_required(self):
        mock_db = make_mock_db()
        # Two execute calls: count then items
        count_result = MagicMock()
        count_result.scalar.return_value = 0
        items_result = MagicMock()
        items_result.scalars.return_value.all.return_value = []
        mock_db.execute = AsyncMock(side_effect=[count_result, items_result])

        app.dependency_overrides[get_async_db] = _override_db(mock_db)

        # No AUTH_HEADERS — should be public
        response = client.get("/api/lms/courses")

        assert response.status_code == 200
        data = response.json()
        assert data["items"] == []
        assert data["total"] == 0
        assert data["page"] == 1

    def test_list_courses_returns_published_courses(self):
        mock_course = make_mock_course(status="published")
        count_result = MagicMock()
        count_result.scalar.return_value = 1
        items_result = MagicMock()
        items_result.scalars.return_value.all.return_value = [mock_course]

        mock_db = make_mock_db()
        mock_db.execute = AsyncMock(side_effect=[count_result, items_result])
        app.dependency_overrides[get_async_db] = _override_db(mock_db)

        response = client.get("/api/lms/courses")

        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 1
        assert data["items"][0]["slug"] == "water-damage-restoration-fundamentals"
        assert data["items"][0]["iicrc_discipline"] == "WRT"

    def test_get_course_by_slug_public(self):
        mock_course = make_mock_course(status="published")
        result = MagicMock()
        result.scalar_one_or_none.return_value = mock_course

        mock_db = make_mock_db()
        mock_db.execute = AsyncMock(return_value=result)
        app.dependency_overrides[get_async_db] = _override_db(mock_db)

        response = client.get("/api/lms/courses/water-damage-restoration-fundamentals")

        assert response.status_code == 200
        data = response.json()
        assert data["slug"] == "water-damage-restoration-fundamentals"
        assert data["status"] == "published"

    def test_get_nonexistent_course_returns_404(self):
        result = MagicMock()
        result.scalar_one_or_none.return_value = None

        mock_db = make_mock_db()
        mock_db.execute = AsyncMock(return_value=result)
        app.dependency_overrides[get_async_db] = _override_db(mock_db)

        response = client.get("/api/lms/courses/nonexistent-course")

        assert response.status_code == 404


# ---------------------------------------------------------------------------
# Course management (authenticated)
# ---------------------------------------------------------------------------


class TestCourseManagement:
    """Tests for create, update, delete, and publish operations."""

    def test_duplicate_slug_returns_409(self):
        existing_course = make_mock_course()
        result = MagicMock()
        result.scalar_one_or_none.return_value = existing_course

        mock_db = make_mock_db()
        mock_db.execute = AsyncMock(return_value=result)
        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(make_mock_instructor())

        response = client.post("/api/lms/courses", json=COURSE_PAYLOAD, headers=AUTH_HEADERS)

        assert response.status_code == 409

    def test_admin_can_publish_course(self):
        mock_course = make_mock_course(status="draft")
        result = MagicMock()
        result.scalar_one_or_none.return_value = mock_course

        mock_db = make_mock_db()
        mock_db.execute = AsyncMock(return_value=result)

        def _populate(obj):
            obj.status = "published"
            obj.created_at = datetime(2026, 3, 3, 10, 0, 0)
            obj.updated_at = datetime(2026, 3, 3, 10, 0, 0)

        mock_db.refresh.side_effect = _populate
        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(make_mock_admin())

        response = client.post(
            "/api/lms/courses/water-damage-restoration-fundamentals/publish",
            headers=AUTH_HEADERS,
        )

        assert response.status_code == 200
        assert response.json()["status"] == "published"

    def test_instructor_can_update_own_course(self):
        mock_course = make_mock_course()
        result = MagicMock()
        result.scalar_one_or_none.return_value = mock_course

        mock_db = make_mock_db()
        mock_db.execute = AsyncMock(return_value=result)

        def _populate(obj):
            obj.created_at = datetime(2026, 3, 3, 10, 0, 0)
            obj.updated_at = datetime(2026, 3, 3, 10, 0, 0)

        mock_db.refresh.side_effect = _populate
        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(make_mock_instructor())

        response = client.patch(
            "/api/lms/courses/water-damage-restoration-fundamentals",
            json={"cec_hours": "16.0"},
            headers=AUTH_HEADERS,
        )

        assert response.status_code == 200
