"""Tests for RPL Portfolio — Phase 26."""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from src.api.main import app
from src.api.deps_lms import get_current_lms_user
from src.config.database import get_async_db
from src.db.lms_models import LMSUser, LMSRPLPortfolio

client = TestClient(app)

STUDENT_ID = uuid4()
INSTRUCTOR_ID = uuid4()
PORTFOLIO_ID = uuid4()


def _make_student():
    user = MagicMock(spec=LMSUser)
    user.id = STUDENT_ID
    user.full_name = "James Wilson"
    user.user_roles = []
    return user


def _make_instructor():
    role = MagicMock()
    role.name = "instructor"
    ur = MagicMock()
    ur.role = role
    user = MagicMock(spec=LMSUser)
    user.id = INSTRUCTOR_ID
    user.user_roles = [ur]
    return user


def _make_submission(status: str = "pending") -> MagicMock:
    sub = MagicMock(spec=LMSRPLPortfolio)
    sub.id = PORTFOLIO_ID
    sub.student_id = STUDENT_ID
    sub.unit_code = "CPPCLO4027"
    sub.unit_name = "Respond to infection control incidents in a cleaning context"
    sub.evidence_description = "10 years field experience in Category 3 water damage."
    sub.evidence_urls = ["https://drive.google.com/file/abc"]
    sub.status = status
    sub.reviewer_id = None
    sub.reviewer_notes = None
    sub.reviewed_at = None
    sub.created_at = datetime.now(timezone.utc)
    sub.updated_at = datetime.now(timezone.utc)
    return sub


def _make_db(submissions=None, submission=None):
    db = AsyncMock()
    db.add = MagicMock()
    db.commit = AsyncMock()
    db.delete = AsyncMock()

    results = []
    if submissions is not None:
        r = MagicMock()
        r.scalars.return_value.all.return_value = submissions
        results.append(r)
    if submission is not None:
        r = MagicMock()
        r.scalar_one_or_none.return_value = submission
        results.append(r)

    it = iter(results)

    async def _execute(_q):
        try:
            return next(it)
        except StopIteration:
            m = MagicMock()
            m.scalars.return_value.all.return_value = []
            m.scalar_one_or_none.return_value = None
            return m

    db.execute = AsyncMock(side_effect=_execute)
    db.refresh = AsyncMock()
    return db


def _override_db(mock_db):
    async def _dep():
        yield mock_db
    return _dep


def _override_user(user):
    async def _dep():
        return user
    return _dep


@pytest.fixture(autouse=True)
def clear_overrides():
    yield
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# GET /api/lms/rpl/units
# ---------------------------------------------------------------------------


def test_list_units_returns_unique_cpp_units():
    """Returns distinct CPP40421 units from published courses."""
    row1 = MagicMock()
    row1.cppp40421_unit_code = "CPPCLO4027"
    row1.cppp40421_unit_name = "Respond to infection control incidents"

    mock_db = AsyncMock()
    result = MagicMock()
    result.all.return_value = [row1]
    mock_db.execute = AsyncMock(return_value=result)

    app.dependency_overrides[get_async_db] = _override_db(mock_db)

    resp = client.get("/api/lms/rpl/units")

    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert data[0]["unit_code"] == "CPPCLO4027"


# ---------------------------------------------------------------------------
# GET /api/lms/rpl/portfolio/me
# ---------------------------------------------------------------------------


def test_my_portfolio_returns_submissions():
    mock_db = _make_db(submissions=[_make_submission()])
    app.dependency_overrides[get_current_lms_user] = _override_user(_make_student())
    app.dependency_overrides[get_async_db] = _override_db(mock_db)

    resp = client.get(
        "/api/lms/rpl/portfolio/me",
        headers={"X-User-Id": str(STUDENT_ID)},
    )

    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1
    assert data[0]["unit_code"] == "CPPCLO4027"
    assert data[0]["status"] == "pending"


def test_my_portfolio_requires_auth():
    resp = client.get("/api/lms/rpl/portfolio/me")
    assert resp.status_code in (401, 403)


# ---------------------------------------------------------------------------
# POST /api/lms/rpl/portfolio
# ---------------------------------------------------------------------------


def test_submit_rpl_application():
    sub = _make_submission()
    mock_db = AsyncMock()
    mock_db.add = MagicMock()
    mock_db.commit = AsyncMock()

    async def _refresh(obj):
        obj.id = PORTFOLIO_ID
        obj.student_id = STUDENT_ID
        obj.unit_code = "CPPCLO4027"
        obj.unit_name = "Respond to infection control incidents"
        obj.evidence_description = "10 years experience"
        obj.evidence_urls = []
        obj.status = "pending"
        obj.reviewer_id = None
        obj.reviewer_notes = None
        obj.reviewed_at = None
        obj.created_at = datetime.now(timezone.utc)
        obj.updated_at = datetime.now(timezone.utc)

    mock_db.refresh = _refresh

    app.dependency_overrides[get_current_lms_user] = _override_user(_make_student())
    app.dependency_overrides[get_async_db] = _override_db(mock_db)

    resp = client.post(
        "/api/lms/rpl/portfolio",
        json={
            "unit_code": "CPPCLO4027",
            "unit_name": "Respond to infection control incidents",
            "evidence_description": "10 years experience",
            "evidence_urls": [],
        },
        headers={"X-User-Id": str(STUDENT_ID)},
    )

    assert resp.status_code == 201
    assert resp.json()["unit_code"] == "CPPCLO4027"


def test_submit_requires_auth():
    resp = client.post(
        "/api/lms/rpl/portfolio",
        json={
            "unit_code": "CPPCLO4027",
            "unit_name": "Test",
            "evidence_description": "Evidence",
        },
    )
    assert resp.status_code in (401, 403)


