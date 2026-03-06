"""
Phase 3 - Course Structure Extraction
Extracts:
  - Published sfwd-courses with IDs and titles
  - sfwd-lessons mapped to their parent course (via post_parent or postmeta)
  - sfwd-topic mapped to their parent lesson
  - Key postmeta: _sfwd-courses_course_price, sfwd-courses_settings, etc.

Output:
  - scripts/migration/output/courses.json   — course list with metadata
  - scripts/migration/output/lessons.json   — lesson list with parent_course_id
  - scripts/migration/output/topics.json    — topic list with parent_lesson_id

Usage:
    python scripts/migration/03_course_structure.py
"""

import json
import re
from collections import defaultdict
from pathlib import Path

SQL_FILE = Path(r"C:\Users\Phill\Downloads\localhost.sql")
OUTPUT_DIR = Path(__file__).parent / "output"

# Only publish-status content (skip trash, draft, private)
KEEP_STATUSES = {"publish"}

# post_type -> category
LEARNDASH_TYPES = {
    "sfwd-courses": "course",
    "sfwd-lessons": "lesson",
    "sfwd-topic": "topic",
    "sfwd-quiz": "quiz",
}

# Postmeta keys we want to extract
WANTED_META = {
    # Price type: "closed" (WooCommerce), "paynow", "free"
    "_ld_price_type",
    # WooCommerce product ID that grants access: a:1:{i:0;s:5:"12345";}
    "_rsc_woo_users_product",
    # Lesson count (direct)
    "_ld_course_steps_count",
    # Lesson step tree (PHP serialised, contains lesson IDs)
    "ld_course_steps",
    # LearnDash course settings blob (PHP serialised, contains price for paynow)
    "_sfwd-courses",
    # SEO descriptions (best available course copy)
    "_aioseo_description",
    "_aioseo_title",
    # Course thumbnail attachment ID
    "_thumbnail_id",
    # Certificate template ID
    "_ld_certificate",
    # WooCommerce product price (on product posts)
    "_price",
    "_regular_price",
}


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    print(f"Scanning: {SQL_FILE}\n")

    # ── Pass 1: collect all posts we care about ────────────────────────────
    posts: dict[str, dict] = {}  # id -> {id, title, status, type, post_parent}

    with open(SQL_FILE, encoding="utf-8", errors="replace") as f:
        in_posts = False
        for line in f:
            stripped = line.rstrip()
            if re.match(r"^INSERT INTO `kvq_posts`", stripped, re.IGNORECASE):
                in_posts = True
                continue
            if in_posts:
                if stripped.startswith("("):
                    row = _strip_row(stripped)
                    fields = _parse_fields(row)
                    if len(fields) < 21:
                        continue
                    post_id = fields[0].strip("'")
                    post_title = _decode_html(fields[5].strip("'"))
                    post_status = fields[7].strip("'")
                    post_parent = fields[17].strip("'")
                    post_type = fields[20].strip("'")
                    if post_type in LEARNDASH_TYPES:
                        posts[post_id] = {
                            "id": post_id,
                            "title": post_title,
                            "status": post_status,
                            "type": post_type,
                            "post_parent": post_parent,
                        }
                    if stripped.endswith(";"):
                        in_posts = False
                else:
                    in_posts = False

    print(f"Collected {len(posts)} LearnDash posts from SQL.\n")

    # ── Pass 2: collect postmeta for our posts + WooCommerce products ────────
    # kvq_postmeta columns: meta_id, post_id, meta_key, meta_value
    postmeta: dict[str, dict[str, str]] = defaultdict(dict)  # post_id -> {key: value}
    # Also collect _price for ALL posts (so we can look up WooCommerce product prices)
    all_prices: dict[str, str] = {}  # post_id -> price

    with open(SQL_FILE, encoding="utf-8", errors="replace") as f:
        in_meta = False
        for line in f:
            stripped = line.rstrip()
            if re.match(r"^INSERT INTO `kvq_postmeta`", stripped, re.IGNORECASE):
                in_meta = True
                continue
            if in_meta:
                if stripped.startswith("("):
                    row = _strip_row(stripped)
                    fields = _parse_fields(row)
                    if len(fields) < 4:
                        continue
                    post_id = fields[1].strip("'")
                    meta_key = fields[2].strip("'")
                    meta_value = fields[3].strip("'")
                    if meta_key == "_price":
                        all_prices[post_id] = meta_value
                    if post_id in posts and meta_key in WANTED_META:
                        postmeta[post_id][meta_key] = meta_value
                    if stripped.endswith(";"):
                        in_meta = False
                else:
                    in_meta = False

    # ── Build output structures ────────────────────────────────────────────
    courses = []
    lessons = []
    topics = []

    for pid, p in posts.items():
        meta = postmeta.get(pid, {})

        # Resolve price
        price = None
        price_type = meta.get("_ld_price_type", "")

        # For "paynow" courses: price is in the _sfwd-courses PHP serialised blob
        if price_type == "paynow":
            sfwd_blob = meta.get("_sfwd-courses", "").replace('\\"', '"')
            pm = re.search(r'"sfwd-courses_course_price";s:\d+:"([^"]*)"', sfwd_blob)
            if pm:
                price = pm.group(1) or "0"

        # For "closed" courses: price comes from linked WooCommerce product
        woo_raw = meta.get("_rsc_woo_users_product", "")
        # Unescape SQL-escaped quotes before regex: \" -> "
        woo_raw_clean = woo_raw.replace('\\"', '"')
        # Extract first product ID from PHP serialised: a:1:{i:0;s:5:"19106";}
        woo_match = re.search(r'"(\d+)"', woo_raw_clean)
        if woo_match and price is None:
            price = all_prices.get(woo_match.group(1))
        if woo_match:
            woo_pid = woo_match.group(1)
            price = all_prices.get(woo_pid)

        entry = {
            "wp_id": pid,
            "title": p["title"],
            "status": p["status"],
            "post_parent": p["post_parent"],
            "price_aud": price,
            "price_type": meta.get("_ld_price_type", ""),
            "lesson_count": meta.get("_ld_course_steps_count", ""),
            "seo_description": meta.get("_aioseo_description", ""),
            "thumbnail_wp_id": meta.get("_thumbnail_id", ""),
            "certificate_wp_id": meta.get("_ld_certificate", ""),
            "woo_product_id": woo_match.group(1) if woo_match else "",

            "meta": meta,
        }
        t = p["type"]
        if t == "sfwd-courses":
            courses.append(entry)
        elif t == "sfwd-lessons":
            lessons.append(entry)
        elif t == "sfwd-topic":
            topics.append(entry)

    # Sort by numeric wp_id
    courses.sort(key=lambda x: int(x["wp_id"]))
    lessons.sort(key=lambda x: int(x["wp_id"]))
    topics.sort(key=lambda x: int(x["wp_id"]))

    # Save
    (OUTPUT_DIR / "courses.json").write_text(
        json.dumps(courses, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    (OUTPUT_DIR / "lessons.json").write_text(
        json.dumps(lessons, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    (OUTPUT_DIR / "topics.json").write_text(
        json.dumps(topics, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    # ── Report ─────────────────────────────────────────────────────────────
    pub_courses = [c for c in courses if c["status"] == "publish"]
    print("=" * 65)
    print(f"COURSES:  {len(courses)} total  |  {len(pub_courses)} published")
    print(f"LESSONS:  {len(lessons)} total")
    print(f"TOPICS:   {len(topics)} total")
    print("=" * 65)

    print("\n-- Published Courses with Price --")
    print(f"  {'WP_ID':>6}  {'AUD':>7}  {'Type':10}  {'Lessons':>7}  Title")
    print(f"  {'-'*6}  {'-'*7}  {'-'*10}  {'-'*7}  {'-'*40}")
    for c in sorted(pub_courses, key=lambda x: int(x["wp_id"])):
        price = f"${c['price_aud']}" if c["price_aud"] else "?"
        ptype = c["price_type"] or "?"
        lessons = c["lesson_count"] or "?"
        print(f"  {c['wp_id']:>6}  {price:>7}  {ptype:10}  {lessons:>7}  {c['title'][:55]}")

    print(f"\nOutput saved to: {OUTPUT_DIR}/")


def _strip_row(line: str) -> str:
    """Remove leading ( and trailing ),  or ); from a row line."""
    s = line.rstrip()
    if s.endswith(";"):
        s = s[:-1]
    elif s.endswith(","):
        s = s[:-1]
    if s.startswith("(") and s.endswith(")"):
        s = s[1:-1]
    return s


def _decode_html(s: str) -> str:
    return (
        s.replace("&#8211;", "-")
        .replace("&#8217;", "'")
        .replace("&#8216;", "'")
        .replace("&amp;", "&")
        .replace("&quot;", '"')
        .replace("&#8220;", '"')
        .replace("&#8221;", '"')
    )


def _parse_fields(row: str) -> list[str]:
    """Parse a comma-separated SQL row into fields, respecting quoted strings."""
    fields: list[str] = []
    current: list[str] = []
    in_string = False
    escape_next = False

    for ch in row:
        if escape_next:
            current.append(ch)
            escape_next = False
            continue
        if ch == "\\" and in_string:
            current.append(ch)
            escape_next = True
            continue
        if ch == "'":
            in_string = not in_string
            current.append(ch)
            continue
        if ch == "," and not in_string:
            fields.append("".join(current).strip())
            current = []
            continue
        current.append(ch)

    if current:
        fields.append("".join(current).strip())

    return fields


if __name__ == "__main__":
    main()
