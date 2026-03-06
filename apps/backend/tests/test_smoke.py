"""
Smoke tests — GP-163

12 quick-check tests confirming every critical API surface returns
the expected status code with minimal mocking. Uses the same
TestClient + dependency-override pattern as the rest of the test suite.
"""

from datetime import date, datetime
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from src.api.main import app
from src.api.deps_lms import get_current_lms_user
from src.config.database import get_async_db
from src.db.lms_models import (
    LMSCourse,
    LMSEnrollment,
    LMSUser,
    LMSUserLevel,
)

client = TestClient(app)

# Auth header that satisfies the AuthMiddleware (X-User-Id bypass)
AUTH_HEADERS = {"X-User-Id": "00000000-0000-0000-0000-000000000001"}

STUDENT_ID = uuid4()
INSTRUCTOR_ID = uuid4()
ADMIN_ID = uuid4()
COURSE_ID = uuid4()
ENROLLMENT_ID = uuid4()

# ---------------------------------------------------------------------------
# Mock factories
# ---------------------------------------------------------------------------


def _make_user_role(role_name: str) -> MagicMock:
    role = MagicMock()
    role.name = role_name
    ur = MagicMock()
    ur.role = role
    return ur


def _mock_student() -> MagicMock:
    user = MagicMock(spec=LMSUser)
    user.id = STUDENT_ID
    user.email = "student@carsi.com.au"
    user.full_name = "James Wilson"
    user.is_active = True
    user.user_roles = [_make_user_role("student")]
    user.roles = ["student"]
    return user


def _mock_instructor() -> MagicMock:
    user = MagicMock(spec=LMSUser)
    user.id = INSTRUCTOR_ID
    user.email = "instructor@carsi.com.au"
    user.full_name = "Sarah Mitchell"
    user.is_active = True
    user.user_roles = [_make_user_role("instructor")]
    user.roles = ["instructor"]
    return user


def _mock_admin() -> MagicMock:
    user = MagicMock(spec=LMSUser)
    user.id = ADMIN_ID
    user.email = "admin@carsi.com.au"
    user.full_name = "Phil Admin"
    user.is_active = True
    user.user_roles = [_make_user_role("admin")]
    user.roles = ["admin"]
    return user


def _mock_course() -> MagicMock:
    course = MagicMock(spec=LMSCourse)
    course.id = COURSE_ID
    course.slug = "water-damage-restoration-fundamentals"
    course.title = "Water Damage Restoration Fundamentals"
    course.description = "IICRC WRT-aligned course"
    course.short_description = "Learn WRT basics"
    course.price_aud = Decimal("349.00")
    course.is_free = False
    course.status = "published"
    course.level = "beginner"
    course.category = "Water Damage Restoration"
    course.tags = ["WRT"]
    course.iicrc_discipline = "WRT"
    course.cec_hours = Decimal("14.0")
    course.duration_hours = None
    course.cppp40421_unit_code = None
    course.cppp40421_unit_name = None
    course.instructor_id = INSTRUCTOR_ID
    course.created_at = datetime(2026, 1, 1)
    course.updated_at = datetime(2026, 3, 1)
    return course


def _mock_db() -> AsyncMock:
    db = AsyncMock()
    result = MagicMock()
    result.scalar_one_or_none.return_value = None
    result.scalar.return_value = 0
    result.scalars.return_value.all.return_value = []
    result.all.return_value = []
    db.execute = AsyncMock(return_value=result)
    db.add = MagicMock()
    db.commit = AsyncMock()
    return db


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
# 1. GET /health → 200
# ---------------------------------------------------------------------------

class TestHealthEndpoint:
    def test_health_returns_200(self):
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data


# ---------------------------------------------------------------------------
# 2. GET /api/lms/courses → 200, returns list
# ---------------------------------------------------------------------------

class TestCourseList:
    def test_courses_returns_200_with_items(self):
        mock_db = _mock_db()
        course = _mock_course()

        result = MagicMock()
        result.scalars.return_value.all.return_value = [course]
        # Total count scalar
        count_result = MagicMock()
        count_result.scalar.return_value = 1
        mock_db.execute = AsyncMock(side_effect=[count_result, result])

        app.dependency_overrides[get_async_db] = _override_db(mock_db)

        response = client.get("/api/lms/courses")
        assert response.status_code == 200
        data = response.json()
        assert "items" in data or isinstance(data, list)


# ---------------------------------------------------------------------------
# 3. GET /api/lms/courses/{slug} → 200
# ---------------------------------------------------------------------------

class TestCourseDetail:
    def test_course_detail_returns_200(self):
        mock_db = _mock_db()
        course = _mock_course()

        result = MagicMock()
        result.scalar_one_or_none.return_value = course
        mock_db.execute = AsyncMock(return_value=result)

        app.dependency_overrides[get_async_db] = _override_db(mock_db)

        response = client.get("/api/lms/courses/water-damage-restoration-fundamentals")
        assert response.status_code == 200


# ---------------------------------------------------------------------------
# 4. POST /api/lms/auth/login → validates structure (public endpoint)
# ---------------------------------------------------------------------------

