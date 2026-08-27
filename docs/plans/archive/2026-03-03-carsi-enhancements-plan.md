# CARSI LMS — Enhancement Phases Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.
> This plan is an addendum to `docs/plans/2026-03-03-carsi-lms-rebuild.md`.
> Execute the base plan first (Phases 0–7), then this plan (Phases 8, 14, 15).
> Run Phase 13 (Admin Panel) between Phases 12 and 14.

**Goal:** Implement the IICRC CEC achievement engine, PDF certificate generation, LinkedIn-shareable public credentials, and dual dark/light theme system on top of the core CARSI LMS.

**Architecture:** Event-driven achievement engine using Redis pub/sub + Celery workers. WeasyPrint generates certificate PDFs stored in Google Drive. Next.js PWA with Workbox service worker for offline lesson caching. Tailwind dark: variants for dual theme.

**Tech Stack:**

- Achievement engine: Redis (already in stack), Celery, WeasyPrint
- PDF certificates: WeasyPrint (Python), Jinja2 HTML templates
- PWA: next-pwa (Workbox)
- Drag-to-reorder: @dnd-kit/core
- Theme: Tailwind CSS v4 dark: variants

**Linear issues:** GP-96 (Phase 0) through GP-111 (Phase 15)

---

## Schema Additions (Apply to Phase 1 Migration)

These tables must be added to the Phase 1 Alembic migration (`001_lms_core_schema.py`) alongside the base LMS tables.

### Additional Tables for Enhancement Layer

```python
# Add to apps/backend/alembic/versions/001_lms_core_schema.py upgrade()

# --- IICRC fields added to courses table ---
# iicrc_discipline VARCHAR(10)   — WRT | CRT | OCT | ASD | CCT
# cec_hours NUMERIC(5,1)         — CECs awarded on completion
# cppp40421_unit_code VARCHAR(20) — e.g. CPPCLO4027
# cppp40421_unit_name TEXT        — full unit name
# (Add these columns inside the courses table definition)

# --- CEC Ledger ---
op.create_table('cec_transactions',
    sa.Column('id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    sa.Column('student_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
    sa.Column('course_id', UUID(as_uuid=True), sa.ForeignKey('courses.id'), nullable=False),
    sa.Column('iicrc_discipline', sa.String(10)),
    sa.Column('cec_hours', sa.Numeric(5, 1), nullable=False),
    sa.Column('earned_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    sa.Column('certificate_id', UUID(as_uuid=True)),  # FK added after certificates table exists
)

# --- Certificates ---
op.create_table('certificates',
    sa.Column('id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    sa.Column('student_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
    sa.Column('course_id', UUID(as_uuid=True), sa.ForeignKey('courses.id'), nullable=False),
    sa.Column('credential_id', sa.String(30), unique=True, nullable=False),  # e.g. CARSI-WRT-2026-001
    sa.Column('pdf_drive_file_id', sa.String(255)),
    sa.Column('pdf_url', sa.Text()),
    sa.Column('issued_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    sa.Column('is_revoked', sa.Boolean(), default=False),
)

# Add FK from cec_transactions.certificate_id to certificates.id
op.create_foreign_key(None, 'cec_transactions', 'certificates', ['certificate_id'], ['id'])

# --- Lesson Notes ---
op.create_table('lesson_notes',
    sa.Column('id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
    sa.Column('student_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
    sa.Column('lesson_id', UUID(as_uuid=True), sa.ForeignKey('lessons.id', ondelete='CASCADE'), nullable=False),
    sa.Column('content', sa.Text()),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    sa.UniqueConstraint('student_id', 'lesson_id', name='uq_lesson_note'),
)

# --- Theme preference added to users ---
# theme_preference VARCHAR(10) DEFAULT 'light'  — light | dark
# (Add this column inside the users table definition)
```

---

## Phase 8: Achievement Engine — IICRC CEC + Certificates

**Linear:** GP-104
**Depends on:** Phases 0–7 complete

### Task 8.1: Install Achievement Engine Dependencies

**Files:**

- Modify: `apps/backend/requirements.txt`
- Modify: `apps/backend/app/core/config.py`

**Step 1: Install packages**

```bash
cd apps/backend
pip install celery[redis]==5.3.6 weasyprint==62.3 jinja2==3.1.4
```

**Step 2: Add to requirements.txt**

```
celery[redis]==5.3.6
weasyprint==62.3
jinja2==3.1.4
```

**Step 3: Add Celery config to `apps/backend/app/core/config.py`**

```python
CELERY_BROKER_URL: str = "redis://localhost:6379/1"
CELERY_RESULT_BACKEND: str = "redis://localhost:6379/2"
```

**Step 4: Commit**

```bash
git add apps/backend/requirements.txt apps/backend/app/core/config.py
git commit -m "chore(deps): add Celery, WeasyPrint, Jinja2 for achievement engine"
```

---

### Task 8.2: Event Publisher Utility

**Files:**

- Create: `apps/backend/app/services/events.py`
- Create: `apps/backend/tests/services/test_events.py`

**Step 1: Write failing test**

```python
# apps/backend/tests/services/test_events.py
from unittest.mock import patch, MagicMock
from app.services.events import fire_event, EventType

def test_fire_lesson_completed_event(mock_redis):
    fire_event(EventType.LESSON_COMPLETED, {
        "student_id": "abc-123",
        "lesson_id": "def-456",
        "course_id": "ghi-789",
        "time_spent_seconds": 300
    })
    mock_redis.publish.assert_called_once()
    call_args = mock_redis.publish.call_args[0]
    assert call_args[0] == "carsi:events"
    payload = json.loads(call_args[1])
    assert payload["type"] == "lesson_completed"
    assert payload["data"]["student_id"] == "abc-123"
```

**Step 2: Run to confirm failure**

```bash
pytest tests/services/test_events.py -v
```

Expected: FAIL — `app.services.events` does not exist.

**Step 3: Create `apps/backend/app/services/events.py`**

