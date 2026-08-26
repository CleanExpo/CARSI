# Gamification, Subscription & IICRC CEC Reporting — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build professional identity gamification (XP/levels/streaks/leaderboard), $795 AUD/year Stripe subscription with 7-day free trial, and automated IICRC CEC email reporting on course completion.

**Architecture:** Three interconnected features all rooted in course completion events. XP is awarded by a Celery task triggered on `LESSON_COMPLETED` and `COURSE_COMPLETED`. Subscriptions gate course access via a FastAPI dependency. CEC reports are sent by a Celery task triggered on `COURSE_COMPLETED` when the student has an IICRC member number.

**Tech Stack:** FastAPI, SQLAlchemy 2.0, Alembic, Celery + Redis, Stripe Python SDK, smtplib (Mailpit dev / Resend prod), Next.js 15, shadcn/ui, Tailwind CSS v4.

**Design doc:** `docs/plans/2026-03-04-gamification-subscription-iicrc-design.md`

**Dev Servers:** Frontend `localhost:3009` | Backend `localhost:8000` | Mailpit UI `localhost:8025`

---

## Phase A: Database

### Task 1: Alembic migration 003 — gamification + subscription + CEC tables

**Files:**

- Create: `apps/backend/alembic/versions/003_gamification_subscription.py`

**Step 1: Write the migration file**

```python
"""
003 — Gamification, Subscription, and IICRC CEC Reporting

Revision ID: 003
Revises: 002
Create Date: 2026-03-04
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "003"
down_revision = "002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ---- New columns on lms_users ----
    op.add_column("lms_users", sa.Column("iicrc_member_number", sa.String(20), nullable=True))
    op.add_column("lms_users", sa.Column("iicrc_card_image_url", sa.Text, nullable=True))
    op.add_column("lms_users", sa.Column("iicrc_expiry_date", sa.Date, nullable=True))
    op.add_column(
        "lms_users",
        sa.Column(
            "iicrc_certifications",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=True,
            server_default="[]",
        ),
    )

    # ---- lms_xp_events ----
    op.create_table(
        "lms_xp_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("student_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("lms_users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("source_type", sa.String(50), nullable=False),
        sa.Column("source_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("xp_awarded", sa.Integer, nullable=False),
        sa.Column("earned_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_lms_xp_events_student_id", "lms_xp_events", ["student_id"])

    # ---- lms_user_levels ----
    op.create_table(
        "lms_user_levels",
        sa.Column("student_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("lms_users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("total_xp", sa.Integer, nullable=False, server_default="0"),
        sa.Column("current_level", sa.Integer, nullable=False, server_default="1"),
        sa.Column("current_streak", sa.Integer, nullable=False, server_default="0"),
        sa.Column("longest_streak", sa.Integer, nullable=False, server_default="0"),
        sa.Column("last_active_date", sa.Date, nullable=True),
    )

    # ---- lms_subscriptions ----
    op.create_table(
        "lms_subscriptions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("student_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("lms_users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("stripe_subscription_id", sa.String(255), unique=True, nullable=False),
        sa.Column("stripe_customer_id", sa.String(255), nullable=False),
        sa.Column("status", sa.String(50), nullable=False, server_default="trialling"),
        sa.Column("plan", sa.String(50), nullable=False, server_default="yearly"),
        sa.Column("current_period_start", sa.DateTime(timezone=True), nullable=True),
        sa.Column("current_period_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("trial_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_lms_subscriptions_student_id", "lms_subscriptions", ["student_id"])

    # ---- lms_cec_reports ----
    op.create_table(
        "lms_cec_reports",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("student_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("lms_users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("course_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("lms_courses.id", ondelete="CASCADE"), nullable=False),
        sa.Column("iicrc_member_number", sa.String(20), nullable=False),
        sa.Column("email_to", sa.String(255), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("error_message", sa.Text, nullable=True),
        sa.Column("retry_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("lms_cec_reports")
    op.drop_table("lms_subscriptions")
    op.drop_table("lms_user_levels")
    op.drop_table("lms_xp_events")
    op.drop_column("lms_users", "iicrc_certifications")
    op.drop_column("lms_users", "iicrc_expiry_date")
    op.drop_column("lms_users", "iicrc_card_image_url")
    op.drop_column("lms_users", "iicrc_member_number")
```

**Step 2: Apply the migration**

```bash
cd apps/backend
C:\Users\Phill\AppData\Roaming\Python\Python313\Scripts\uv.exe run alembic upgrade head
```

Expected output:

```
INFO  [alembic.runtime.migration] Running upgrade 002 -> 003, 003 — Gamification, Subscription, and IICRC CEC Reporting
```

**Step 3: Verify tables exist**

```bash
C:\Users\Phill\AppData\Roaming\Python\Python313\Scripts\uv.exe run python -c "
import psycopg2
conn = psycopg2.connect('postgresql://carsi_user:carsi_dev_pass@localhost:5433/carsi_dev')
cur = conn.cursor()
cur.execute(\"SELECT tablename FROM pg_tables WHERE tablename LIKE 'lms_%' ORDER BY tablename\")
for row in cur.fetchall(): print(row[0])
conn.close()
"
```

Expected: `lms_cec_reports`, `lms_subscriptions`, `lms_user_levels`, `lms_xp_events` in the list.

**Step 4: Commit**

```bash
git add apps/backend/alembic/versions/003_gamification_subscription.py
git commit -m "feat(db): migration 003 — gamification, subscription, CEC report tables"
```

---

### Task 2: SQLAlchemy ORM models for the three new features

**Files:**

- Modify: `apps/backend/src/db/lms_models.py`

**Step 1: Add imports and new models**

At the top of `lms_models.py`, add `Date` to the SQLAlchemy imports:

```python
from sqlalchemy import (
    BigInteger, Boolean, Column, Date, DateTime,
    ForeignKey, Integer, Numeric, String, Text, UniqueConstraint,
)
```

**Step 2: Add IICRC columns to `LMSUser`**

After the `theme_preference` column (line ~62), add:

```python
    # IICRC Professional Identity (Phase 22)
    iicrc_member_number = Column(String(20), nullable=True)
    iicrc_card_image_url = Column(Text, nullable=True)
    iicrc_expiry_date = Column(Date, nullable=True)
    iicrc_certifications = Column(JSONB, nullable=True, default=list)
```

Also add relationships (after existing relationships on `LMSUser`):

```python
    xp_events = relationship("LMSXPEvent", back_populates="student", cascade="all, delete-orphan")
    user_level = relationship("LMSUserLevel", back_populates="student", uselist=False, cascade="all, delete-orphan")
    subscriptions = relationship("LMSSubscription", back_populates="student", cascade="all, delete-orphan")
    cec_reports = relationship("LMSCECReport", back_populates="student", cascade="all, delete-orphan")
```

**Step 3: Add four new model classes at the end of `lms_models.py`**

```python
# ---------------------------------------------------------------------------
# XP Events
# ---------------------------------------------------------------------------


class LMSXPEvent(Base):
    __tablename__ = "lms_xp_events"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(PGUUID(as_uuid=True), ForeignKey("lms_users.id", ondelete="CASCADE"), nullable=False)
    source_type = Column(String(50), nullable=False)
    # lesson_completed | quiz_passed | quiz_perfect | course_completed | streak_bonus
    source_id = Column(PGUUID(as_uuid=True), nullable=True)
    xp_awarded = Column(Integer, nullable=False)
    earned_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    student = relationship("LMSUser", back_populates="xp_events")


# ---------------------------------------------------------------------------
# User Levels (one row per student, upserted on XP award)
# ---------------------------------------------------------------------------


class LMSUserLevel(Base):
    __tablename__ = "lms_user_levels"

    student_id = Column(PGUUID(as_uuid=True), ForeignKey("lms_users.id", ondelete="CASCADE"), primary_key=True)
    total_xp = Column(Integer, nullable=False, default=0)
    current_level = Column(Integer, nullable=False, default=1)
    current_streak = Column(Integer, nullable=False, default=0)
    longest_streak = Column(Integer, nullable=False, default=0)
    last_active_date = Column(Date, nullable=True)

    student = relationship("LMSUser", back_populates="user_level")


# ---------------------------------------------------------------------------
# Subscriptions (Stripe recurring)
# ---------------------------------------------------------------------------


class LMSSubscription(Base):
    __tablename__ = "lms_subscriptions"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(PGUUID(as_uuid=True), ForeignKey("lms_users.id", ondelete="CASCADE"), nullable=False)
    stripe_subscription_id = Column(String(255), unique=True, nullable=False)
    stripe_customer_id = Column(String(255), nullable=False)
    status = Column(String(50), nullable=False, default="trialling")
    # trialling | active | past_due | cancelled | unpaid
    plan = Column(String(50), nullable=False, default="yearly")
    current_period_start = Column(DateTime(timezone=True), nullable=True)
    current_period_end = Column(DateTime(timezone=True), nullable=True)
    trial_end = Column(DateTime(timezone=True), nullable=True)
    cancelled_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    student = relationship("LMSUser", back_populates="subscriptions")


# ---------------------------------------------------------------------------
# CEC Reports (IICRC email audit trail)
# ---------------------------------------------------------------------------


class LMSCECReport(Base):
    __tablename__ = "lms_cec_reports"

    id = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(PGUUID(as_uuid=True), ForeignKey("lms_users.id", ondelete="CASCADE"), nullable=False)
    course_id = Column(PGUUID(as_uuid=True), ForeignKey("lms_courses.id", ondelete="CASCADE"), nullable=False)
    iicrc_member_number = Column(String(20), nullable=False)
    email_to = Column(String(255), nullable=False)
    status = Column(String(20), nullable=False, default="pending")
    # pending | sent | failed
    sent_at = Column(DateTime(timezone=True), nullable=True)
    error_message = Column(Text, nullable=True)
    retry_count = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    student = relationship("LMSUser", back_populates="cec_reports")
    course = relationship("LMSCourse")
```

**Step 4: Verify models import cleanly**

```bash
cd apps/backend
C:\Users\Phill\AppData\Roaming\Python\Python313\Scripts\uv.exe run python -c "
from src.db.lms_models import LMSXPEvent, LMSUserLevel, LMSSubscription, LMSCECReport
print('Models OK')
"
```

Expected: `Models OK`

**Step 5: Commit**

```bash
git add apps/backend/src/db/lms_models.py
git commit -m "feat(models): LMSXPEvent, LMSUserLevel, LMSSubscription, LMSCECReport + IICRC columns on LMSUser"
```

