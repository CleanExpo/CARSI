# CARSI LMS — Full Rebuild Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild the CARSI Learning Management System (carsi.com.au) as a modern, scalable Node.js/Python full-stack application using NodeJS-Starter-V1 as the framework foundation, preserving all existing course data and adding Google Drive content integration.

**Architecture:** Next.js 15 frontend (React Server Components) + FastAPI backend, PostgreSQL for relational LMS data, Redis for session caching and job queues, Google Drive for course content storage. All services run locally via Docker in development.

**Tech Stack:**

- Frontend: Next.js 15, React 19, TypeScript 5.7, Tailwind CSS v4, shadcn/ui
- Backend: FastAPI (Python 3.12+), SQLAlchemy 2.0, Alembic, Pydantic v2
- Database: PostgreSQL 15 + pgvector, Redis 7
- Auth: JWT cookie-based (built into starter)
- Content: Google Drive API v3 (OAuth2)
- Project Tracking: Linear (API key in .env)
- Dev tooling: Docker, pnpm 9+, Vitest, Playwright, Pytest

---

## Project Context

CARSI is an LMS for **Restoration Courses & Training Online** — targeting building restoration and conservation trade professionals in Australia. The existing site is WordPress/WooCommerce-based. This rebuild replaces it with a custom Node.js stack, migrating:

- Courses, modules, lessons, quiz data
- Student accounts and enrolment history
- Instructor roles and content
- Course content (PDFs, videos) stored in Google Drive

**User Roles:**

1. **Admin** — Full platform control
2. **Instructor** — Create/manage their own courses
3. **Student** — Enrol and complete courses

---

## Phase 0: Foundation Setup

### Task 0.1: Clone & Initialise Framework

**Files:**

- Creates: `C:/CARSI/` (entire project from clone)

**Step 1: Clone the NodeJS-Starter-V1 into C:/CARSI**

```bash
cd /c
git clone https://github.com/CleanExpo/NodeJS-Starter-V1.git CARSI
cd CARSI
```

**Step 2: Verify prerequisites are installed**

```bash
node --version   # Expected: v20.x.x or higher
pnpm --version   # Expected: 9.x.x or higher
python --version # Expected: Python 3.12.x or higher
docker --version # Expected: Docker Desktop running
```

**Step 3: Install dependencies**

```bash
pnpm install
```

Expected: All workspace packages resolved with no errors.

**Step 4: Verify initial tests pass on the starter**

```bash
pnpm turbo run test
```

Expected: 343+ tests passing (inherited from starter).

**Step 5: Commit**

```bash
git add .
git commit -m "chore: initialise CARSI from NodeJS-Starter-V1 framework"
```

---

### Task 0.2: Create .env.local for Development

**Files:**

- Create: `.env.local` (DO NOT commit — add to .gitignore)
- Modify: `.env.example` (document all CARSI-specific variables)
- Modify: `.gitignore` (ensure .env.local is listed)

**Step 1: Verify .env.local is in .gitignore**

```bash
grep ".env.local" .gitignore
```

Expected: `.env.local` appears in output. If not, add it.

**Step 2: Create .env.local with all required variables**

Create the file at project root `C:/CARSI/.env.local`:

```env
# ============================================================
# CARSI LMS — Local Development Environment
# DO NOT COMMIT THIS FILE
# ============================================================

# Application
NODE_ENV=development
APP_URL=http://localhost:3000
API_URL=http://localhost:8000
APP_NAME="CARSI LMS"
APP_VERSION=0.1.0

# Database — PostgreSQL (Docker)
DATABASE_URL=postgresql://carsi_user:carsi_dev_pass@localhost:5432/carsi_dev
POSTGRES_USER=carsi_user
POSTGRES_PASSWORD=carsi_dev_pass
POSTGRES_DB=carsi_dev

# Redis (Docker)
REDIS_URL=redis://localhost:6379

# JWT Auth
JWT_SECRET_KEY=carsi-local-dev-secret-change-in-production-min-32-chars
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=60
JWT_REFRESH_TOKEN_EXPIRE_DAYS=30

# Admin Seed Account
ADMIN_EMAIL=admin@carsi.local
ADMIN_PASSWORD=CARSIadmin2026!

# AI Provider (Local Ollama — free, no API key needed)
AI_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b

# Linear Project Tracking
LINEAR_API_KEY=lin_api_REDACTED
LINEAR_TEAM_ID=
LINEAR_PROJECT_ID=

# Google Drive Integration (OAuth2 — see Task 0.4 for setup)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback
GOOGLE_DRIVE_FOLDER_ID=

# Storage
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=100

# Email (Development — use Mailpit via Docker)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=noreply@carsi.local

# Feature Flags
FEATURE_GOOGLE_DRIVE=true
FEATURE_AI_RECOMMENDATIONS=false
FEATURE_PAYMENTS=false
```

**Step 3: Update .env.example with CARSI variables (safe to commit)**

Copy .env.local to .env.example and replace all sensitive values with placeholder comments.

**Step 4: Commit .env.example only**