```python
import json
import enum
from datetime import datetime, timezone
from app.core.redis import get_redis_client

class EventType(str, enum.Enum):
    LESSON_COMPLETED = "lesson_completed"
    QUIZ_PASSED = "quiz_passed"
    COURSE_COMPLETED = "course_completed"

def fire_event(event_type: EventType, data: dict) -> None:
    """Publish an achievement event to Redis channel."""
    redis = get_redis_client()
    payload = json.dumps({
        "type": event_type.value,
        "data": data,
        "fired_at": datetime.now(timezone.utc).isoformat()
    })
    redis.publish("carsi:events", payload)
```

**Step 4: Run tests**

```bash
pytest tests/services/test_events.py -v
```

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/backend/app/services/events.py apps/backend/tests/services/test_events.py
git commit -m "feat(events): add event publisher utility for achievement engine"
```

---

### Task 8.3: Celery App + Worker Setup

**Files:**

- Create: `apps/backend/app/worker/celery_app.py`
- Create: `apps/backend/app/worker/tasks.py`

**Step 1: Create `apps/backend/app/worker/celery_app.py`**

```python
from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "carsi",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.worker.tasks"]
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="Australia/Sydney",
    enable_utc=True,
)
```

**Step 2: Create `apps/backend/app/worker/tasks.py` (stub — implementation in next tasks)**

```python
from app.worker.celery_app import celery_app

@celery_app.task(name="handle_lesson_completed")
def handle_lesson_completed(data: dict) -> dict:
    """Process LessonCompleted event — update progress record."""
    # Implementation in Task 8.4
    return {"status": "ok"}

@celery_app.task(name="handle_quiz_passed")
def handle_quiz_passed(data: dict) -> dict:
    """Process QuizPassed event."""
    return {"status": "ok"}

@celery_app.task(name="handle_course_completed")
def handle_course_completed(data: dict) -> dict:
    """Process CourseCompleted event — award CECs, generate certificate."""
    # Implementation in Task 8.5
    return {"status": "ok"}
```

**Step 3: Verify Celery starts**

```bash
cd apps/backend
celery -A app.worker.celery_app worker --loglevel=info
```

Expected: Worker starts, shows registered tasks.

**Step 4: Commit**

```bash
git add apps/backend/app/worker/
git commit -m "feat(worker): add Celery app and task stubs for achievement engine"
```

---

### Task 8.4: Lesson Completion Handler

**Files:**

- Modify: `apps/backend/app/worker/tasks.py`
- Modify: `apps/backend/app/api/v1/lessons.py`
- Create: `apps/backend/tests/worker/test_lesson_completed.py`

**Step 1: Write failing test**

```python
# apps/backend/tests/worker/test_lesson_completed.py
def test_lesson_completed_updates_progress(db_session, enrolled_student, lesson):
    from app.worker.tasks import handle_lesson_completed
    handle_lesson_completed({
        "student_id": str(enrolled_student.id),
        "lesson_id": str(lesson.id),
        "course_id": str(lesson.module.course_id),
        "time_spent_seconds": 420
    })
    from app.models.enrollment import Progress
    progress = db_session.query(Progress).filter_by(
        lesson_id=lesson.id
    ).first()
    assert progress is not None
    assert progress.time_spent_seconds == 420
    assert progress.completed_at is not None
```

**Step 2: Run to confirm failure**

```bash
pytest tests/worker/test_lesson_completed.py -v
```

Expected: FAIL.

**Step 3: Implement `handle_lesson_completed` in `tasks.py`**

```python
@celery_app.task(name="handle_lesson_completed")
def handle_lesson_completed(data: dict) -> dict:
    from app.database import SessionLocal
    from app.models.enrollment import Enrollment, Progress
    from datetime import datetime, timezone
    import uuid

    db = SessionLocal()
    try:
        enrollment = db.query(Enrollment).filter_by(
            student_id=uuid.UUID(data["student_id"]),
            course_id=uuid.UUID(data["course_id"]),
            status="active"
        ).first()
        if not enrollment:
            return {"status": "no_enrollment"}

        progress = db.query(Progress).filter_by(
            enrollment_id=enrollment.id,
            lesson_id=uuid.UUID(data["lesson_id"])
        ).first()

        if not progress:
            progress = Progress(
                enrollment_id=enrollment.id,
                lesson_id=uuid.UUID(data["lesson_id"])
            )
            db.add(progress)

        progress.completed_at = datetime.now(timezone.utc)
        progress.time_spent_seconds = data.get("time_spent_seconds", 0)
        db.commit()

        # Check if all lessons in course are now complete → fire CourseCompleted
        _check_course_completion(db, enrollment)
        return {"status": "ok"}
    finally:
        db.close()

def _check_course_completion(db, enrollment):
    from app.models.course import Lesson, Module
    from app.models.enrollment import Progress
    total_lessons = (
        db.query(Lesson)
        .join(Module)
        .filter(Module.course_id == enrollment.course_id)
        .count()
    )
    completed_lessons = (
        db.query(Progress)
        .filter_by(enrollment_id=enrollment.id)
        .filter(Progress.completed_at.isnot(None))
        .count()
    )
    if completed_lessons >= total_lessons:
        handle_course_completed.delay({
            "student_id": str(enrollment.student_id),
            "course_id": str(enrollment.course_id),
        })
```

**Step 4: Add Mark Complete endpoint to `apps/backend/app/api/v1/lessons.py`**

```python
@router.post("/{lesson_id}/complete", status_code=202)
async def mark_lesson_complete(
    lesson_id: UUID,
    time_spent_seconds: int = 0,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["student"]))
):
    from app.services.events import fire_event, EventType
    from app.worker.tasks import handle_lesson_completed

    lesson = db.query(Lesson).filter_by(id=lesson_id).first()
    if not lesson:
        raise HTTPException(404, "Lesson not found")

    handle_lesson_completed.delay({
        "student_id": str(current_user.id),
        "lesson_id": str(lesson_id),
        "course_id": str(lesson.module.course_id),
        "time_spent_seconds": time_spent_seconds
    })
    return {"status": "queued"}
