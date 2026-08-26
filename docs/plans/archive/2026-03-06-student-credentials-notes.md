# Student Credentials Wallet + Notes Pages — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the two missing student pages (`/student/credentials`, `/student/notes`) and the backend endpoints they require.

**Architecture:** Backend-first — add `GET /api/lms/credentials/me` to the existing credentials router, create the missing `lms_notes.py` router (DB model already exists), register it, then build the two frontend pages following the exact patterns of `/student/rpl/page.tsx`.

**Tech Stack:** FastAPI + SQLAlchemy 2.0 async (backend), Next.js 15 App Router `'use client'` pages (frontend), Tailwind CSS v4 with OLED Black design tokens.

---

## Task 1: Add `GET /api/lms/credentials/me` endpoint

**Files:**

- Modify: `apps/backend/src/api/routes/lms_credentials.py`
- Test: `apps/backend/tests/api/test_lms_credentials.py` (create new)

### Step 1: Create the test file

Create `apps/backend/tests/api/test_lms_credentials.py`:

```python
"""
Tests for LMS Credentials API — student wallet endpoint
"""

from datetime import datetime, timezone
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
ENROLLMENT_ID = uuid4()
COURSE_ID = uuid4()


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
    course.iicrc_discipline = "WRT"
    course.cec_hours = 8.0
    course.cppp40421_unit_code = "CPPCLO3003"
    return course


def make_mock_enrollment(status: str = "completed") -> MagicMock:
    enrollment = MagicMock(spec=LMSEnrollment)
    enrollment.id = ENROLLMENT_ID
    enrollment.student_id = STUDENT_ID
    enrollment.course_id = COURSE_ID
    enrollment.status = status
    enrollment.enrolled_at = datetime(2026, 1, 1, tzinfo=timezone.utc)
    enrollment.completed_at = datetime(2026, 2, 15, tzinfo=timezone.utc)
    enrollment.course = make_mock_course()
    return enrollment


def make_mock_db() -> AsyncMock:
    db = AsyncMock()
    result = MagicMock()
    result.scalars.return_value.all.return_value = []
    db.execute = AsyncMock(return_value=result)
    return db


def _override_db(mock_db: AsyncMock):
    async def _get_db():
        yield mock_db
    return _get_db


def _override_user(mock_user):
    def _get_user():
        return mock_user
    return _get_user


class TestGetMyCredentials:
    def test_returns_empty_list_when_no_completed_enrollments(self):
        mock_db = make_mock_db()
        mock_student = make_mock_student()
        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(mock_student)

        resp = client.get("/api/lms/credentials/me", headers=AUTH_HEADERS)
        assert resp.status_code == 200
        assert resp.json() == []

        app.dependency_overrides.clear()

    def test_returns_credentials_for_completed_enrollments(self):
        mock_db = make_mock_db()
        mock_student = make_mock_student()
        mock_enrollment = make_mock_enrollment(status="completed")

        result = MagicMock()
        result.scalars.return_value.all.return_value = [mock_enrollment]
        mock_db.execute = AsyncMock(return_value=result)

        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(mock_student)

        resp = client.get("/api/lms/credentials/me", headers=AUTH_HEADERS)
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        assert data[0]["credential_id"] == str(ENROLLMENT_ID)
        assert data[0]["course_title"] == "WRT Fundamentals"
        assert data[0]["iicrc_discipline"] == "WRT"
        assert data[0]["cec_hours"] == 8.0
        assert data[0]["status"] == "completed"

        app.dependency_overrides.clear()

    def test_requires_authentication(self):
        resp = client.get("/api/lms/credentials/me")
        assert resp.status_code == 401
```

### Step 2: Run test to verify it fails

```bash
cd apps/backend && uv run pytest tests/api/test_lms_credentials.py -v
```

Expected: FAIL — `404` because `/api/lms/credentials/me` doesn't exist yet.

### Step 3: Add the endpoint to `lms_credentials.py`

Add these imports at the top of the existing file (after `from sqlalchemy.orm import selectinload`):

```python
from src.api.deps_lms import get_current_lms_user
```

Add this Pydantic model before the existing `CredentialOut`:

```python
class StudentCredentialOut(BaseModel):
    credential_id: str
    course_title: str
    iicrc_discipline: str | None
    cec_hours: float
    cppp40421_unit_code: str | None
    issued_date: str
    verification_url: str
    status: str
```

Add this route after the existing `get_credential_pdf` function:

```python
@router.get("/me", response_model=list[StudentCredentialOut])
async def get_my_credentials(
    db: AsyncSession = Depends(get_async_db),
    current_user: LMSUser = Depends(get_current_lms_user),
) -> list[StudentCredentialOut]:
    """Return all completed course credentials for the current student."""
    result = await db.execute(
        select(LMSEnrollment)
        .where(
            LMSEnrollment.student_id == current_user.id,
            LMSEnrollment.status == "completed",
        )
        .options(selectinload(LMSEnrollment.course))
        .order_by(LMSEnrollment.completed_at.desc())
    )
    enrollments = result.scalars().all()

    credentials = []
    for e in enrollments:
        course: LMSCourse = e.course
        issued_ts = e.completed_at or e.enrolled_at
        issued_date = (
            issued_ts.strftime("%d %B %Y").lstrip("0") if issued_ts else "—"
        )
        credentials.append(
            StudentCredentialOut(
                credential_id=str(e.id),
                course_title=course.title if course else "Unknown",
                iicrc_discipline=course.iicrc_discipline if course else None,
                cec_hours=float(course.cec_hours) if course and course.cec_hours else 0.0,
                cppp40421_unit_code=course.cppp40421_unit_code if course else None,
                issued_date=issued_date,
                verification_url=f"https://carsi.com.au/credentials/{e.id}",
                status=e.status,
            )
        )
    return credentials
```

**IMPORTANT:** The `/me` route must be registered BEFORE `/{credential_id}` in the router — otherwise FastAPI will try to match "me" as a UUID. Move the `@router.get("/me")` definition above `@router.get("/{credential_id}")`.

### Step 4: Run tests to verify they pass

```bash
cd apps/backend && uv run pytest tests/api/test_lms_credentials.py -v
```

Expected: All 3 tests PASS.

### Step 5: Commit

```bash
git add apps/backend/src/api/routes/lms_credentials.py apps/backend/tests/api/test_lms_credentials.py
git commit -m "feat(backend): add GET /api/lms/credentials/me endpoint"
```

---

## Task 2: Create `lms_notes.py` backend router

**Files:**

- Create: `apps/backend/src/api/routes/lms_notes.py`
- Test: `apps/backend/tests/api/test_lms_notes.py` (create new)

### Step 1: Create the test file

Create `apps/backend/tests/api/test_lms_notes.py`:

```python
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
    return db


def _override_db(mock_db: AsyncMock):
    async def _get_db():
        yield mock_db
    return _get_db


def _override_user(mock_user):
    def _get_user():
        return mock_user
    return _get_user


class TestGetMyNotes:
    def test_returns_empty_list_when_no_notes(self):
        mock_db = make_mock_db()
        mock_student = make_mock_student()
        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(mock_student)

        resp = client.get("/api/lms/notes/me", headers=AUTH_HEADERS)
        assert resp.status_code == 200
        assert resp.json() == []

        app.dependency_overrides.clear()

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

        app.dependency_overrides.clear()

    def test_requires_authentication(self):
        resp = client.get("/api/lms/notes/me")
        assert resp.status_code == 401


class TestUpsertNote:
    def test_creates_new_note(self):
        mock_db = make_mock_db()
        mock_student = make_mock_student()

        # No existing note
        result_lookup = MagicMock()
        result_lookup.scalar_one_or_none.return_value = None
        mock_db.execute = AsyncMock(return_value=result_lookup)

        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(mock_student)

        resp = client.put(
            f"/api/lms/notes/{LESSON_ID}",
            headers={**AUTH_HEADERS, "Content-Type": "application/json"},
            json={"content": "New note content"},
        )
        assert resp.status_code == 200
        mock_db.add.assert_called_once()

        app.dependency_overrides.clear()

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

        app.dependency_overrides.clear()

    def test_returns_404_when_note_not_found(self):
        mock_db = make_mock_db()
        mock_student = make_mock_student()

        app.dependency_overrides[get_async_db] = _override_db(mock_db)
        app.dependency_overrides[get_current_lms_user] = _override_user(mock_student)

        resp = client.delete(f"/api/lms/notes/{LESSON_ID}", headers=AUTH_HEADERS)
        assert resp.status_code == 404

        app.dependency_overrides.clear()
```