```bash
git add .env.example .gitignore
git commit -m "chore: add CARSI environment variable template"
```

---

### Task 0.3: Configure Docker for CARSI Services

**Files:**

- Modify: `docker-compose.yml` (rename databases, add Mailpit)
- Create: `docker-compose.dev.yml` (CARSI-specific overrides)

**Step 1: Check existing docker-compose.yml**

Read `docker-compose.yml` to understand existing service configuration.

**Step 2: Update database name and credentials to match .env.local**

Change PostgreSQL service to use:

```yaml
environment:
  POSTGRES_USER: carsi_user
  POSTGRES_PASSWORD: carsi_dev_pass
  POSTGRES_DB: carsi_dev
```

**Step 3: Add Mailpit service for local email testing**

```yaml
mailpit:
  image: axllent/mailpit:latest
  ports:
    - '1025:1025' # SMTP
    - '8025:8025' # Web UI at http://localhost:8025
  restart: unless-stopped
```

**Step 4: Start Docker services**

```bash
pnpm run docker:up
```

Expected: postgres, redis, mailpit containers running.

**Step 5: Verify database connection**

```bash
docker exec -it carsi_postgres psql -U carsi_user -d carsi_dev -c "\dt"
```

Expected: Empty table list (no tables yet).

**Step 6: Commit**

```bash
git add docker-compose.yml
git commit -m "chore: configure Docker services for CARSI development"
```

---

### Task 0.4: Set Up Google Drive OAuth2

> NOTE: This task requires browser interaction. Do it manually following these steps.

**Step 1: Go to Google Cloud Console**

URL: https://console.cloud.google.com/

**Step 2: Create a new project**

- Project name: `CARSI-LMS-Dev`
- Click Create

**Step 3: Enable Google Drive API**

- APIs & Services → Library → search "Google Drive API" → Enable

**Step 4: Create OAuth2 Credentials**

- APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID
- Application type: Web application
- Name: `CARSI LMS Dev`
- Authorised redirect URIs: `http://localhost:3000/api/auth/google/callback`
- Download the JSON — extract `client_id` and `client_secret`

**Step 5: Update .env.local**

```env
GOOGLE_CLIENT_ID=<paste from downloaded JSON>
GOOGLE_CLIENT_SECRET=<paste from downloaded JSON>
```

**Step 6: Create a CARSI folder in Google Drive**

- In Google Drive, create a folder named `CARSI-LMS-Content`
- Right-click → Get link → copy the folder ID (the long string after `/folders/`)
- Update .env.local:
  ```env
  GOOGLE_DRIVE_FOLDER_ID=<paste folder ID>
  ```

---

### Task 0.5: Configure Linear Project

**Files:**

- Create: `scripts/setup-linear.sh`

**Step 1: Verify Linear API key works**

```bash
curl -s -X POST https://api.linear.app/graphql \
  -H "Authorization: lin_api_REDACTED" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ viewer { id name } }"}' | python -m json.tool
```

Expected: JSON with your Linear user name.

**Step 2: Fetch your team ID**

```bash
curl -s -X POST https://api.linear.app/graphql \
  -H "Authorization: lin_api_REDACTED" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ teams { nodes { id name } } }"}' | python -m json.tool
```

Expected: List of teams. Copy the team `id` for CARSI.

**Step 3: Create CARSI project in Linear**

```bash
curl -s -X POST https://api.linear.app/graphql \
  -H "Authorization: lin_api_REDACTED" \
  -H "Content-Type: application/json" \
  -d '{"query": "mutation { projectCreate(input: { name: \"CARSI LMS Rebuild\", teamIds: [\"<TEAM_ID>\"] }) { project { id } } }"}' | python -m json.tool
```

**Step 4: Update .env.local with the IDs**

```env
LINEAR_TEAM_ID=<team id from step 2>
LINEAR_PROJECT_ID=<project id from step 3>
```

**Step 5: Commit setup script**

```bash
git add scripts/setup-linear.sh
git commit -m "chore: add Linear project setup script"
```

---

## Phase 1: LMS Database Schema

### Task 1.1: Design & Create LMS Tables (Migration)

**Files:**

- Create: `apps/backend/alembic/versions/001_lms_core_schema.py`
- Modify: `apps/backend/app/models/__init__.py`

**Step 1: Write the failing test for migration**

File: `apps/backend/tests/test_migrations.py`

```python
def test_lms_tables_exist(db_session):
    """Verify all LMS core tables are present after migration."""
    from sqlalchemy import inspect
    inspector = inspect(db_session.bind)
    tables = inspector.get_table_names()
    expected_tables = [
        "users", "roles", "user_roles",
        "courses", "modules", "lessons",
        "enrollments", "progress",
        "quizzes", "quiz_questions", "quiz_attempts",
        "drive_assets"
    ]
    for table in expected_tables:
        assert table in tables, f"Table '{table}' not found in database"
```

**Step 2: Run test to confirm it fails**

```bash
cd apps/backend
pytest tests/test_migrations.py -v
```

Expected: FAIL — tables don't exist yet.

**Step 3: Create the Alembic migration**

