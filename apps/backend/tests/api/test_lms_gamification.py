"""Tests for LMS Gamification — XP level and leaderboard endpoints."""
from datetime import date
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from src.api.main import app
from src.api.deps_lms import get_current_lms_user
from src.config.database import get_async_db
from src.db.lms_models import LMSUser, LMSUserLevel

client = TestClient(app)
STUDENT_ID = uuid4()
HEADERS = {"X-User-Id": str(STUDENT_ID)}


def _make_mock_student():
    user = MagicMock(spec=LMSUser)
    user.id = STUDENT_ID
    user.full_name = "James Wilson"
    user.roles = ["student"]
    return user


def _make_mock_level():
    lvl = MagicMock(spec=LMSUserLevel)
    lvl.student_id = STUDENT_ID
    lvl.total_xp = 1200
    lvl.current_level = 3
    lvl.current_streak = 5
    lvl.longest_streak = 12
    lvl.last_active_date = date(2026, 3, 4)
    return lvl


def _make_mock_db():
    db = AsyncMock()
    result = MagicMock()
    result.scalar_one_or_none.return_value = None
    result.all.return_value = []
    db.execute = AsyncMock(return_value=result)
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


def test_get_my_level_returns_level_data():
    mock_db = _make_mock_db()
    result = MagicMock()
    result.scalar_one_or_none.return_value = _make_mock_level()
    mock_db.execute = AsyncMock(return_value=result)

    app.dependency_overrides[get_current_lms_user] = _override_user(_make_mock_student())
    app.dependency_overrides[get_async_db] = _override_db(mock_db)

    resp = client.get("/api/lms/gamification/me/level", headers=HEADERS)

    assert resp.status_code == 200
    data = resp.json()
    assert data["total_xp"] == 1200
    assert data["current_level"] == 3
    assert data["level_title"] == "Technician"
    assert data["current_streak"] == 5


def test_get_my_level_returns_defaults_when_no_row():
    mock_db = _make_mock_db()

    app.dependency_overrides[get_current_lms_user] = _override_user(_make_mock_student())
    app.dependency_overrides[get_async_db] = _override_db(mock_db)

    resp = client.get("/api/lms/gamification/me/level", headers=HEADERS)

    assert resp.status_code == 200
    data = resp.json()
    assert data["total_xp"] == 0
    assert data["current_level"] == 1
    assert data["level_title"] == "Apprentice"


def test_get_leaderboard_returns_list():
    mock_db = _make_mock_db()

    app.dependency_overrides[get_async_db] = _override_db(mock_db)

    resp = client.get("/api/lms/gamification/leaderboard")

    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