---

## Phase B: Backend — Email Service

### Task 3: SMTP email service

**Files:**

- Create: `apps/backend/src/services/email_service.py`

**Step 1: Write tests first**

Create `apps/backend/tests/services/test_email_service.py`:

```python
"""Tests for EmailService — uses Mailpit (dev SMTP at localhost:1025)."""
from unittest.mock import MagicMock, patch

import pytest

from src.services.email_service import EmailService


def test_send_email_calls_smtp():
    """send_email builds MIME message and calls SMTP sendmail."""
    svc = EmailService(host="localhost", port=1025, from_addr="test@carsi.com.au")

    with patch("src.services.email_service.smtplib.SMTP") as MockSMTP:
        mock_server = MagicMock()
        MockSMTP.return_value.__enter__ = MagicMock(return_value=mock_server)
        MockSMTP.return_value.__exit__ = MagicMock(return_value=False)

        svc.send_email(
            to="recipient@example.com",
            subject="Test Subject",
            html_body="<p>Test body</p>",
        )

        MockSMTP.assert_called_once_with("localhost", 1025)
        mock_server.sendmail.assert_called_once()
        args = mock_server.sendmail.call_args[0]
        assert args[0] == "test@carsi.com.au"
        assert args[1] == "recipient@example.com"


def test_send_email_includes_subject_in_message():
    svc = EmailService(host="localhost", port=1025, from_addr="test@carsi.com.au")

    with patch("src.services.email_service.smtplib.SMTP") as MockSMTP:
        mock_server = MagicMock()
        MockSMTP.return_value.__enter__ = MagicMock(return_value=mock_server)
        MockSMTP.return_value.__exit__ = MagicMock(return_value=False)

        svc.send_email(to="r@example.com", subject="My Subject", html_body="<p>x</p>")

        raw = mock_server.sendmail.call_args[0][2]
        assert "My Subject" in raw
```

**Step 2: Run tests to verify they fail**

```bash
cd apps/backend
C:\Users\Phill\AppData\Roaming\Python\Python313\Scripts\uv.exe run pytest tests/services/test_email_service.py -v
```

Expected: `ModuleNotFoundError: No module named 'src.services.email_service'`

**Step 3: Create the service**

```python
"""
CARSI Email Service

Uses smtplib directly (synchronous — called from Celery tasks).
Dev: Mailpit at localhost:1025 (no auth, no TLS needed)
Prod: Resend SMTP at smtp.resend.com:465 (TLS + API key as password)
"""

import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText


class EmailService:
    def __init__(
        self,
        host: str | None = None,
        port: int | None = None,
        from_addr: str | None = None,
        username: str | None = None,
        password: str | None = None,
    ) -> None:
        self.host = host or os.getenv("SMTP_HOST", "localhost")
        self.port = port or int(os.getenv("SMTP_PORT", "1025"))
        self.from_addr = from_addr or os.getenv("SMTP_FROM", "admin@carsi.com.au")
        self.username = username or os.getenv("SMTP_USER", "")
        self.password = password or os.getenv("SMTP_PASS", "")

    def send_email(self, *, to: str, subject: str, html_body: str) -> None:
        """Send an HTML email. Raises on failure — let Celery handle retry."""
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = self.from_addr
        msg["To"] = to
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(self.host, self.port) as server:
            if self.username and self.password:
                server.login(self.username, self.password)
            server.sendmail(self.from_addr, to, msg.as_string())


# Module-level singleton — configured from env vars at import time
email_service = EmailService()
```

**Step 4: Run tests to verify they pass**

```bash
cd apps/backend
C:\Users\Phill\AppData\Roaming\Python\Python313\Scripts\uv.exe run pytest tests/services/test_email_service.py -v
```

Expected: 2 tests PASSED.

**Step 5: Commit**

```bash
git add apps/backend/src/services/email_service.py apps/backend/tests/services/test_email_service.py
git commit -m "feat(services): EmailService — SMTP email sender (Mailpit dev / Resend prod)"
```

---

### Task 4: IICRC CEC report builder

**Files:**

- Create: `apps/backend/src/services/iicrc_reporter.py`
- Test: `apps/backend/tests/services/test_iicrc_reporter.py`

**Step 1: Write the test**

```python
"""Tests for IICRC CEC report email builder."""
from unittest.mock import MagicMock, patch
from datetime import date

import pytest

from src.services.iicrc_reporter import build_cec_email_html, send_cec_report


def test_build_cec_email_html_contains_member_number():
    html = build_cec_email_html(
        student_name="James Wilson",
        iicrc_member_number="IICRC-12345",
        student_email="james@example.com",
        course_title="Water Damage Restoration Fundamentals",
        iicrc_discipline="WRT",
        cec_hours=3.0,
        completion_date=date(2026, 3, 4),
        certificate_id="cert-abc-123",
    )
    assert "IICRC-12345" in html
    assert "James Wilson" in html
    assert "Water Damage Restoration Fundamentals" in html
    assert "WRT" in html
    assert "3.0" in html
    assert "04/03/2026" in html


def test_send_cec_report_calls_email_service():
    with patch("src.services.iicrc_reporter.email_service") as mock_svc:
        send_cec_report(
            student_name="Jane Smith",
            iicrc_member_number="IICRC-99999",
            student_email="jane@example.com",
            course_title="Odour Control",
            iicrc_discipline="OCT",
            cec_hours=2.0,
            completion_date=date(2026, 3, 4),
            certificate_id="cert-xyz-456",
        )
        mock_svc.send_email.assert_called_once()
        call_kwargs = mock_svc.send_email.call_args[1]
        assert call_kwargs["to"] == "cec@iicrc.org"
        assert "Jane Smith" in call_kwargs["subject"]
        assert "OCT" in call_kwargs["subject"] or "Odour Control" in call_kwargs["subject"]
```

**Step 2: Run the test to verify it fails**

```bash
cd apps/backend
C:\Users\Phill\AppData\Roaming\Python\Python313\Scripts\uv.exe run pytest tests/services/test_iicrc_reporter.py -v
```

Expected: `ModuleNotFoundError: No module named 'src.services.iicrc_reporter'`

**Step 3: Create the IICRC reporter**

```python
"""
IICRC CEC Report Email Builder

Sends a per-completion email to IICRC Las Vegas when a student has an IICRC
member number and the course carries CEC hours.

IICRC email address: cec@iicrc.org (confirm with IICRC America before go-live)
"""

from datetime import date

from src.services.email_service import email_service

IICRC_EMAIL = "cec@iicrc.org"


def build_cec_email_html(
    *,
    student_name: str,
    iicrc_member_number: str,
    student_email: str,
    course_title: str,
    iicrc_discipline: str,
    cec_hours: float,
    completion_date: date,
    certificate_id: str,
) -> str:
    """Build the HTML body for an IICRC CEC completion report."""
    formatted_date = completion_date.strftime("%d/%m/%Y")
    return f"""<html><body>
<p>Dear IICRC CEC Department,</p>
<p>Please record the following Continuing Education Credit completion:</p>
<table cellpadding="8" border="1" style="border-collapse:collapse;font-family:Arial,sans-serif;">
  <tr><td><strong>Member Name</strong></td><td>{student_name}</td></tr>
  <tr><td><strong>IICRC Member #</strong></td><td>{iicrc_member_number}</td></tr>
  <tr><td><strong>Email</strong></td><td>{student_email}</td></tr>
  <tr><td><strong>Course</strong></td><td>{course_title}</td></tr>
  <tr><td><strong>IICRC Discipline</strong></td><td>{iicrc_discipline}</td></tr>
  <tr><td><strong>CEC Hours</strong></td><td>{cec_hours}</td></tr>
  <tr><td><strong>Completion Date</strong></td><td>{formatted_date} AEST</td></tr>
</table>
<p>
  Course Provider: CARSI — Restoration Courses &amp; Training Online<br>
  Provider Contact: admin@carsi.com.au<br>
  Provider Website: carsi.com.au
</p>
<p>
  This completion has been recorded in the CARSI system.<br>
  Certificate ID: {certificate_id}
</p>
<p>Kind regards,<br>CARSI Administration</p>
</body></html>"""


def send_cec_report(
    *,
    student_name: str,
    iicrc_member_number: str,
    student_email: str,
    course_title: str,
    iicrc_discipline: str,
    cec_hours: float,
    completion_date: date,
    certificate_id: str,
) -> None:
    """Send the CEC report email to IICRC. Raises on failure — Celery retries."""
    subject = (
        f"CEC Completion Report — {student_name} — {course_title} ({iicrc_discipline})"
    )
    html = build_cec_email_html(
        student_name=student_name,
        iicrc_member_number=iicrc_member_number,
        student_email=student_email,
        course_title=course_title,
        iicrc_discipline=iicrc_discipline,
        cec_hours=cec_hours,
        completion_date=completion_date,
        certificate_id=certificate_id,
    )
    email_service.send_email(to=IICRC_EMAIL, subject=subject, html_body=html)
```

**Step 4: Run tests to verify they pass**

```bash
cd apps/backend
C:\Users\Phill\AppData\Roaming\Python\Python313\Scripts\uv.exe run pytest tests/services/test_iicrc_reporter.py -v
```

Expected: 2 tests PASSED.

**Step 5: Commit**

```bash
git add apps/backend/src/services/iicrc_reporter.py apps/backend/tests/services/test_iicrc_reporter.py
git commit -m "feat(services): IICRC CEC report email builder"
```

---

## Phase C: Backend — Gamification Routes

### Task 5: XP award service + gamification API routes

**Files:**

- Create: `apps/backend/src/api/routes/lms_gamification.py`
- Test: `apps/backend/tests/api/test_lms_gamification.py`

**Step 1: Write failing tests**

