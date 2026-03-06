"""
Phase 2 - Post Type Breakdown
Streams kvq_posts and counts by post_type + post_status.
Also extracts course/lesson titles so we can see the actual content.

Usage:
    python scripts/migration/02_post_types.py
"""

import re
import sys
from collections import defaultdict
from pathlib import Path

SQL_FILE = Path(r"C:\Users\Phill\Downloads\localhost.sql")

# LearnDash post types we care about
LEARNDASH_TYPES = {
    "sfwd-courses",
    "sfwd-lessons",
    "sfwd-topic",
    "sfwd-quiz",
    "sfwd-certificates",
    "sfwd-assignments",
    "sfwd-question",
}

WOOCOMMERCE_TYPES = {"product", "shop_order"}

# Column indices (0-based) from CREATE TABLE column list:
# ID, post_author, post_date, post_date_gmt, post_content,
# post_title, post_excerpt, post_status, comment_status, ping_status,
# post_password, post_name, to_ping, pinged, post_modified, post_modified_gmt,
# post_content_filtered, post_parent, guid, menu_order, post_type, post_mime_type, comment_count
COL_ID = 0
COL_TITLE = 5
COL_STATUS = 7
COL_TYPE = 20


def stream_post_types(path: Path):
    type_counts: dict[str, int] = defaultdict(int)
    # type -> list of (id, title, status)
    content_items: dict[str, list] = defaultdict(list)

    insert_re = re.compile(r"^INSERT INTO `kvq_posts`", re.IGNORECASE)

    print(f"Scanning: {path}\n")

    rows_seen = 0
    rows_parsed = 0

    with open(path, encoding="utf-8", errors="replace") as f:
        in_posts_insert = False
        for line in f:
            stripped = line.rstrip()

            # Detect start of a kvq_posts INSERT statement
            if insert_re.match(stripped):
                in_posts_insert = True
                continue

            # Once inside, each non-empty line starting with '(' is a row
            if in_posts_insert:
                if stripped.startswith("("):
                    rows_seen += 1
                    # Strip trailing comma/semicolon
                    row_str = stripped
                    if row_str.endswith(";"):
                        row_str = row_str[:-1]
                        in_posts_insert = False  # Last row in statement
                    elif row_str.endswith(","):
                        row_str = row_str[:-1]

                    # Remove surrounding parens
                    if row_str.startswith("(") and row_str.endswith(")"):
                        row_str = row_str[1:-1]

                    fields = _parse_fields(row_str)
                    if len(fields) < 21:
                        continue

                    rows_parsed += 1
                    post_id = fields[COL_ID].strip("'")
                    post_title = fields[COL_TITLE].strip("'")
                    post_status = fields[COL_STATUS].strip("'")
                    post_type = fields[COL_TYPE].strip("'")

                    type_counts[post_type] += 1

                    if post_type in LEARNDASH_TYPES or post_type in WOOCOMMERCE_TYPES:
                        content_items[post_type].append((post_id, post_title, post_status))
                else:
                    # Non-row line (blank, comment, next statement) — leave posts mode
                    in_posts_insert = False

    print(f"Rows seen: {rows_seen} | Successfully parsed: {rows_parsed}\n")

    # Report
    print("=" * 65)
    print("POST TYPE BREAKDOWN")
    print("=" * 65)
    for pt, count in sorted(type_counts.items(), key=lambda x: -x[1]):
        tag = ""
        if pt in LEARNDASH_TYPES:
            tag = " [LearnDash]"
        elif pt in WOOCOMMERCE_TYPES:
            tag = " [WooCommerce]"
        print(f"  {count:>5}  {pt}{tag}")

    print()
    print("=" * 65)
    print("COURSE / LESSON TITLES")
    print("=" * 65)
    for pt in ["sfwd-courses", "sfwd-lessons", "sfwd-topic", "sfwd-quiz", "product"]:
        items = content_items.get(pt, [])
        if not items:
            continue
        print(f"\n-- {pt} ({len(items)} items) --")
        for pid, title, status in items:
            # Decode basic HTML entities
            title = title.replace("&#8211;", "-").replace("&amp;", "&").replace("&#8217;", "'")
            print(f"   [{status:10}] {pid:>5}: {title[:80]}")


def _parse_fields(row: str) -> list[str]:
    """Parse a comma-separated SQL row into fields, respecting quoted strings and escapes."""
    fields = []
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
    stream_post_types(SQL_FILE)