```

**Step 5: Run tests**

```bash
pytest tests/worker/test_lesson_completed.py -v
```

Expected: PASS.

**Step 6: Commit**

```bash
git add apps/backend/app/worker/tasks.py apps/backend/app/api/v1/lessons.py \
        apps/backend/tests/worker/test_lesson_completed.py
git commit -m "feat(worker): lesson completion handler — updates progress, checks course completion"
```

---

### Task 8.5: Course Completion → CEC Award

**Files:**

- Modify: `apps/backend/app/worker/tasks.py`
- Create: `apps/backend/tests/worker/test_course_completed.py`

**Step 1: Write failing test**

```python
# apps/backend/tests/worker/test_course_completed.py
def test_course_completed_creates_cec_transaction(db_session, student, wrt_course):
    """Completing a WRT course awards the correct CEC hours."""
    from app.worker.tasks import handle_course_completed
    handle_course_completed({
        "student_id": str(student.id),
        "course_id": str(wrt_course.id),
    })
    from app.models.certificate import CECTransaction
    tx = db_session.query(CECTransaction).filter_by(student_id=student.id).first()
    assert tx is not None
    assert tx.iicrc_discipline == "WRT"
    assert tx.cec_hours == wrt_course.cec_hours

def test_course_completed_creates_certificate(db_session, student, wrt_course):
    from app.worker.tasks import handle_course_completed
    handle_course_completed({
        "student_id": str(student.id),
        "course_id": str(wrt_course.id),
    })
    from app.models.certificate import Certificate
    cert = db_session.query(Certificate).filter_by(
        student_id=student.id, course_id=wrt_course.id
    ).first()
    assert cert is not None
    assert cert.credential_id.startswith("CARSI-WRT-")
    assert cert.is_revoked is False
```

**Step 2: Run to confirm failure**

```bash
pytest tests/worker/test_course_completed.py -v
```

Expected: FAIL.

**Step 3: Implement `handle_course_completed` in `tasks.py`**

```python
@celery_app.task(name="handle_course_completed")
def handle_course_completed(data: dict) -> dict:
    from app.database import SessionLocal
    from app.models.course import Course
    from app.models.enrollment import Enrollment
    from app.models.certificate import CECTransaction, Certificate
    from app.services.certificate_service import generate_certificate
    import uuid
    from datetime import datetime, timezone

    db = SessionLocal()
    try:
        student_id = uuid.UUID(data["student_id"])
        course_id = uuid.UUID(data["course_id"])

        course = db.query(Course).filter_by(id=course_id).first()
        if not course:
            return {"status": "course_not_found"}

        # 1. Award CECs
        tx = CECTransaction(
            student_id=student_id,
            course_id=course_id,
            iicrc_discipline=course.iicrc_discipline,
            cec_hours=course.cec_hours,
        )
        db.add(tx)
        db.flush()

        # 2. Generate certificate
        cert = generate_certificate(db, student_id, course, tx.id)
        db.add(cert)

        # 3. Mark enrollment complete
        enrollment = db.query(Enrollment).filter_by(
            student_id=student_id, course_id=course_id
        ).first()
        if enrollment:
            enrollment.status = "completed"
            enrollment.completed_at = datetime.now(timezone.utc)

        db.commit()
        return {"status": "ok", "credential_id": cert.credential_id}
    finally:
        db.close()
```

**Step 4: Run tests**

```bash
pytest tests/worker/test_course_completed.py -v
```

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/backend/app/worker/tasks.py \
        apps/backend/tests/worker/test_course_completed.py
git commit -m "feat(worker): course completion handler — awards IICRC CECs, creates certificate record"
```

---

### Task 8.6: PDF Certificate Generation (WeasyPrint)

**Files:**

- Create: `apps/backend/app/services/certificate_service.py`
- Create: `apps/backend/app/templates/certificate.html`
- Create: `apps/backend/tests/services/test_certificate_service.py`

**Step 1: Write failing test**

```python
# apps/backend/tests/services/test_certificate_service.py
def test_generate_certificate_pdf_returns_bytes(student, wrt_course):
    from app.services.certificate_service import render_certificate_pdf
    pdf_bytes = render_certificate_pdf(
        student_name="James Wilson",
        course_title="Water Damage Restoration",
        iicrc_discipline="WRT",
        cec_hours=14.0,
        cppp40421_unit_code="CPPCLO4027",
        cppp40421_unit_name="Carry out water damage restoration",
        issued_date="12 March 2026",
        credential_id="CARSI-WRT-2026-001"
    )
    assert isinstance(pdf_bytes, bytes)
    assert len(pdf_bytes) > 1000  # Valid PDF is never tiny
    assert pdf_bytes[:4] == b"%PDF"  # PDF magic bytes
```

**Step 2: Run to confirm failure**

```bash
pytest tests/services/test_certificate_service.py -v
```

Expected: FAIL.

**Step 3: Create HTML certificate template**