```python
"""Tests for LMS Gamification — XP events, user level, leaderboard."""
from datetime import date
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from src.api.main import app
from src.api.deps_lms import get_current_lms_user
from src.config.database import get_async_db
from src.db.lms_models import LMSUser, LMSUserLevel, LMSXPEvent

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


def test_get_my_level_returns_level_data():
    mock_db = AsyncMock()
    mock_level = _make_mock_level()
    mock_db.execute.return_value.scalar_one_or_none.return_value = mock_level

    app.dependency_overrides[get_current_lms_user] = lambda: _make_mock_student()
    app.dependency_overrides[get_async_db] = lambda: mock_db

    resp = client.get("/api/lms/gamification/me/level", headers=HEADERS)

    app.dependency_overrides.clear()
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_xp"] == 1200
    assert data["current_level"] == 3
    assert data["level_title"] == "Technician"
    assert data["current_streak"] == 5


def test_get_my_level_creates_default_when_missing():
    mock_db = AsyncMock()
    mock_db.execute.return_value.scalar_one_or_none.return_value = None

    app.dependency_overrides[get_current_lms_user] = lambda: _make_mock_student()
    app.dependency_overrides[get_async_db] = lambda: mock_db

    resp = client.get("/api/lms/gamification/me/level", headers=HEADERS)

    app.dependency_overrides.clear()
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_xp"] == 0
    assert data["current_level"] == 1
    assert data["level_title"] == "Apprentice"


def test_get_leaderboard_returns_list():
    mock_db = AsyncMock()
    mock_db.execute.return_value.all.return_value = []

    resp = client.get("/api/lms/gamification/leaderboard")

    assert resp.status_code == 200
    assert isinstance(resp.json(), list)
```

**Step 2: Run to verify they fail**

```bash
cd apps/backend
C:\Users\Phill\AppData\Roaming\Python\Python313\Scripts\uv.exe run pytest tests/api/test_lms_gamification.py -v
```

Expected: `ImportError` or 404s.

**Step 3: Create the gamification route**

```python
"""
CARSI LMS Gamification Routes

GET  /api/lms/gamification/me/level       — my XP, level, streak
GET  /api/lms/gamification/me/xp-events  — my XP history (last 50)
GET  /api/lms/gamification/leaderboard   — top 20 this month (public)
"""

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps_lms import get_current_lms_user
from src.config.database import get_async_db
from src.db.lms_models import LMSUser, LMSUserLevel, LMSXPEvent

router = APIRouter(prefix="/api/lms/gamification", tags=["lms-gamification"])

# XP thresholds per level
LEVEL_THRESHOLDS: dict[int, int] = {
    1: 0,
    2: 500,
    3: 1_500,
    4: 3_500,
    5: 7_000,
    6: 12_000,
}

LEVEL_TITLES: dict[int, str] = {
    1: "Apprentice",
    2: "Trainee",
    3: "Technician",
    4: "Senior Technician",
    5: "Specialist",
    6: "Master Restorer",
}


def _calculate_level(total_xp: int) -> int:
    level = 1
    for lvl, threshold in sorted(LEVEL_THRESHOLDS.items(), reverse=True):
        if total_xp >= threshold:
            level = lvl
            break
    return level


def _xp_for_next_level(current_level: int, total_xp: int) -> int | None:
    next_lvl = current_level + 1
    if next_lvl not in LEVEL_THRESHOLDS:
        return None
    return LEVEL_THRESHOLDS[next_lvl] - total_xp


class UserLevelOut(BaseModel):
    total_xp: int
    current_level: int
    level_title: str
    current_streak: int
    longest_streak: int
    xp_to_next_level: int | None


class LeaderboardEntryOut(BaseModel):
    rank: int
    display_name: str
    total_xp: int
    current_level: int
    level_title: str


@router.get("/me/level", response_model=UserLevelOut)
async def get_my_level(
    db: AsyncSession = Depends(get_async_db),
    current_user: LMSUser = Depends(get_current_lms_user),
) -> UserLevelOut:
    """Get the current user's XP, level, and streak."""
    level_row = await db.execute(
        select(LMSUserLevel).where(LMSUserLevel.student_id == current_user.id)
    )
    level = level_row.scalar_one_or_none()

    if level is None:
        total_xp = 0
        current_level = 1
        current_streak = 0
        longest_streak = 0
    else:
        total_xp = level.total_xp
        current_level = level.current_level
        current_streak = level.current_streak
        longest_streak = level.longest_streak

    return UserLevelOut(
        total_xp=total_xp,
        current_level=current_level,
        level_title=LEVEL_TITLES[current_level],
        current_streak=current_streak,
        longest_streak=longest_streak,
        xp_to_next_level=_xp_for_next_level(current_level, total_xp),
    )


@router.get("/leaderboard", response_model=list[LeaderboardEntryOut])
async def get_leaderboard(
    db: AsyncSession = Depends(get_async_db),
) -> list[LeaderboardEntryOut]:
    """Top 20 students by total XP (public — anonymous display names)."""
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    result = await db.execute(
        select(
            LMSXPEvent.student_id,
            func.sum(LMSXPEvent.xp_awarded).label("monthly_xp"),
        )
        .where(LMSXPEvent.earned_at >= month_start)
        .group_by(LMSXPEvent.student_id)
        .order_by(func.sum(LMSXPEvent.xp_awarded).desc())
        .limit(20)
    )
    rows = result.all()

    entries = []
    for rank, row in enumerate(rows, start=1):
        level_result = await db.execute(
            select(LMSUserLevel).where(LMSUserLevel.student_id == row.student_id)
        )
        level = level_result.scalar_one_or_none()
        total_xp = level.total_xp if level else 0
        current_level = level.current_level if level else 1

        entries.append(
            LeaderboardEntryOut(
                rank=rank,
                display_name=f"Technician #{rank}",  # anonymous by default
                total_xp=total_xp,
                current_level=current_level,
                level_title=LEVEL_TITLES[current_level],
            )
        )
    return entries
```

**Step 4: Run tests to verify they pass**

```bash
cd apps/backend
C:\Users\Phill\AppData\Roaming\Python\Python313\Scripts\uv.exe run pytest tests/api/test_lms_gamification.py -v
```

Expected: All tests PASSED.

**Step 5: Commit**

```bash
git add apps/backend/src/api/routes/lms_gamification.py apps/backend/tests/api/test_lms_gamification.py
git commit -m "feat(api): GET /api/lms/gamification/me/level + /leaderboard"
```

---

## Phase D: Backend — Subscription Routes

### Task 6: Stripe subscription checkout + status + portal

**Files:**

- Create: `apps/backend/src/api/routes/lms_subscription.py`
- Test: `apps/backend/tests/api/test_lms_subscription.py`

**Note:** Stripe Python SDK must be installed. Add to `apps/backend/pyproject.toml` if not present:

```
stripe>=8.0.0
```

Then run: `cd apps/backend && uv sync`

**Step 1: Write failing tests**

```python
"""Tests for LMS Subscription Routes."""
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from src.api.main import app
from src.api.deps_lms import get_current_lms_user
from src.config.database import get_async_db
from src.db.lms_models import LMSSubscription, LMSUser

client = TestClient(app)

STUDENT_ID = uuid4()
HEADERS = {"X-User-Id": str(STUDENT_ID)}


def _make_mock_student():
    user = MagicMock(spec=LMSUser)
    user.id = STUDENT_ID
    user.email = "student@carsi.com.au"
    user.full_name = "James Wilson"
    user.roles = ["student"]
    return user


def test_checkout_returns_url():
    mock_db = AsyncMock()
    mock_db.execute.return_value.scalar_one_or_none.return_value = None

    app.dependency_overrides[get_current_lms_user] = lambda: _make_mock_student()
    app.dependency_overrides[get_async_db] = lambda: mock_db

    with patch("src.api.routes.lms_subscription.stripe") as mock_stripe:
        mock_stripe.checkout.Session.create.return_value = MagicMock(url="https://checkout.stripe.com/test")
        resp = client.post(
            "/api/lms/subscription/checkout",
            json={"success_url": "http://localhost:3009/subscribe/success", "cancel_url": "http://localhost:3009/subscribe"},
            headers=HEADERS,
        )

    app.dependency_overrides.clear()
    assert resp.status_code == 200
    assert "url" in resp.json()
    assert resp.json()["url"].startswith("https://checkout.stripe.com")


def test_get_status_returns_none_when_no_subscription():
    mock_db = AsyncMock()
    mock_db.execute.return_value.scalar_one_or_none.return_value = None

    app.dependency_overrides[get_current_lms_user] = lambda: _make_mock_student()
    app.dependency_overrides[get_async_db] = lambda: mock_db

    resp = client.get("/api/lms/subscription/status", headers=HEADERS)

    app.dependency_overrides.clear()
    assert resp.status_code == 200
    assert resp.json()["has_subscription"] is False


def test_get_status_returns_active_when_subscribed():
    mock_db = AsyncMock()
    mock_sub = MagicMock(spec=LMSSubscription)
    mock_sub.status = "active"
    mock_sub.plan = "yearly"
    mock_sub.current_period_end = None
    mock_sub.trial_end = None
    mock_db.execute.return_value.scalar_one_or_none.return_value = mock_sub

    app.dependency_overrides[get_current_lms_user] = lambda: _make_mock_student()
    app.dependency_overrides[get_async_db] = lambda: mock_db

    resp = client.get("/api/lms/subscription/status", headers=HEADERS)

    app.dependency_overrides.clear()
    assert resp.status_code == 200
    assert resp.json()["has_subscription"] is True
    assert resp.json()["status"] == "active"
```

**Step 2: Run to verify they fail**

```bash
cd apps/backend
C:\Users\Phill\AppData\Roaming\Python\Python313\Scripts\uv.exe run pytest tests/api/test_lms_subscription.py -v
```

Expected: `ImportError` or 404s.

**Step 3: Check if stripe is installed, install if needed**

```bash
cd apps/backend
C:\Users\Phill\AppData\Roaming\Python\Python313\Scripts\uv.exe run python -c "import stripe; print('stripe OK')"
```

If `ModuleNotFoundError`:

```bash
C:\Users\Phill\AppData\Roaming\Python\Python313\Scripts\uv.exe add stripe
```

**Step 4: Create the subscription route**

