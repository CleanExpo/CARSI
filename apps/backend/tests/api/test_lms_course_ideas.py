"""Tests for Course Idea Catalog — Phase 23."""

from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from src.api.main import app
from src.api.deps_lms import get_current_lms_user
from src.config.database import get_async_db
from src.db.lms_models import LMSUser, LMSCourseIdea, LMSCourseIdeaVote

client = TestClient(app)

STUDENT_ID = uuid4()
INSTRUCTOR_ID = uuid4()
IDEA_ID = uuid4()


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
    user.full_name = "Sarah Mitchell"
    user.user_roles = [ur]
    return user


def _make_idea(with_outline: bool = False) -> MagicMock:
    idea = MagicMock(spec=LMSCourseIdea)
    idea.id = IDEA_ID
    idea.title = "Advanced Water Damage Remediation"
    idea.description = "Deep dive into Category 3 water damage"
    idea.iicrc_discipline = "WRT"
    idea.suggested_by_id = STUDENT_ID
    idea.vote_count = 7
    idea.status = "idea"
    idea.ai_outline = (
        {
            "course_title": "Advanced Water Damage Remediation",
            "total_cec_hours": 3.0,
            "modules": [{"title": "Module 1", "lessons": []}],
        }
        if with_outline
        else None
    )
    idea.ai_outline_generated_at = None
    idea.created_at = None
    return idea


def _make_db(ideas=None, idea=None, vote=None):
    db = AsyncMock()

    def _result_for(query):
        result = MagicMock()
        result.scalars.return_value.all.return_value = ideas or []
        result.scalar_one_or_none.return_value = idea
        result.rowcount = 1 if vote else 0
        return result

    db.execute = AsyncMock(side_effect=_result_for)
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    db.add = MagicMock()
    db.delete = AsyncMock()
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
# GET /api/lms/ideas
# ---------------------------------------------------------------------------


def test_list_ideas_public_no_auth():
    """Public endpoint — no auth header needed."""
    mock_db = _make_db(ideas=[_make_idea()])
    app.dependency_overrides[get_async_db] = _override_db(mock_db)

    resp = client.get("/api/lms/ideas")

    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert data[0]["title"] == "Advanced Water Damage Remediation"
    assert data[0]["vote_count"] == 7


def test_list_ideas_returns_empty_list():
    mock_db = _make_db(ideas=[])
    app.dependency_overrides[get_async_db] = _override_db(mock_db)

    resp = client.get("/api/lms/ideas")

    assert resp.status_code == 200
    assert resp.json() == []


# ---------------------------------------------------------------------------
# POST /api/lms/ideas
# ---------------------------------------------------------------------------


def test_create_idea_authenticated():
    """Any authenticated user can submit an idea."""
    mock_db = AsyncMock()
    mock_db.add = MagicMock()
    mock_db.commit = AsyncMock()

    created_idea = _make_idea()

    async def _refresh(obj):
        obj.id = IDEA_ID
        obj.vote_count = 0
        obj.status = "idea"
        obj.ai_outline = None
        obj.ai_outline_generated_at = None
        obj.created_at = None

    mock_db.refresh = _refresh

    app.dependency_overrides[get_current_lms_user] = _override_user(_make_student())
    app.dependency_overrides[get_async_db] = _override_db(mock_db)

    resp = client.post(
        "/api/lms/ideas",
        json={
            "title": "Advanced Water Damage Remediation",
            "description": "Deep dive into Category 3 water damage",
            "iicrc_discipline": "WRT",
        },
        headers={"X-User-Id": str(STUDENT_ID)},
    )

    assert resp.status_code == 201


def test_create_idea_requires_auth():
    resp = client.post(
        "/api/lms/ideas",
        json={"title": "New Course Idea"},
    )
    assert resp.status_code in (401, 403)


# ---------------------------------------------------------------------------
# GET /api/lms/ideas/{id}
# ---------------------------------------------------------------------------


def test_get_idea_detail_public():
    mock_db = _make_db(idea=_make_idea(with_outline=True))
    app.dependency_overrides[get_async_db] = _override_db(mock_db)

    resp = client.get(f"/api/lms/ideas/{IDEA_ID}")

    assert resp.status_code == 200
    data = resp.json()
    assert data["id"] == str(IDEA_ID)
    assert data["ai_outline"] is not None


def test_get_idea_detail_not_found():
    mock_db = _make_db(idea=None)
    app.dependency_overrides[get_async_db] = _override_db(mock_db)

    resp = client.get(f"/api/lms/ideas/{uuid4()}")

    assert resp.status_code == 404