### Step 2: Run test to verify it fails

```bash
cd apps/backend && uv run pytest tests/api/test_lms_notes.py -v
```

Expected: FAIL — `404` because routes don't exist yet.

### Step 3: Create `apps/backend/src/api/routes/lms_notes.py`

```python
"""
CARSI LMS Lesson Notes Routes

GET    /api/lms/notes/me              — list all notes for current user
PUT    /api/lms/notes/{lesson_id}     — upsert note for a lesson
DELETE /api/lms/notes/{lesson_id}     — delete note for a lesson
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.api.deps_lms import get_current_lms_user
from src.config.database import get_async_db
from src.db.lms_models import LMSLesson, LMSLessonNote, LMSModule, LMSUser

router = APIRouter(prefix="/api/lms/notes", tags=["lms-notes"])


class NoteUpsert(BaseModel):
    content: str


class LessonNoteOut(BaseModel):
    id: str
    lesson_id: str
    lesson_title: str
    module_title: str | None
    course_title: str
    course_slug: str
    content: str | None
    updated_at: str | None


@router.get("/me", response_model=list[LessonNoteOut])
async def get_my_notes(
    db: AsyncSession = Depends(get_async_db),
    current_user: LMSUser = Depends(get_current_lms_user),
) -> list[LessonNoteOut]:
    """Return all lesson notes for the current student, with lesson/course metadata."""
    result = await db.execute(
        select(LMSLessonNote)
        .where(LMSLessonNote.student_id == current_user.id)
        .options(
            selectinload(LMSLessonNote.lesson)
            .selectinload(LMSLesson.module)
            .selectinload(LMSModule.course)
        )
        .order_by(LMSLessonNote.updated_at.desc())
    )
    notes = result.scalars().all()

    out = []
    for n in notes:
        lesson = n.lesson
        module = lesson.module if lesson else None
        course = module.course if module else None
        out.append(
            LessonNoteOut(
                id=str(n.id),
                lesson_id=str(n.lesson_id),
                lesson_title=lesson.title if lesson else "Unknown lesson",
                module_title=module.title if module else None,
                course_title=course.title if course else "Unknown course",
                course_slug=course.slug if course else "",
                content=n.content,
                updated_at=n.updated_at.isoformat() if n.updated_at else None,
            )
        )
    return out


@router.put("/{lesson_id}", response_model=LessonNoteOut)
async def upsert_note(
    lesson_id: str,
    data: NoteUpsert,
    db: AsyncSession = Depends(get_async_db),
    current_user: LMSUser = Depends(get_current_lms_user),
) -> LessonNoteOut:
    """Create or update the current student's note for a lesson."""
    try:
        lid = UUID(lesson_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")

    result = await db.execute(
        select(LMSLessonNote).where(
            LMSLessonNote.student_id == current_user.id,
            LMSLessonNote.lesson_id == lid,
        )
    )
    note = result.scalar_one_or_none()

    if note:
        note.content = data.content
    else:
        note = LMSLessonNote(
            student_id=current_user.id,
            lesson_id=lid,
            content=data.content,
        )
        db.add(note)

    await db.commit()
    await db.refresh(note)

    # Re-fetch with lesson/course metadata for response
    result2 = await db.execute(
        select(LMSLessonNote)
        .where(LMSLessonNote.id == note.id)
        .options(
            selectinload(LMSLessonNote.lesson)
            .selectinload(LMSLesson.module)
            .selectinload(LMSModule.course)
        )
    )
    note = result2.scalar_one_or_none()
    lesson = note.lesson if note else None
    module = lesson.module if lesson else None
    course = module.course if module else None

    return LessonNoteOut(
        id=str(note.id),
        lesson_id=str(note.lesson_id),
        lesson_title=lesson.title if lesson else "Unknown lesson",
        module_title=module.title if module else None,
        course_title=course.title if course else "Unknown course",
        course_slug=course.slug if course else "",
        content=note.content,
        updated_at=note.updated_at.isoformat() if note.updated_at else None,
    )


@router.delete("/{lesson_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(
    lesson_id: str,
    db: AsyncSession = Depends(get_async_db),
    current_user: LMSUser = Depends(get_current_lms_user),
) -> None:
    """Delete the current student's note for a lesson."""
    try:
        lid = UUID(lesson_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")

    result = await db.execute(
        select(LMSLessonNote).where(
            LMSLessonNote.student_id == current_user.id,
            LMSLessonNote.lesson_id == lid,
        )
    )
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")

    await db.delete(note)
    await db.commit()
```