File: `apps/backend/alembic/versions/001_lms_core_schema.py`

```python
"""LMS core schema — users, courses, enrolments, progress, quizzes

Revision ID: 001
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid

revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # --- Users & Roles ---
    op.create_table('roles',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('name', sa.String(50), unique=True, nullable=False),
        sa.Column('description', sa.Text()),
    )

    op.create_table('users',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('email', sa.String(255), unique=True, nullable=False, index=True),
        sa.Column('hashed_password', sa.String(255), nullable=False),
        sa.Column('full_name', sa.String(255), nullable=False),
        sa.Column('avatar_url', sa.Text()),
        sa.Column('bio', sa.Text()),
        sa.Column('is_active', sa.Boolean(), default=True),
        sa.Column('is_verified', sa.Boolean(), default=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.text('now()')),
    )

    op.create_table('user_roles',
        sa.Column('user_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('role_id', sa.Integer(), sa.ForeignKey('roles.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('granted_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )

    # --- Courses ---
    op.create_table('courses',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('slug', sa.String(255), unique=True, nullable=False, index=True),
        sa.Column('title', sa.String(500), nullable=False),
        sa.Column('description', sa.Text()),
        sa.Column('short_description', sa.String(500)),
        sa.Column('thumbnail_url', sa.Text()),
        sa.Column('instructor_id', UUID(as_uuid=True), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('status', sa.String(50), default='draft'),  # draft|published|archived
        sa.Column('price_aud', sa.Numeric(10, 2), default=0),
        sa.Column('is_free', sa.Boolean(), default=False),
        sa.Column('duration_hours', sa.Numeric(5, 1)),
        sa.Column('level', sa.String(50)),  # beginner|intermediate|advanced
        sa.Column('category', sa.String(100)),
        sa.Column('tags', JSONB(), default=list),
        sa.Column('meta', JSONB(), default=dict),  # SEO, custom fields
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.text('now()')),
    )

    op.create_table('modules',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('course_id', UUID(as_uuid=True), sa.ForeignKey('courses.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(500), nullable=False),
        sa.Column('description', sa.Text()),
        sa.Column('order_index', sa.Integer(), nullable=False),
        sa.Column('is_preview', sa.Boolean(), default=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )

    op.create_table('lessons',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('module_id', UUID(as_uuid=True), sa.ForeignKey('modules.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(500), nullable=False),
        sa.Column('content_type', sa.String(50)),  # video|pdf|text|quiz|drive_file
        sa.Column('content_body', sa.Text()),  # Rich text or embed code
        sa.Column('drive_file_id', sa.String(255)),  # Google Drive file ID
        sa.Column('duration_minutes', sa.Integer()),
        sa.Column('order_index', sa.Integer(), nullable=False),
        sa.Column('is_preview', sa.Boolean(), default=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )

    # --- Enrolments & Progress ---
    op.create_table('enrollments',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('student_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('course_id', UUID(as_uuid=True), sa.ForeignKey('courses.id', ondelete='CASCADE'), nullable=False),
        sa.Column('enrolled_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('completed_at', sa.DateTime(timezone=True)),
        sa.Column('status', sa.String(50), default='active'),  # active|completed|suspended
        sa.Column('payment_reference', sa.String(255)),
        sa.UniqueConstraint('student_id', 'course_id', name='uq_enrollment'),
    )

    op.create_table('progress',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('enrollment_id', UUID(as_uuid=True), sa.ForeignKey('enrollments.id', ondelete='CASCADE'), nullable=False),
        sa.Column('lesson_id', UUID(as_uuid=True), sa.ForeignKey('lessons.id', ondelete='CASCADE'), nullable=False),
        sa.Column('completed_at', sa.DateTime(timezone=True)),
        sa.Column('time_spent_seconds', sa.Integer(), default=0),
        sa.UniqueConstraint('enrollment_id', 'lesson_id', name='uq_progress'),
    )

    # --- Assessments ---
    op.create_table('quizzes',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('lesson_id', UUID(as_uuid=True), sa.ForeignKey('lessons.id', ondelete='CASCADE'), nullable=False),
        sa.Column('title', sa.String(500), nullable=False),
        sa.Column('pass_percentage', sa.Integer(), default=70),
        sa.Column('time_limit_minutes', sa.Integer()),
        sa.Column('attempts_allowed', sa.Integer(), default=3),
    )

    op.create_table('quiz_questions',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('quiz_id', UUID(as_uuid=True), sa.ForeignKey('quizzes.id', ondelete='CASCADE'), nullable=False),
        sa.Column('question_text', sa.Text(), nullable=False),
        sa.Column('question_type', sa.String(50), default='multiple_choice'),  # multiple_choice|true_false|short_answer
        sa.Column('options', JSONB()),  # [{"text": "...", "is_correct": true}]
        sa.Column('explanation', sa.Text()),
        sa.Column('order_index', sa.Integer(), nullable=False),
        sa.Column('points', sa.Integer(), default=1),
    )

    op.create_table('quiz_attempts',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('quiz_id', UUID(as_uuid=True), sa.ForeignKey('quizzes.id', ondelete='CASCADE'), nullable=False),
        sa.Column('student_id', UUID(as_uuid=True), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('answers', JSONB()),  # {question_id: answer}
        sa.Column('score_percentage', sa.Numeric(5, 2)),
        sa.Column('passed', sa.Boolean()),
        sa.Column('started_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('completed_at', sa.DateTime(timezone=True)),
    )

    # --- Google Drive Assets ---
    op.create_table('drive_assets',
        sa.Column('id', UUID(as_uuid=True), primary_key=True, default=uuid.uuid4),
        sa.Column('drive_file_id', sa.String(255), unique=True, nullable=False),
        sa.Column('file_name', sa.String(500), nullable=False),
        sa.Column('mime_type', sa.String(100)),
        sa.Column('file_size_bytes', sa.BigInteger()),
        sa.Column('drive_url', sa.Text()),
        sa.Column('uploaded_by', UUID(as_uuid=True), sa.ForeignKey('users.id')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
    )

    # Seed default roles
    op.execute("""
        INSERT INTO roles (name, description) VALUES
        ('admin', 'Full platform administrator'),
        ('instructor', 'Can create and manage courses'),
        ('student', 'Can enrol in and complete courses')
    """)


def downgrade() -> None:
    for table in ['drive_assets', 'quiz_attempts', 'quiz_questions', 'quizzes',
                  'progress', 'enrollments', 'lessons', 'modules', 'courses',
                  'user_roles', 'users', 'roles']:
        op.drop_table(table)
```