```python
"""
CARSI LMS Subscription Routes

POST /api/lms/subscription/checkout  — create Stripe Checkout Session ($795 AUD/year, 7-day trial)
GET  /api/lms/subscription/status    — current user's subscription status
POST /api/lms/subscription/portal    — create Stripe Billing Portal session
"""

import os
from datetime import datetime

import stripe
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps_lms import get_current_lms_user
from src.config.database import get_async_db
from src.db.lms_models import LMSSubscription, LMSUser

stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")

router = APIRouter(prefix="/api/lms/subscription", tags=["lms-subscription"])

# Stripe Price ID for $795 AUD/year — set this after creating the product in Stripe
STRIPE_PRICE_ID = os.getenv("STRIPE_YEARLY_PRICE_ID", "price_placeholder")


class CheckoutRequest(BaseModel):
    success_url: str
    cancel_url: str


class CheckoutResponse(BaseModel):
    url: str


class SubscriptionStatusOut(BaseModel):
    has_subscription: bool
    status: str | None = None
    plan: str | None = None
    current_period_end: str | None = None
    trial_end: str | None = None


class PortalResponse(BaseModel):
    url: str


@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout_session(
    data: CheckoutRequest,
    db: AsyncSession = Depends(get_async_db),
    current_user: LMSUser = Depends(get_current_lms_user),
) -> CheckoutResponse:
    """
    Create a Stripe Checkout Session for the CARSI yearly subscription.
    Card required. 7-day free trial. $795 AUD charged on day 8.
    """
    existing = await db.execute(
        select(LMSSubscription).where(
            LMSSubscription.student_id == current_user.id,
            LMSSubscription.status.in_(["trialling", "active"]),
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You already have an active subscription.",
        )

    session = stripe.checkout.Session.create(
        mode="subscription",
        payment_method_types=["card"],
        customer_email=current_user.email,
        line_items=[{"price": STRIPE_PRICE_ID, "quantity": 1}],
        subscription_data={"trial_period_days": 7},
        success_url=data.success_url + "?session_id={CHECKOUT_SESSION_ID}",
        cancel_url=data.cancel_url,
        metadata={"student_id": str(current_user.id)},
    )
    return CheckoutResponse(url=session.url)


@router.get("/status", response_model=SubscriptionStatusOut)
async def get_subscription_status(
    db: AsyncSession = Depends(get_async_db),
    current_user: LMSUser = Depends(get_current_lms_user),
) -> SubscriptionStatusOut:
    """Return the current user's most recent subscription record."""
    result = await db.execute(
        select(LMSSubscription)
        .where(LMSSubscription.student_id == current_user.id)
        .order_by(LMSSubscription.created_at.desc())
        .limit(1)
    )
    sub = result.scalar_one_or_none()

    if sub is None:
        return SubscriptionStatusOut(has_subscription=False)

    return SubscriptionStatusOut(
        has_subscription=True,
        status=sub.status,
        plan=sub.plan,
        current_period_end=sub.current_period_end.isoformat() if sub.current_period_end else None,
        trial_end=sub.trial_end.isoformat() if sub.trial_end else None,
    )


@router.post("/portal", response_model=PortalResponse)
async def create_billing_portal(
    return_url: str = "http://localhost:3009/student",
    db: AsyncSession = Depends(get_async_db),
    current_user: LMSUser = Depends(get_current_lms_user),
) -> PortalResponse:
    """Create a Stripe Billing Portal session for subscription management."""
    result = await db.execute(
        select(LMSSubscription)
        .where(LMSSubscription.student_id == current_user.id)
        .order_by(LMSSubscription.created_at.desc())
        .limit(1)
    )
    sub = result.scalar_one_or_none()
    if not sub:
        raise HTTPException(status_code=404, detail="No subscription found.")

    portal = stripe.billing_portal.Session.create(
        customer=sub.stripe_customer_id,
        return_url=return_url,
    )
    return PortalResponse(url=portal.url)
```

**Step 5: Run tests to verify they pass**

```bash
cd apps/backend
C:\Users\Phill\AppData\Roaming\Python\Python313\Scripts\uv.exe run pytest tests/api/test_lms_subscription.py -v
```

Expected: All tests PASSED.

**Step 6: Commit**

```bash
git add apps/backend/src/api/routes/lms_subscription.py apps/backend/tests/api/test_lms_subscription.py
git commit -m "feat(api): Stripe subscription checkout, status, and billing portal"
```

---

### Task 7: Stripe webhook handler

**Files:**

- Create: `apps/backend/src/api/routes/lms_webhooks.py`
- Test: `apps/backend/tests/api/test_lms_webhooks.py`

**Step 1: Write failing tests**

```python
"""Tests for Stripe webhook handler."""
import json
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from src.api.main import app
from src.config.database import get_async_db

client = TestClient(app)

STUDENT_ID = uuid4()


def _make_stripe_event(event_type: str, obj: dict) -> dict:
    return {
        "type": event_type,
        "data": {"object": obj},
    }


def test_webhook_handles_subscription_created():
    mock_db = AsyncMock()
    mock_db.execute.return_value.scalar_one_or_none.return_value = None

    app.dependency_overrides[get_async_db] = lambda: mock_db

    payload = _make_stripe_event(
        "customer.subscription.created",
        {
            "id": "sub_test123",
            "customer": "cus_test123",
            "status": "trialling",
            "current_period_start": 1709500000,
            "current_period_end": 1741036000,
            "trial_end": 1710000000,
            "metadata": {"student_id": str(STUDENT_ID)},
        },
    )

    with patch("src.api.routes.lms_webhooks.stripe") as mock_stripe:
        mock_stripe.Webhook.construct_event.return_value = payload
        resp = client.post(
            "/api/lms/webhooks/stripe",
            content=json.dumps(payload).encode(),
            headers={"stripe-signature": "test_sig"},
        )

    app.dependency_overrides.clear()
    assert resp.status_code == 200
    assert resp.json() == {"received": True}


def test_webhook_returns_400_on_invalid_signature():
    with patch("src.api.routes.lms_webhooks.stripe") as mock_stripe:
        import stripe as real_stripe
        mock_stripe.Webhook.construct_event.side_effect = real_stripe.error.SignatureVerificationError(
            "bad sig", "sig_header"
        )
        resp = client.post(
            "/api/lms/webhooks/stripe",
            content=b"{}",
            headers={"stripe-signature": "bad_sig"},
        )
    assert resp.status_code == 400
```

**Step 2: Run to verify they fail**

```bash
cd apps/backend
C:\Users\Phill\AppData\Roaming\Python\Python313\Scripts\uv.exe run pytest tests/api/test_lms_webhooks.py -v
```

**Step 3: Create the webhook handler**

```python
"""
Stripe Webhook Handler

POST /api/lms/webhooks/stripe

Handles subscription lifecycle events:
  customer.subscription.created  → create LMSSubscription row
  customer.subscription.deleted  → set status=cancelled
  invoice.payment_succeeded       → set status=active, extend period
  invoice.payment_failed          → set status=past_due
  customer.subscription.trial_will_end → (email reminder — future)

IMPORTANT: This endpoint must receive the RAW request body (bytes) for
Stripe signature verification. Do NOT use Pydantic body parsing here.
"""

import os
from datetime import datetime, timezone

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.config.database import get_async_db
from src.db.lms_models import LMSSubscription

stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")
WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")

router = APIRouter(prefix="/api/lms/webhooks", tags=["lms-webhooks"])


def _ts_to_dt(ts: int | None) -> datetime | None:
    if ts is None:
        return None
    return datetime.fromtimestamp(ts, tz=timezone.utc)


@router.post("/stripe")
async def stripe_webhook(
    request: Request,
    db: AsyncSession = Depends(get_async_db),
) -> dict:
    """
    Receive and verify Stripe webhook events. Updates subscription state in DB.
    Must be exempt from CSRF / body-parsing middleware.
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, WEBHOOK_SECRET)
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid Stripe signature")

    event_type: str = event["type"]
    obj = event["data"]["object"]

    if event_type == "customer.subscription.created":
        await _handle_subscription_created(db, obj)
    elif event_type == "customer.subscription.deleted":
        await _handle_subscription_deleted(db, obj)
    elif event_type == "invoice.payment_succeeded":
        await _handle_payment_succeeded(db, obj)
    elif event_type == "invoice.payment_failed":
        await _handle_payment_failed(db, obj)

    return {"received": True}


async def _handle_subscription_created(db: AsyncSession, obj: dict) -> None:
    from uuid import UUID

    student_id_str = (obj.get("metadata") or {}).get("student_id")
    if not student_id_str:
        return
    try:
        student_id = UUID(student_id_str)
    except ValueError:
        return

    existing = await db.execute(
        select(LMSSubscription).where(
            LMSSubscription.stripe_subscription_id == obj["id"]
        )
    )
    if existing.scalar_one_or_none():
        return

    sub = LMSSubscription(
        student_id=student_id,
        stripe_subscription_id=obj["id"],
        stripe_customer_id=obj["customer"],
        status=obj.get("status", "trialling"),
        plan="yearly",
        current_period_start=_ts_to_dt(obj.get("current_period_start")),
        current_period_end=_ts_to_dt(obj.get("current_period_end")),
        trial_end=_ts_to_dt(obj.get("trial_end")),
    )
    db.add(sub)
    await db.commit()


async def _handle_subscription_deleted(db: AsyncSession, obj: dict) -> None:
    result = await db.execute(
        select(LMSSubscription).where(
            LMSSubscription.stripe_subscription_id == obj["id"]
        )
    )
    sub = result.scalar_one_or_none()
    if sub:
        sub.status = "cancelled"
        from datetime import datetime, timezone
        sub.cancelled_at = datetime.now(timezone.utc)
        await db.commit()


async def _handle_payment_succeeded(db: AsyncSession, obj: dict) -> None:
    sub_id = obj.get("subscription")
    if not sub_id:
        return
    result = await db.execute(
        select(LMSSubscription).where(
            LMSSubscription.stripe_subscription_id == sub_id
        )
    )
    sub = result.scalar_one_or_none()
    if sub:
        sub.status = "active"
        await db.commit()


async def _handle_payment_failed(db: AsyncSession, obj: dict) -> None:
    sub_id = obj.get("subscription")
    if not sub_id:
        return
    result = await db.execute(
        select(LMSSubscription).where(
            LMSSubscription.stripe_subscription_id == sub_id
        )
    )
    sub = result.scalar_one_or_none()
    if sub:
        sub.status = "past_due"
        await db.commit()
```

**Step 4: Run tests to verify they pass**

```bash
cd apps/backend
C:\Users\Phill\AppData\Roaming\Python\Python313\Scripts\uv.exe run pytest tests/api/test_lms_webhooks.py -v
```

Expected: All tests PASSED.

**Step 5: Commit**

```bash
git add apps/backend/src/api/routes/lms_webhooks.py apps/backend/tests/api/test_lms_webhooks.py
git commit -m "feat(api): Stripe webhook handler — subscription lifecycle events"
```

---

## Phase E: Backend — Celery Tasks (XP + CEC)

### Task 8: Award XP on lesson/quiz/course completion

**Files:**

- Modify: `apps/backend/src/worker/tasks.py`
- Test: `apps/backend/tests/worker/test_xp_tasks.py`

**Step 1: Write failing tests**

