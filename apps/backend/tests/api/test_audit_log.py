"""
Tests for GET /api/lms/admin/audit-log and GET /api/lms/auth/me/export — Phase D2

Covers admin-only guard, action filter, and data export auth requirement.
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
    user.roles = ["student"]
    user.created_at = None
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


class TestAuditLogEndpointRequiresAdmin:
    def test_audit_log_endpoint_requires_admin(self):
        mock_db = AsyncMock()
        mock_student = make_mock_student()

        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(mock_student)

        response = client.get("/api/lms/admin/audit-log", headers=AUTH_HEADERS)
        assert response.status_code == 403

    def test_audit_log_returns_200_for_admin(self):
        mock_db = AsyncMock()
        mock_admin = make_mock_admin()

        count_result = MagicMock()
        count_result.scalar.return_value = 0
        rows_result = MagicMock()
        rows_result.scalars.return_value.all.return_value = []

        call_count = 0

        async def execute_side_effect(query, *args, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                return count_result
            return rows_result

        mock_db.execute = execute_side_effect

        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(mock_admin)

        response = client.get("/api/lms/admin/audit-log", headers=AUTH_HEADERS)
        assert response.status_code == 200
        data = response.json()
        assert "items" in data
        assert "total" in data


class TestAuditLogFiltersByAction:
    def test_audit_log_filters_by_action(self):
        """Query with ?action= passes filter — endpoint accepts it without error."""
        mock_db = AsyncMock()
        mock_admin = make_mock_admin()

        count_result = MagicMock()
        count_result.scalar.return_value = 0
        rows_result = MagicMock()
        rows_result.scalars.return_value.all.return_value = []

        call_count = 0

        async def execute_side_effect(query, *args, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                return count_result
            return rows_result

        mock_db.execute = execute_side_effect

        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(mock_admin)

        response = client.get(
            "/api/lms/admin/audit-log?action=certificate.issued",
            headers=AUTH_HEADERS,
        )
        assert response.status_code == 200
        data = response.json()
        assert data["total"] == 0
        assert data["items"] == []


class TestDataExportRequiresAuth:
    def test_data_export_requires_auth(self):
        """GET /api/lms/auth/me/export without auth headers → 401."""
        response = client.get("/api/lms/auth/me/export")
        assert response.status_code == 401

    def test_data_export_returns_json_for_authenticated_user(self):
        """Authenticated request returns JSON with expected top-level keys."""
        from datetime import datetime, timezone

        mock_db = AsyncMock()
        mock_student = make_mock_student()
        mock_student.created_at = datetime.now(timezone.utc)

        empty_result = MagicMock()
        empty_result.scalars.return_value.all.return_value = []
        mock_db.execute = AsyncMock(return_value=empty_result)

        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(mock_student)

        response = client.get("/api/lms/auth/me/export", headers=AUTH_HEADERS)
        assert response.status_code == 200
        assert "attachment" in response.headers.get("content-disposition", "")
        data = response.json()
        assert "user" in data
        assert "enrollments" in data
        assert "certificates" in data
        assert "quiz_attempts" in data
        assert "notes" in data
        assert "progress" in data
