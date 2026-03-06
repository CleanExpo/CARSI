#!/usr/bin/env python3
"""Seed the Scoping & Quoting for Restoration Professionals course.

Usage:
    cd apps/backend
    uv run python scripts/seed_scoping_quoting_course.py

Connects to the local PostgreSQL database using SyncSessionLocal and inserts
the course, 8 modules, and 32 lessons. Idempotent — skips if the course
slug already exists.
"""

import sys
import uuid
from decimal import Decimal
from pathlib import Path

# Ensure the backend package is importable
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select

from src.config.database import SyncSessionLocal
from src.db.lms_models import LMSCourse, LMSLesson, LMSModule

# ---------------------------------------------------------------------------
# Known seed IDs (from MEMORY.md / init-db.sql)
# ---------------------------------------------------------------------------
INSTRUCTOR_ID = uuid.UUID("e879d5c4-5a69-4c03-8e5e-49b52eee13b7")  # Sarah Mitchell

COURSE_SLUG = "scoping-quoting-restoration-professionals"

COURSE_DESCRIPTION = """\
Learn how to professionally scope, document and price water, fire and mould \
restoration jobs. This course covers site assessment, moisture mapping, \
IICRC S500 standards, pricing software (Xactimate, SimPRO), insurance \
processes and a capstone project where you produce a full job scope from \
initial inspection through to final quote.

Designed for restoration technicians, estimators and project managers who \
want to improve accuracy, reduce re-work and increase profitability on \
every job.

Topics include:
- Site inspection and evidence documentation
- Moisture mapping and affected-materials inventory
- Water, mould and fire/smoke scoping workflows
- Drying equipment selection and placement
- Industry pricing software and margin calculation
- Working with loss adjusters and supplement writing
- Client communication and dispute resolution
- Capstone: full residential and commercial case studies\
"""

# ---------------------------------------------------------------------------
# Course + Module + Lesson data
# ---------------------------------------------------------------------------

MODULES = [
    {
        "title": "Module 1: Introduction to Scoping",
        "order_index": 1,
        "lessons": [
            {"title": "What is a Scope of Works?", "order_index": 1, "content_type": "video", "duration_minutes": 12},
            {"title": "The Role of the Estimator", "order_index": 2, "content_type": "video", "duration_minutes": 10},
            {"title": "Industry Standards: IICRC S500 & AS/NZS", "order_index": 3, "content_type": "text", "duration_minutes": 15},
            {"title": "Module 1 Quiz", "order_index": 4, "content_type": "quiz", "duration_minutes": 10},
        ],
    },
    {
        "title": "Module 2: Site Assessment & Documentation",
        "order_index": 2,
        "lessons": [
            {"title": "Initial Site Inspection Checklist", "order_index": 1, "content_type": "video", "duration_minutes": 18},
            {"title": "Photography & Evidence Documentation", "order_index": 2, "content_type": "video", "duration_minutes": 14},
            {"title": "Moisture Mapping Fundamentals", "order_index": 3, "content_type": "video", "duration_minutes": 20},
            {"title": "Module 2 Quiz", "order_index": 4, "content_type": "quiz", "duration_minutes": 10},
        ],
    },
    {
        "title": "Module 3: Water Damage Scoping",
        "order_index": 3,
        "lessons": [
            {"title": "Category & Class of Water Damage", "order_index": 1, "content_type": "video", "duration_minutes": 16},
            {"title": "Affected Materials Inventory", "order_index": 2, "content_type": "video", "duration_minutes": 14},
            {"title": "Drying Equipment Selection & Placement", "order_index": 3, "content_type": "video", "duration_minutes": 18},
            {"title": "Scope Writing: Water Jobs", "order_index": 4, "content_type": "text", "duration_minutes": 25},
            {"title": "Module 3 Quiz", "order_index": 5, "content_type": "quiz", "duration_minutes": 12},
        ],
    },
    {
        "title": "Module 4: Mould & Contamination Scoping",
        "order_index": 4,
        "lessons": [
            {"title": "Mould Assessment Protocol", "order_index": 1, "content_type": "video", "duration_minutes": 20},
            {"title": "Air Sampling & Surface Testing", "order_index": 2, "content_type": "video", "duration_minutes": 15},
            {"title": "Containment & Negative Air Requirements", "order_index": 3, "content_type": "video", "duration_minutes": 12},
            {"title": "Scope Writing: Mould Jobs", "order_index": 4, "content_type": "text", "duration_minutes": 25},
        ],
    },
    {
        "title": "Module 5: Fire & Smoke Scoping",
        "order_index": 5,
        "lessons": [
            {"title": "Fire Damage Categories", "order_index": 1, "content_type": "video", "duration_minutes": 14},
            {"title": "Contents Inventory & Pack-Out Procedures", "order_index": 2, "content_type": "video", "duration_minutes": 18},
            {"title": "Smoke Odour Assessment", "order_index": 3, "content_type": "video", "duration_minutes": 12},
            {"title": "Scope Writing: Fire & Smoke Jobs", "order_index": 4, "content_type": "text", "duration_minutes": 25},
        ],
    },
    {
        "title": "Module 6: Pricing & Estimating",
        "order_index": 6,
        "lessons": [
            {"title": "Industry Pricing Software (Xactimate, SimPRO)", "order_index": 1, "content_type": "video", "duration_minutes": 22},
            {"title": "Labour Costing & Overhead Recovery", "order_index": 2, "content_type": "video", "duration_minutes": 18},
            {"title": "Equipment Hire vs. Own Rates", "order_index": 3, "content_type": "video", "duration_minutes": 14},
            {"title": "Margin, Markup & Profitability", "order_index": 4, "content_type": "video", "duration_minutes": 16},
            {"title": "Module 6 Quiz", "order_index": 5, "content_type": "quiz", "duration_minutes": 15},
        ],
    },
    {
        "title": "Module 7: Insurance & Client Communication",
        "order_index": 7,
        "lessons": [
            {"title": "Working with Loss Adjusters", "order_index": 1, "content_type": "video", "duration_minutes": 20},
            {"title": "Supplement Writing & Negotiation", "order_index": 2, "content_type": "video", "duration_minutes": 18},
            {"title": "Client Expectations & Dispute Resolution", "order_index": 3, "content_type": "video", "duration_minutes": 15},
            {"title": "Module 7 Quiz", "order_index": 4, "content_type": "quiz", "duration_minutes": 10},
        ],
    },
    {
        "title": "Module 8: Capstone — Full Job Scope",
        "order_index": 8,
        "lessons": [
            {"title": "Case Study: Residential Water Loss", "order_index": 1, "content_type": "text", "duration_minutes": 30},
            {"title": "Case Study: Commercial Fire Damage", "order_index": 2, "content_type": "text", "duration_minutes": 30},
            {"title": "Final Assessment", "order_index": 3, "content_type": "quiz", "duration_minutes": 45},
        ],
    },
]


