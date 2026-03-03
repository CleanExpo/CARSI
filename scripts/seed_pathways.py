#!/usr/bin/env python3
"""
Seed the 5 core IICRC learning pathways and matching category taxonomy.

Run from the backend directory:
    uv run python ../../scripts/seed_pathways.py

Or from the repo root:
    python scripts/seed_pathways.py
"""

import os
import sys
import uuid
from pathlib import Path

# Allow running from repo root or apps/backend
sys.path.insert(0, str(Path(__file__).parent.parent / "apps" / "backend"))

import psycopg2
from psycopg2.extras import execute_values

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://carsi_user:carsi_dev_pass@localhost:5433/carsi_dev",
)

# ---------------------------------------------------------------------------
# Data
# ---------------------------------------------------------------------------

CATEGORIES = [
    {"slug": "water-damage",  "name": "Water Damage Restoration", "order_index": 1},
    {"slug": "carpet-care",   "name": "Carpet & Upholstery Care",  "order_index": 2},
    {"slug": "odour-control", "name": "Odour Control",             "order_index": 3},
    {"slug": "structural-drying", "name": "Structural Drying",     "order_index": 4},
    {"slug": "commercial-cleaning", "name": "Commercial Cleaning", "order_index": 5},
]

PATHWAYS = [
    {
        "slug": "wrt-pathway",
        "title": "Water Damage Restoration Technician (WRT)",
        "description": (
            "Master the science of water damage restoration. This pathway covers "
            "moisture detection, drying theory, documentation, and IICRC WRT "
            "examination preparation."
        ),
        "iicrc_discipline": "WRT",
        "target_certification": "IICRC WRT — Water Damage Restoration Technician",
        "estimated_hours": 21.0,
        "is_published": True,
        "order_index": 1,
    },
    {
        "slug": "crt-pathway",
        "title": "Carpet Repair & Upholstery Technician (CRT)",
        "description": (
            "From fibre identification to advanced spotting, this pathway covers "
            "the full spectrum of carpet and upholstery care for the IICRC CRT "
            "certification."
        ),
        "iicrc_discipline": "CRT",
        "target_certification": "IICRC CRT — Carpet Repair & Upholstery Technician",
        "estimated_hours": 14.0,
        "is_published": True,
        "order_index": 2,
    },
    {
        "slug": "oct-pathway",
        "title": "Odour Control Technician (OCT)",
        "description": (
            "Understand odour chemistry, source identification, and modern "
            "deodorisation techniques. Prepares technicians for the IICRC OCT "
            "certification."
        ),
        "iicrc_discipline": "OCT",
        "target_certification": "IICRC OCT — Odour Control Technician",
        "estimated_hours": 10.5,
        "is_published": True,
        "order_index": 3,
    },
    {
        "slug": "asd-pathway",
        "title": "Applied Structural Drying (ASD)",
        "description": (
            "Advanced drying science, psychrometrics, and structural drying "
            "systems. Designed for restoration professionals pursuing the IICRC "
            "ASD certification."
        ),
        "iicrc_discipline": "ASD",
        "target_certification": "IICRC ASD — Applied Structural Drying",
        "estimated_hours": 17.5,
        "is_published": True,
        "order_index": 4,
    },
    {
        "slug": "cct-pathway",
        "title": "Commercial Carpet Maintenance Technician (CCT)",
        "description": (
            "Commercial-scale carpet cleaning methods, encapsulation, hot-water "
            "extraction, and maintenance planning for the IICRC CCT certification."
        ),
        "iicrc_discipline": "CCT",
        "target_certification": "IICRC CCT — Commercial Carpet Maintenance Technician",
        "estimated_hours": 10.5,
        "is_published": True,
        "order_index": 5,
    },
]

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def upsert_categories(cur):
    for cat in CATEGORIES:
        cur.execute(
            """
            INSERT INTO lms_categories (id, slug, name, order_index)
            VALUES (%s, %s, %s, %s)
            ON CONFLICT (slug) DO UPDATE
                SET name = EXCLUDED.name,
                    order_index = EXCLUDED.order_index
            """,
            (str(uuid.uuid4()), cat["slug"], cat["name"], cat["order_index"]),
        )
    print(f"  OK {len(CATEGORIES)} categories upserted")


def upsert_pathways(cur):
    for p in PATHWAYS:
        cur.execute(
            """
            INSERT INTO lms_learning_pathways
                (id, slug, title, description, iicrc_discipline,
                 target_certification, estimated_hours, is_published, order_index)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (slug) DO UPDATE
                SET title                = EXCLUDED.title,
                    description          = EXCLUDED.description,
                    iicrc_discipline     = EXCLUDED.iicrc_discipline,
                    target_certification = EXCLUDED.target_certification,
                    estimated_hours      = EXCLUDED.estimated_hours,
                    is_published         = EXCLUDED.is_published,
                    order_index          = EXCLUDED.order_index
            """,
            (
                str(uuid.uuid4()),
                p["slug"],
                p["title"],
                p["description"],
                p["iicrc_discipline"],
                p["target_certification"],
                p["estimated_hours"],
                p["is_published"],
                p["order_index"],
            ),
        )
    print(f"  OK {len(PATHWAYS)} learning pathways upserted")


def verify(cur):
    cur.execute("SELECT slug, iicrc_discipline, is_published FROM lms_learning_pathways ORDER BY order_index")
    rows = cur.fetchall()
    print("\n  Learning Pathways in DB:")
    for slug, disc, published in rows:
        status = "PUBLISHED" if published else "draft"
        print(f"    [{status}] {slug}  ({disc})")

    cur.execute("SELECT COUNT(*) FROM lms_categories")
    n = cur.fetchone()[0]
    print(f"\n  Categories in DB: {n}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------


def main():
    print(f"Connecting to: {DATABASE_URL[:40]}...")
    conn = psycopg2.connect(DATABASE_URL)
    conn.autocommit = False

    try:
        with conn.cursor() as cur:
            print("\nSeeding categories...")
            upsert_categories(cur)

            print("Seeding learning pathways...")
            upsert_pathways(cur)

        conn.commit()

        with conn.cursor() as cur:
            verify(cur)

        print("\nDone.")
    except Exception as exc:
        conn.rollback()
        print(f"\nERROR: {exc}")
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    main()
