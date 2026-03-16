"""
Seed script — CARSI Industry Calendar (UNI-68)

Inserts 5 test events to validate the calendar page and Event schema output.
Run from the CARSI repo root:
    python scripts/seed_industry_events.py
"""

import asyncio
import os
import sys
from datetime import UTC, datetime, timedelta

# Make sure the backend package is on the path when run from repo root
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "apps", "backend"))

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from src.db.models import IndustryEvent

DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/carsi"
)

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

NOW = datetime.now(UTC)

TEST_EVENTS = [
    {
        "title": "IICRC World Flood School — Sydney",
        "description": (
            "The IICRC World Flood School is the definitive training program for water damage "
            "restoration professionals. This intensive multi-day course covers advanced drying "
            "science, psychrometrics, documentation, and insurance claim procedures. "
            "Mandatory for professionals seeking WRT or ASD certification."
        ),
        "event_type": "training",
        "industry_categories": ["Restoration", "Indoor Air Quality", "Standards & Compliance"],
        "start_date": NOW + timedelta(days=14),
        "end_date": NOW + timedelta(days=17),
        "location_name": "IICRC Training Centre",
        "location_city": "Sydney",
        "location_state": "NSW",
        "is_virtual": False,
        "organiser_name": "IICRC",
        "organiser_url": "https://www.iicrc.org",
        "event_url": "https://www.iicrc.org/events",
        "schema_event_status": "EventScheduled",
        "is_free": False,
        "price_range": "AUD $1,200–$1,800",
        "published": True,
        "featured": True,
    },
    {
        "title": "AIRAH National HVAC Conference 2026",
        "description": (
            "The Australian Institute of Refrigeration, Air Conditioning and Heating annual national "
            "conference brings together 800+ HVAC professionals for two days of technical sessions, "
            "product showcases, and peer networking. Covers energy efficiency, climate resilience, "
            "indoor air quality standards, and the future of refrigerants."
        ),
        "event_type": "conference",
        "industry_categories": ["HVAC", "Indoor Air Quality", "Standards & Compliance", "Building & Construction"],
        "start_date": NOW + timedelta(days=28),
        "end_date": NOW + timedelta(days=29),
        "location_name": "Melbourne Convention Centre",
        "location_city": "Melbourne",
        "location_state": "VIC",
        "is_virtual": False,
        "organiser_name": "AIRAH",
        "organiser_url": "https://www.airah.org.au",
        "event_url": "https://www.airah.org.au/events",
        "schema_event_status": "EventScheduled",
        "is_free": False,
        "price_range": "AUD $850–$1,200",
        "published": True,
        "featured": True,
    },
    {
        "title": "Mould Remediation Best Practices — Webinar",
        "description": (
            "Free webinar covering the latest Australian standards for mould assessment and "
            "remediation. Topics include moisture mapping, containment procedures, PPE requirements, "
            "post-remediation verification, and the new AS/NZS guidance. Q&A with an accredited "
            "Indoor Hygienist follows the presentation."
        ),
        "event_type": "webinar",
        "industry_categories": ["Restoration", "Indoor Air Quality", "Flooring"],
        "start_date": NOW + timedelta(days=7),
        "end_date": NOW + timedelta(days=7, hours=2),
        "is_virtual": True,
        "organiser_name": "CARSI",
        "organiser_url": "https://carsi.com.au",
        "event_url": "https://carsi.com.au/webinars",
        "schema_event_status": "EventScheduled",
        "is_free": True,
        "published": True,
        "featured": False,
    },
    {
        "title": "Flooring Industry Skills Workshop — Brisbane",
        "description": (
            "Hands-on workshop for commercial carpet and hard floor installers. Covers subfloor "
            "preparation, moisture testing protocols, adhesive selection, and compliance with "
            "AS 1884 floor coverings standards. Limited to 20 participants for practical sessions."
        ),
        "event_type": "workshop",
        "industry_categories": ["Flooring", "Building & Construction"],
        "start_date": NOW + timedelta(days=21),
        "location_name": "TAFE Queensland — South Bank",
        "location_city": "Brisbane",
        "location_state": "QLD",
        "is_virtual": False,
        "organiser_name": "FCIA Australia",
        "event_url": "https://carsi.com.au/calendar",
        "schema_event_status": "EventScheduled",
        "is_free": False,
        "price_range": "AUD $350",
        "published": True,
        "featured": False,
    },
    {
        "title": "Restoration Industry Networking — Perth",
        "description": (
            "Monthly in-person networking event for Perth-based restoration and disaster recovery "
            "professionals. Casual format — drinks, nibbles, and industry conversation. "
            "Connect with local contractors, suppliers, insurers, and service providers."
        ),
        "event_type": "networking",
        "industry_categories": ["Restoration", "Insurance & Claims"],
        "start_date": NOW + timedelta(days=10),
        "location_city": "Perth",
        "location_state": "WA",
        "is_virtual": False,
        "organiser_name": "NRPG Western Australia",
        "organiser_url": "https://nrpg.com.au",
        "event_url": "https://nrpg.com.au/events",
        "schema_event_status": "EventScheduled",
        "is_free": True,
        "published": True,
        "featured": False,
    },
]


async def seed() -> None:
    async with AsyncSessionLocal() as session:
        inserted = 0
        for data in TEST_EVENTS:
            event = IndustryEvent(**data)
            session.add(event)
            inserted += 1
        await session.commit()
        print(f"✅ Seeded {inserted} industry events")


if __name__ == "__main__":
    asyncio.run(seed())
