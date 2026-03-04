"""
Phase 1 — SQL Dump Recon
Streams the file line-by-line. Never loads the full file into memory.

Usage:
    python scripts/migration/01_recon.py <path-to-sql-file>

Output:
    - Table list with row counts
    - Sample rows from key WordPress tables
"""

import re
import sys
from collections import defaultdict
from pathlib import Path

SQL_FILE = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(
    r"C:\Users\Phill\Downloads\localhost.sql"
)

# Tables we care about for the CARSI migration
KEY_TABLES = {
    "kvq_posts",
    "kvq_postmeta",
    "kvq_terms",
    "kvq_term_taxonomy",
    "kvq_term_relationships",
    "kvq_users",
    "kvq_usermeta",
    "kvq_options",
    "kvq_learndash_pro_quiz_master",
    "kvq_learndash_pro_quiz_question",
    "kvq_learndash_user_activity",
    "kvq_woocommerce_order_items",
    "kvq_woocommerce_order_itemmeta",
}

SAMPLE_LIMIT = 3  # rows per key table to print

def stream_recon(path: Path):
    table_counts: dict[str, int] = defaultdict(int)
    samples: dict[str, list[str]] = defaultdict(list)
    current_table: str | None = None
    create_tables: list[str] = []

    insert_re = re.compile(r"^INSERT INTO `(\w+)`", re.IGNORECASE)
    create_re = re.compile(r"^CREATE TABLE `(\w+)`", re.IGNORECASE)

    print(f"\nScanning: {path}  ({path.stat().st_size / 1_048_576:.1f} MB)\n")

    with open(path, encoding="utf-8", errors="replace") as f:
        for line in f:
            # Detect CREATE TABLE
            m = create_re.match(line)
            if m:
                current_table = m.group(1)
                create_tables.append(current_table)
                continue

            # Detect INSERT INTO
            m = insert_re.match(line)
            if m:
                tbl = m.group(1)
                table_counts[tbl] += 1
                if tbl in KEY_TABLES and len(samples[tbl]) < SAMPLE_LIMIT:
                    # Truncate long lines for readability
                    samples[tbl].append(line[:200].rstrip())

    # ── Report ────────────────────────────────────────────────────────────────

    print("=" * 70)
    print("ALL TABLES (sorted by row count)")
    print("=" * 70)
    for tbl, count in sorted(table_counts.items(), key=lambda x: -x[1]):
        marker = " <--" if tbl in KEY_TABLES else ""
        print(f"  {count:>8,}  {tbl}{marker}")

    print()
    print("=" * 70)
    print("KEY TABLE SAMPLES")
    print("=" * 70)
    for tbl in KEY_TABLES:
        rows = samples.get(tbl, [])
        count = table_counts.get(tbl, 0)
        print(f"\n-- {tbl}  ({count:,} rows) --")
        if rows:
            for r in rows:
                print(f"   {r}")
        else:
            print("   (no INSERT rows found)")

    # ── Post type breakdown from wp_posts ─────────────────────────────────────
    print()
    print("=" * 70)
    print("NEXT STEP: run 02_post_types.py to see wp_posts breakdown by type")
    print("=" * 70)


if __name__ == "__main__":
    stream_recon(SQL_FILE)