def seed() -> None:
    """Insert the Scoping & Quoting course if it does not already exist."""
    with SyncSessionLocal() as db:
        existing = db.execute(
            select(LMSCourse).where(LMSCourse.slug == COURSE_SLUG)
        ).scalar_one_or_none()

        if existing:
            print(f"Course '{COURSE_SLUG}' already exists (id={existing.id}). Skipping.")
            return

        # -- Course ----------------------------------------------------------
        course = LMSCourse(
            id=uuid.uuid4(),
            slug=COURSE_SLUG,
            title="Scoping & Quoting for Restoration Professionals",
            short_description=(
                "Master the commercial and technical skills to scope, document "
                "and price water, fire and mould restoration jobs with confidence."
            ),
            description=COURSE_DESCRIPTION,
            instructor_id=INSTRUCTOR_ID,
            status="published",
            price_aud=Decimal("349.00"),
            is_free=False,
            level="intermediate",
            category="WRT — Water Damage Restoration",
            iicrc_discipline="WRT",
            cec_hours=Decimal("8.0"),
            tags=["scoping", "quoting", "estimating", "WRT", "restoration"],
            meta={"lesson_count": 32},
        )
        db.add(course)

        # -- Modules + Lessons -----------------------------------------------
        total_lessons = 0
        for mod_data in MODULES:
            module = LMSModule(
                id=uuid.uuid4(),
                course_id=course.id,
                title=mod_data["title"],
                order_index=mod_data["order_index"],
            )
            db.add(module)

            for lesson_data in mod_data["lessons"]:
                lesson = LMSLesson(
                    id=uuid.uuid4(),
                    module_id=module.id,
                    title=lesson_data["title"],
                    content_type=lesson_data["content_type"],
                    duration_minutes=lesson_data["duration_minutes"],
                    order_index=lesson_data["order_index"],
                )
                db.add(lesson)
                total_lessons += 1

        db.commit()
        print(
            f"Seeded course '{course.title}' (id={course.id}) "
            f"with {len(MODULES)} modules and {total_lessons} lessons."
        )


if __name__ == "__main__":
    seed()
    print("Done.")