**Step 4: Run the migration**

```bash
cd apps/backend
alembic upgrade head
```

Expected: `Running upgrade  -> 001` with no errors.

**Step 5: Run the test again**

```bash
pytest tests/test_migrations.py -v
```

Expected: PASS

**Step 6: Commit**

```bash
git add apps/backend/alembic/versions/001_lms_core_schema.py \
        apps/backend/tests/test_migrations.py
git commit -m "feat(db): add LMS core schema migration — users, courses, enrollments, quizzes"
```

---

## Phase 2: SQLAlchemy Models

### Task 2.1: Create Python ORM Models

**Files:**

- Create: `apps/backend/app/models/user.py`
- Create: `apps/backend/app/models/course.py`
- Create: `apps/backend/app/models/enrollment.py`
- Create: `apps/backend/app/models/quiz.py`
- Create: `apps/backend/app/models/drive_asset.py`
- Modify: `apps/backend/app/models/__init__.py`

**Step 1: Write model tests first**

File: `apps/backend/tests/models/test_course_model.py`

```python
def test_create_course(db_session, instructor_user):
    from app.models.course import Course
    course = Course(
        slug="intro-to-restoration",
        title="Introduction to Restoration",
        instructor_id=instructor_user.id,
        status="draft",
        price_aud=299.00
    )
    db_session.add(course)
    db_session.commit()
    assert course.id is not None
    assert course.slug == "intro-to-restoration"
    assert course.status == "draft"
```

**Step 2: Run test to confirm failure**

```bash
pytest tests/models/test_course_model.py -v
```

Expected: FAIL — `app.models.course` does not exist.

**Step 3: Create `apps/backend/app/models/course.py`**

```python
from sqlalchemy import Column, String, Text, Boolean, Numeric, Integer, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from app.database import Base
import uuid

class Course(Base):
    __tablename__ = "courses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug = Column(String(255), unique=True, nullable=False, index=True)
    title = Column(String(500), nullable=False)
    description = Column(Text)
    short_description = Column(String(500))
    thumbnail_url = Column(Text)
    instructor_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    status = Column(String(50), default="draft")
    price_aud = Column(Numeric(10, 2), default=0)
    is_free = Column(Boolean, default=False)
    duration_hours = Column(Numeric(5, 1))
    level = Column(String(50))
    category = Column(String(100))
    tags = Column(JSONB, default=list)
    meta = Column(JSONB, default=dict)

    # Relationships
    instructor = relationship("User", back_populates="courses_taught")
    modules = relationship("Module", back_populates="course", cascade="all, delete-orphan",
                           order_by="Module.order_index")
    enrollments = relationship("Enrollment", back_populates="course")
```

> Follow the same pattern for `user.py`, `enrollment.py`, `quiz.py`, `drive_asset.py`. Each maps 1:1 to the migration schema above.

**Step 4: Run tests**

```bash
pytest tests/models/ -v
```

Expected: All model tests PASS.

**Step 5: Commit**

```bash
git add apps/backend/app/models/
git commit -m "feat(models): add SQLAlchemy ORM models for all LMS entities"
```

---

## Phase 3: Authentication & User Roles

### Task 3.1: Extend Auth to Support LMS Roles

**Files:**

- Modify: `apps/backend/app/api/v1/auth.py`
- Create: `apps/backend/app/services/user_service.py`
- Create: `apps/backend/tests/test_auth_roles.py`

**Step 1: Write failing test**