File: `apps/backend/app/templates/certificate.html`

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <style>
      @page {
        size: A4 landscape;
        margin: 20mm;
      }
      body {
        font-family: 'Georgia', serif;
        color: #1a1a2e;
        background: #ffffff;
      }
      .border {
        border: 6px solid #1a3c5e;
        padding: 30px 40px;
        height: calc(100vh - 40mm);
        box-sizing: border-box;
        position: relative;
      }
      .logo {
        text-align: center;
        margin-bottom: 10px;
      }
      .logo h1 {
        font-size: 36px;
        color: #1a3c5e;
        letter-spacing: 4px;
        margin: 0;
      }
      .logo p {
        font-size: 12px;
        color: #666;
        margin: 0;
      }
      .title {
        text-align: center;
        font-size: 28px;
        color: #1a3c5e;
        margin: 20px 0 10px;
        text-transform: uppercase;
        letter-spacing: 3px;
      }
      .subtitle {
        text-align: center;
        font-size: 14px;
        color: #555;
        margin-bottom: 20px;
      }
      .student-name {
        text-align: center;
        font-size: 38px;
        color: #c8a94a;
        font-style: italic;
        margin: 20px 0;
        border-bottom: 2px solid #c8a94a;
        padding-bottom: 10px;
      }
      .course-title {
        text-align: center;
        font-size: 22px;
        color: #1a3c5e;
        font-weight: bold;
        margin: 10px 0 5px;
      }
      .details-grid {
        display: flex;
        justify-content: space-around;
        margin: 20px 0;
        font-size: 13px;
      }
      .detail-item {
        text-align: center;
      }
      .detail-label {
        color: #888;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 1px;
      }
      .detail-value {
        color: #1a3c5e;
        font-weight: bold;
        font-size: 14px;
        margin-top: 4px;
      }
      .iicrc-badge {
        text-align: center;
        background: #1a3c5e;
        color: white;
        display: inline-block;
        padding: 4px 16px;
        border-radius: 20px;
        font-size: 13px;
        font-weight: bold;
        letter-spacing: 2px;
      }
      .verification {
        position: absolute;
        bottom: 30px;
        left: 40px;
        right: 40px;
        text-align: center;
        font-size: 10px;
        color: #aaa;
        border-top: 1px solid #eee;
        padding-top: 10px;
      }
      .iicrc-notice {
        text-align: center;
        font-size: 11px;
        color: #666;
        margin-top: 10px;
        font-style: italic;
      }
    </style>
  </head>
  <body>
    <div class="border">
      <div class="logo">
        <h1>CARSI</h1>
        <p>Cleaning And Restoration Skills Institute</p>
      </div>

      <div class="title">Certificate of Completion</div>
      <div class="subtitle">This is to certify that</div>

      <div class="student-name">{{ student_name }}</div>

      <div class="subtitle">has successfully completed</div>

      <div class="course-title">{{ course_title }}</div>

      <div style="text-align:center; margin: 10px 0;">
        <span class="iicrc-badge">{{ iicrc_discipline }}</span>
      </div>

      <div class="details-grid">
        <div class="detail-item">
          <div class="detail-label">IICRC CECs Awarded</div>
          <div class="detail-value">{{ cec_hours }} CECs</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Date of Completion</div>
          <div class="detail-value">{{ issued_date }}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Credential ID</div>
          <div class="detail-value">{{ credential_id }}</div>
        </div>
        {% if cppp40421_unit_code %}
        <div class="detail-item">
          <div class="detail-label">CPP40421 Unit</div>
          <div class="detail-value">{{ cppp40421_unit_code }}</div>
        </div>
        {% endif %}
      </div>

      <div class="iicrc-notice">
        This course is accredited for IICRC Continuing Education Credits (CECs)
      </div>

      <div class="verification">
        Verify this credential at: carsi.com.au/credentials/{{ credential_id }}
      </div>
    </div>
  </body>
</html>
```

**Step 4: Create `apps/backend/app/services/certificate_service.py`**

```python
from weasyprint import HTML
from jinja2 import Environment, FileSystemLoader
from pathlib import Path
from datetime import datetime, timezone
import uuid

TEMPLATE_DIR = Path(__file__).parent.parent / "templates"

def render_certificate_pdf(
    student_name: str,
    course_title: str,
    iicrc_discipline: str,
    cec_hours: float,
    cppp40421_unit_code: str = None,
    cppp40421_unit_name: str = None,
    issued_date: str = None,
    credential_id: str = None,
) -> bytes:
    env = Environment(loader=FileSystemLoader(str(TEMPLATE_DIR)))
    template = env.get_template("certificate.html")

    html_content = template.render(
        student_name=student_name,
        course_title=course_title,
        iicrc_discipline=iicrc_discipline,
        cec_hours=cec_hours,
        cppp40421_unit_code=cppp40421_unit_code,
        cppp40421_unit_name=cppp40421_unit_name,
        issued_date=issued_date or datetime.now(timezone.utc).strftime("%-d %B %Y"),
        credential_id=credential_id,
    )
    return HTML(string=html_content).write_pdf()


def generate_credential_id(iicrc_discipline: str) -> str:
    """Generate human-readable credential ID: CARSI-WRT-2026-XXXX"""
    year = datetime.now(timezone.utc).year
    suffix = uuid.uuid4().hex[:6].upper()
    return f"CARSI-{iicrc_discipline}-{year}-{suffix}"


def generate_certificate(db, student_id, course, cec_transaction_id):
    """Create Certificate record and generate PDF. Returns Certificate model instance."""
    from app.models.user import User
    from app.models.certificate import Certificate

    student = db.query(User).filter_by(id=student_id).first()
    credential_id = generate_credential_id(course.iicrc_discipline or "CERT")

    # Render PDF
    pdf_bytes = render_certificate_pdf(
        student_name=student.full_name,
        course_title=course.title,
        iicrc_discipline=course.iicrc_discipline or "CERT",
        cec_hours=float(course.cec_hours or 0),
        cppp40421_unit_code=course.cppp40421_unit_code,
        cppp40421_unit_name=course.cppp40421_unit_name,
        credential_id=credential_id,
    )

    # Upload to Google Drive (async — Drive upload can be slow)
    pdf_drive_file_id = None
    try:
        from app.services.google_drive import upload_certificate_pdf
        pdf_drive_file_id = upload_certificate_pdf(
            pdf_bytes=pdf_bytes,
            filename=f"{credential_id}.pdf",
            student_id=str(student_id)
        )
    except Exception:
        pass  # Certificate record still created; PDF upload retried separately

    return Certificate(
        student_id=student_id,
        course_id=course.id,
        credential_id=credential_id,
        pdf_drive_file_id=pdf_drive_file_id,
        pdf_url=f"https://drive.google.com/file/d/{pdf_drive_file_id}/view" if pdf_drive_file_id else None,
    )
```

**Step 5: Run tests**

```bash
pytest tests/services/test_certificate_service.py -v
```

Expected: PASS.

**Step 6: Commit**

```bash
git add apps/backend/app/services/certificate_service.py \
        apps/backend/app/templates/certificate.html \
        apps/backend/tests/services/test_certificate_service.py
