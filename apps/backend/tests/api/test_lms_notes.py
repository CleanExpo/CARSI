"""
Tests for LMS Notes API
"""

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from src.api.main import app
from src.api.deps_lms import get_current_lms_user
from src.config.database import get_async_db
from src.db.lms_models import LMSCourse, LMSLesson, LMSLessonNote, LMSModule, LMSUser

client = TestClient(app)

AUTH_HEADERS = {"X-User-Id": "00000000-0000-0000-0000-000000000001"}
STUDENT_ID = uuid4()
LESSON_ID = uuid4()
MODULE_ID = uuid4()
COURSE_ID = uuid4()
NOTE_ID = uuid4()


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


def make_mock_course() -> MagicMock:
    course = MagicMock(spec=LMSCourse)
    course.id = COURSE_ID
    course.title = "WRT Fundamentals"
    course.slug = "wrt-fundamentals"
    return course


def make_mock_module() -> MagicMock:
    module = MagicMock(spec=LMSModule)
    module.id = MODULE_ID
    module.title = "Module 1: Water Damage Basics"
    module.course = make_mock_course()
    return module


def make_mock_lesson() -> MagicMock:
    lesson = MagicMock(spec=LMSLesson)
    lesson.id = LESSON_ID
    lesson.title = "Introduction to WRT"
    lesson.module = make_mock_module()
    return lesson


def make_mock_note() -> MagicMock:
    note = MagicMock(spec=LMSLessonNote)
    note.id = NOTE_ID
    note.student_id = STUDENT_ID
    note.lesson_id = LESSON_ID
    note.content = "Important: RH levels above 60% indicate moisture problem."
    note.updated_at = datetime(2026, 2, 20, tzinfo=timezone.utc)
    note.lesson = make_mock_lesson()
    return note


def make_mock_db() -> AsyncMock:
    db = AsyncMock()
    result = MagicMock()
    result.scalars.return_value.all.return_value = []
    result.scalar_one_or_none.return_value = None
    db.execute = AsyncMock(return_value=result)
    db.flush = AsyncMock()
    db.commit = AsyncMock()
    db.refresh = AsyncMock()
    db.delete = AsyncMock()
    db.add = MagicMock()
    return db


def _override_db(mock_db: AsyncMock):
    async def _get_db():
        yield mock_db
    return _get_db


def _override_user(mock_user):
    def _get_user():
        return mock_user
    return _get_user


@pytest.fixture(autouse=True)
def clear_overrides():
    yield
    app.dependency_overrides.clear()


class TestGetMyNotes:
    def test_returns_empty_list_when_no_notes(self):
        mock_db = make_mock_db()
        mock_student = make_mock_student()
        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(mock_student)

        resp = client.get("/api/lms/notes/me", headers=AUTH_HEADERS)
        assert resp.status_code == 200
        assert resp.json() == []

    def test_returns_notes_with_lesson_and_course_metadata(self):
        mock_db = make_mock_db()
        mock_student = make_mock_student()
        mock_note = make_mock_note()

        result = MagicMock()
        result.scalars.return_value.all.return_value = [mock_note]
        mock_db.execute = AsyncMock(return_value=result)

        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(mock_student)

        resp = client.get("/api/lms/notes/me", headers=AUTH_HEADERS)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["lesson_id"] == str(LESSON_ID)
        assert data[0]["lesson_title"] == "Introduction to WRT"
        assert data[0]["course_title"] == "WRT Fundamentals"
        assert data[0]["course_slug"] == "wrt-fundamentals"

    def test_requires_authentication(self):
        resp = client.get("/api/lms/notes/me")
        assert resp.status_code == 401


class TestUpsertNote:
    def test_creates_new_note(self):
        mock_db = make_mock_db()
        mock_student = make_mock_student()
        lesson_id = str(LESSON_ID)

        # First execute call: lookup returns None (note doesn't exist yet)
        result_lookup = MagicMock()
        result_lookup.scalar_one_or_none.return_value = None

        # Second execute call: re-fetch after commit returns a fully-formed note
        mock_note = MagicMock(spec=LMSLessonNote)
        mock_note.id = str(NOTE_ID)
        mock_note.lesson_id = lesson_id
        mock_note.content = "My new note"
        mock_note.updated_at = datetime.now(timezone.utc)
        mock_note.lesson = MagicMock()
        mock_note.lesson.title = "Test Lesson"
        mock_note.lesson.module = MagicMock()
        mock_note.lesson.module.title = "Test Module"
        mock_note.lesson.module.course = MagicMock()
        mock_note.lesson.module.course.title = "Test Course"
        mock_note.lesson.module.course.slug = "test-course"

        result_refetch = MagicMock()
        result_refetch.scalar_one_or_none.return_value = mock_note

        mock_db.execute = AsyncMock(side_effect=[result_lookup, result_refetch])

        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(mock_student)

        response = client.put(
            f"/api/lms/notes/{lesson_id}",
            json={"content": "My new note"},
            headers=AUTH_HEADERS,
        )

        assert response.status_code == 200
        data = response.json()
        assert data["lesson_title"] == "Test Lesson"
        assert data["content"] == "My new note"
        mock_db.add.assert_called_once()

    def test_requires_authentication(self):
        resp = client.put(f"/api/lms/notes/{LESSON_ID}", json={"content": "test"})
        assert resp.status_code == 401


class TestDeleteNote:
    def test_deletes_existing_note(self):
        mock_db = make_mock_db()
        mock_student = make_mock_student()
        mock_note = make_mock_note()

        result_lookup = MagicMock()
        result_lookup.scalar_one_or_none.return_value = mock_note
        mock_db.execute = AsyncMock(return_value=result_lookup)

        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(mock_student)

        resp = client.delete(f"/api/lms/notes/{LESSON_ID}", headers=AUTH_HEADERS)
        assert resp.status_code == 204
        mock_db.delete.assert_called_once_with(mock_note)

    def test_returns_404_when_note_not_found(self):
        mock_db = make_mock_db()
        mock_student = make_mock_student()

        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(mock_student)

        resp = client.delete(f"/api/lms/notes/{LESSON_ID}", headers=AUTH_HEADERS)
        assert resp.status_code == 404