```python
def test_student_registration(client):
    response = client.post("/api/v1/auth/register", json={
        "email": "student@test.carsi.local",
        "password": "TestPass123!",
        "full_name": "Test Student",
        "role": "student"
    })
    assert response.status_code == 201
    data = response.json()
    assert data["role"] == "student"
    assert "access_token" not in data  # No auto-login; must verify email
```

**Step 2: Run to confirm failure**

```bash
pytest tests/test_auth_roles.py::test_student_registration -v
```

Expected: FAIL

**Step 3: Implement role assignment in registration endpoint**

In `apps/backend/app/api/v1/auth.py`, after creating the user:

```python
# Assign default 'student' role on registration
role = db.query(Role).filter_by(name=registration_data.role or "student").first()
if role:
    db.add(UserRole(user_id=new_user.id, role_id=role.id))
    db.commit()
```

**Step 4: Run test**

```bash
pytest tests/test_auth_roles.py -v
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/backend/app/api/v1/auth.py apps/backend/tests/test_auth_roles.py
git commit -m "feat(auth): add role-based registration — student, instructor, admin"
```

---

## Phase 4: Course API (Backend)

### Task 4.1: CRUD Endpoints for Courses

**Files:**

- Create: `apps/backend/app/api/v1/courses.py`
- Create: `apps/backend/app/schemas/course.py`
- Create: `apps/backend/tests/api/test_courses.py`
- Modify: `apps/backend/app/api/v1/__init__.py`

**Step 1: Write failing tests for course CRUD**

```python
def test_create_course_as_instructor(authenticated_instructor_client):
    response = authenticated_instructor_client.post("/api/v1/courses", json={
        "title": "Roof Restoration Fundamentals",
        "slug": "roof-restoration-fundamentals",
        "description": "Learn the basics of roof restoration in Australia.",
        "price_aud": "349.00",
        "level": "beginner",
        "category": "Roof Restoration"
    })
    assert response.status_code == 201
    data = response.json()
    assert data["slug"] == "roof-restoration-fundamentals"
    assert data["status"] == "draft"

def test_student_cannot_create_course(authenticated_student_client):
    response = authenticated_student_client.post("/api/v1/courses", json={
        "title": "Fake Course", "slug": "fake"
    })
    assert response.status_code == 403

def test_list_published_courses_public(client):
    response = client.get("/api/v1/courses")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
```

**Step 2: Run to confirm failure**

```bash
pytest tests/api/test_courses.py -v
```

Expected: All FAIL — route doesn't exist.

**Step 3: Create course schema `apps/backend/app/schemas/course.py`**

```python
from pydantic import BaseModel, Field
from typing import Optional, List
from decimal import Decimal
from uuid import UUID

class CourseCreate(BaseModel):
    title: str = Field(..., max_length=500)
    slug: str = Field(..., max_length=255, pattern=r'^[a-z0-9-]+$')
    description: Optional[str] = None
    short_description: Optional[str] = Field(None, max_length=500)
    price_aud: Decimal = Field(default=0, ge=0)
    is_free: bool = False
    level: Optional[str] = Field(None, pattern=r'^(beginner|intermediate|advanced)$')
    category: Optional[str] = None
    tags: List[str] = []

class CourseOut(CourseCreate):
    id: UUID
    instructor_id: UUID
    status: str
    model_config = {"from_attributes": True}

class CourseListOut(BaseModel):
    items: List[CourseOut]
    total: int
    page: int
    per_page: int
```

**Step 4: Create course router `apps/backend/app/api/v1/courses.py`**

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.course import Course
from app.schemas.course import CourseCreate, CourseOut, CourseListOut
from app.api.deps import require_role, get_current_user

router = APIRouter(prefix="/courses", tags=["courses"])

@router.post("", response_model=CourseOut, status_code=201)
async def create_course(
    data: CourseCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["instructor", "admin"]))
):
    course = Course(**data.model_dump(), instructor_id=current_user.id, status="draft")
    db.add(course)
    db.commit()
    db.refresh(course)
    return course

@router.get("", response_model=CourseListOut)
async def list_courses(
    page: int = 1,
    per_page: int = 20,
    category: str = None,
    level: str = None,
    db: Session = Depends(get_db)
):
    query = db.query(Course).filter(Course.status == "published")
    if category:
        query = query.filter(Course.category == category)
    if level:
        query = query.filter(Course.level == level)
    total = query.count()
    items = query.offset((page - 1) * per_page).limit(per_page).all()
    return CourseListOut(items=items, total=total, page=page, per_page=per_page)

@router.get("/{slug}", response_model=CourseOut)
async def get_course(slug: str, db: Session = Depends(get_db)):
    course = db.query(Course).filter_by(slug=slug).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return course
```

**Step 5: Run all course tests**

```bash
pytest tests/api/test_courses.py -v
```

Expected: All PASS.

**Step 6: Commit**

```bash
git add apps/backend/app/api/v1/courses.py \
        apps/backend/app/schemas/course.py \
        apps/backend/tests/api/test_courses.py
