#!/usr/bin/env python3
"""Seed all WordPress courses from the migration export.

Usage:
    cd apps/backend
    uv run python scripts/seed_wordpress_courses.py

Reads data/wordpress-export/lms-courses.json and inserts all courses into
the PostgreSQL database. Idempotent — skips courses that already exist by slug.

Stats from export:
- 150 courses
- Categories preserved in meta
- IICRC discipline/CEC fields preserved where set
"""

import json
import sys
import uuid
from decimal import Decimal
from pathlib import Path
from typing import Any

# Ensure the backend package is importable
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert

from src.config.database import SyncSessionLocal
from src.db.lms_models import LMSCourse, LMSModule, LMSLesson

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
INSTRUCTOR_ID = uuid.UUID("e879d5c4-5a69-4c03-8e5e-49b52eee13b7")  # Sarah Mitchell
DATA_FILE = Path(__file__).resolve().parent.parent.parent.parent / "data" / "wordpress-export" / "lms-courses.json"

# ---------------------------------------------------------------------------
# Helper functions
# ---------------------------------------------------------------------------

def clean_html(text: str | None) -> str | None:
    """Strip HTML tags for cleaner storage (basic cleanup)."""
    if not text:
        return text
    # Keep HTML for description, just ensure it's not None
    return text.strip() if text else None


def parse_price(price_str: str | None) -> Decimal:
    """Parse price string to Decimal, default to 0."""
    if not price_str:
        return Decimal("0")
    try:
        # Remove currency symbols and whitespace
        cleaned = price_str.replace("$", "").replace(",", "").strip()
        return Decimal(cleaned) if cleaned else Decimal("0")
    except Exception:
        return Decimal("0")


def map_course_to_db(course_data: dict[str, Any], instructor_id: uuid.UUID) -> dict[str, Any]:
    """Map WordPress export course to database model fields."""
    # Parse price from meta if present
    price_aud = Decimal("0")
    if course_data.get("meta"):
        original_price = course_data["meta"].get("original_price", "")
        if original_price:
            price_aud = parse_price(original_price)
        elif course_data.get("price_aud"):
            price_aud = Decimal(str(course_data["price_aud"]))

    # Determine status
    status = course_data.get("status", "draft")
    if status == "publish":
        status = "published"
    elif status not in ["draft", "published", "archived"]:
        status = "draft"

    return {
        "slug": course_data["slug"],
        "title": course_data["title"],
        "description": clean_html(course_data.get("description")),
        "short_description": clean_html(course_data.get("short_description", ""))[:500] if course_data.get("short_description") else None,
        "thumbnail_url": course_data.get("thumbnail_url"),
        "instructor_id": instructor_id,
        "status": status,
        "price_aud": price_aud,
        "is_free": course_data.get("is_free", price_aud == Decimal("0")),
        "duration_hours": Decimal(str(course_data["duration_hours"])) if course_data.get("duration_hours") else None,
        "level": course_data.get("level"),
        "category": course_data.get("category"),
        "tags": course_data.get("tags", []),
        "iicrc_discipline": course_data.get("iicrc_discipline"),
        "cec_hours": Decimal(str(course_data["cec_hours"])) if course_data.get("cec_hours") else None,
        "cppp40421_unit_code": course_data.get("cppp40421_unit_code"),
        "cppp40421_unit_name": course_data.get("cppp40421_unit_name"),
        "meta": {
            "wp_id": course_data.get("wp_id"),
            "wp_permalink": course_data.get("wp_permalink"),
            "wp_categories": course_data.get("meta", {}).get("wp_categories", []),
            "wp_tags": course_data.get("meta", {}).get("wp_tags", []),
            "migrated_from": "wordpress",
            "migration_date": "2026-03-22",
        },
    }


def seed_courses() -> tuple[int, int, int]:
    """
    Seed all courses from WordPress export.

    Returns:
        Tuple of (created, skipped, errors)
    """
    # Load export data
    if not DATA_FILE.exists():
        print(f"ERROR: Data file not found: {DATA_FILE}")
        print("Run 'pnpm wp:migrate' first to export WordPress data.")
        sys.exit(1)

    with open(DATA_FILE, "r", encoding="utf-8") as f:
        courses_data = json.load(f)

    print(f"Loaded {len(courses_data)} courses from WordPress export")

    created = 0
    skipped = 0
    errors = 0

    with SyncSessionLocal() as session:
        # Get existing course slugs for idempotency
        existing_slugs = set(
            row[0] for row in session.execute(
                select(LMSCourse.slug)
            ).fetchall()
        )
        print(f"Found {len(existing_slugs)} existing courses in database")

        for course_data in courses_data:
            slug = course_data.get("slug")
            if not slug:
                print(f"  SKIP: Course missing slug - {course_data.get('title', 'Unknown')[:50]}")
                errors += 1
                continue

            if slug in existing_slugs:
                print(f"  SKIP: {slug} (already exists)")
                skipped += 1
                continue

            try:
                # Map data to database model
                db_data = map_course_to_db(course_data, INSTRUCTOR_ID)

                # Create course
                course = LMSCourse(**db_data)
                session.add(course)
                session.flush()  # Get ID assigned

                created += 1
                if created % 10 == 0:
                    print(f"  Created {created} courses...")

            except Exception as e:
                print(f"  ERROR: {slug} - {e}")
                errors += 1
                session.rollback()
                continue

        # Commit all changes
        session.commit()
        print(f"\nCommitted {created} new courses to database")

    return created, skipped, errors


def create_placeholder_module(session, course_id: uuid.UUID, course_title: str) -> None:
    """Create a placeholder module for imported courses."""
    module = LMSModule(
        course_id=course_id,
        title=f"Course Content",
        description=f"Content for {course_title}",
        order_index=1,
        is_preview=False,
    )
    session.add(module)
    session.flush()

    # Add a placeholder lesson
    lesson = LMSLesson(
        module_id=module.id,
        title="Introduction",
        content_type="text",
        content_body="Course content will be added here.",
        order_index=1,
        is_preview=True,
    )
    session.add(lesson)


def main():
    """Main entry point."""
    print("=" * 60)
    print("CARSI LMS - WordPress Course Migration Seed")
    print("=" * 60)
    print(f"Data file: {DATA_FILE}")
    print(f"Instructor ID: {INSTRUCTOR_ID}")
    print()

    created, skipped, errors = seed_courses()

    print()
    print("=" * 60)
    print("Migration Summary")
    print("=" * 60)
    print(f"  Created: {created}")
    print(f"  Skipped: {skipped} (already exist)")
    print(f"  Errors:  {errors}")
    print(f"  Total:   {created + skipped + errors}")
    print()

    if errors > 0:
        print("WARNING: Some courses failed to import. Check errors above.")
        sys.exit(1)

    print("SUCCESS: WordPress courses imported successfully!")
    print()
    print("Next steps:")
    print("  1. Review courses in the admin panel")
    print("  2. Add modules and lessons to each course")
    print("  3. Set IICRC discipline and CEC hours where applicable")
    print("  4. Publish courses when ready")


if __name__ == "__main__":
    main()