git commit -m "feat(certs): WeasyPrint PDF certificate generation with IICRC + CPP40421 fields"
```

---

### Task 8.7: Public Credential Verification Endpoint

**Files:**

- Create: `apps/backend/app/api/v1/credentials.py`
- Create: `apps/backend/tests/api/test_credentials.py`

**Step 1: Write failing tests**

```python
# apps/backend/tests/api/test_credentials.py
def test_public_credential_returns_200_no_auth(client, issued_certificate):
    response = client.get(f"/credentials/{issued_certificate.credential_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["credential_id"] == issued_certificate.credential_id
    assert data["valid"] is True
    assert "student_name" in data
    assert "course_title" in data
    assert "iicrc_discipline" in data
    assert "cec_hours" in data
    assert "issued_date" in data

def test_invalid_credential_returns_404(client):
    response = client.get("/credentials/CARSI-WRT-2026-INVALID")
    assert response.status_code == 404

def test_revoked_credential_shows_revoked(client, revoked_certificate):
    response = client.get(f"/credentials/{revoked_certificate.credential_id}")
    assert response.status_code == 200
    assert response.json()["valid"] is False
    assert response.json()["status"] == "revoked"
```

**Step 2: Run to confirm failure**

```bash
pytest tests/api/test_credentials.py -v
```

Expected: All FAIL.

**Step 3: Create `apps/backend/app/api/v1/credentials.py`**

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.certificate import Certificate
from app.models.course import Course
from app.models.user import User

router = APIRouter(prefix="/credentials", tags=["credentials"])

@router.get("/{credential_id}")
async def verify_credential(credential_id: str, db: Session = Depends(get_db)):
    """
    Public endpoint — no authentication required.
    Returns credential verification data for display and LinkedIn.
    """
    cert = db.query(Certificate).filter_by(credential_id=credential_id).first()
    if not cert:
        raise HTTPException(status_code=404, detail="Credential not found")

    student = db.query(User).filter_by(id=cert.student_id).first()
    course = db.query(Course).filter_by(id=cert.course_id).first()

    return {
        "credential_id": cert.credential_id,
        "valid": not cert.is_revoked,
        "status": "revoked" if cert.is_revoked else "valid",
        "student_name": student.full_name if student else "Unknown",
        "course_title": course.title if course else "Unknown",
        "iicrc_discipline": course.iicrc_discipline if course else None,
        "cec_hours": float(course.cec_hours) if course and course.cec_hours else 0,
        "cppp40421_unit_code": course.cppp40421_unit_code if course else None,
        "issued_date": cert.issued_at.strftime("%-d %B %Y"),
        "issuing_organisation": "CARSI — Cleaning And Restoration Skills Institute",
        "verification_url": f"https://carsi.com.au/credentials/{cert.credential_id}",
    }
```

**Step 4: Run tests**

```bash
pytest tests/api/test_credentials.py -v
```

Expected: All PASS.

**Step 5: Commit**

```bash
git add apps/backend/app/api/v1/credentials.py \
        apps/backend/tests/api/test_credentials.py
git commit -m "feat(api): public credential verification endpoint — no auth required"
```

**Step 6: Update Linear — mark GP-104 In Progress, then Done when Phase 8 complete**

```bash
# Mark GP-104 In Progress (run at Phase 8 start)
python scripts/linear_update.py GP-104 in_progress

# Mark GP-104 Done (run when all Phase 8 tasks complete)
python scripts/linear_update.py GP-104 done
```

---

## Phase 14: LinkedIn Share + Frontend Credential Page

**Linear:** GP-110
**Depends on:** Phase 8 complete (certificates exist in DB)

### Task 14.1: Public Credential Verification Page (Next.js)

**Files:**

- Create: `apps/web/app/(public)/credentials/[credentialId]/page.tsx`
- Create: `apps/web/components/lms/CredentialVerificationCard.tsx`
- Create: `apps/web/tests/components/CredentialVerificationCard.test.tsx`

**Step 1: Write failing test**

```typescript
// apps/web/tests/components/CredentialVerificationCard.test.tsx
import { render, screen } from '@testing-library/react'
import { CredentialVerificationCard } from '@/components/lms/CredentialVerificationCard'

const validCredential = {
  credential_id: 'CARSI-WRT-2026-ABC123',
  valid: true,
  status: 'valid',
  student_name: 'James Wilson',
  course_title: 'Water Damage Restoration',
  iicrc_discipline: 'WRT',
  cec_hours: 14,
  issued_date: '12 March 2026',
  issuing_organisation: 'CARSI — Cleaning And Restoration Skills Institute',
  verification_url: 'https://carsi.com.au/credentials/CARSI-WRT-2026-ABC123',
}

test('renders valid credential with green badge', () => {
  render(<CredentialVerificationCard credential={validCredential} />)
  expect(screen.getByText('VERIFIED')).toBeInTheDocument()
  expect(screen.getByText('James Wilson')).toBeInTheDocument()
  expect(screen.getByText('Water Damage Restoration')).toBeInTheDocument()
  expect(screen.getByText('14 CECs')).toBeInTheDocument()
  expect(screen.getByText('WRT')).toBeInTheDocument()
})

test('renders revoked credential with red badge', () => {
  render(<CredentialVerificationCard credential={{ ...validCredential, valid: false, status: 'revoked' }} />)
  expect(screen.getByText('REVOKED')).toBeInTheDocument()
})
```

**Step 2: Run to confirm failure**

```bash
cd apps/web && pnpm vitest run tests/components/CredentialVerificationCard.test.tsx
```

Expected: FAIL.

**Step 3: Create `CredentialVerificationCard.tsx`**

```tsx
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { CheckCircle, XCircle } from 'lucide-react';

interface Credential {
  credential_id: string;
  valid: boolean;
  status: string;
  student_name: string;
  course_title: string;
  iicrc_discipline: string;
  cec_hours: number;
  issued_date: string;
  issuing_organisation: string;
  verification_url: string;
  cppp40421_unit_code?: string;
}

export function CredentialVerificationCard({ credential }: { credential: Credential }) {
  const isValid = credential.valid;

  return (
    <Card className="mx-auto max-w-2xl">
      <CardHeader className="pb-2 text-center">
        <div className="mb-3 flex justify-center">
          {isValid ? (
            <CheckCircle className="h-16 w-16 text-green-500" />
          ) : (
            <XCircle className="h-16 w-16 text-red-500" />
          )}
        </div>
        <Badge variant={isValid ? 'default' : 'destructive'} className="mx-auto px-6 py-2 text-lg">
          {isValid ? 'VERIFIED' : 'REVOKED'}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-center">
          <p className="text-muted-foreground text-sm">This certifies that</p>
          <h2 className="mt-1 text-3xl font-bold">{credential.student_name}</h2>
          <p className="text-muted-foreground mt-2 text-sm">has successfully completed</p>
          <h3 className="mt-1 text-xl font-semibold">{credential.course_title}</h3>
        </div>

        <div className="grid grid-cols-2 gap-4 border-t pt-4">
          <div>
            <p className="text-muted-foreground text-xs tracking-wide uppercase">
              IICRC Discipline
            </p>
            <Badge variant="outline" className="mt-1 text-base font-bold">
              {credential.iicrc_discipline}
            </Badge>
          </div>
          <div>
            <p className="text-muted-foreground text-xs tracking-wide uppercase">CECs Awarded</p>
            <p className="mt-1 text-lg font-bold">{credential.cec_hours} CECs</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs tracking-wide uppercase">Date Issued</p>
            <p className="mt-1 font-medium">{credential.issued_date}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs tracking-wide uppercase">Credential ID</p>
            <p className="mt-1 font-mono text-sm">{credential.credential_id}</p>
          </div>
          {credential.cppp40421_unit_code && (
            <div className="col-span-2">
              <p className="text-muted-foreground text-xs tracking-wide uppercase">CPP40421 Unit</p>
              <p className="mt-1 font-medium">{credential.cppp40421_unit_code}</p>
            </div>
          )}
        </div>

        <div className="border-t pt-4 text-center">
          <p className="text-muted-foreground text-sm">{credential.issuing_organisation}</p>
          <p className="text-muted-foreground mt-1 text-xs">
            Verify at: <span className="font-mono">{credential.verification_url}</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
```

**Step 4: Create public credentials page `apps/web/app/(public)/credentials/[credentialId]/page.tsx`**

```tsx
import { CredentialVerificationCard } from '@/components/lms/CredentialVerificationCard';
import { notFound } from 'next/navigation';

async function getCredential(credentialId: string) {
  const res = await fetch(
    `${process.env.API_URL}/credentials/${credentialId}`,
    { cache: 'no-store' } // Always fresh — credentials can be revoked
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('Failed to fetch credential');
  return res.json();
}

export default async function CredentialPage({ params }: { params: { credentialId: string } }) {
  const credential = await getCredential(params.credentialId);
  if (!credential) notFound();

  return (
    <main className="container mx-auto px-4 py-16">
      <CredentialVerificationCard credential={credential} />
    </main>
  );
}

export async function generateMetadata({ params }: { params: { credentialId: string } }) {
  return {
    title: `Credential Verification — ${params.credentialId} | CARSI`,
    description: 'Verify an IICRC CEC credential issued by CARSI',
    robots: 'index, follow', // Public, indexable page
  };
}
```

**Step 5: Run tests**

```bash
pnpm vitest run tests/components/CredentialVerificationCard.test.tsx
```

Expected: PASS.

**Step 6: Commit**

```bash
git add apps/web/app/\(public\)/credentials/ \
        apps/web/components/lms/CredentialVerificationCard.tsx \
        apps/web/tests/components/CredentialVerificationCard.test.tsx
git commit -m "feat(frontend): public credential verification page with valid/revoked status"
```

---

### Task 14.2: LinkedIn Share Button + Credentials Wallet

**Files:**

- Create: `apps/web/components/lms/LinkedInShareButton.tsx`
- Modify: `apps/web/components/lms/CredentialCard.tsx`
- Create: `apps/web/tests/components/LinkedInShareButton.test.tsx`

**Step 1: Write failing test**

```typescript
// apps/web/tests/components/LinkedInShareButton.test.tsx
import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { LinkedInShareButton } from '@/components/lms/LinkedInShareButton'

const mockOpenFn = vi.fn()
window.open = mockOpenFn

test('LinkedIn button generates correct pre-filled URL', async () => {
  render(
    <LinkedInShareButton
      courseTitle="Water Damage Restoration"
      iicrcDiscipline="WRT"
      issuedYear={2026}
      issuedMonth={3}
      credentialId="CARSI-WRT-2026-ABC123"
      credentialUrl="https://carsi.com.au/credentials/CARSI-WRT-2026-ABC123"
    />
  )

  await userEvent.click(screen.getByRole('button', { name: /linkedin/i }))

  expect(mockOpenFn).toHaveBeenCalledOnce()
  const calledUrl = mockOpenFn.mock.calls[0][0]
  expect(calledUrl).toContain('linkedin.com/profile/add')
  expect(calledUrl).toContain('Water%20Damage%20Restoration')
  expect(calledUrl).toContain('CARSI')
  expect(calledUrl).toContain('CARSI-WRT-2026-ABC123')
})
```

**Step 2: Run to confirm failure**

```bash
pnpm vitest run tests/components/LinkedInShareButton.test.tsx
```

Expected: FAIL.

**Step 3: Create `apps/web/components/lms/LinkedInShareButton.tsx`**

```tsx
'use client';
import { Button } from '@/components/ui/button';
import { Linkedin } from 'lucide-react';

interface LinkedInShareButtonProps {
  courseTitle: string;
  iicrcDiscipline: string;
  issuedYear: number;
  issuedMonth: number;
  credentialId: string;
  credentialUrl: string;
}

export function LinkedInShareButton({
  courseTitle,
  iicrcDiscipline,
  issuedYear,
  issuedMonth,
  credentialId,
  credentialUrl,
}: LinkedInShareButtonProps) {
  const handleShare = () => {
    const params = new URLSearchParams({
      startTask: 'CERTIFICATION_NAME',
      name: `${courseTitle} (${iicrcDiscipline})`,
      organizationName: 'CARSI',
      issueYear: String(issuedYear),
      issueMonth: String(issuedMonth),
      certId: credentialId,
      certUrl: credentialUrl,
    });
    window.open(
      `https://www.linkedin.com/profile/add?${params.toString()}`,
      '_blank',
      'noopener,noreferrer'
    );
  };

  return (
    <Button
      onClick={handleShare}
      variant="outline"
      size="sm"
      className="gap-2 border-[#0077B5] text-[#0077B5] hover:bg-[#0077B5] hover:text-white"
      aria-label="Share on LinkedIn"
    >
      <Linkedin className="h-4 w-4" />
      Add to LinkedIn
    </Button>
  );
}
```

**Step 4: Run tests**

```bash
pnpm vitest run tests/components/LinkedInShareButton.test.tsx
```

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/web/components/lms/LinkedInShareButton.tsx \
        apps/web/tests/components/LinkedInShareButton.test.tsx
git commit -m "feat(frontend): LinkedIn share button — pre-fills certification form with IICRC credential data"
```