git commit -m "feat(api): course CRUD endpoints — create, list, get by slug"
```

---

## Phase 5: Google Drive Integration (Backend)

### Task 5.1: Google Drive Service

**Files:**

- Create: `apps/backend/app/services/google_drive.py`
- Create: `apps/backend/app/api/v1/drive.py`
- Create: `apps/backend/tests/services/test_google_drive.py`

**Step 1: Install Google API client**

```bash
cd apps/backend
pip install google-api-python-client google-auth-httplib2 google-auth-oauthlib
```

Add to `apps/backend/requirements.txt`:

```
google-api-python-client==2.116.0
google-auth-httplib2==0.2.0
google-auth-oauthlib==1.2.0
```

**Step 2: Write failing test (mock Drive API)**

```python
from unittest.mock import patch, MagicMock

def test_list_drive_files_in_folder(mock_drive_service):
    from app.services.google_drive import DriveService
    service = DriveService(credentials=mock_credentials)
    files = service.list_files_in_folder("test_folder_id")
    assert isinstance(files, list)
    assert len(files) >= 0

def test_get_file_metadata(mock_drive_service):
    from app.services.google_drive import DriveService
    service = DriveService(credentials=mock_credentials)
    metadata = service.get_file_metadata("test_file_id")
    assert "id" in metadata
    assert "name" in metadata
```

**Step 3: Create `apps/backend/app/services/google_drive.py`**

```python
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from typing import List, Dict, Optional
import os

class DriveService:
    SCOPES = ['https://www.googleapis.com/auth/drive.readonly']

    def __init__(self, credentials: Credentials):
        self.service = build('drive', 'v3', credentials=credentials)
        self.root_folder_id = os.getenv("GOOGLE_DRIVE_FOLDER_ID")

    def list_files_in_folder(self, folder_id: str = None) -> List[Dict]:
        folder = folder_id or self.root_folder_id
        results = self.service.files().list(
            q=f"'{folder}' in parents and trashed=false",
            fields="files(id, name, mimeType, size, webViewLink, createdTime)",
            orderBy="name"
        ).execute()
        return results.get('files', [])

    def get_file_metadata(self, file_id: str) -> Dict:
        return self.service.files().get(
            fileId=file_id,
            fields="id, name, mimeType, size, webViewLink, thumbnailLink"
        ).execute()

    def get_file_download_url(self, file_id: str) -> str:
        """Returns a short-lived direct download URL."""
        return f"https://drive.google.com/uc?export=download&id={file_id}"
```

**Step 4: Run tests**

```bash
pytest tests/services/test_google_drive.py -v
```

Expected: PASS.

**Step 5: Create Drive API endpoints**

File: `apps/backend/app/api/v1/drive.py`

```python
from fastapi import APIRouter, Depends, HTTPException
from app.services.google_drive import DriveService
from app.api.deps import get_google_credentials, require_role

router = APIRouter(prefix="/drive", tags=["drive"])

@router.get("/files")
async def list_drive_files(
    folder_id: str = None,
    credentials=Depends(get_google_credentials),
    current_user=Depends(require_role(["instructor", "admin"]))
):
    drive = DriveService(credentials)
    return drive.list_files_in_folder(folder_id)

@router.get("/files/{file_id}")
async def get_drive_file(
    file_id: str,
    credentials=Depends(get_google_credentials),
):
    drive = DriveService(credentials)
    return drive.get_file_metadata(file_id)
```

**Step 6: Commit**

```bash
git add apps/backend/app/services/google_drive.py \
        apps/backend/app/api/v1/drive.py \
        apps/backend/requirements.txt \
        apps/backend/tests/services/test_google_drive.py
git commit -m "feat(drive): Google Drive API integration — list and fetch course content files"
```

---

## Phase 6: Next.js Frontend — Course Catalog

### Task 6.1: Course Catalog Page

**Files:**

- Create: `apps/web/app/(public)/courses/page.tsx`
- Create: `apps/web/app/(public)/courses/[slug]/page.tsx`
- Create: `apps/web/components/lms/CourseCard.tsx`
- Create: `apps/web/components/lms/CourseGrid.tsx`

**Step 1: Write Vitest component test**

```typescript
// apps/web/tests/components/CourseCard.test.tsx
import { render, screen } from '@testing-library/react'
import { CourseCard } from '@/components/lms/CourseCard'

const mockCourse = {
  id: '1',
  slug: 'roof-restoration',
  title: 'Roof Restoration Fundamentals',
  short_description: 'Learn the basics',
  price_aud: 349,
  level: 'beginner',
  category: 'Roof Restoration',
  status: 'published',
  thumbnail_url: null,
  instructor: { full_name: 'Jane Smith' }
}

test('renders course title and price', () => {
  render(<CourseCard course={mockCourse} />)
  expect(screen.getByText('Roof Restoration Fundamentals')).toBeInTheDocument()
  expect(screen.getByText('$349.00')).toBeInTheDocument()
  expect(screen.getByText('beginner')).toBeInTheDocument()
})
```

**Step 2: Run to confirm failure**

```bash
cd apps/web
pnpm vitest run tests/components/CourseCard.test.tsx
```

Expected: FAIL — component doesn't exist.

**Step 3: Create `apps/web/components/lms/CourseCard.tsx`**

```tsx
import Link from 'next/link';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';

