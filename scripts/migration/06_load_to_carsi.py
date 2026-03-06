"""
Phase 6 - Load Extracted Data into CARSI PostgreSQL
Reads the output JSONs from phases 3-5 and inserts into the live CARSI database.

Load order:
  1. Users (skip existing emails, set temp password requiring reset)
  2. Courses (90 published, with slug generation + dedup)
  3. Modules (one "Course Content" module per course)
  4. Lessons (mapped to their module)
  5. Enrollments (mapped wp_id -> CARSI UUID for both user and course)

Safe to rerun — all inserts use ON CONFLICT DO NOTHING.

Usage:
    python scripts/migration/06_load_to_carsi.py [--dry-run]
"""

import json
import re
import sys
import uuid
from pathlib import Path

import psycopg2
import psycopg2.extras

OUTPUT_DIR = Path(__file__).parent / "output"
DB_URL = "postgresql://carsi_user:carsi_dev_pass@localhost:5433/carsi_dev"

# Phil (CARSI Admin) — instructor for all migrated courses
CARSI_ADMIN_ID = "8db8bbcb-66d3-40d2-b4be-13b420cf5146"

# Temp password for migrated users — bcrypt hash of "CarsiReset2026!"
# Generated with: bcrypt.hashpw(b"CarsiReset2026!", bcrypt.gensalt(rounds=12))
TEMP_PASSWORD_HASH = "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TiPbEYDj8kZwz.B5o4MptOc5pX.e"

DRY_RUN = "--dry-run" in sys.argv


