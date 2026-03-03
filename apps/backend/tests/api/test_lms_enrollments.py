"""
Tests for LMS Enrollment API — Phase 7 (GP-103)

Covers:
- Schema validation
- Enrol in a course (student only)
- Prevent duplicate enrolment (409)
- List my enrolments
- Auth required for all endpoints
"""

from datetime import datetime
from unittest.mock import AsyncMock, MagicMock
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
COURSE_ID = uuid4()
ENROLLMENT_ID = uuid4()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


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


def make_mock_course(status: str = "published") -> MagicMock:
    course = MagicMock(spec=LMSCourse)
    course.id = COURSE_ID
    course.slug = "wrt-fundamentals"
    course.title = "WRT Fundamentals"
    course.status = status
    return course


def make_mock_enrollment() -> MagicMock:
    enrollment = MagicMock(spec=LMSEnrollment)
    enrollment.id = ENROLLMENT_ID
    enrollment.student_id = STUDENT_ID
    enrollment.course_id = COURSE_ID
    enrollment.status = "active"
    enrollment.enrolled_at = datetime(2026, 3, 3, 10, 0, 0)
    enrollment.completed_at = None
    enrollment.payment_reference = None
    return enrollment


def make_mock_db() -> AsyncMock:
    db = AsyncMock()
    result = MagicMock()
    result.scalar_one_or_none.return_value = None
    result.scalars.return_value.all.return_value = []
    db.execute = AsyncMock(return_value=result)
    db.add = MagicMock()
    db.flush = AsyncMock()
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


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(autouse=True)
def clear_overrides():
    """Reset dependency overrides after each test."""
    yield
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Schema validation
# ---------------------------------------------------------------------------


class TestEnrollmentSchemaValidation:
    def test_valid_enrollment_create(self):
        from src.api.schemas.lms_enrollments import EnrollmentCreate

        schema = EnrollmentCreate(course_id=COURSE_ID)
        assert schema.course_id == COURSE_ID

    def test_enrollment_out_from_attributes(self):
        from src.api.schemas.lms_enrollments import EnrollmentOut

        data = {
            "id": ENROLLMENT_ID,
            "student_id": STUDENT_ID,
            "course_id": COURSE_ID,
            "status": "active",
            "enrolled_at": datetime(2026, 3, 3, 10, 0, 0),
            "completed_at": None,
            "payment_reference": None,
        }
        out = EnrollmentOut(**data)
        assert out.status == "active"
        assert out.student_id == STUDENT_ID


# ---------------------------------------------------------------------------
# HTTP contract tests
# ---------------------------------------------------------------------------


class TestEnrollmentEndpoints:
    def test_enroll_requires_auth(self):
        response = client.post(
            "/api/lms/enrollments",
            json={"course_id": str(COURSE_ID)},
        )
        assert response.status_code == 401

    def test_list_enrollments_requires_auth(self):
        response = client.get("/api/lms/enrollments/me")
        assert response.status_code == 401

    def test_enroll_in_published_course_returns_201(self):
        mock_db = make_mock_db()
        mock_student = make_mock_student()
        mock_course = make_mock_course(status="published")
        mock_enrollment = make_mock_enrollment()

        # First execute: no existing enrollment  → None
        # Second execute: course lookup → course
        result_no_enrollment = MagicMock()
        result_no_enrollment.scalar_one_or_none.return_value = None
        result_course = MagicMock()
        result_course.scalar_one_or_none.return_value = mock_course

        mock_db.execute = AsyncMock(
            side_effect=[result_no_enrollment, result_course]
        )
        mock_db.refresh = AsyncMock(side_effect=lambda obj: _set_enrollment_fields(obj, mock_enrollment))

        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(mock_student)

        response = client.post(
            "/api/lms/enrollments",
            json={"course_id": str(COURSE_ID)},
            headers=AUTH_HEADERS,
        )
        assert response.status_code == 201
        data = response.json()
        assert data["status"] == "active"
        assert data["course_id"] == str(COURSE_ID)

    def test_cannot_enroll_in_unpublished_course(self):
        mock_db = make_mock_db()
        mock_student = make_mock_student()

        # First execute: no existing enrollment
        result_no_enrollment = MagicMock()
        result_no_enrollment.scalar_one_or_none.return_value = None
        # Second execute: published-course query returns None (draft doesn't match)
        result_course_not_found = MagicMock()
        result_course_not_found.scalar_one_or_none.return_value = None

        mock_db.execute = AsyncMock(
            side_effect=[result_no_enrollment, result_course_not_found]
        )

        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(mock_student)

        response = client.post(
            "/api/lms/enrollments",
            json={"course_id": str(COURSE_ID)},
            headers=AUTH_HEADERS,
        )
        assert response.status_code == 404

    def test_duplicate_enrolment_returns_409(self):
        mock_db = make_mock_db()
        mock_student = make_mock_student()
        existing_enrollment = make_mock_enrollment()

        result_existing = MagicMock()
        result_existing.scalar_one_or_none.return_value = existing_enrollment

        mock_db.execute = AsyncMock(return_value=result_existing)

        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(mock_student)

        response = client.post(
            "/api/lms/enrollments",
            json={"course_id": str(COURSE_ID)},
            headers=AUTH_HEADERS,
        )
        assert response.status_code == 409

    def test_list_my_enrollments_returns_200(self):
        mock_db = make_mock_db()
        mock_student = make_mock_student()
        enrollment = make_mock_enrollment()
        # Attach a course to the enrollment for the title/slug
        enrollment.course = make_mock_course()

        result = MagicMock()
        result.scalars.return_value.all.return_value = [enrollment]
        mock_db.execute = AsyncMock(return_value=result)

        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(mock_student)

        response = client.get("/api/lms/enrollments/me", headers=AUTH_HEADERS)
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 1
        assert data[0]["status"] == "active"

    def test_list_my_enrollments_empty(self):
        mock_db = make_mock_db()
        mock_student = make_mock_student()

        result = MagicMock()
        result.scalars.return_value.all.return_value = []
        mock_db.execute = AsyncMock(return_value=result)

        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(mock_student)

        response = client.get("/api/lms/enrollments/me", headers=AUTH_HEADERS)
        assert response.status_code == 200
        assert response.json() == []


# ---------------------------------------------------------------------------
# Helpers for refresh side-effect
# ---------------------------------------------------------------------------


def _set_enrollment_fields(obj, source: MagicMock) -> None:
    """Simulate db.refresh() by copying fields from mock source onto obj."""
    obj.id = source.id
    obj.student_id = source.student_id
    obj.course_id = source.course_id
    obj.status = source.status
    obj.enrolled_at = source.enrolled_at
    obj.completed_at = source.completed_at
    obj.payment_reference = source.payment_reference