# ---------------------------------------------------------------------------
# DELETE /api/lms/rpl/portfolio/{id}
# ---------------------------------------------------------------------------


def test_withdraw_pending_submission():
    mock_db = AsyncMock()
    mock_db.commit = AsyncMock()
    mock_db.delete = AsyncMock()

    sub = _make_submission(status="pending")
    mock_db.execute = AsyncMock(
        return_value=MagicMock(**{"scalar_one_or_none.return_value": sub})
    )

    app.dependency_overrides[get_current_lms_user] = _override_user(_make_student())
    app.dependency_overrides[get_async_db] = _override_db(mock_db)

    resp = client.delete(
        f"/api/lms/rpl/portfolio/{PORTFOLIO_ID}",
        headers={"X-User-Id": str(STUDENT_ID)},
    )

    assert resp.status_code == 204


def test_withdraw_approved_submission_forbidden():
    """Cannot withdraw an already-approved submission."""
    mock_db = AsyncMock()
    sub = _make_submission(status="approved")
    mock_db.execute = AsyncMock(
        return_value=MagicMock(**{"scalar_one_or_none.return_value": sub})
    )

    app.dependency_overrides[get_current_lms_user] = _override_user(_make_student())
    app.dependency_overrides[get_async_db] = _override_db(mock_db)

    resp = client.delete(
        f"/api/lms/rpl/portfolio/{PORTFOLIO_ID}",
        headers={"X-User-Id": str(STUDENT_ID)},
    )

    assert resp.status_code == 409


def test_withdraw_other_student_forbidden():
    """Cannot withdraw another student's submission."""
    other_student = MagicMock(spec=LMSUser)
    other_student.id = uuid4()  # different ID
    other_student.user_roles = []

    sub = _make_submission(status="pending")
    mock_db = AsyncMock()
    mock_db.execute = AsyncMock(
        return_value=MagicMock(**{"scalar_one_or_none.return_value": sub})
    )

    app.dependency_overrides[get_current_lms_user] = _override_user(other_student)
    app.dependency_overrides[get_async_db] = _override_db(mock_db)

    resp = client.delete(
        f"/api/lms/rpl/portfolio/{PORTFOLIO_ID}",
        headers={"X-User-Id": str(other_student.id)},
    )

    assert resp.status_code == 403


# ---------------------------------------------------------------------------
# GET /api/lms/admin/rpl
# ---------------------------------------------------------------------------


def test_admin_rpl_queue_requires_instructor():
    mock_db = _make_db(submissions=[])
    app.dependency_overrides[get_current_lms_user] = _override_user(_make_student())
    app.dependency_overrides[get_async_db] = _override_db(mock_db)

    resp = client.get(
        "/api/lms/admin/rpl",
        headers={"X-User-Id": str(STUDENT_ID)},
    )

    assert resp.status_code == 403


def test_admin_rpl_queue_returns_submissions():
    mock_db = _make_db(submissions=[_make_submission(status="pending")])
    app.dependency_overrides[get_current_lms_user] = _override_user(_make_instructor())
    app.dependency_overrides[get_async_db] = _override_db(mock_db)

    resp = client.get(
        "/api/lms/admin/rpl",
        headers={"X-User-Id": str(INSTRUCTOR_ID)},
    )

    assert resp.status_code == 200
    data = resp.json()
    assert len(data) == 1


# ---------------------------------------------------------------------------
# PATCH /api/lms/admin/rpl/{id}/review
# ---------------------------------------------------------------------------


def test_approve_submission():
    sub = _make_submission(status="pending")
    mock_db = AsyncMock()
    mock_db.commit = AsyncMock()
    mock_db.execute = AsyncMock(
        return_value=MagicMock(**{"scalar_one_or_none.return_value": sub})
    )

    app.dependency_overrides[get_current_lms_user] = _override_user(_make_instructor())
    app.dependency_overrides[get_async_db] = _override_db(mock_db)

    resp = client.patch(
        f"/api/lms/admin/rpl/{PORTFOLIO_ID}/review",
        json={"decision": "approved", "notes": "Evidence verified — 10 years field experience confirmed."},
        headers={"X-User-Id": str(INSTRUCTOR_ID)},
    )

    assert resp.status_code == 200
    assert resp.json()["status"] == "approved"


def test_reject_submission():
    sub = _make_submission(status="under_review")
    mock_db = AsyncMock()
    mock_db.commit = AsyncMock()
    mock_db.execute = AsyncMock(
        return_value=MagicMock(**{"scalar_one_or_none.return_value": sub})
    )

    app.dependency_overrides[get_current_lms_user] = _override_user(_make_instructor())
    app.dependency_overrides[get_async_db] = _override_db(mock_db)

    resp = client.patch(
        f"/api/lms/admin/rpl/{PORTFOLIO_ID}/review",
        json={"decision": "rejected", "notes": "Insufficient evidence provided."},
        headers={"X-User-Id": str(INSTRUCTOR_ID)},
    )

    assert resp.status_code == 200
    assert resp.json()["status"] == "rejected"


def test_review_invalid_decision_rejected():
    sub = _make_submission()
    mock_db = AsyncMock()
    mock_db.execute = AsyncMock(
        return_value=MagicMock(**{"scalar_one_or_none.return_value": sub})
    )

    app.dependency_overrides[get_current_lms_user] = _override_user(_make_instructor())
    app.dependency_overrides[get_async_db] = _override_db(mock_db)

    resp = client.patch(
        f"/api/lms/admin/rpl/{PORTFOLIO_ID}/review",
        json={"decision": "maybe"},
        headers={"X-User-Id": str(INSTRUCTOR_ID)},
    )

    assert resp.status_code == 422
