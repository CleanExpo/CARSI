"""
Phase 4 - Lesson Content Extraction
Extracts:
  - post_content for each sfwd-lessons and sfwd-topic post
  - Maps lessons to their parent course via ld_course_steps (PHP serialised)
  - Maps topics to their parent lesson via post_parent

Output:
  - scripts/migration/output/lesson_content.json
    [{wp_id, title, content_html, content_text_preview, parent_course_id,
      parent_lesson_id, order_index, type}]

Usage:
    python scripts/migration/04_lesson_content.py
"""

import json
import re
from pathlib import Path

SQL_FILE = Path(r"C:\Users\Phill\Downloads\localhost.sql")
OUTPUT_DIR = Path(__file__).parent / "output"
COURSES_JSON = OUTPUT_DIR / "courses.json"


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    courses = json.loads(COURSES_JSON.read_text(encoding="utf-8"))
    pub_course_ids = {c["wp_id"] for c in courses if c["status"] == "publish"}

    print(f"Scanning: {SQL_FILE}\n")
    print(f"Published courses to map: {len(pub_course_ids)}\n")

    # ── Pass 1: collect posts (sfwd-lessons + sfwd-topic) with content ─────
    # kvq_posts columns (0-indexed):
    #   0=ID, 1=post_author, 2=post_date, 3=post_date_gmt, 4=post_content,
    #   5=post_title, 6=post_excerpt, 7=post_status, ..., 17=post_parent,
    #   ..., 20=post_type
    posts: dict[str, dict] = {}

    with open(SQL_FILE, encoding="utf-8", errors="replace") as f:
        in_posts = False
        for line in f:
            s = line.rstrip()
            if re.match(r"^INSERT INTO `kvq_posts`", s, re.IGNORECASE):
                in_posts = True
                continue
            if in_posts:
                if s.startswith("("):
                    row = _strip_row(s)
                    fields = _parse_fields(row)
                    if len(fields) < 21:
                        continue
                    post_type = fields[20].strip("'")
                    if post_type not in ("sfwd-lessons", "sfwd-topic"):
                        if s.endswith(";"):
                            in_posts = False
                        continue
                    post_id = fields[0].strip("'")
                    post_title = _decode_html(fields[5].strip("'"))
                    post_status = fields[7].strip("'")
                    post_parent = fields[17].strip("'")
                    # Content — unescape SQL escape sequences
                    content_raw = fields[4].strip("'")
                    content_html = _unescape_sql(content_raw)
                    # Plain text preview (strip HTML tags)
                    content_preview = re.sub(r"<[^>]+>", " ", content_html)
                    content_preview = re.sub(r"\s+", " ", content_preview).strip()[:200]

                    posts[post_id] = {
                        "wp_id": post_id,
                        "type": post_type,
                        "title": post_title,
                        "status": post_status,
                        "post_parent": post_parent,
                        "content_html": content_html,
                        "content_preview": content_preview,
                    }
                    if s.endswith(";"):
                        in_posts = False
                else:
                    in_posts = False

    print(f"Collected {len(posts)} lesson/topic posts\n")

    # ── Pass 2: read ld_course_steps postmeta to build course→lesson map ───
    # ld_course_steps value is PHP serialised:
    # a:7:{s:5:"steps";a:1:{s:1:"h";a:2:{s:12:"sfwd-lessons";a:N:{i:0;s:ID:"<id>"...
    course_lesson_order: dict[str, list[str]] = {}  # course_wp_id -> ordered lesson IDs

    with open(SQL_FILE, encoding="utf-8", errors="replace") as f:
        in_meta = False
        for line in f:
            s = line.rstrip()
            if re.match(r"^INSERT INTO `kvq_postmeta`", s, re.IGNORECASE):
                in_meta = True
                continue
            if in_meta:
                if s.startswith("("):
                    row = _strip_row(s)
                    fields = _parse_fields(row)
                    if len(fields) < 4:
                        continue
                    post_id = fields[1].strip("'")
                    meta_key = fields[2].strip("'")
                    if meta_key != "ld_course_steps":
                        if s.endswith(";"):
                            in_meta = False
                        continue
                    if post_id not in pub_course_ids:
                        if s.endswith(";"):
                            in_meta = False
                        continue

                    meta_value = fields[3].strip("'").replace('\\"', '"')
                    # Lesson IDs are PHP array INTEGER KEYS mapped to a:2:{} sub-arrays
                    # Format: i:LESSON_ID;a:2:{s:10:"sfwd-topic";a:N:{...}...}
                    # Only match i:NUMBER;a:2:{ — this identifies top-level lesson entries
                    lesson_ids = re.findall(r'i:(\d+);a:2:\{', meta_value)
                    if lesson_ids:
                        course_lesson_order[post_id] = lesson_ids

                    if s.endswith(";"):
                        in_meta = False
                else:
                    in_meta = False

    print(f"Course->lesson maps parsed: {len(course_lesson_order)} courses\n")

    # ── Build output ───────────────────────────────────────────────────────
    output = []

    # First: lessons mapped via ld_course_steps (authoritative order)
    mapped_ids: set[str] = set()
    for course_id, lesson_ids in course_lesson_order.items():
        for order_idx, lesson_id in enumerate(lesson_ids):
            if lesson_id in posts:
                p = posts[lesson_id]
                entry = {
                    "wp_id": lesson_id,
                    "type": p["type"],
                    "title": p["title"],
                    "status": p["status"],
                    "parent_course_id": course_id,
                    "parent_lesson_id": p["post_parent"] if p["type"] == "sfwd-topic" else None,
                    "order_index": order_idx + 1,
                    "content_html": p["content_html"],
                    "content_preview": p["content_preview"],
                }
                output.append(entry)
                mapped_ids.add(lesson_id)

    # Then: unmapped posts (orphans — add with post_parent as fallback)
    unmapped = [p for pid, p in posts.items() if pid not in mapped_ids]
    for p in unmapped:
        entry = {
            "wp_id": p["wp_id"],
            "type": p["type"],
            "title": p["title"],
            "status": p["status"],
            "parent_course_id": None,
            "parent_lesson_id": p["post_parent"] if p["type"] == "sfwd-topic" else None,
            "order_index": 999,
            "content_html": p["content_html"],
            "content_preview": p["content_preview"],
        }
        output.append(entry)

    (OUTPUT_DIR / "lesson_content.json").write_text(
        json.dumps(output, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    # ── Report ─────────────────────────────────────────────────────────────
    lessons = [x for x in output if x["type"] == "sfwd-lessons"]
    topics = [x for x in output if x["type"] == "sfwd-topic"]
    mapped_lessons = [x for x in lessons if x["parent_course_id"]]
    unmapped_lessons = [x for x in lessons if not x["parent_course_id"]]
    has_content = [x for x in output if len(x["content_html"]) > 50]

    print("=" * 65)
    print(f"LESSONS:           {len(lessons):>4}  ({len(mapped_lessons)} mapped to course, {len(unmapped_lessons)} orphan)")
    print(f"TOPICS:            {len(topics):>4}")
    print(f"WITH CONTENT:      {len(has_content):>4}  (content_html > 50 chars)")
    print(f"TOTAL OUTPUT:      {len(output):>4} records")
    print("=" * 65)

    # Sample a few with content
    print("\n-- Sample lessons with content --")
    samples = [x for x in mapped_lessons if len(x["content_html"]) > 100][:5]
    for s in samples:
        print(f"  Course {s['parent_course_id']:>6}  [{s['order_index']:>3}]  {s['title'][:50]}")
        print(f"    Preview: {s['content_preview'][:120]}")

    print(f"\nOutput saved to: {OUTPUT_DIR}/lesson_content.json")


def _strip_row(line: str) -> str:
    s = line.rstrip()
    if s.endswith(";"):
        s = s[:-1]
    elif s.endswith(","):
        s = s[:-1]
    if s.startswith("(") and s.endswith(")"):
        s = s[1:-1]
    return s


def _unescape_sql(s: str) -> str:
    """Unescape SQL string escape sequences."""
    return (
        s.replace("\\n", "\n")
        .replace("\\r", "")
        .replace("\\t", "\t")
        .replace('\\"', '"')
        .replace("\\'", "'")
        .replace("\\\\", "\\")
    )


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