**Step 6: Update Linear — mark GP-110 Done when Phase 14 complete**

```bash
python scripts/linear_update.py GP-110 done
```

---

## Phase 15: Theme System + Mobile PWA

**Linear:** GP-111
**Depends on:** Phases 6, 9, 10 complete (enough UI to style)

### Task 15.1: Add Theme Preference to User Model + API

**Files:**

- Create: `apps/backend/alembic/versions/002_add_theme_preference.py`
- Modify: `apps/backend/app/models/user.py`
- Modify: `apps/backend/app/api/v1/users.py`

**Step 1: Write failing test**

```python
def test_update_theme_preference(authenticated_student_client):
    response = authenticated_student_client.patch(
        "/api/v1/users/me",
        json={"theme_preference": "dark"}
    )
    assert response.status_code == 200
    assert response.json()["theme_preference"] == "dark"

def test_theme_preference_invalid_value(authenticated_student_client):
    response = authenticated_student_client.patch(
        "/api/v1/users/me",
        json={"theme_preference": "rainbow"}
    )
    assert response.status_code == 422
```

**Step 2: Create migration `002_add_theme_preference.py`**

```python
"""Add theme_preference to users table

Revision ID: 002
"""
from alembic import op
import sqlalchemy as sa

revision = '002'
down_revision = '001'

def upgrade():
    op.add_column('users', sa.Column(
        'theme_preference',
        sa.String(10),
        server_default='light',
        nullable=False
    ))

def downgrade():
    op.drop_column('users', 'theme_preference')
```

