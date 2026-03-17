"""
Tests for LMS Category Taxonomy API (admin-only)

Covers:
- GET  /api/lms/admin/categories — list all categories
- POST /api/lms/admin/categories — create category (slug validation, duplicate check)
- PATCH /api/lms/admin/categories/{slug} — update name / parent
- DELETE /api/lms/admin/categories/{slug} — delete (courses unlinked via ON DELETE SET NULL)
- Enrollment-status endpoint on courses
"""

from datetime import datetime
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from src.api.main import app
from src.api.deps_lms import get_current_lms_user
from src.config.database import get_async_db
from src.db.lms_models import LMSCategory, LMSCourse, LMSEnrollment, LMSUser

client = TestClient(app)

ADMIN_ID = uuid4()
STUDENT_ID = uuid4()
CATEGORY_ID = uuid4()
COURSE_ID = uuid4()
ENROLLMENT_ID = uuid4()

ADMIN_HEADERS = {"X-User-Id": str(ADMIN_ID)}
STUDENT_HEADERS = {"X-User-Id": str(STUDENT_ID)}


# ---------------------------------------------------------------------------
# Factories
# ---------------------------------------------------------------------------


def _make_user_role(role_name: str) -> MagicMock:
    role = MagicMock()
    role.name = role_name
    ur = MagicMock()
    ur.role = role
    return ur


def make_mock_admin() -> MagicMock:
    user = MagicMock(spec=LMSUser)
    user.id = ADMIN_ID
    user.email = "admin@test.com"
    user.full_name = "Test Admin"
    user.is_active = True
    user.user_roles = [_make_user_role("admin")]
    user.roles = ["admin"]
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


def make_mock_category(slug: str = "water-damage") -> MagicMock:
    cat = MagicMock(spec=LMSCategory)
    cat.id = CATEGORY_ID
    cat.slug = slug
    cat.name = "Water Damage"
    cat.parent_id = None
    cat.order_index = 0
    cat.created_at = datetime(2026, 3, 4, 10, 0, 0)
    return cat


def make_mock_course() -> MagicMock:
    c = MagicMock(spec=LMSCourse)
    c.id = COURSE_ID
    c.slug = "wrt-level-1"
    c.title = "WRT Level 1"
    c.modules = []
    return c


def make_mock_enrollment() -> MagicMock:
    e = MagicMock(spec=LMSEnrollment)
    e.id = ENROLLMENT_ID
    e.student_id = STUDENT_ID
    e.course_id = COURSE_ID
    e.status = "active"
    e.completion_percentage = 42.0
    e.progress_records = []
    e.course = make_mock_course()
    return e


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


@pytest.fixture(autouse=True)
def clear_overrides():
    yield
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# GET /api/lms/admin/categories
# ---------------------------------------------------------------------------


class TestListCategories:
    def test_admin_can_list_categories(self):
        mock_db = make_mock_db()
        admin = make_mock_admin()
        cat = make_mock_category()
        result = MagicMock()
        result.scalars.return_value.all.return_value = [cat]
        mock_db.execute = AsyncMock(return_value=result)

        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(admin)

        resp = client.get("/api/lms/admin/categories", headers=ADMIN_HEADERS)

        assert resp.status_code == 200
        body = resp.json()
        assert isinstance(body, list)
        assert body[0]["slug"] == "water-damage"

    def test_student_cannot_list_categories(self):
        mock_db = make_mock_db()
        student = make_mock_student()
        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(student)

        resp = client.get("/api/lms/admin/categories", headers=STUDENT_HEADERS)

        assert resp.status_code == 403

    def test_unauthenticated_returns_401(self):
        mock_db = make_mock_db()
        app.dependency_overrides[get_async_db] = _override_db(mock_db)

        resp = client.get("/api/lms/admin/categories")

        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# POST /api/lms/admin/categories
# ---------------------------------------------------------------------------


class TestCreateCategory:
    PAYLOAD = {"slug": "fire-damage", "name": "Fire Damage", "order_index": 1}

    def test_admin_can_create_category(self):
        mock_db = make_mock_db()
        admin = make_mock_admin()

        def _populate_category(obj):
            obj.id = CATEGORY_ID
            obj.order_index = 1
            obj.created_at = datetime(2026, 3, 4, 10, 0, 0)

        mock_db.refresh = AsyncMock(side_effect=_populate_category)

        result_none = MagicMock()
        result_none.scalar_one_or_none.return_value = None
        mock_db.execute = AsyncMock(return_value=result_none)

        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(admin)

        resp = client.post("/api/lms/admin/categories", json=self.PAYLOAD, headers=ADMIN_HEADERS)

        assert resp.status_code == 201
        assert mock_db.add.called
        assert mock_db.commit.called

    def test_duplicate_slug_returns_409(self):
        mock_db = make_mock_db()
        admin = make_mock_admin()
        existing = make_mock_category("fire-damage")
        result = MagicMock()
        result.scalar_one_or_none.return_value = existing
        mock_db.execute = AsyncMock(return_value=result)

        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(admin)

        resp = client.post("/api/lms/admin/categories", json=self.PAYLOAD, headers=ADMIN_HEADERS)

        assert resp.status_code == 409

    def test_invalid_slug_returns_422(self):
        mock_db = make_mock_db()
        admin = make_mock_admin()
        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(admin)

        resp = client.post(
            "/api/lms/admin/categories",
            json={"slug": "INVALID SLUG!", "name": "Bad"},
            headers=ADMIN_HEADERS,
        )

        assert resp.status_code == 422

    def test_student_cannot_create_category(self):
        mock_db = make_mock_db()
        student = make_mock_student()
        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(student)

        resp = client.post("/api/lms/admin/categories", json=self.PAYLOAD, headers=STUDENT_HEADERS)

        assert resp.status_code == 403