```python
"""Tests for XP award Celery task."""
from datetime import date, timedelta
from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest

from src.worker.tasks import award_xp


STUDENT_ID = str(uuid4())
SOURCE_ID = str(uuid4())


def _make_db_session(level_row=None):
    session = MagicMock()
    ctx_mgr = MagicMock()
    ctx_mgr.__enter__ = MagicMock(return_value=session)
    ctx_mgr.__exit__ = MagicMock(return_value=False)

    execute_result = MagicMock()
    execute_result.scalar_one_or_none.return_value = level_row
    session.execute.return_value = execute_result

    return ctx_mgr


def test_award_xp_creates_event_and_level_row():
    with patch("src.worker.tasks.SyncSessionLocal", return_value=_make_db_session()):
        result = award_xp(
            student_id=STUDENT_ID,
            source_type="lesson_completed",
            source_id=SOURCE_ID,
            xp_amount=10,
        )
    assert result["status"] == "ok"
    assert result["xp_awarded"] == 10


def test_award_xp_increments_existing_level():
    from src.db.lms_models import LMSUserLevel

    mock_level = MagicMock(spec=LMSUserLevel)
    mock_level.total_xp = 490
    mock_level.current_level = 1
    mock_level.current_streak = 2
    mock_level.longest_streak = 5
    mock_level.last_active_date = date.today() - timedelta(days=1)  # yesterday

    with patch("src.worker.tasks.SyncSessionLocal", return_value=_make_db_session(mock_level)):
        result = award_xp(
            student_id=STUDENT_ID,
            source_type="quiz_passed",
            source_id=SOURCE_ID,
            xp_amount=25,
        )

    assert result["status"] == "ok"
    # 490 + 25 = 515 => should be level 2 (threshold 500)
    assert mock_level.total_xp == 515
    assert mock_level.current_level == 2
    # streak: yesterday → increment from 2 to 3
    assert mock_level.current_streak == 3
```

**Step 2: Run to verify they fail**

```bash
cd apps/backend
C:\Users\Phill\AppData\Roaming\Python\Python313\Scripts\uv.exe run pytest tests/worker/test_xp_tasks.py -v
```

**Step 3: Add `award_xp` task and `send_iicrc_cec_report` task to `tasks.py`**

Add at the bottom of `apps/backend/src/worker/tasks.py`:

```python
# ---------------------------------------------------------------------------
# XP Award
# ---------------------------------------------------------------------------

LEVEL_THRESHOLDS = {1: 0, 2: 500, 3: 1_500, 4: 3_500, 5: 7_000, 6: 12_000}


def _compute_level(total_xp: int) -> int:
    level = 1
    for lvl, threshold in sorted(LEVEL_THRESHOLDS.items(), reverse=True):
        if total_xp >= threshold:
            level = lvl
            break
    return level


@celery_app.task(name="award_xp")
def award_xp(
    student_id: str,
    source_type: str,
    source_id: str | None,
    xp_amount: int,
) -> dict:
    """
    Award XP to a student for a learning event.

    source_type: lesson_completed | quiz_passed | quiz_perfect |
                 course_completed | streak_bonus
    """
    from datetime import date, timedelta

    from sqlalchemy import select

    from src.db.lms_models import LMSUserLevel, LMSXPEvent

    sid = uuid.UUID(student_id)
    src_id = uuid.UUID(source_id) if source_id else None
    today = date.today()

    with SyncSessionLocal() as db:
        # Create XP event record
        event = LMSXPEvent(
            student_id=sid,
            source_type=source_type,
            source_id=src_id,
            xp_awarded=xp_amount,
        )
        db.add(event)

        # Upsert user level row
        level_row = db.execute(
            select(LMSUserLevel).where(LMSUserLevel.student_id == sid)
        ).scalar_one_or_none()

        if level_row is None:
            level_row = LMSUserLevel(
                student_id=sid,
                total_xp=xp_amount,
                current_level=_compute_level(xp_amount),
                current_streak=1,
                longest_streak=1,
                last_active_date=today,
            )
            db.add(level_row)
        else:
            level_row.total_xp += xp_amount
            level_row.current_level = _compute_level(level_row.total_xp)

            # Streak tracking
            last = level_row.last_active_date
            if last is None or last < today - timedelta(days=1):
                level_row.current_streak = 1
            elif last == today - timedelta(days=1):
                level_row.current_streak += 1
            # else: same day — no change to streak

            if level_row.current_streak > level_row.longest_streak:
                level_row.longest_streak = level_row.current_streak
            level_row.last_active_date = today

        db.commit()

    # Streak milestone bonuses (fire-and-forget, no recursion risk)
    streak = level_row.current_streak
    bonus_xp = 0
    if streak == 7:
        bonus_xp = 50
    elif streak == 30:
        bonus_xp = 200
    elif streak == 100:
        bonus_xp = 500

    if bonus_xp:
        award_xp.delay(student_id, "streak_bonus", None, bonus_xp)

    return {"status": "ok", "xp_awarded": xp_amount}


# ---------------------------------------------------------------------------
# IICRC CEC Report
# ---------------------------------------------------------------------------


@celery_app.task(
    name="send_iicrc_cec_report",
    bind=True,
    max_retries=3,
    default_retry_delay=300,  # 5 minutes
)
def send_iicrc_cec_report(self, data: dict) -> dict:
    """
    Send a CEC completion report email to IICRC Las Vegas.

    data keys: student_id, course_id, student_name, iicrc_member_number,
               student_email, course_title, iicrc_discipline, cec_hours,
               completion_date (ISO string), certificate_id
    """
    from datetime import date

    from sqlalchemy import select

    from src.db.lms_models import LMSCECReport
    from src.services.iicrc_reporter import send_cec_report

    report_id_str = data.get("report_id")
    if not report_id_str:
        return {"status": "no_report_id"}

    report_id = uuid.UUID(report_id_str)

    with SyncSessionLocal() as db:
        report = db.execute(
            select(LMSCECReport).where(LMSCECReport.id == report_id)
        ).scalar_one_or_none()

        if not report or report.status == "sent":
            return {"status": "already_sent_or_missing"}

        try:
            completion_date = date.fromisoformat(data["completion_date"])
            send_cec_report(
                student_name=data["student_name"],
                iicrc_member_number=data["iicrc_member_number"],
                student_email=data["student_email"],
                course_title=data["course_title"],
                iicrc_discipline=data["iicrc_discipline"],
                cec_hours=float(data["cec_hours"]),
                completion_date=completion_date,
                certificate_id=data.get("certificate_id", ""),
            )
            report.status = "sent"
            from datetime import datetime, timezone
            report.sent_at = datetime.now(timezone.utc)
            db.commit()
            return {"status": "sent"}

        except Exception as exc:
            report.retry_count += 1
            report.error_message = str(exc)
            db.commit()

            # Exponential backoff: 5m → 30m → 2h
            countdown = [300, 1800, 7200][min(self.request.retries, 2)]
            raise self.retry(exc=exc, countdown=countdown)
```

**Step 4: Run the tests to verify they pass**

```bash
cd apps/backend
C:\Users\Phill\AppData\Roaming\Python\Python313\Scripts\uv.exe run pytest tests/worker/test_xp_tasks.py -v
```

Expected: All tests PASSED.

**Step 5: Wire XP award into `handle_lesson_completed` and `handle_course_completed`**

In `tasks.py`, inside `handle_lesson_completed`, after the progress row is updated, add:

```python
# Award XP for lesson completion
award_xp.delay(str(student_id), "lesson_completed", str(lesson_id), 10)
```

Inside `handle_course_completed` (find the existing task), add after certificate creation:

```python
# Award XP for course completion
award_xp.delay(str(student_id), "course_completed", str(course_id), 100)

# Trigger IICRC CEC report if student has member number
_maybe_send_cec_report(db, student_id, course_id)
```

Add `_maybe_send_cec_report` helper function:

```python
def _maybe_send_cec_report(db, student_id: uuid.UUID, course_id: uuid.UUID) -> None:
    """Create a CEC report row and trigger the email task if eligible."""
    from sqlalchemy import select

    from src.db.lms_models import LMSCECReport, LMSCourse, LMSUser
    from datetime import date

    user = db.execute(
        select(LMSUser).where(LMSUser.id == student_id)
    ).scalar_one_or_none()

    if not user or not user.iicrc_member_number:
        return

    course = db.execute(
        select(LMSCourse).where(LMSCourse.id == course_id)
    ).scalar_one_or_none()

    if not course or not course.cec_hours or course.cec_hours <= 0:
        return

    if not getattr(course, "iicrc_discipline", None):
        return

    # Idempotency: check if already reported
    existing = db.execute(
        select(LMSCECReport).where(
            LMSCECReport.student_id == student_id,
            LMSCECReport.course_id == course_id,
            LMSCECReport.status == "sent",
        )
    ).scalar_one_or_none()

    if existing:
        return

    report = LMSCECReport(
        student_id=student_id,
        course_id=course_id,
        iicrc_member_number=user.iicrc_member_number,
        email_to="cec@iicrc.org",
        status="pending",
    )
    db.add(report)
    db.flush()  # get report.id before commit

    send_iicrc_cec_report.delay({
        "report_id": str(report.id),
        "student_id": str(student_id),
        "course_id": str(course_id),
        "student_name": user.full_name,
        "iicrc_member_number": user.iicrc_member_number,
        "student_email": user.email,
        "course_title": course.title,
        "iicrc_discipline": course.iicrc_discipline,
        "cec_hours": float(course.cec_hours),
        "completion_date": date.today().isoformat(),
        "certificate_id": "",  # populated if certificate exists
    })
```

**Step 6: Run all worker tests**

```bash
cd apps/backend
C:\Users\Phill\AppData\Roaming\Python\Python313\Scripts\uv.exe run pytest tests/worker/ -v
```

**Step 7: Commit**

```bash
git add apps/backend/src/worker/tasks.py apps/backend/tests/worker/test_xp_tasks.py
git commit -m "feat(worker): award_xp + send_iicrc_cec_report Celery tasks, wired to lesson/course completion"
```

---

## Phase F: Backend — Admin CEC Reports

### Task 9: Admin CEC reports API

**Files:**

- Modify: `apps/backend/src/api/routes/lms_admin.py`

**Step 1: Add two endpoints to `lms_admin.py`**

Find the end of `lms_admin.py` and add:

```python
# ---- CEC Reports ----

class CECReportOut(BaseModel):
    id: str
    student_id: str
    course_id: str
    iicrc_member_number: str
    email_to: str
    status: str
    sent_at: str | None
    error_message: str | None
    retry_count: int
    created_at: str


@router.get("/cec-reports", response_model=list[CECReportOut])
async def list_cec_reports(
    status_filter: str | None = None,
    db: AsyncSession = Depends(get_async_db),
    current_user: LMSUser = Depends(get_current_lms_user),
) -> list[CECReportOut]:
    """Admin: list all CEC report submissions. Filter by status=pending|sent|failed."""
    if "admin" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Admin access required.")

    from src.db.lms_models import LMSCECReport

    query = select(LMSCECReport).order_by(LMSCECReport.created_at.desc())
    if status_filter:
        query = query.where(LMSCECReport.status == status_filter)

    result = await db.execute(query)
    reports = result.scalars().all()
    return [
        CECReportOut(
            id=str(r.id),
            student_id=str(r.student_id),
            course_id=str(r.course_id),
            iicrc_member_number=r.iicrc_member_number,
            email_to=r.email_to,
            status=r.status,
            sent_at=r.sent_at.isoformat() if r.sent_at else None,
            error_message=r.error_message,
            retry_count=r.retry_count,
            created_at=r.created_at.isoformat(),
        )
        for r in reports
    ]


@router.post("/cec-reports/{report_id}/retry")
async def retry_cec_report(
    report_id: str,
    db: AsyncSession = Depends(get_async_db),
    current_user: LMSUser = Depends(get_current_lms_user),
) -> dict:
    """Admin: manually retry a failed CEC report."""
    if "admin" not in current_user.roles:
        raise HTTPException(status_code=403, detail="Admin access required.")

    from uuid import UUID

    from src.db.lms_models import LMSCECReport
    from src.worker.tasks import send_iicrc_cec_report

    result = await db.execute(
        select(LMSCECReport).where(LMSCECReport.id == UUID(report_id))
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="CEC report not found.")

    report.status = "pending"
    report.error_message = None
    await db.commit()

    send_iicrc_cec_report.delay({"report_id": report_id})
    return {"queued": True}
```

**Step 2: Run existing admin tests to ensure no regression**

```bash
cd apps/backend
C:\Users\Phill\AppData\Roaming\Python\Python313\Scripts\uv.exe run pytest tests/api/test_lms_admin.py -v
```

Expected: All existing tests PASSED.

**Step 3: Commit**

```bash
git add apps/backend/src/api/routes/lms_admin.py
git commit -m "feat(admin): GET /api/lms/admin/cec-reports + manual retry endpoint"
```

---

## Phase G: Route Registration

### Task 10: Register all new routers

**Files:**

- Modify: `apps/backend/src/api/routes/__init__.py`
- Modify: `apps/backend/src/api/main.py`
- Test: verify via `curl` or `pytest`

**Step 1: Update `routes/__init__.py`**

Add these three imports:

```python
from . import lms_gamification  # noqa: F401
from . import lms_subscription  # noqa: F401
from . import lms_webhooks      # noqa: F401
```

**Step 2: Update `main.py`**

In the import block, add:

```python
    lms_gamification,
    lms_subscription,
    lms_webhooks,
```

In the `include_router` block, add (find the section where pathways and migration are added):

```python
app.include_router(lms_gamification.router)
app.include_router(lms_subscription.router)
app.include_router(lms_webhooks.router)
```

**Step 3: Verify the app starts clean**

```bash
cd apps/backend
C:\Users\Phill\AppData\Roaming\Python\Python313\Scripts\uv.exe run python -c "from src.api.main import app; print('App OK', len(app.routes), 'routes')"
```

Expected: `App OK <N> routes` (number increases by ~7 new endpoints).

**Step 4: Run full backend test suite**

```bash
cd apps/backend
C:\Users\Phill\AppData\Roaming\Python\Python313\Scripts\uv.exe run pytest tests/api/ -v --tb=short
```

Expected: All existing tests pass, new tests pass.

**Step 5: Commit**

```bash
git add apps/backend/src/api/routes/__init__.py apps/backend/src/api/main.py
git commit -m "feat(api): register gamification, subscription, and webhook routers"
```

---

## Phase H: Frontend Components

### Task 11: XPLevelBadge component

**Files:**

- Create: `apps/web/components/lms/XPLevelBadge.tsx`

**Step 1: Create the component**

```tsx
'use client';

interface XPLevelBadgeProps {
  totalXp: number;
  currentLevel: number;
  levelTitle: string;
  xpToNextLevel: number | null;
}

const LEVEL_COLOURS: Record<number, string> = {
  1: 'bg-zinc-800 text-zinc-300',
  2: 'bg-emerald-950 text-emerald-400',
  3: 'bg-cyan-950 text-cyan-400',
  4: 'bg-blue-950 text-blue-400',
  5: 'bg-purple-950 text-purple-400',
  6: 'bg-amber-950 text-amber-400',
};

export function XPLevelBadge({
  totalXp,
  currentLevel,
  levelTitle,
  xpToNextLevel,
}: XPLevelBadgeProps) {
  const colourClass = LEVEL_COLOURS[currentLevel] ?? LEVEL_COLOURS[1];

  return (
    <div className="flex flex-col gap-1">
      <div
        className={`inline-flex items-center gap-2 rounded-sm px-3 py-1.5 font-mono text-sm font-semibold ${colourClass}`}
      >
        <span className="text-xs opacity-60">LVL {currentLevel}</span>
        <span>{levelTitle}</span>
        <span className="text-xs opacity-60">{totalXp.toLocaleString()} XP</span>
      </div>
      {xpToNextLevel !== null && (
        <p className="font-mono text-xs text-white/40">
          {xpToNextLevel.toLocaleString()} XP to next level
        </p>
      )}
    </div>
  );
}
```

**Step 2: Verify TypeScript**

```bash
cd apps/web
pnpm turbo run type-check --filter=web 2>&1 | tail -5
```

Expected: No errors mentioning `XPLevelBadge`.

**Step 3: Commit**

```bash
git add apps/web/components/lms/XPLevelBadge.tsx
git commit -m "feat(ui): XPLevelBadge component — level title + XP display"
```

---

### Task 12: StreakTracker component

**Files:**

- Create: `apps/web/components/lms/StreakTracker.tsx`

**Step 1: Create the component**

```tsx
'use client';

interface StreakTrackerProps {
  currentStreak: number;
  longestStreak: number;
}

export function StreakTracker({ currentStreak, longestStreak }: StreakTrackerProps) {
  const isHot = currentStreak >= 7;

  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-1.5">
        <span
          className={`text-2xl transition-all ${isHot ? 'drop-shadow-[0_0_8px_#f97316]' : 'opacity-40'}`}
          aria-label="streak flame"
        >
          🔥
        </span>
        <div className="flex flex-col">
          <span className="font-mono text-xl leading-none font-bold text-white">
            {currentStreak}
          </span>
          <span className="text-xs text-white/40">day streak</span>
        </div>
      </div>

      {longestStreak > 0 && (
        <div className="flex flex-col border-l border-white/10 pl-4">
          <span className="font-mono text-sm leading-none text-white/60">{longestStreak}</span>
          <span className="text-xs text-white/30">best streak</span>
        </div>
      )}

      {currentStreak >= 7 && (
        <span className="rounded-sm bg-amber-950 px-2 py-0.5 font-mono text-xs text-amber-400">
          7-day bonus active
        </span>
      )}
    </div>
  );
}
```

**Step 2: Verify TypeScript**

```bash
cd apps/web
pnpm turbo run type-check --filter=web 2>&1 | tail -5
```

**Step 3: Commit**

```bash
git add apps/web/components/lms/StreakTracker.tsx
git commit -m "feat(ui): StreakTracker component — flame icon + day count"
```

---

### Task 13: CECProgressRing component

**Files:**

- Create: `apps/web/components/lms/CECProgressRing.tsx`

**Step 1: Create the SVG ring component**

```tsx
'use client';

interface CECProgressRingProps {
  cecEarned: number;
  cecRequired?: number; // default: 8 (IICRC standard 3-year cycle)
  discipline?: string;
}

export function CECProgressRing({ cecEarned, cecRequired = 8, discipline }: CECProgressRingProps) {
  const radius = 40;
  const stroke = 6;
  const normalised = Math.min(cecEarned / cecRequired, 1);
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - normalised);
  const percentage = Math.round(normalised * 100);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative inline-flex items-center justify-center">
        <svg width={100} height={100} className="-rotate-90">
          {/* Background track */}
          <circle
            cx={50}
            cy={50}
            r={radius}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={stroke}
            fill="none"
          />
          {/* Progress arc */}
          <circle
            cx={50}
            cy={50}
            r={radius}
            stroke={normalised >= 1 ? '#00FF88' : '#00F5FF'}
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="butt"
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="font-mono text-xl leading-none font-bold text-white">{cecEarned}</span>
          <span className="text-xs leading-none text-white/40">/{cecRequired}</span>
          <span className="mt-0.5 text-[10px] leading-none text-white/30">CECs</span>
        </div>
      </div>

      <div className="flex flex-col items-center gap-0.5">
        {discipline && <span className="font-mono text-xs text-cyan-400">{discipline}</span>}
        <span className="text-xs text-white/40">{percentage}% of 3-year cycle</span>
        {normalised >= 1 && (
          <span className="font-mono text-xs text-emerald-400">Renewal requirement met</span>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Verify TypeScript**

```bash
cd apps/web
pnpm turbo run type-check --filter=web 2>&1 | tail -5
```

**Step 3: Commit**

```bash
git add apps/web/components/lms/CECProgressRing.tsx
git commit -m "feat(ui): CECProgressRing — SVG progress ring for IICRC CEC tracking"
```

---

### Task 14: SubscriptionStatus component

**Files:**

- Create: `apps/web/components/lms/SubscriptionStatus.tsx`

**Step 1: Create the component**

```tsx
'use client';

type SubStatus = 'trialling' | 'active' | 'past_due' | 'cancelled' | 'unpaid' | null;

interface SubscriptionStatusProps {
  status: SubStatus;
  trialEnd?: string | null; // ISO date string
  periodEnd?: string | null; // ISO date string
  onManage?: () => void;
  onSubscribe?: () => void;
}

const STATUS_CONFIG: Record<NonNullable<SubStatus>, { label: string; colour: string }> = {
  trialling: { label: 'Free Trial Active', colour: 'text-amber-400 bg-amber-950' },
  active: { label: 'Pro Subscriber', colour: 'text-emerald-400 bg-emerald-950' },
  past_due: { label: 'Payment Overdue', colour: 'text-red-400 bg-red-950' },
  cancelled: { label: 'Cancelled', colour: 'text-zinc-400 bg-zinc-800' },
  unpaid: { label: 'Unpaid', colour: 'text-red-400 bg-red-950' },
};