def main():
    print(f"Loading migration data into CARSI PostgreSQL")
    print(f"Mode: {'DRY RUN (no writes)' if DRY_RUN else 'LIVE'}\n")

    courses_raw = json.loads((OUTPUT_DIR / "courses.json").read_text(encoding="utf-8"))
    lessons_raw = json.loads((OUTPUT_DIR / "lesson_content.json").read_text(encoding="utf-8"))
    users_raw = json.loads((OUTPUT_DIR / "users.json").read_text(encoding="utf-8"))
    enrollments_raw = json.loads((OUTPUT_DIR / "enrollments.json").read_text(encoding="utf-8"))

    pub_courses = [c for c in courses_raw if c["status"] == "publish"]
    print(f"Input: {len(pub_courses)} courses, {len(lessons_raw)} lessons, "
          f"{len(users_raw)} users, {len(enrollments_raw)} enrollments\n")

    conn = psycopg2.connect(DB_URL)
    psycopg2.extras.register_uuid()
    cur = conn.cursor()

    # Pre-load existing slugs and emails to avoid conflicts
    cur.execute("SELECT slug FROM lms_courses")
    existing_slugs: set[str] = {r[0] for r in cur.fetchall()}

    cur.execute("SELECT email, id FROM lms_users")
    existing_emails: dict[str, str] = {r[0]: str(r[1]) for r in cur.fetchall()}

    # Get role IDs
    cur.execute("SELECT name, id FROM lms_roles")
    role_map: dict[str, int] = {r[0]: r[1] for r in cur.fetchall()}
    student_role_id = role_map.get("student", 3)
    instructor_role_id = role_map.get("instructor", 2)
    admin_role_id = role_map.get("admin", 1)

    print(f"Existing slugs: {len(existing_slugs)}  |  Existing emails: {len(existing_emails)}\n")

    # ── 1. Users ──────────────────────────────────────────────────────────
    wp_user_to_carsi: dict[str, str] = {}  # wp_id -> CARSI UUID string

    # Map already-existing users
    for u in users_raw:
        if u["email"] in existing_emails:
            wp_user_to_carsi[u["wp_id"]] = existing_emails[u["email"]]

    users_inserted = 0
    users_skipped = 0

    for u in users_raw:
        if u["email"] in existing_emails:
            users_skipped += 1
            continue

        full_name = (
            f"{u['first_name']} {u['last_name']}".strip()
            or u["display_name"]
            or u["email"].split("@")[0]
        )
        new_id = str(uuid.uuid4())
        wp_user_to_carsi[u["wp_id"]] = new_id

        role = u.get("role", "student")
        role_id = {"admin": admin_role_id, "instructor": instructor_role_id}.get(
            role, student_role_id
        )

        if not DRY_RUN:
            cur.execute(
                """
                INSERT INTO lms_users
                  (id, email, hashed_password, full_name, is_active, is_verified,
                   theme_preference, created_at, updated_at)
                VALUES (%s, %s, %s, %s, true, false, 'light', now(), now())
                ON CONFLICT (email) DO NOTHING
                """,
                (new_id, u["email"], TEMP_PASSWORD_HASH, full_name),
            )
            # Assign role
            cur.execute(
                """
                INSERT INTO lms_user_roles (user_id, role_id)
                VALUES (%s, %s) ON CONFLICT DO NOTHING
                """,
                (new_id, role_id),
            )
        users_inserted += 1

    print(f"Users:   {users_inserted} inserted  |  {users_skipped} skipped (already exist)")

    # ── 2. Courses ────────────────────────────────────────────────────────
    wp_course_to_carsi: dict[str, str] = {}  # wp_id -> CARSI UUID string
    courses_inserted = 0
    courses_skipped = 0

    for c in pub_courses:
        base_slug = _slugify(c["title"])
        slug = base_slug
        # Deduplicate slug
        if slug in existing_slugs:
            slug = f"{base_slug}-{c['wp_id']}"
        if slug in existing_slugs:
            courses_skipped += 1
            # Still need to map it if it exists
            continue

        existing_slugs.add(slug)
        new_id = str(uuid.uuid4())
        wp_course_to_carsi[c["wp_id"]] = new_id

        price = float(c["price_aud"]) if c["price_aud"] else 0.0
        is_free = price == 0.0 or c.get("price_type") == "free"
        description = c.get("seo_description") or None

        meta = {
            "wp_id": c["wp_id"],
            "migration_source": "wordpress_carsi_2026",
            "woo_product_id": c.get("woo_product_id") or None,
            "price_type": c.get("price_type") or None,
        }

        if not DRY_RUN:
            cur.execute(
                """
                INSERT INTO lms_courses
                  (id, slug, title, description, instructor_id, status,
                   price_aud, is_free, level, meta, created_at, updated_at)
                VALUES (%s, %s, %s, %s, %s, 'published', %s, %s, 'beginner',
                        %s::jsonb, now(), now())
                ON CONFLICT (slug) DO NOTHING
                """,
                (
                    new_id, slug, c["title"], description,
                    CARSI_ADMIN_ID, price, is_free,
                    json.dumps(meta),
                ),
            )
        courses_inserted += 1

    print(f"Courses: {courses_inserted} inserted  |  {courses_skipped} skipped")

    # ── 3. Modules (one per course) ───────────────────────────────────────
    wp_course_to_module: dict[str, str] = {}  # wp_id -> module UUID

    modules_inserted = 0
    for wp_cid, carsi_cid in wp_course_to_carsi.items():
        mod_id = str(uuid.uuid4())
        wp_course_to_module[wp_cid] = mod_id
        if not DRY_RUN:
            cur.execute(
                """
                INSERT INTO lms_modules (id, course_id, title, order_index, created_at)
                VALUES (%s, %s, 'Course Content', 1, now())
                ON CONFLICT DO NOTHING
                """,
                (mod_id, carsi_cid),
            )
        modules_inserted += 1

    print(f"Modules: {modules_inserted} inserted")

    # ── 4. Lessons ────────────────────────────────────────────────────────
    lessons_inserted = 0
    lessons_skipped = 0

    # Only insert lessons that map to a course we successfully inserted
    mapped_lessons = [
        l for l in lessons_raw
        if l.get("parent_course_id") in wp_course_to_module
    ]

    for lesson in mapped_lessons:
        wp_cid = lesson["parent_course_id"]
        mod_id = wp_course_to_module.get(wp_cid)
        if not mod_id:
            lessons_skipped += 1
            continue

        lesson_id = str(uuid.uuid4())
        content_html = lesson.get("content_html") or ""
        # Detect content type
        if re.search(r'youtu\.be|youtube\.com', content_html):
            content_type = "video"
        elif len(content_html) > 100:
            content_type = "text"
        else:
            content_type = "text"

        if not DRY_RUN:
            cur.execute(
                """
                INSERT INTO lms_lessons
                  (id, module_id, title, content_type, content_body,
                   order_index, is_preview, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, false, now())
                ON CONFLICT DO NOTHING
                """,
                (
                    lesson_id, mod_id,
                    lesson["title"][:500],
                    content_type,
                    content_html or None,
                    lesson.get("order_index", 999),
                ),
            )
        lessons_inserted += 1

    print(f"Lessons: {lessons_inserted} inserted  |  {lessons_skipped} skipped")

    # ── 5. Enrollments ────────────────────────────────────────────────────
    enrollments_inserted = 0
    enrollments_skipped = 0

    for e in enrollments_raw:
        carsi_user_id = wp_user_to_carsi.get(e["user_wp_id"])
        carsi_course_id = wp_course_to_carsi.get(e["course_wp_id"])

        if not carsi_user_id or not carsi_course_id:
            enrollments_skipped += 1
            continue

        if not DRY_RUN:
            cur.execute(
                """
                INSERT INTO lms_enrollments
                  (id, student_id, course_id, status, payment_reference, enrolled_at)
                VALUES (%s, %s, %s, 'active', %s, now())
                ON CONFLICT ON CONSTRAINT uq_lms_enrollment DO NOTHING
                """,
                (
                    str(uuid.uuid4()),
                    carsi_user_id,
                    carsi_course_id,
                    f"wp_order_{e.get('order_id', 'direct')}",
                ),
            )
        enrollments_inserted += 1

    print(f"Enrollments: {enrollments_inserted} inserted  |  {enrollments_skipped} skipped "
          f"(unmapped user/course)")

    # ── Commit ────────────────────────────────────────────────────────────
    if not DRY_RUN:
        conn.commit()
        print("\n[OK] All changes committed to database.")
    else:
        conn.rollback()
        print("\n[DRY RUN] No changes written.")

    conn.close()

    # ── Summary ───────────────────────────────────────────────────────────
    print("\n" + "=" * 55)
    print("MIGRATION SUMMARY")
    print("=" * 55)
    print(f"  Users inserted:       {users_inserted:>5}")
    print(f"  Courses inserted:     {courses_inserted:>5}")
    print(f"  Modules inserted:     {modules_inserted:>5}")
    print(f"  Lessons inserted:     {lessons_inserted:>5}")
    print(f"  Enrollments inserted: {enrollments_inserted:>5}")
    print("=" * 55)


def _slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[-\s]+", "-", text)
    return text.strip("-")[:200]


if __name__ == "__main__":
    main()