# ---------------------------------------------------------------------------
# PATCH /api/lms/admin/categories/{slug}
# ---------------------------------------------------------------------------


class TestUpdateCategory:
    def test_admin_can_update_name(self):
        mock_db = make_mock_db()
        admin = make_mock_admin()
        cat = make_mock_category()
        result = MagicMock()
        result.scalar_one_or_none.return_value = cat
        mock_db.execute = AsyncMock(return_value=result)
        mock_db.refresh = AsyncMock()

        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(admin)

        resp = client.patch("/api/lms/admin/categories/water-damage", json={"name": "Water & Flood Damage"}, headers=ADMIN_HEADERS)

        assert resp.status_code == 200
        assert mock_db.commit.called

    def test_404_for_unknown_slug(self):
        mock_db = make_mock_db()
        admin = make_mock_admin()
        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(admin)

        resp = client.patch("/api/lms/admin/categories/ghost-cat", json={"name": "Ghost"}, headers=ADMIN_HEADERS)

        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# DELETE /api/lms/admin/categories/{slug}
# ---------------------------------------------------------------------------


class TestDeleteCategory:
    def test_admin_can_delete_category(self):
        mock_db = make_mock_db()
        admin = make_mock_admin()
        cat = make_mock_category()
        result = MagicMock()
        result.scalar_one_or_none.return_value = cat
        mock_db.execute = AsyncMock(return_value=result)

        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(admin)

        resp = client.delete("/api/lms/admin/categories/water-damage", headers=ADMIN_HEADERS)

        assert resp.status_code == 204
        assert mock_db.delete.called

    def test_404_for_unknown_category(self):
        mock_db = make_mock_db()
        admin = make_mock_admin()
        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(admin)

        resp = client.delete("/api/lms/admin/categories/ghost", headers=ADMIN_HEADERS)

        assert resp.status_code == 404

    def test_student_cannot_delete(self):
        mock_db = make_mock_db()
        student = make_mock_student()
        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(student)

        resp = client.delete("/api/lms/admin/categories/water-damage", headers=STUDENT_HEADERS)

        assert resp.status_code == 403


# ---------------------------------------------------------------------------
# GET /api/lms/courses/{slug}/enrollment-status
# ---------------------------------------------------------------------------


class TestEnrollmentStatus:
    def test_returns_not_enrolled_when_no_enrollment(self):
        mock_db = make_mock_db()
        student = make_mock_student()
        course = make_mock_course()

        calls = [
            MagicMock(**{"scalar_one_or_none.return_value": course}),  # course lookup
            MagicMock(**{"scalar_one_or_none.return_value": None}),    # no enrollment
            MagicMock(**{"scalar_one_or_none.return_value": None}),    # no active subscription
        ]
        mock_db.execute = AsyncMock(side_effect=calls)

        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(student)

        resp = client.get("/api/lms/courses/wrt-level-1/enrollment-status", headers=STUDENT_HEADERS)

        assert resp.status_code == 200
        body = resp.json()
        assert body["enrolled"] is False
        assert body["enrollment_id"] is None
        assert body["completion_percentage"] == 0.0

    def test_returns_enrolled_with_progress(self):
        mock_db = make_mock_db()
        student = make_mock_student()
        course = make_mock_course()
        enrollment = make_mock_enrollment()

        calls = [
            MagicMock(**{"scalar_one_or_none.return_value": course}),
            MagicMock(**{"scalar_one_or_none.return_value": enrollment}),
        ]
        mock_db.execute = AsyncMock(side_effect=calls)

        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(student)

        resp = client.get("/api/lms/courses/wrt-level-1/enrollment-status", headers=STUDENT_HEADERS)

        assert resp.status_code == 200
        body = resp.json()
        assert body["enrolled"] is True
        assert body["status"] == "active"
        assert body["completion_percentage"] == 42.0
        assert body["enrollment_id"] == str(ENROLLMENT_ID)

    def test_404_for_unknown_course(self):
        mock_db = make_mock_db()
        student = make_mock_student()
        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(student)

        resp = client.get("/api/lms/courses/does-not-exist/enrollment-status", headers=STUDENT_HEADERS)

        assert resp.status_code == 404

    def test_unauthenticated_returns_401(self):
        mock_db = make_mock_db()
        app.dependency_overrides[get_async_db] = _override_db(mock_db)

        resp = client.get("/api/lms/courses/wrt-level-1/enrollment-status")

        assert resp.status_code == 401
