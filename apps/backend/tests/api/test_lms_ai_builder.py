"""Tests for AI Course Builder — GP-129."""

from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from src.api.main import app
from src.api.deps_lms import get_current_lms_user
from src.db.lms_models import LMSUser

client = TestClient(app)

STUDENT_ID = uuid4()
INSTRUCTOR_ID = uuid4()
ADMIN_ID = uuid4()

VALID_BODY = {
    "title": "Water Restoration Technician Advanced",
    "iicrc_discipline": "WRT",
    "standard_outline": "S500 Standard: structural drying, moisture mapping, psychrometry",
    "module_count": 3,
}


def _make_student():
    role = MagicMock()
    role.name = "student"
    ur = MagicMock()
    ur.role = role
    user = MagicMock(spec=LMSUser)
    user.id = STUDENT_ID
    user.full_name = "James Wilson"
    user.user_roles = [ur]
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


def _make_admin():
    role = MagicMock()
    role.name = "admin"
    ur = MagicMock()
    ur.role = role
    user = MagicMock(spec=LMSUser)
    user.id = ADMIN_ID
    user.full_name = "Phil Admin"
    user.user_roles = [ur]
    return user


def _override_user(user):
    async def _dep():
        return user
    return _dep


@pytest.fixture(autouse=True)
def clear_overrides():
    yield
    app.dependency_overrides.clear()


AI_RESPONSE = {
    "modules": [
        {
            "name": "Structural Drying Fundamentals",
            "description": "Core concepts of structural drying per IICRC S500.",
            "lessons": [
                {
                    "title": "Introduction to Structural Drying",
                    "content": "Lesson content about structural drying principles...",
                    "key_takeaways": [
                        "Understand drying chambers",
                        "Know grain depression targets",
                    ],
                    "quiz_questions": [
                        {
                            "question": "What is the primary goal of structural drying?",
                            "options": [
                                "Speed",
                                "Moisture removal",
                                "Cost saving",
                                "Aesthetics",
                            ],
                            "correct_index": 1,
                        }
                    ],
                },
                {
                    "title": "Equipment Selection",
                    "content": "Lesson content about drying equipment...",
                    "key_takeaways": ["Select proper dehumidifiers"],
                    "quiz_questions": [],
                },
            ],
        },
        {
            "name": "Moisture Mapping",
            "description": "Mapping moisture profiles in affected structures.",
            "lessons": [
                {
                    "title": "Moisture Meters",
                    "content": "Using pin-type and pinless meters...",
                    "key_takeaways": ["Calibrate meters correctly"],
                    "quiz_questions": [],
                },
                {
                    "title": "Documentation",
                    "content": "Recording moisture readings...",
                    "key_takeaways": ["Maintain daily logs"],
                    "quiz_questions": [],
                },
            ],
        },
        {
            "name": "Psychrometry",
            "description": "Understanding psychrometric principles.",
            "lessons": [
                {
                    "title": "Psychrometric Charts",
                    "content": "Reading and interpreting charts...",
                    "key_takeaways": ["Calculate dew point"],
                    "quiz_questions": [],
                },
                {
                    "title": "Atmospheric Conditions",
                    "content": "Monitoring conditions during drying...",
                    "key_takeaways": ["Track GPP daily"],
                    "quiz_questions": [],
                },
            ],
        },
    ]
}


# ---------------------------------------------------------------------------
# POST /api/lms/admin/ai-course-builder
# ---------------------------------------------------------------------------


def test_ai_builder_requires_auth():
    """401 without any auth header."""
    resp = client.post("/api/lms/admin/ai-course-builder", json=VALID_BODY)
    assert resp.status_code in (401, 403)


def test_ai_builder_requires_instructor():
    """403 for student role."""
    app.dependency_overrides[get_current_lms_user] = _override_user(_make_student())

    resp = client.post(
        "/api/lms/admin/ai-course-builder",
        json=VALID_BODY,
        headers={"X-User-Id": str(STUDENT_ID)},
    )
    assert resp.status_code == 403


def test_ai_builder_generates_content():
    """200 with mocked AI response — verify structure."""
    app.dependency_overrides[get_current_lms_user] = _override_user(_make_instructor())

    with patch(
        "src.api.routes.lms_ai_builder._generate_course_content",
        new=AsyncMock(return_value=AI_RESPONSE),
    ):
        resp = client.post(
            "/api/lms/admin/ai-course-builder",
            json=VALID_BODY,
            headers={"X-User-Id": str(INSTRUCTOR_ID)},
        )

    assert resp.status_code == 200
    data = resp.json()

    # Verify top-level structure
    assert "modules" in data
    modules = data["modules"]
    assert len(modules) == 3

    # Verify module structure
    mod = modules[0]
    assert "name" in mod
    assert "description" in mod
    assert "lessons" in mod
    assert len(mod["lessons"]) == 2

    # Verify lesson structure
    lesson = mod["lessons"][0]
    assert "title" in lesson
    assert "content" in lesson
    assert "key_takeaways" in lesson
    assert "quiz_questions" in lesson
    assert isinstance(lesson["key_takeaways"], list)
    assert isinstance(lesson["quiz_questions"], list)

    # Verify quiz question structure
    q = lesson["quiz_questions"][0]
    assert "question" in q
    assert "options" in q
    assert "correct_index" in q
    assert len(q["options"]) == 4


def test_ai_builder_admin_allowed():
    """Admin users can also use the builder."""
    app.dependency_overrides[get_current_lms_user] = _override_user(_make_admin())

    with patch(
        "src.api.routes.lms_ai_builder._generate_course_content",
        new=AsyncMock(return_value=AI_RESPONSE),
    ):
        resp = client.post(
            "/api/lms/admin/ai-course-builder",
            json=VALID_BODY,
            headers={"X-User-Id": str(ADMIN_ID)},
        )

    assert resp.status_code == 200
    assert "modules" in resp.json()


def test_ai_builder_fallback_on_ai_error():
    """Still returns 200 with minimal structure when AI provider fails."""
    app.dependency_overrides[get_current_lms_user] = _override_user(_make_instructor())

    with patch(
        "src.api.routes.lms_ai_builder._generate_course_content",
        new=AsyncMock(side_effect=Exception("AI provider unavailable")),
    ):
        resp = client.post(
            "/api/lms/admin/ai-course-builder",
            json=VALID_BODY,
            headers={"X-User-Id": str(INSTRUCTOR_ID)},
        )

    assert resp.status_code == 200
    data = resp.json()

    # Fallback structure should have correct module_count
    assert "modules" in data
    modules = data["modules"]
    assert len(modules) == 3

    # Each module should have 2 lessons
    for mod in modules:
        assert "name" in mod
        assert "lessons" in mod
        assert len(mod["lessons"]) == 2
