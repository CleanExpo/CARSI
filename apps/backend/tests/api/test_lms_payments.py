"""
Tests for LMS Course Payment API — GP-126

Covers:
- Free course direct enrolment
- Paid course returns Stripe checkout URL
- Already enrolled returns 409
- Course not found returns 404
"""

from decimal import Decimal
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
COURSE_ID = uuid4()


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


def make_mock_course(price: Decimal = Decimal("0"), is_free: bool = True) -> MagicMock:
    course = MagicMock(spec=LMSCourse)
    course.id = COURSE_ID
    course.slug = "wrt-fundamentals"
    course.title = "WRT Fundamentals"
    course.status = "published"
    course.price_aud = price
    course.is_free = is_free
    return course


def make_mock_db() -> AsyncMock:
    db = AsyncMock()
    result = MagicMock()
    result.scalar_one_or_none.return_value = None
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
# Tests
# ---------------------------------------------------------------------------


class TestCourseCheckout:
    def test_checkout_requires_auth(self):
        response = client.post("/api/lms/courses/wrt-fundamentals/checkout")
        assert response.status_code == 401

    def test_free_course_direct_enrol(self):
        """price=0 / is_free creates enrolment directly without Stripe."""
        mock_db = make_mock_db()
        mock_student = make_mock_student()
        mock_course = make_mock_course(price=Decimal("0"), is_free=True)

        # First execute: course lookup → found
        result_course = MagicMock()
        result_course.scalar_one_or_none.return_value = mock_course
        # Second execute: no existing enrolment
        result_no_enrol = MagicMock()
        result_no_enrol.scalar_one_or_none.return_value = None

        mock_db.execute = AsyncMock(side_effect=[result_course, result_no_enrol])

        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(mock_student)

        response = client.post(
            "/api/lms/courses/wrt-fundamentals/checkout",
            headers=AUTH_HEADERS,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["enrolled"] is True
        assert data["checkout_url"] is None

    @patch("src.api.routes.lms_payments.stripe.checkout.Session.create")
    def test_paid_course_returns_checkout_url(self, mock_stripe_create):
        """price>0 returns a Stripe Checkout URL."""
        mock_db = make_mock_db()
        mock_student = make_mock_student()
        mock_course = make_mock_course(price=Decimal("500.00"), is_free=False)

        # First execute: course lookup → found
        result_course = MagicMock()
        result_course.scalar_one_or_none.return_value = mock_course
        # Second execute: no existing enrolment
        result_no_enrol = MagicMock()
        result_no_enrol.scalar_one_or_none.return_value = None

        mock_db.execute = AsyncMock(side_effect=[result_course, result_no_enrol])

        # Mock Stripe response
        mock_session = MagicMock()
        mock_session.url = "https://checkout.stripe.com/test_session"
        mock_stripe_create.return_value = mock_session

        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(mock_student)

        response = client.post(
            "/api/lms/courses/wrt-fundamentals/checkout",
            headers=AUTH_HEADERS,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["enrolled"] is False
        assert data["checkout_url"] == "https://checkout.stripe.com/test_session"

        # Verify Stripe was called with correct params
        call_kwargs = mock_stripe_create.call_args[1]
        assert call_kwargs["mode"] == "payment"
        assert call_kwargs["line_items"][0]["price_data"]["unit_amount"] == 50000
        assert call_kwargs["line_items"][0]["price_data"]["currency"] == "aud"
        assert call_kwargs["metadata"]["course_id"] == str(COURSE_ID)
        assert call_kwargs["metadata"]["student_id"] == str(STUDENT_ID)

    def test_already_enrolled_checkout(self):
        """409 if already enrolled."""
        mock_db = make_mock_db()
        mock_student = make_mock_student()
        mock_course = make_mock_course(price=Decimal("500.00"), is_free=False)
        mock_enrolment = MagicMock(spec=LMSEnrollment)

        # First execute: course lookup → found
        result_course = MagicMock()
        result_course.scalar_one_or_none.return_value = mock_course
        # Second execute: existing enrolment found
        result_enrolled = MagicMock()
        result_enrolled.scalar_one_or_none.return_value = mock_enrolment

        mock_db.execute = AsyncMock(side_effect=[result_course, result_enrolled])

        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(mock_student)

        response = client.post(
            "/api/lms/courses/wrt-fundamentals/checkout",
            headers=AUTH_HEADERS,
        )
        assert response.status_code == 409

    def test_course_not_found_returns_404(self):
        """404 if course slug does not match a published course."""
        mock_db = make_mock_db()
        mock_student = make_mock_student()

        # Course lookup returns None
        result_no_course = MagicMock()
        result_no_course.scalar_one_or_none.return_value = None
        mock_db.execute = AsyncMock(return_value=result_no_course)

        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(mock_student)

        response = client.post(
            "/api/lms/courses/nonexistent/checkout",
            headers=AUTH_HEADERS,
        )
        assert response.status_code == 404
