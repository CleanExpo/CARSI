"""
Tests for LMS Marketing API — Phase D3 (UTM capture)

Covers:
- Auth guard: unauthenticated requests return 401
- Empty UTM: no top-level UTM fields → captured=False, no DB write
- Valid UTM: utm_source + utm_medium present → captured=True, row added
"""

from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from src.api.main import app
from src.api.deps_lms import get_current_lms_user
from src.config.database import get_async_db
from src.db.lms_models import LMSUser

client = TestClient(app)

AUTH_HEADERS = {"X-User-Id": "00000000-0000-0000-0000-000000000001"}
USER_ID = uuid4()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_mock_user() -> MagicMock:
    user = MagicMock(spec=LMSUser)
    user.id = USER_ID
    user.email = "student@carsi.com.au"
    return user


def _mock_db() -> AsyncMock:
    db = AsyncMock()
    db.commit = AsyncMock()
    db.add = MagicMock()
    return db


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------


def test_utm_capture_requires_auth() -> None:
    """POST /api/lms/marketing/utm-capture without auth → 401."""
    response = client.post(
        "/api/lms/marketing/utm-capture",
        json={"utm_source": "google", "utm_medium": "cpc"},
    )
    assert response.status_code == 401


def test_utm_capture_skips_empty_utm() -> None:
    """When no top-level UTM fields are present, captured=False and nothing is written."""
    mock_user = _make_mock_user()
    mock_db = _mock_db()

    app.dependency_overrides[get_current_lms_user] = lambda: mock_user
    app.dependency_overrides[get_async_db] = lambda: mock_db

    try:
        response = client.post(
            "/api/lms/marketing/utm-capture",
            headers=AUTH_HEADERS,
            json={"utm_content": "banner", "utm_term": "restoration"},
        )
        assert response.status_code == 201
        assert response.json() == {"captured": False}
        # db.add should NOT have been called
        mock_db.add.assert_not_called()
    finally:
        app.dependency_overrides.clear()


def test_utm_capture_records_utm_data() -> None:
    """Valid UTM fields → captured=True and db.add is called once."""
    mock_user = _make_mock_user()
    mock_db = _mock_db()

    app.dependency_overrides[get_current_lms_user] = lambda: mock_user
    app.dependency_overrides[get_async_db] = lambda: mock_db

    try:
        response = client.post(
            "/api/lms/marketing/utm-capture",
            headers=AUTH_HEADERS,
            json={
                "utm_source": "google",
                "utm_medium": "cpc",
                "utm_campaign": "wrt-course-launch",
                "page_path": "/courses/wrt-fundamentals",
            },
        )
        assert response.status_code == 201
        assert response.json() == {"captured": True}
        mock_db.add.assert_called_once()
        mock_db.commit.assert_called_once()
    finally:
        app.dependency_overrides.clear()