interface CourseCardProps {
  course: {
    id: string;
    slug: string;
    title: string;
    short_description?: string;
    price_aud: number;
    is_free?: boolean;
    level?: string;
    category?: string;
    thumbnail_url?: string;
    instructor?: { full_name: string };
  };
}

export function CourseCard({ course }: CourseCardProps) {
  const price = course.is_free ? 'Free' : `$${course.price_aud.toFixed(2)}`;

  return (
    <Card className="flex flex-col transition-shadow hover:shadow-lg">
      <Link href={`/courses/${course.slug}`}>
        <CardHeader className="p-0">
          <div className="bg-muted relative h-48 w-full overflow-hidden rounded-t-lg">
            {course.thumbnail_url ? (
              <Image src={course.thumbnail_url} alt={course.title} fill className="object-cover" />
            ) : (
              <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
                No preview
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-4">
          <h3 className="mb-2 text-lg leading-tight font-semibold">{course.title}</h3>
          {course.short_description && (
            <p className="text-muted-foreground line-clamp-2 text-sm">{course.short_description}</p>
          )}
          <div className="mt-3 flex gap-2">
            {course.level && <Badge variant="outline">{course.level}</Badge>}
            {course.category && <Badge variant="secondary">{course.category}</Badge>}
          </div>
        </CardContent>
        <CardFooter className="flex items-center justify-between p-4 pt-0">
          <span className="text-muted-foreground text-sm">{course.instructor?.full_name}</span>
          <span className="text-lg font-bold">{price}</span>
        </CardFooter>
      </Link>
    </Card>
  );
}
```

**Step 4: Create course catalog page `apps/web/app/(public)/courses/page.tsx`**

```tsx
import { CourseCard } from '@/components/lms/CourseCard';

async function getCourses(category?: string, level?: string) {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (level) params.set('level', level);
  const res = await fetch(`${process.env.API_URL}/api/v1/courses?${params}`, {
    next: { revalidate: 60 }, // ISR — revalidate every 60s
  });
  if (!res.ok) return { items: [], total: 0 };
  return res.json();
}

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: { category?: string; level?: string };
}) {
  const { items: courses, total } = await getCourses(searchParams.category, searchParams.level);

  return (
    <main className="container mx-auto px-4 py-12">
      <h1 className="mb-2 text-4xl font-bold">Restoration Training Courses</h1>
      <p className="text-muted-foreground mb-8">
        {total} course{total !== 1 ? 's' : ''} available
      </p>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {courses.map((course: any) => (
          <CourseCard key={course.id} course={course} />
        ))}
      </div>
      {courses.length === 0 && (
        <p className="text-muted-foreground mt-12 text-center">
          No courses found. Check back soon.
        </p>
      )}
    </main>
  );
}
```

**Step 5: Run tests**

```bash
pnpm vitest run tests/components/CourseCard.test.tsx
```

Expected: PASS.

**Step 6: Commit**

```bash
git add apps/web/components/lms/ apps/web/app/\(public\)/courses/
git commit -m "feat(frontend): course catalog page with CourseCard component"
```

---

## Phase 7: Enrolment System

### Task 7.1: Enrolment API Endpoints

**Files:**

- Create: `apps/backend/app/api/v1/enrollments.py`
- Create: `apps/backend/app/schemas/enrollment.py`
- Create: `apps/backend/tests/api/test_enrollments.py`

**Step 1: Write failing tests**

```python
def test_enroll_in_free_course(authenticated_student_client, free_course):
    response = authenticated_student_client.post(
        f"/api/v1/enrollments",
        json={"course_id": str(free_course.id)}
    )
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "active"

def test_cannot_enroll_twice(authenticated_student_client, enrolled_course):
    response = authenticated_student_client.post(
        "/api/v1/enrollments",
        json={"course_id": str(enrolled_course.id)}
    )
    assert response.status_code == 409  # Conflict

def test_get_my_enrolments(authenticated_student_client):
    response = authenticated_student_client.get("/api/v1/enrollments/me")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