### Step 4: Run tests to verify they pass

```bash
cd apps/backend && uv run pytest tests/api/test_lms_notes.py -v
```

Expected: All tests PASS.

### Step 5: Commit

```bash
git add apps/backend/src/api/routes/lms_notes.py apps/backend/tests/api/test_lms_notes.py
git commit -m "feat(backend): add lms_notes routes (GET /me, PUT, DELETE)"
```

---

## Task 3: Register the notes router in `main.py`

**Files:**

- Modify: `apps/backend/src/api/main.py`

### Step 1: Add import

In `apps/backend/src/api/main.py`, find the block of `lms_*` imports and add:

```python
from src.api.routes import lms_notes
```

### Step 2: Register the router

After `app.include_router(lms_rpl.admin_router)` add:

```python
app.include_router(lms_notes.router)
```

### Step 3: Verify server starts cleanly

```bash
cd apps/backend && uv run uvicorn src.api.main:app --reload --port 8000 &
sleep 3
curl http://localhost:8000/openapi.json | python -c "import sys,json; routes=[r['path'] for r in json.load(sys.stdin)['paths']]; print([r for r in routes if 'notes' in r])"
```

Expected: `['/api/lms/notes/me', '/api/lms/notes/{lesson_id}']`

Stop the test server after verification.

### Step 4: Commit

```bash
git add apps/backend/src/api/main.py
git commit -m "feat(backend): register lms_notes router"
```

---

## Task 4: Build `/student/credentials/page.tsx`

**Files:**

- Create: `apps/web/app/(dashboard)/student/credentials/page.tsx`

### Step 1: Create the page

Create `apps/web/app/(dashboard)/student/credentials/page.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';
import { AlertCircle, Award, Download, ExternalLink, RefreshCw } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';

function getUserId(): string {
  return typeof window !== 'undefined' ? (localStorage.getItem('carsi_user_id') ?? '') : '';
}

function authHeaders(): Record<string, string> {
  const id = getUserId();
  return id ? { 'X-User-Id': id } : {};
}

interface StudentCredential {
  credential_id: string;
  course_title: string;
  iicrc_discipline: string | null;
  cec_hours: number;
  cppp40421_unit_code: string | null;
  issued_date: string;
  verification_url: string;
  status: string;
}

const DISCIPLINE_COLOURS: Record<string, string> = {
  WRT: 'bg-cyan-950 text-cyan-400',
  CRT: 'bg-emerald-950 text-emerald-400',
  OCT: 'bg-amber-950 text-amber-400',
  ASD: 'bg-blue-950 text-blue-400',
  CCT: 'bg-fuchsia-950 text-fuchsia-400',
};

function DisciplineBadge({ discipline }: { discipline: string | null }) {
  if (!discipline) return null;
  const cls = DISCIPLINE_COLOURS[discipline] ?? 'bg-zinc-800 text-zinc-400';
  return (
    <span className={`rounded-sm px-2.5 py-1 font-mono text-xs font-semibold ${cls}`}>
      {discipline}
    </span>
  );
}

function CredentialCard({ cred }: { cred: StudentCredential }) {
  const pdfUrl = `${API}/api/lms/credentials/${cred.credential_id}/pdf`;

  return (
    <div className="flex flex-col gap-4 rounded-sm border border-white/[0.06] bg-zinc-900/50 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="font-mono text-sm font-semibold text-white">{cred.course_title}</span>
          {cred.cppp40421_unit_code && (
            <span className="font-mono text-xs text-white/30">{cred.cppp40421_unit_code}</span>
          )}
        </div>
        <DisciplineBadge discipline={cred.iicrc_discipline} />
      </div>

      <div className="flex items-center gap-6">
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-xs tracking-widest text-white/30 uppercase">
            CEC Hours
          </span>
          <span className="font-mono text-lg font-bold text-white">{cred.cec_hours}</span>
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-xs tracking-widest text-white/30 uppercase">Issued</span>
          <span className="font-mono text-sm text-white">{cred.issued_date}</span>
        </div>
      </div>

      <div className="flex items-center gap-3 border-t border-white/[0.04] pt-4">
        <a
          href={`/credentials/${cred.credential_id}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 rounded-sm border border-white/[0.08] px-3 py-1.5 font-mono text-xs text-white/60 transition-colors hover:border-cyan-500/40 hover:text-cyan-400"
        >
          <ExternalLink className="h-3 w-3" />
          View Certificate
        </a>
        <a
          href={pdfUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 rounded-sm border border-white/[0.08] px-3 py-1.5 font-mono text-xs text-white/60 transition-colors hover:border-emerald-500/40 hover:text-emerald-400"
        >
          <Download className="h-3 w-3" />
          Download PDF
        </a>
      </div>
    </div>
  );
}