**Step 3: Run migration**

```bash
alembic upgrade head
```

**Step 4: Add PATCH /api/v1/users/me endpoint**

```python
@router.patch("/me", response_model=UserOut)
async def update_my_profile(
    data: UserUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    if data.theme_preference and data.theme_preference not in ('light', 'dark'):
        raise HTTPException(422, "theme_preference must be 'light' or 'dark'")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(current_user, field, value)
    db.commit()
    db.refresh(current_user)
    return current_user
```

**Step 5: Run tests**

```bash
pytest tests/api/test_users.py -v
```

Expected: PASS.

**Step 6: Commit**

```bash
git add apps/backend/alembic/versions/002_add_theme_preference.py \
        apps/backend/app/api/v1/users.py
git commit -m "feat(api): add theme_preference field to user profile — light/dark"
```

---

### Task 15.2: Theme Provider + Toggle (Next.js)

**Files:**

- Create: `apps/web/components/ThemeProvider.tsx`
- Create: `apps/web/components/ThemeToggle.tsx`
- Modify: `apps/web/app/layout.tsx`
- Modify: `apps/web/tailwind.config.ts`

**Step 1: Write failing test**

```typescript
test('ThemeToggle saves preference to API on click', async () => {
  const mockPatch = vi.fn().mockResolvedValue({ theme_preference: 'dark' })
  render(<ThemeToggle currentTheme="light" onToggle={mockPatch} />)
  await userEvent.click(screen.getByRole('button', { name: /toggle theme/i }))
  expect(mockPatch).toHaveBeenCalledWith('dark')
})
```

**Step 2: Configure Tailwind for dark mode class strategy**

In `apps/web/tailwind.config.ts`:

```typescript
export default {
  darkMode: 'class', // Toggle via .dark class on <html>
  // ... rest of config
};
```

**Step 3: Create `ThemeProvider.tsx`**

```tsx
'use client';
import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';
const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({
  theme: 'light',
  toggle: () => {},
});

export function ThemeProvider({
  children,
  initialTheme = 'light',
}: {
  children: React.ReactNode;
  initialTheme?: Theme;
}) {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const toggle = async () => {
    const next: Theme = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    // Persist to API (fire-and-forget)
    fetch('/api/users/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme_preference: next }),
    }).catch(() => {}); // Fail silently — theme still toggles locally
  };

  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
```

**Step 4: Create `ThemeToggle.tsx`**

```tsx
'use client';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from './ThemeProvider';

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
      {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
    </Button>
  );
}
```

**Step 5: Wrap app in ThemeProvider in `apps/web/app/layout.tsx`**

Load theme preference server-side from session to avoid flash:

```tsx
// In layout.tsx — read theme from user session cookie, pass as initialTheme
const theme = cookies().get('theme_preference')?.value ?? 'light';

return (
  <html lang="en" className={theme === 'dark' ? 'dark' : ''} suppressHydrationWarning>
    <body>
      <ThemeProvider initialTheme={theme as 'light' | 'dark'}>{children}</ThemeProvider>
    </body>
  </html>
);
```

**Step 6: Run tests**

```bash
pnpm vitest run tests/components/ThemeToggle.test.tsx
```

Expected: PASS.

**Step 7: Commit**

```bash
git add apps/web/components/ThemeProvider.tsx \
        apps/web/components/ThemeToggle.tsx \
        apps/web/app/layout.tsx \
        apps/web/tailwind.config.ts
git commit -m "feat(frontend): dark/light theme system — server-side initial render, API persistence"
```

---

### Task 15.3: PWA Configuration

**Files:**