# ---------------------------------------------------------------------------
# POST /api/lms/ideas/{id}/vote
# ---------------------------------------------------------------------------


def test_vote_toggles_on():
    """Vote when no vote exists — creates vote, increments count."""
    mock_db = AsyncMock()
    mock_db.commit = AsyncMock()
    mock_db.add = MagicMock()

    # First execute returns the idea, second returns None (no existing vote)
    idea = _make_idea()
    results = iter([
        MagicMock(**{"scalar_one_or_none.return_value": idea}),
        MagicMock(**{"scalar_one_or_none.return_value": None}),
    ])
    mock_db.execute = AsyncMock(side_effect=lambda _: next(results))

    app.dependency_overrides[get_current_lms_user] = _override_user(_make_student())
    app.dependency_overrides[get_async_db] = _override_db(mock_db)

    resp = client.post(
        f"/api/lms/ideas/{IDEA_ID}/vote",
        headers={"X-User-Id": str(STUDENT_ID)},
    )

    assert resp.status_code == 200
    assert resp.json()["voted"] is True


def test_vote_toggles_off():
    """Vote when vote exists — removes vote, decrements count."""
    mock_db = AsyncMock()
    mock_db.commit = AsyncMock()
    mock_db.delete = AsyncMock()

    idea = _make_idea()
    existing_vote = MagicMock(spec=LMSCourseIdeaVote)

    results = iter([
        MagicMock(**{"scalar_one_or_none.return_value": idea}),
        MagicMock(**{"scalar_one_or_none.return_value": existing_vote}),
    ])
    mock_db.execute = AsyncMock(side_effect=lambda _: next(results))

    app.dependency_overrides[get_current_lms_user] = _override_user(_make_student())
    app.dependency_overrides[get_async_db] = _override_db(mock_db)

    resp = client.post(
        f"/api/lms/ideas/{IDEA_ID}/vote",
        headers={"X-User-Id": str(STUDENT_ID)},
    )

    assert resp.status_code == 200
    assert resp.json()["voted"] is False


# ---------------------------------------------------------------------------
# POST /api/lms/ideas/{id}/generate-outline
# ---------------------------------------------------------------------------


def test_generate_outline_requires_instructor():
    """Students cannot generate outlines."""
    mock_db = _make_db(idea=_make_idea())
    app.dependency_overrides[get_current_lms_user] = _override_user(_make_student())
    app.dependency_overrides[get_async_db] = _override_db(mock_db)

    resp = client.post(
        f"/api/lms/ideas/{IDEA_ID}/generate-outline",
        headers={"X-User-Id": str(STUDENT_ID)},
    )

    assert resp.status_code == 403


def test_generate_outline_returns_json_outline():
    """Instructor gets AI outline stored on the idea."""
    outline_json = {
        "course_title": "Advanced Water Damage Remediation",
        "total_cec_hours": 3.0,
        "modules": [{"title": "Foundations", "lessons": []}],
        "learning_objectives": ["Understand Category 3 contamination"],
    }

    mock_db = AsyncMock()
    mock_db.commit = AsyncMock()

    idea = _make_idea()
    mock_db.execute = AsyncMock(
        return_value=MagicMock(**{"scalar_one_or_none.return_value": idea})
    )

    app.dependency_overrides[get_current_lms_user] = _override_user(_make_instructor())
    app.dependency_overrides[get_async_db] = _override_db(mock_db)

    with patch(
        "src.api.routes.lms_course_ideas._generate_outline_via_ai",
        new=AsyncMock(return_value=outline_json),
    ):
        resp = client.post(
            f"/api/lms/ideas/{IDEA_ID}/generate-outline",
            headers={"X-User-Id": str(INSTRUCTOR_ID)},
        )

    assert resp.status_code == 200
    data = resp.json()
    assert data["course_title"] == "Advanced Water Damage Remediation"
    assert data["total_cec_hours"] == 3.0


def test_generate_outline_404_when_idea_missing():
    mock_db = AsyncMock()
    mock_db.execute = AsyncMock(
        return_value=MagicMock(**{"scalar_one_or_none.return_value": None})
    )

    app.dependency_overrides[get_current_lms_user] = _override_user(_make_instructor())
    app.dependency_overrides[get_async_db] = _override_db(mock_db)

    resp = client.post(
        f"/api/lms/ideas/{uuid4()}/generate-outline",
        headers={"X-User-Id": str(INSTRUCTOR_ID)},
    )

    assert resp.status_code == 404