function _formatDate(iso: string | null | undefined): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('en-AU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function SubscriptionStatus({
  status,
  trialEnd,
  periodEnd,
  onManage,
  onSubscribe,
}: SubscriptionStatusProps) {
  if (!status) {
    return (
      <div className="flex flex-col gap-2">
        <p className="text-sm text-white/50">No active subscription.</p>
        {onSubscribe && (
          <button
            onClick={onSubscribe}
            className="rounded-sm bg-cyan-600 px-4 py-2 font-mono text-sm text-white transition-colors hover:bg-cyan-500"
          >
            Start 7-Day Free Trial — $795 AUD/year
          </button>
        )}
      </div>
    );
  }

  const config = STATUS_CONFIG[status];
  const dateLabel =
    status === 'trialling' && trialEnd
      ? `Trial ends ${_formatDate(trialEnd)}`
      : periodEnd
        ? `Renews ${_formatDate(periodEnd)}`
        : null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <span
          className={`inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1 font-mono text-xs font-semibold ${config.colour}`}
        >
          {config.label}
        </span>
        {dateLabel && <span className="text-xs text-white/40">{dateLabel}</span>}
      </div>
      {onManage && (
        <button
          onClick={onManage}
          className="text-left text-xs text-white/40 underline transition-colors hover:text-white/60"
        >
          Manage subscription →
        </button>
      )}
    </div>
  );
}
```

**Step 2: Verify TypeScript**

```bash
cd apps/web
pnpm turbo run type-check --filter=web 2>&1 | tail -5
```

**Step 3: Commit**

```bash
git add apps/web/components/lms/SubscriptionStatus.tsx
git commit -m "feat(ui): SubscriptionStatus — trial/active/cancelled badge + CTA"
```

---

### Task 15: IICRCIdentityCard component

**Files:**

- Create: `apps/web/components/lms/IICRCIdentityCard.tsx`

**Step 1: Create the component**

```tsx
'use client';

interface IICRCCertification {
  discipline: string;
  certified_at: string; // ISO date
}

interface IICRCIdentityCardProps {
  memberNumber?: string | null;
  cardImageUrl?: string | null;
  expiryDate?: string | null;
  certifications?: IICRCCertification[];
  cecEarned?: number;
  cecRequired?: number;
  onEdit?: () => void;
}