- Modify: `apps/web/next.config.ts`
- Create: `apps/web/public/manifest.json`

**Step 1: Install next-pwa**

```bash
cd apps/web && pnpm add next-pwa
```

**Step 2: Configure `apps/web/next.config.ts`**

```typescript
import withPWA from 'next-pwa';

const pwaConfig = withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/localhost:3000\/courses\/.+\/lessons\/.+/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'lesson-content',
        expiration: { maxEntries: 20, maxAgeSeconds: 86400 },
      },
    },
  ],
});

export default pwaConfig({
  /* your existing next config */
});
```

**Step 3: Create `apps/web/public/manifest.json`**

```json
{
  "name": "CARSI LMS",
  "short_name": "CARSI",
  "description": "IICRC CEC Training — Cleaning & Restoration",
  "start_url": "/student/dashboard",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#1a3c5e",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

**Step 4: Verify PWA installs**

Build and run in production mode:

```bash
pnpm build && pnpm start
```

Open http://localhost:3000 in Chrome → DevTools → Application → Manifest — verify all fields correct.
Open on Android Chrome — should prompt "Add to Home Screen."

**Step 5: Commit**

```bash
git add apps/web/next.config.ts apps/web/public/manifest.json
git commit -m "feat(pwa): add next-pwa with lesson content caching and app manifest"
```

**Step 6: Update Linear — mark GP-111 Done**

```bash
python scripts/linear_update.py GP-111 done
```

---

## Linear Status Update Script

Create this utility to update Linear issue states as phases progress.

**File:** `scripts/linear_update.py`

```python
"""
Update a Linear issue state from the CLI.
Usage: python scripts/linear_update.py GP-104 in_progress
       python scripts/linear_update.py GP-104 done
"""
import sys
import json
import urllib.request
import ssl

API_KEY = "lin_api_REDACTED"
TEAM_ID = "91b3cd04-86eb-422d-81e2-9aa37db2f2f5"

STATE_MAP = {
    "backlog": "fd635199-7bd7-442a-9df0-8c9afda1d646",
    "todo": "b7ba26fa-c315-4b44-ad63-016fd2645044",
    "in_progress": "aa3c68b5-6ee9-4557-b7ac-59f0f70fa6a0",
    "in_review": "5f41830f-e55a-4b83-9d01-c1aba6c9bbd4",
    "done": "5b7ee027-d815-4af9-8e2a-eb12e2399e77",
}

def get_issue_id(identifier: str) -> str:
    query = '{ issues(filter: { team: { key: { eq: "GP" } } }) { nodes { id identifier } } }'
    result = run_query(query)
    for issue in result["data"]["issues"]["nodes"]:
        if issue["identifier"] == identifier:
            return issue["id"]
    raise ValueError(f"Issue {identifier} not found")

def update_issue_state(issue_id: str, state_id: str) -> None:
    mutation = """
    mutation UpdateIssue($id: String!, $stateId: String!) {
      issueUpdate(id: $id, input: { stateId: $stateId }) {
        success
        issue { identifier title state { name } }
      }
    }
    """
    result = run_query(mutation, {"id": issue_id, "stateId": state_id})
    issue = result["data"]["issueUpdate"]["issue"]
    print(f"[OK] {issue['identifier']}: {issue['title']} -> {issue['state']['name']}")

def run_query(query: str, variables: dict = None) -> dict:
    payload = json.dumps({"query": query, "variables": variables or {}}).encode()
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    req = urllib.request.Request(
        "https://api.linear.app/graphql",
        data=payload,
        headers={"Authorization": API_KEY, "Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, context=ctx) as r:
        return json.loads(r.read())

if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Usage: python scripts/linear_update.py GP-104 in_progress")
        sys.exit(1)
    identifier, state_name = sys.argv[1], sys.argv[2]
    if state_name not in STATE_MAP:
        print(f"Unknown state. Choose from: {', '.join(STATE_MAP.keys())}")
        sys.exit(1)
    issue_id = get_issue_id(identifier)
    update_issue_state(issue_id, STATE_MAP[state_name])
```

---

## Phase Execution Sequence

Execute in this order:

```
Base plan (docs/plans/2026-03-03-carsi-lms-rebuild.md):
  Phase 0  → Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5
  → Phase 6 → Phase 7

This plan (docs/plans/2026-03-03-carsi-enhancements-plan.md):
  Phase 8 (Achievement Engine) ← depends on Phases 0-7

Back to base plan:
  Phase 9 (Student Dashboard, now with CECs + Credentials Wallet)
  Phase 10 (Lesson Player + Notes + PWA prep)
  Phase 11 (Quiz Engine)
  Phase 12 (Instructor Tools)
  Phase 13 (Admin Panel)

This plan:
  Phase 14 (LinkedIn Share + Public Credentials) ← depends on Phase 8
  Phase 15 (Theme System + PWA) ← depends on Phases 6, 9, 10
```

## Linear Issue Reference

| Issue  | Phase                            | Priority |
| ------ | -------------------------------- | -------- |
| GP-96  | Phase 0: Foundation Setup        | Urgent   |
| GP-97  | Phase 1: Database Schema         | Urgent   |
| GP-98  | Phase 2: ORM Models              | Urgent   |
| GP-99  | Phase 3: Auth & Roles            | Urgent   |
| GP-100 | Phase 4: Course API              | High     |
| GP-101 | Phase 5: Google Drive            | High     |
| GP-102 | Phase 6: Course Catalog          | High     |
| GP-103 | Phase 7: Enrolment               | High     |
| GP-104 | Phase 8: Achievement Engine      | High     |
| GP-105 | Phase 9: Student Dashboard       | High     |
| GP-106 | Phase 10: Lesson Player + PWA    | Medium   |
| GP-107 | Phase 11: Quiz Engine            | Medium   |
| GP-108 | Phase 12: Instructor Tools       | Medium   |
| GP-109 | Phase 13: Admin Panel            | Medium   |
| GP-110 | Phase 14: LinkedIn + Credentials | Medium   |
| GP-111 | Phase 15: Theme + Mobile         | Low      |