export default function CredentialsPage() {
  const [credentials, setCredentials] = useState<StudentCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCredentials = async () => {
    const headers = authHeaders();
    if (!headers['X-User-Id']) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`${API}/api/lms/credentials/me`, { headers });
      if (r.ok) {
        setCredentials(await r.json());
      } else {
        setError('Failed to load credentials');
      }
    } catch {
      setError('Network error loading credentials');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCredentials();
  }, []);

  return (
    <div className="flex max-w-3xl flex-col gap-8 p-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="font-mono text-2xl font-bold text-white">Credential Wallet</h1>
          <p className="text-sm text-white/40">
            IICRC CEC certificates earned through CARSI courses
          </p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-sm border border-white/[0.06] bg-zinc-900">
          <Award className="h-5 w-5 text-cyan-400" />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-sm border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
          <button
            onClick={fetchCredentials}
            className="ml-auto flex items-center gap-1 rounded-sm bg-red-900/50 px-2 py-1 text-xs hover:bg-red-900/70"
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </button>
        </div>
      )}

      {loading && <p className="text-sm text-white/40">Loading credentials…</p>}

      {!loading && !error && credentials.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-sm border border-white/[0.04] bg-zinc-900/30 px-6 py-12 text-center">
          <Award className="h-8 w-8 text-white/20" />
          <p className="font-mono text-sm text-white/30">No credentials yet</p>
          <p className="text-xs text-white/20">
            Complete a course to earn your first IICRC CEC certificate
          </p>
          <a
            href="/courses"
            className="mt-2 rounded-sm bg-cyan-600 px-4 py-2 font-mono text-xs font-semibold text-white transition-colors hover:bg-cyan-500"
          >
            Browse Courses
          </a>
        </div>
      )}

      {credentials.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <h2 className="font-mono text-xs tracking-widest text-white/40 uppercase">
              Earned Certificates
            </h2>
            <span className="font-mono text-xs text-white/30">
              {credentials.length} certificate{credentials.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {credentials.map((cred) => (
              <CredentialCard key={cred.credential_id} cred={cred} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
```

### Step 2: Verify TypeScript compiles

```bash
cd apps/web && pnpm exec tsc --noEmit
```

Expected: 0 errors.

### Step 3: Commit

```bash
git add apps/web/app/\(dashboard\)/student/credentials/page.tsx
git commit -m "feat(frontend): add /student/credentials credential wallet page"
```

---

## Task 5: Build `/student/notes/page.tsx`

**Files:**

- Create: `apps/web/app/(dashboard)/student/notes/page.tsx`

### Step 1: Create the page

Create `apps/web/app/(dashboard)/student/notes/page.tsx`:

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, ArrowRight, BookOpen, RefreshCw, Trash2 } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';

function getUserId(): string {
  return typeof window !== 'undefined' ? (localStorage.getItem('carsi_user_id') ?? '') : '';
}

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const id = getUserId();
  return { ...(id ? { 'X-User-Id': id } : {}), 'Content-Type': 'application/json', ...extra };
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-AU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

interface LessonNote {
  id: string;
  lesson_id: string;
  lesson_title: string;
  module_title: string | null;
  course_title: string;
  course_slug: string;
  content: string | null;
  updated_at: string | null;
}

interface NotesByGroup {
  [courseTitle: string]: LessonNote[];
}

function groupByCourse(notes: LessonNote[]): NotesByGroup {
  return notes.reduce<NotesByGroup>((acc, note) => {
    const key = note.course_title;
    if (!acc[key]) acc[key] = [];
    acc[key].push(note);
    return acc;
  }, {});
}

function NoteCard({
  note,
  onSave,
  onDelete,
}: {
  note: LessonNote;
  onSave: (lessonId: string, content: string) => Promise<void>;
  onDelete: (lessonId: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.content ?? '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleEdit() {
    setEditing(true);
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  async function handleSave() {
    setSaving(true);
    await onSave(note.lesson_id, draft);
    setSaving(false);
    setEditing(false);
  }

  function handleCancel() {
    setDraft(note.content ?? '');
    setEditing(false);
  }

  async function handleDelete() {
    setDeleting(true);
    await onDelete(note.lesson_id);
  }

  const lessonUrl = `/courses/${note.course_slug}/lessons/${note.lesson_id}`;

  return (
    <div className="flex flex-col gap-3 rounded-sm border border-white/[0.06] bg-zinc-900/50 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="font-mono text-sm font-semibold text-white">{note.lesson_title}</span>
          {note.module_title && (
            <span className="font-mono text-xs text-white/30">{note.module_title}</span>
          )}
        </div>
        <a
          href={lessonUrl}
          className="flex shrink-0 items-center gap-1 font-mono text-xs text-white/30 transition-colors hover:text-cyan-400"
        >
          Go to lesson
          <ArrowRight className="h-3 w-3" />
        </a>
      </div>

      {editing ? (
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={5}
          className="rounded-sm border border-white/[0.08] bg-zinc-800 px-3 py-2 text-sm text-white placeholder-white/20 focus:border-cyan-500/50 focus:outline-none"
          placeholder="Write your note here…"
        />
      ) : (
        <p
          className="cursor-pointer text-sm leading-relaxed text-white/60 hover:text-white/80"
          onClick={handleEdit}
          title="Click to edit"
        >
          {note.content?.trim() || (
            <span className="text-white/20 italic">Empty note — click to add content</span>
          )}
        </p>
      )}

      <div className="flex items-center justify-between border-t border-white/[0.04] pt-3">
        <span className="text-xs text-white/20">Updated {formatDate(note.updated_at)}</span>

        <div className="flex items-center gap-2">
          {editing ? (
            <>
              <button
                onClick={handleCancel}
                className="rounded-sm px-3 py-1 font-mono text-xs text-white/40 transition-colors hover:text-white/70"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-sm bg-cyan-600 px-3 py-1 font-mono text-xs font-semibold text-white transition-colors hover:bg-cyan-500 disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleEdit}
                className="rounded-sm border border-white/[0.06] px-3 py-1 font-mono text-xs text-white/40 transition-colors hover:border-white/20 hover:text-white/70"
              >
                Edit
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-1 rounded-sm px-2 py-1 font-mono text-xs text-white/20 transition-colors hover:text-red-400 disabled:opacity-40"
                title="Delete note"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function NotesPage() {
  const [notes, setNotes] = useState<LessonNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchNotes = async () => {
    const headers = authHeaders();
    if (!headers['X-User-Id']) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`${API}/api/lms/notes/me`, { headers });
      if (r.ok) {
        setNotes(await r.json());
      } else {
        setError('Failed to load notes');
      }
    } catch {
      setError('Network error loading notes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, []);

  async function handleSave(lessonId: string, content: string) {
    try {
      const r = await fetch(`${API}/api/lms/notes/${lessonId}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ content }),
      });
      if (r.ok) {
        const updated: LessonNote = await r.json();
        setNotes((prev) => prev.map((n) => (n.lesson_id === lessonId ? updated : n)));
      }
    } catch {
      // Fail silently — user sees stale data, retry on next load
    }
  }

  async function handleDelete(lessonId: string) {
    try {
      const r = await fetch(`${API}/api/lms/notes/${lessonId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (r.ok || r.status === 204) {
        setNotes((prev) => prev.filter((n) => n.lesson_id !== lessonId));
      }
    } catch {
      // Fail silently
    }
  }

  const grouped = groupByCourse(notes);
  const courseGroups = Object.entries(grouped);

  return (
    <div className="flex max-w-3xl flex-col gap-8 p-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="font-mono text-2xl font-bold text-white">My Notes</h1>
          <p className="text-sm text-white/40">Per-lesson notes from your courses</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-sm border border-white/[0.06] bg-zinc-900">
          <BookOpen className="h-5 w-5 text-cyan-400" />
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-sm border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-400">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
          <button
            onClick={fetchNotes}
            className="ml-auto flex items-center gap-1 rounded-sm bg-red-900/50 px-2 py-1 text-xs hover:bg-red-900/70"
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </button>
        </div>
      )}

      {loading && <p className="text-sm text-white/40">Loading notes…</p>}

      {!loading && !error && notes.length === 0 && (
        <div className="flex flex-col items-center gap-3 rounded-sm border border-white/[0.04] bg-zinc-900/30 px-6 py-12 text-center">
          <BookOpen className="h-8 w-8 text-white/20" />
          <p className="font-mono text-sm text-white/30">No notes yet</p>
          <p className="text-xs text-white/20">Notes written during lessons will appear here</p>
        </div>
      )}

      {courseGroups.map(([courseTitle, courseNotes]) => (
        <section key={courseTitle} className="flex flex-col gap-3">
          <h2 className="font-mono text-xs tracking-widest text-white/40 uppercase">
            {courseTitle}
          </h2>
          {courseNotes.map((note) => (
            <NoteCard
              key={note.lesson_id}
              note={note}
              onSave={handleSave}
              onDelete={handleDelete}
            />
          ))}
        </section>
      ))}
    </div>
  );
}
```

### Step 2: Verify TypeScript compiles

```bash
cd apps/web && pnpm exec tsc --noEmit
```

Expected: 0 errors.

### Step 3: Commit

```bash
git add apps/web/app/\(dashboard\)/student/notes/page.tsx
git commit -m "feat(frontend): add /student/notes notes management page"
```

---

## Final Verification

```bash
# Backend tests
cd apps/backend && uv run pytest tests/api/test_lms_credentials.py tests/api/test_lms_notes.py -v

# Frontend type-check
cd apps/web && pnpm exec tsc --noEmit

# Lint
cd apps/web && pnpm exec eslint app/\(dashboard\)/student/
```

Expected: All tests pass, 0 type errors, 0 lint errors.

---

## Infrastructure Steps (requires human action)

These cannot be automated — they require Fly.io access and Google Cloud Console:

### Deploy backend to Fly.io

```bash
cd apps/backend
fly deploy
# Confirm: curl https://api.carsi.com.au/health
```

### Provision PostgreSQL + run migrations

```bash
fly postgres create --name carsi-db --region syd
fly postgres attach carsi-db --app <your-app-name>
fly ssh console -C "cd /app && alembic upgrade head"
```

### Configure production Redis

```bash
# Option A: Upstash Redis (recommended — free tier)
# Create at upstash.com, then:
fly secrets set REDIS_URL=redis://...@...upstash.io:...
```

### Configure Google Drive OAuth

```bash
# 1. Create OAuth2 credentials at console.cloud.google.com
# 2. Set secrets:
fly secrets set GOOGLE_DRIVE_CLIENT_ID=... GOOGLE_DRIVE_CLIENT_SECRET=... GOOGLE_DRIVE_REFRESH_TOKEN=...
```

### Switch Stripe to live mode

```bash
# In Stripe dashboard: create live price cloning price_1T7Z5wDOMULuvIJbCPf7cJqd
# Then:
fly secrets set STRIPE_SECRET_KEY=sk_live_... STRIPE_YEARLY_PRICE_ID=price_live_...
vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY  # pk_live_...
```