function _formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-AU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function IICRCIdentityCard({
  memberNumber,
  cardImageUrl,
  expiryDate,
  certifications = [],
  cecEarned = 0,
  cecRequired = 8,
  onEdit,
}: IICRCIdentityCardProps) {
  if (!memberNumber) {
    return (
      <div className="flex flex-col gap-3 rounded-sm border border-white/[0.06] bg-zinc-900/50 p-6">
        <p className="text-sm text-white/50">
          No IICRC membership linked. Add your IICRC member number to track your CEC credits and
          renewal status.
        </p>
        {onEdit && (
          <button
            onClick={onEdit}
            className="text-left text-sm text-cyan-400 underline transition-colors hover:text-cyan-300"
          >
            + Add IICRC member number
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 rounded-sm border border-white/[0.06] bg-zinc-900/50 p-6">
      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="font-mono text-xs tracking-widest text-white/40 uppercase">IICRC Member</p>
          <p className="font-mono text-2xl font-bold text-white">{memberNumber}</p>
          {expiryDate && (
            <p className="text-xs text-white/40">
              Renewal due: <span className="text-white/70">{_formatDate(expiryDate)}</span>
            </p>
          )}
        </div>

        {cardImageUrl && (
          <img
            src={cardImageUrl}
            alt="IICRC member card"
            className="h-16 rounded-sm border border-white/[0.08] object-cover"
          />
        )}
      </div>

      {/* Certifications */}
      {certifications.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="font-mono text-xs tracking-widest text-white/40 uppercase">
            Certifications
          </p>
          <div className="flex flex-wrap gap-2">
            {certifications.map((cert) => (
              <div
                key={cert.discipline}
                className="flex flex-col items-center rounded-sm border border-white/[0.06] bg-zinc-800 px-3 py-2"
              >
                <span className="font-mono text-sm font-bold text-cyan-400">{cert.discipline}</span>
                <span className="text-xs text-white/30">{_formatDate(cert.certified_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {onEdit && (
        <button
          onClick={onEdit}
          className="text-left text-xs text-white/30 underline transition-colors hover:text-white/50"
        >
          Edit IICRC details
        </button>
      )}
    </div>
  );
}
```

**Step 2: Verify TypeScript**

```bash
cd apps/web
pnpm turbo run type-check --filter=web 2>&1 | tail -5
```

**Step 3: Commit**

```bash
git add apps/web/components/lms/IICRCIdentityCard.tsx
git commit -m "feat(ui): IICRCIdentityCard — member number, certifications, card image"
```

---

## Phase I: Frontend Pages

### Task 16: Subscribe page — pricing + trial CTA

**Files:**

- Create: `apps/web/app/(public)/subscribe/page.tsx`

**Step 1: Create the page**

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';

async function startCheckout(userId: string): Promise<string> {
  const resp = await fetch(`${API}/api/lms/subscription/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': userId,
    },
    body: JSON.stringify({
      success_url: `${window.location.origin}/subscribe/success`,
      cancel_url: `${window.location.origin}/subscribe`,
    }),
  });
  if (!resp.ok) throw new Error('Failed to create checkout session');
  const data = await resp.json();
  return data.url;
}

export default function SubscribePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubscribe() {
    setLoading(true);
    setError(null);
    try {
      const userId = localStorage.getItem('carsi_user_id') ?? '';
      const url = await startCheckout(userId);
      window.location.href = url;
    } catch (e) {
      setError('Could not start checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#050505] px-4 py-16 text-white">
      <div className="flex w-full max-w-lg flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col gap-3">
          <h1 className="font-mono text-3xl font-bold text-white">CARSI Professional</h1>
          <p className="text-sm leading-relaxed text-white/60">
            Unlimited access to all CARSI courses. One subscription — every restoration discipline.
            Required for NRPG membership.
          </p>
        </div>

        {/* Pricing card */}
        <div className="flex flex-col gap-6 rounded-sm border border-white/[0.08] bg-zinc-900/50 p-8">
          <div className="flex items-baseline gap-2">
            <span className="font-mono text-5xl font-bold text-white">$795</span>
            <span className="font-mono text-white/40">AUD / year</span>
          </div>

          <ul className="flex flex-col gap-3 text-sm text-white/70">
            {[
              'All published CARSI courses — unlimited access',
              'IICRC CEC tracking dashboard',
              'Professional Identity Hub',
              'Monthly XP leaderboard',
              'NRPG membership prerequisite',
            ].map((feature) => (
              <li key={feature} className="flex items-start gap-2">
                <span className="mt-0.5 text-emerald-400">✓</span>
                {feature}
              </li>
            ))}
          </ul>

          <div className="flex flex-col gap-3">
            <button
              onClick={handleSubscribe}
              disabled={loading}
              className="w-full rounded-sm bg-cyan-600 py-3 font-mono text-sm font-semibold text-white transition-colors hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? 'Opening checkout…' : 'Start 7-Day Free Trial'}
            </button>
            <p className="text-center text-xs text-white/30">
              Card required. No charge for 7 days. Cancel anytime.
            </p>
          </div>

          {error && <p className="rounded-sm bg-red-950 px-3 py-2 text-sm text-red-400">{error}</p>}
        </div>

        <p className="text-center text-xs leading-relaxed text-white/20">
          Prices in AUD. GST included. Billed annually. Subscription via Stripe — secure payment.
        </p>
      </div>
    </main>
  );
}
```

**Step 2: Verify TypeScript**

```bash
cd apps/web
pnpm turbo run type-check --filter=web 2>&1 | tail -5
```

**Step 3: Test in browser**

Start dev server (`pnpm dev --port 3009 --filter=web`) and visit `http://localhost:3009/subscribe`. Confirm the pricing card renders, the button is clickable, and disables during loading.

**Step 4: Commit**

```bash
git add apps/web/app/(public)/subscribe/page.tsx
git commit -m "feat(pages): /subscribe — $795 AUD/year pricing + 7-day free trial CTA"
```

---

### Task 17: Leaderboard page

**Files:**

- Create: `apps/web/app/(dashboard)/student/leaderboard/page.tsx`

**Step 1: Create the page**

```tsx
'use client';

import { useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';

interface LeaderboardEntry {
  rank: number;
  display_name: string;
  total_xp: number;
  current_level: number;
  level_title: string;
}

const LEVEL_COLOURS: Record<number, string> = {
  1: 'text-zinc-400',
  2: 'text-emerald-400',
  3: 'text-cyan-400',
  4: 'text-blue-400',
  5: 'text-purple-400',
  6: 'text-amber-400',
};

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API}/api/lms/gamification/leaderboard`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then(setEntries)
      .catch(() => setError('Could not load leaderboard.'))
      .finally(() => setLoading(false));
  }, []);

  const now = new Date();
  const monthLabel = now.toLocaleDateString('en-AU', { month: 'long', year: 'numeric' });

  return (
    <main className="flex max-w-2xl flex-col gap-6 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="font-mono text-2xl font-bold text-white">Monthly Leaderboard</h1>
        <p className="text-sm text-white/40">{monthLabel} — top 20 by XP earned</p>
      </div>

      {loading && <p className="text-sm text-white/40">Loading…</p>}

      {error && <p className="text-sm text-red-400">{error}</p>}

      {!loading && !error && entries.length === 0 && (
        <p className="text-sm text-white/40">
          No activity recorded yet this month. Complete a lesson to appear!
        </p>
      )}

      {entries.length > 0 && (
        <div className="flex flex-col divide-y divide-white/[0.04]">
          {entries.map((entry) => {
            const isTop3 = entry.rank <= 3;
            const medals = ['', '🥇', '🥈', '🥉'];

            return (
              <div
                key={entry.rank}
                className={`flex items-center justify-between px-2 py-4 ${
                  isTop3 ? 'rounded-sm bg-white/[0.02]' : ''
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className="w-8 text-center font-mono text-white/40">
                    {isTop3 ? medals[entry.rank] : `#${entry.rank}`}
                  </span>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-mono text-sm text-white">{entry.display_name}</span>
                    <span
                      className={`font-mono text-xs ${LEVEL_COLOURS[entry.current_level] ?? 'text-zinc-400'}`}
                    >
                      Lvl {entry.current_level} — {entry.level_title}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-0.5">
                  <span className="font-mono text-sm font-bold text-white">
                    {entry.total_xp.toLocaleString()}
                  </span>
                  <span className="text-xs text-white/30">XP</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
```

**Step 2: Verify TypeScript**

```bash
cd apps/web
pnpm turbo run type-check --filter=web 2>&1 | tail -5
```

**Step 3: Test in browser**

Visit `http://localhost:3009/student/leaderboard`. Confirm the table renders (empty state if no XP events yet).

**Step 4: Commit**

```bash
git add apps/web/app/(dashboard)/student/leaderboard/page.tsx
git commit -m "feat(pages): /student/leaderboard — monthly XP leaderboard"
```

---

### Task 18: Student dashboard — Professional Identity Hub

**Files:**

- Modify: `apps/web/app/(dashboard)/student/page.tsx`

**Step 1: Read the current student page**

```bash
cat apps/web/app/(dashboard)/student/page.tsx
```

**Step 2: Replace the dashboard with the Professional Identity Hub**

The new student page composes all new components. It fetches:

- `GET /api/lms/gamification/me/level` → XP / level / streak data
- `GET /api/lms/subscription/status` → subscription badge
- `GET /api/lms/enrollments/me` → enrolled courses
- `GET /api/lms/auth/me` → IICRC profile fields

Implement the page using a composition of `XPLevelBadge`, `StreakTracker`, `CECProgressRing`, `IICRCIdentityCard`, and `SubscriptionStatus`. Each section fetches its own data independently so partial loading works.

The top of the page should show:

1. Professional Identity card (IICRC member number, certifications, CEC ring)
2. XP level badge + streak tracker in a row
3. Subscription status
4. Enrolled courses list (reuse existing `EnrolledCourseList` if it exists)

```tsx
'use client';

import { useEffect, useState } from 'react';
import { XPLevelBadge } from '@/components/lms/XPLevelBadge';
import { StreakTracker } from '@/components/lms/StreakTracker';
import { CECProgressRing } from '@/components/lms/CECProgressRing';
import { IICRCIdentityCard } from '@/components/lms/IICRCIdentityCard';
import { SubscriptionStatus } from '@/components/lms/SubscriptionStatus';

const API = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:8000';

function getUserId(): string {
  return typeof window !== 'undefined' ? (localStorage.getItem('carsi_user_id') ?? '') : '';
}

function authHeaders(): Record<string, string> {
  const id = getUserId();
  return id ? { 'X-User-Id': id } : {};
}

interface LevelData {
  total_xp: number;
  current_level: number;
  level_title: string;
  current_streak: number;
  longest_streak: number;
  xp_to_next_level: number | null;
}

interface SubData {
  has_subscription: boolean;
  status: string | null;
  plan: string | null;
  current_period_end: string | null;
  trial_end: string | null;
}

interface ProfileData {
  full_name: string;
  email: string;
  iicrc_member_number: string | null;
  iicrc_card_image_url: string | null;
  iicrc_expiry_date: string | null;
  iicrc_certifications: Array<{ discipline: string; certified_at: string }> | null;
}

export default function StudentDashboardPage() {
  const [level, setLevel] = useState<LevelData | null>(null);
  const [sub, setSub] = useState<SubData | null>(null);
  const [profile, setProfile] = useState<ProfileData | null>(null);

  useEffect(() => {
    const headers = authHeaders();
    if (!headers['X-User-Id']) return;

    fetch(`${API}/api/lms/gamification/me/level`, { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then(setLevel)
      .catch(() => null);

    fetch(`${API}/api/lms/subscription/status`, { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then(setSub)
      .catch(() => null);

    fetch(`${API}/api/lms/auth/me`, { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then(setProfile)
      .catch(() => null);
  }, []);

  function handleManageSubscription() {
    const headers = authHeaders();
    fetch(`${API}/api/lms/subscription/portal`, { method: 'POST', headers })
      .then((r) => r.json())
      .then((data) => {
        if (data.url) window.location.href = data.url;
      })
      .catch(() => null);
  }

  function handleSubscribe() {
    window.location.href = '/subscribe';
  }

  // CEC data derived from profile (total across all disciplines)
  const certifications = profile?.iicrc_certifications ?? [];

  return (
    <div className="flex max-w-4xl flex-col gap-8 p-6">
      <h1 className="font-mono text-2xl font-bold text-white">
        {profile?.full_name ?? 'My Dashboard'}
      </h1>

      {/* --- Professional Identity Row --- */}
      <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* IICRC Identity Card */}
        <div className="flex flex-col gap-3">
          <h2 className="font-mono text-xs tracking-widest text-white/40 uppercase">
            IICRC Identity
          </h2>
          <IICRCIdentityCard
            memberNumber={profile?.iicrc_member_number}
            cardImageUrl={profile?.iicrc_card_image_url}
            expiryDate={profile?.iicrc_expiry_date}
            certifications={certifications}
          />
        </div>

        {/* CEC Progress */}
        {profile?.iicrc_member_number && (
          <div className="flex flex-col items-center gap-3">
            <h2 className="self-start font-mono text-xs tracking-widest text-white/40 uppercase">
              CEC Progress
            </h2>
            <CECProgressRing
              cecEarned={0} // TODO: sum from lms_cec_transactions in future ticket
              cecRequired={8}
              discipline={certifications[0]?.discipline}
            />
          </div>
        )}
      </section>

      {/* --- XP + Streak Row --- */}
      <section className="flex flex-col gap-3">
        <h2 className="font-mono text-xs tracking-widest text-white/40 uppercase">
          Progress & Streak
        </h2>
        <div className="flex flex-wrap items-center gap-6">
          {level ? (
            <>
              <XPLevelBadge
                totalXp={level.total_xp}
                currentLevel={level.current_level}
                levelTitle={level.level_title}
                xpToNextLevel={level.xp_to_next_level}
              />
              <StreakTracker
                currentStreak={level.current_streak}
                longestStreak={level.longest_streak}
              />
            </>
          ) : (
            <p className="text-sm text-white/30">Loading…</p>
          )}
        </div>
      </section>

      {/* --- Subscription Status --- */}
      <section className="flex flex-col gap-3">
        <h2 className="font-mono text-xs tracking-widest text-white/40 uppercase">Subscription</h2>
        <SubscriptionStatus
          status={sub?.has_subscription ? (sub.status as any) : null}
          trialEnd={sub?.trial_end}
          periodEnd={sub?.current_period_end}
          onManage={sub?.has_subscription ? handleManageSubscription : undefined}
          onSubscribe={!sub?.has_subscription ? handleSubscribe : undefined}
        />
      </section>
    </div>
  );
}
```

**Step 3: Verify TypeScript**

```bash
cd apps/web
pnpm turbo run type-check --filter=web 2>&1 | tail -5
```

**Step 4: Test in browser**

Visit `http://localhost:3009/student`. Confirm all three sections render. The IICRC card should show the "no member number" state for test users. The XP badge should show "Apprentice / 0 XP" (no events yet). Subscription should show the "Start Trial" CTA.

**Step 5: Commit**

```bash
git add apps/web/app/(dashboard)/student/page.tsx
git commit -m "feat(pages): student dashboard — Professional Identity Hub with XP, streak, IICRC card, subscription"
```

---

## Phase J: Verification

### Task 19: Full integration verification

**Step 1: Run the full backend test suite**

```bash
cd apps/backend
C:\Users\Phill\AppData\Roaming\Python\Python313\Scripts\uv.exe run pytest tests/ -v --tb=short 2>&1 | tail -20
```

Expected: All prior tests pass + new gamification, subscription, webhook tests pass.

**Step 2: Run frontend type-check and lint**

```bash
cd apps/web
pnpm turbo run type-check lint --filter=web 2>&1 | tail -10
```

Expected: No errors.

**Step 3: Smoke test the new endpoints**

Start backend: `cd apps/backend && .venv\Scripts\uvicorn.exe src.api.main:app --reload --port 8000`

```bash
# Check gamification level endpoint (uses known student UUID)
curl -s -H "X-User-Id: 87159e2e-39ff-4cbc-acfd-2f85cff07bd0" \
  http://localhost:8000/api/lms/gamification/me/level | python -m json.tool

# Check subscription status
curl -s -H "X-User-Id: 87159e2e-39ff-4cbc-acfd-2f85cff07bd0" \
  http://localhost:8000/api/lms/subscription/status | python -m json.tool

# Check leaderboard (public)
curl -s http://localhost:8000/api/lms/gamification/leaderboard | python -m json.tool
```

Expected responses: `200 OK` with valid JSON bodies.

**Step 4: Verify Mailpit receives email (when Celery is running)**

Celery worker: `cd apps/backend && .venv\Scripts\celery.exe -A src.worker.celery_app worker --loglevel=info`

Trigger a course completion event via the lesson completion API, then check Mailpit at `http://localhost:8025` for the CEC report email.

**Step 5: Final commit**

```bash
git add -A
git commit -m "feat: gamification, $795 subscription, IICRC CEC reporting — all features wired and tested"
```

---

## Environment Variables to Add

Add these to `apps/backend/.env.local` before testing Stripe live:

```bash
STRIPE_SECRET_KEY=sk_test_...         # from Stripe dashboard
STRIPE_WEBHOOK_SECRET=whsec_...       # from Stripe CLI: stripe listen --print-secret
STRIPE_YEARLY_PRICE_ID=price_...      # create in Stripe: $795 AUD/year, trial_period_days=7
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_FROM=admin@carsi.com.au
```

---

## Stripe Setup (One-Time, Before Testing Checkout)

1. Create product in Stripe Dashboard: "CARSI Professional Subscription"
2. Create price: $795.00 AUD, recurring, annual
3. Copy the `price_xxx` ID → set as `STRIPE_YEARLY_PRICE_ID`
4. Run Stripe CLI for local webhooks:
   ```bash
   stripe listen --forward-to localhost:8000/api/lms/webhooks/stripe
   ```
5. Copy the `whsec_xxx` secret → set as `STRIPE_WEBHOOK_SECRET`

---

## Open Questions (Confirm Before Go-Live)

1. **IICRC email address** — confirm `cec@iicrc.org` is correct with IICRC America
2. **IICRC report format** — confirm per-completion email (not monthly batch) is acceptable
3. **SPF/DKIM** — configure for `admin@carsi.com.au` before sending to IICRC
4. **NRPG proof format** — what does NRPG accept as evidence of active subscription?