```

**Step 2 - 6:** Follow same TDD pattern — implement schema, router, run tests, commit.

```bash
git commit -m "feat(api): enrollment endpoints — enroll, list my courses, check access"
```

---

## Phase 8: Student Dashboard (Frontend)

### Task 8.1: Student Dashboard Page

**Files:**

- Create: `apps/web/app/(dashboard)/student/page.tsx`
- Create: `apps/web/components/lms/EnrolledCourseList.tsx`
- Create: `apps/web/components/lms/ProgressBar.tsx`

**TDD pattern applies.** Test progress bar renders correct percentage, enrolled course list shows correct count.

```bash
git commit -m "feat(frontend): student dashboard — enrolled courses with progress tracking"
```

---

## Phase 9: Lesson Player

### Task 9.1: Lesson Content Player

Supports content types: `video`, `pdf`, `text`, `drive_file`.

**Files:**

- Create: `apps/web/app/(dashboard)/courses/[slug]/lessons/[lessonId]/page.tsx`
- Create: `apps/web/components/lms/LessonPlayer.tsx`
- Create: `apps/web/components/lms/DriveFileViewer.tsx`

Google Drive files render via `<iframe>` embed for PDFs, or direct video player for MP4s.

```bash
git commit -m "feat(frontend): lesson player — supports text, video, PDF, and Google Drive files"
```

---

## Phase 10: Quiz Engine

### Task 10.1: Quiz API

**Files:**

- Create: `apps/backend/app/api/v1/quizzes.py`
- Create: `apps/backend/app/services/quiz_service.py`

Handles: fetch quiz questions (randomised), submit answers, calculate score, check pass/fail, track attempts.

```bash
git commit -m "feat(api): quiz engine — submit answers, score calculation, attempt tracking"
```

### Task 10.2: Quiz UI

**Files:**

- Create: `apps/web/components/lms/QuizPlayer.tsx`
- Create: `apps/web/components/lms/QuizResult.tsx`

Multiple choice, true/false, timed quiz support.

```bash
git commit -m "feat(frontend): quiz player UI with timer and result display"
```

---

## Phase 11: Instructor Dashboard

### Task 11.1: Instructor Course Builder

**Files:**

- Create: `apps/web/app/(dashboard)/instructor/courses/new/page.tsx`
- Create: `apps/web/app/(dashboard)/instructor/courses/[slug]/edit/page.tsx`
- Create: `apps/web/components/lms/CourseBuilder.tsx`
- Create: `apps/web/components/lms/ModuleEditor.tsx`
- Create: `apps/web/components/lms/LessonEditor.tsx`
- Create: `apps/web/components/lms/DriveFilePicker.tsx`

DriveFilePicker uses the `/api/v1/drive/files` endpoint to browse and attach Google Drive files to lessons.

```bash
git commit -m "feat(frontend): instructor course builder with Google Drive file picker"
```

---

## Phase 12: Admin Panel

### Task 12.1: Admin Dashboard

**Files:**

- Create: `apps/web/app/(dashboard)/admin/page.tsx`
- Create: `apps/web/app/(dashboard)/admin/users/page.tsx`
- Create: `apps/web/app/(dashboard)/admin/courses/page.tsx`

Admin views: all users, role management, course approval workflow, platform metrics.

```bash
git commit -m "feat(frontend): admin panel — user management, course approval, metrics"
```

---

## Environment Variables Reference

| Variable                 | Description                   | Dev Value                                                         |
| ------------------------ | ----------------------------- | ----------------------------------------------------------------- |
| `DATABASE_URL`           | PostgreSQL connection string  | `postgresql://carsi_user:carsi_dev_pass@localhost:5432/carsi_dev` |
| `REDIS_URL`              | Redis connection string       | `redis://localhost:6379`                                          |
| `JWT_SECRET_KEY`         | JWT signing key               | See .env.local                                                    |
| `LINEAR_API_KEY`         | Linear project tracking       | `lin_api_REDACTED`                |
| `GOOGLE_CLIENT_ID`       | Google OAuth2 client ID       | From Google Cloud Console                                         |
| `GOOGLE_CLIENT_SECRET`   | Google OAuth2 client secret   | From Google Cloud Console                                         |
| `GOOGLE_DRIVE_FOLDER_ID` | Root Drive folder for content | From Google Drive                                                 |
| `AI_PROVIDER`            | AI provider selection         | `ollama` (local, free)                                            |

---

## Development Commands

```bash
# Start everything
pnpm run docker:up && pnpm dev

# Backend only
cd apps/backend && uvicorn app.main:app --reload

# Frontend only
cd apps/web && pnpm dev

# Run all tests
pnpm turbo run test

# Backend tests only
cd apps/backend && pytest -v

# Frontend tests only
cd apps/web && pnpm vitest run

# Reset database (destroy all data)
pnpm run docker:reset && cd apps/backend && alembic upgrade head

# View email (Mailpit UI)
open http://localhost:8025

# View API docs (FastAPI auto-generated)
open http://localhost:8000/docs
```

---

## Phase Summary

| Phase | Focus             | Key Deliverables                                   |
| ----- | ----------------- | -------------------------------------------------- |
| 0     | Foundation        | Clone, .env.local, Docker, Google OAuth, Linear    |
| 1     | Database          | All LMS tables via Alembic migration               |
| 2     | Models            | SQLAlchemy ORM for all entities                    |
| 3     | Auth              | Role-based registration (student/instructor/admin) |
| 4     | Course API        | CRUD endpoints with role gating                    |
| 5     | Google Drive      | Drive service + file browser API                   |
| 6     | Course Catalog    | Public Next.js course listing page                 |
| 7     | Enrolment         | Enrol in courses, access control                   |
| 8     | Student Dashboard | Progress tracking, enrolled courses                |
| 9     | Lesson Player     | Multi-format content (video, PDF, Drive)           |
| 10    | Quiz Engine       | Assessment with scoring and attempts               |
| 11    | Instructor Tools  | Course builder + Drive file picker                 |
| 12    | Admin Panel       | User management, course approval                   |