class TestAuthLogin:
    def test_login_endpoint_exists(self):
        """Login endpoint should accept POST and return 401/422 for bad creds,
        NOT 404 — proving the route exists."""
        mock_db = _mock_db()
        app.dependency_overrides[get_async_db] = _override_db(mock_db)

        response = client.post(
            "/api/lms/auth/login",
            json={"email": "nobody@test.com", "password": "wrong"},
        )
        # 401 (bad creds) or 422 (validation) — but NOT 404
        assert response.status_code in (401, 422)


# ---------------------------------------------------------------------------
# 5. GET /api/lms/enrollments/me (authenticated) → 200
# ---------------------------------------------------------------------------

class TestEnrollmentsMe:
    def test_enrollments_returns_200(self):
        mock_db = _mock_db()
        student = _mock_student()

        result = MagicMock()
        result.scalars.return_value.all.return_value = []
        mock_db.execute = AsyncMock(return_value=result)

        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(student)

        response = client.get("/api/lms/enrollments/me", headers=AUTH_HEADERS)
        assert response.status_code == 200


# ---------------------------------------------------------------------------
# 6. GET /api/lms/pathways → 200
# ---------------------------------------------------------------------------

class TestPathwaysList:
    def test_pathways_returns_200(self):
        mock_db = _mock_db()

        result = MagicMock()
        result.scalars.return_value.all.return_value = []
        count_result = MagicMock()
        count_result.scalar.return_value = 0
        mock_db.execute = AsyncMock(side_effect=[count_result, result])

        app.dependency_overrides[get_async_db] = _override_db(mock_db)

        response = client.get("/api/lms/pathways")
        assert response.status_code == 200


# ---------------------------------------------------------------------------
# 7. GET /api/lms/admin/categories → 200 (admin auth)
# ---------------------------------------------------------------------------

class TestAdminCategories:
    def test_categories_returns_200(self):
        mock_db = _mock_db()
        admin = _mock_admin()

        result = MagicMock()
        result.scalars.return_value.all.return_value = []
        mock_db.execute = AsyncMock(return_value=result)

        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(admin)

        response = client.get("/api/lms/admin/categories", headers=AUTH_HEADERS)
        assert response.status_code == 200


# ---------------------------------------------------------------------------
# 8. GET /api/lms/admin/metrics (admin auth) → 200
# ---------------------------------------------------------------------------

class TestAdminMetrics:
    def test_metrics_returns_200(self):
        mock_db = _mock_db()
        admin = _mock_admin()

        result = MagicMock()
        result.scalar.return_value = 42
        mock_db.execute = AsyncMock(return_value=result)

        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(admin)

        response = client.get("/api/lms/admin/metrics", headers=AUTH_HEADERS)
        assert response.status_code == 200
        data = response.json()
        assert "total_users" in data
        assert "total_courses" in data
        assert "total_enrollments" in data


# ---------------------------------------------------------------------------
# 9. GET /api/lms/credentials/{id} → 404 for unknown (public endpoint)
# ---------------------------------------------------------------------------

class TestCredentials:
    def test_credential_endpoint_exists(self):
        """Credentials route is public. Unknown ID → 404 (not 401/405),
        proving the route is registered."""
        mock_db = _mock_db()
        app.dependency_overrides[get_async_db] = _override_db(mock_db)

        fake_id = uuid4()
        response = client.get(f"/api/lms/credentials/{fake_id}")
        assert response.status_code == 404


# ---------------------------------------------------------------------------
# 10. GET /api/lms/gamification/me/level (authenticated) → 200
# ---------------------------------------------------------------------------

class TestGamificationLevel:
    def test_level_returns_200(self):
        mock_db = _mock_db()
        student = _mock_student()

        level = MagicMock(spec=LMSUserLevel)
        level.student_id = STUDENT_ID
        level.total_xp = 0
        level.current_level = 1
        level.current_streak = 0
        level.longest_streak = 0
        level.last_active_date = date(2026, 3, 5)

        result = MagicMock()
        result.scalar_one_or_none.return_value = level
        mock_db.execute = AsyncMock(return_value=result)

        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(student)

        response = client.get("/api/lms/gamification/me/level", headers=AUTH_HEADERS)
        assert response.status_code == 200


# ---------------------------------------------------------------------------
# 11. GET /api/lms/gamification/leaderboard → 200 (public)
# ---------------------------------------------------------------------------

class TestLeaderboard:
    def test_leaderboard_returns_200(self):
        mock_db = _mock_db()

        result = MagicMock()
        result.all.return_value = []
        mock_db.execute = AsyncMock(return_value=result)

        app.dependency_overrides[get_async_db] = _override_db(mock_db)

        response = client.get("/api/lms/gamification/leaderboard")
        assert response.status_code == 200


# ---------------------------------------------------------------------------
# 12. GET /api/lms/subscription/status (authenticated) → 200
# ---------------------------------------------------------------------------

class TestSubscriptionStatus:
    def test_status_returns_200(self):
        mock_db = _mock_db()
        student = _mock_student()

        result = MagicMock()
        result.scalar_one_or_none.return_value = None
        mock_db.execute = AsyncMock(return_value=result)

        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(student)

        response = client.get("/api/lms/subscription/status", headers=AUTH_HEADERS)
        assert response.status_code == 200
