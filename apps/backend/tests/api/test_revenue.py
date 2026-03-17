"""
Tests for GET /api/lms/admin/revenue — Phase D1

Covers zero-state, MRR calculation, and admin-only access guard.
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

ADMIN_ID = uuid4()
STUDENT_ID = uuid4()


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
    return user


def make_mock_student() -> MagicMock:
    user = MagicMock(spec=LMSUser)
    user.id = STUDENT_ID
    user.email = "student@test.com"
    user.full_name = "Test Student"
    user.is_active = True
    user.user_roles = [_make_user_role("student")]
    return user


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


class TestRevenueReturnsZeroWhenNoSubs:
    def test_revenue_returns_zero_when_no_subs(self):
        mock_db = AsyncMock()

        # All scalar() calls return 0 (no subscriptions)
        scalar_result = MagicMock()
        scalar_result.scalar.return_value = 0
        scalar_result.scalars.return_value.all.return_value = []

        mock_db.execute = AsyncMock(return_value=scalar_result)
        mock_admin = make_mock_admin()

        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(mock_admin)

        response = client.get("/api/lms/admin/revenue", headers=AUTH_HEADERS)
        assert response.status_code == 200
        data = response.json()
        assert data["mrr_aud"] == 0.0
        assert data["arr_aud"] == 0.0
        assert data["total_subscribers"] == 0
        assert data["trialling"] == 0
        assert data["revenue_by_month"] == []


class TestRevenueMRRCalculation:
    def test_revenue_calculates_mrr_correctly(self):
        """2 active subscribers at $795/year → MRR = 2 * 795 / 12 = 132.50"""
        mock_db = AsyncMock()

        call_count = 0

        async def execute_side_effect(query, *args, **kwargs):
            nonlocal call_count
            call_count += 1
            result = MagicMock()

            if call_count == 1:
                # active count
                result.scalar.return_value = 2
            elif call_count == 2:
                # trialling count
                result.scalar.return_value = 1
            elif call_count == 3:
                # cancelled_this_month
                result.scalar.return_value = 0
            elif call_count == 4:
                # total_ever
                result.scalar.return_value = 3
            else:
                # revenue_by_month query
                result.scalars.return_value.all.return_value = []
                # Simulate an iterable result set (no rows)
                result.__iter__ = MagicMock(return_value=iter([]))

            return result

        mock_db.execute = execute_side_effect
        mock_admin = make_mock_admin()

        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(mock_admin)

        response = client.get("/api/lms/admin/revenue", headers=AUTH_HEADERS)
        assert response.status_code == 200
        data = response.json()
        expected_mrr = round(2 * 795.0 / 12, 2)
        assert data["mrr_aud"] == expected_mrr
        assert data["arr_aud"] == round(2 * 795.0, 2)
        assert data["total_subscribers"] == 2


class TestRevenueRequiresAdmin:
    def test_revenue_requires_admin(self):
        mock_db = AsyncMock()
        mock_student = make_mock_student()

        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(mock_student)

        response = client.get("/api/lms/admin/revenue", headers=AUTH_HEADERS)
        assert response.status_code == 403
