#!/usr/bin/env python3
"""
Seed script: 10 placeholder CARSI Research Articles

Creates 10 published placeholder articles across key CARSI Hub topic areas.
These are ready for COO content hand-off (editorial population).
Each article includes:
- Slug, title, excerpt, category, tags
- SEO metadata (title, description, canonical, OG)
- FAQ schema items for FAQPage structured data
- Placeholder rich-text content body

Run:
    python scripts/seed_research_articles.py

Requires DATABASE_URL env var (or .env file).
"""

import asyncio
import os
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent / "apps" / "backend"))

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent.parent / ".env")

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from src.db.models import ArticleStatus, ResearchArticle

ARTICLES = [
    {
        "slug": "water-damage-restoration-complete-guide",
        "title": "Water Damage Restoration: The Complete Australian Guide",
        "excerpt": (
            "Everything homeowners and insurers need to know about water damage restoration in "
            "Australia — from immediate response steps to IICRC standards compliance."
        ),
        "content": """<h2>What is Water Damage Restoration?</h2>
<p>Water damage restoration is the process of cleaning, drying, and restoring a property affected by water intrusion.
In Australia, this follows the IICRC S500 Standard for Professional Water Damage Restoration.</p>
<h2>The Four Classes of Water Damage</h2>
<p>Water damage is classified from Class 1 (minimal absorption) to Class 4 (specialty drying required).
Understanding the class helps restoration professionals select the correct drying equipment and timeframes.</p>
<h2>Insurance Claims Process</h2>
<p>Most homeowner insurance policies in Australia cover sudden and accidental water damage.
Work with a licensed NRPG-accredited restorer to document damage thoroughly for your claim.</p>
<p><em>This article will be expanded by the CARSI editorial team. Placeholder content for COO review.</em></p>""",
        "category": "Water Damage",
        "tags": ["water damage", "restoration", "IICRC", "insurance", "Australia"],
        "seo_title": "Water Damage Restoration Australia — Complete Guide | CARSI",
        "seo_description": (
            "Complete guide to water damage restoration in Australia. IICRC standards, "
            "insurance claims process, and how to choose a licensed restorer."
        ),
        "canonical_url": "https://carsi.com.au/research/water-damage-restoration-complete-guide",
        "faq_items": [
            {
                "question": "How quickly should water damage be addressed?",
                "answer": (
                    "Water damage should be addressed within 24-48 hours to prevent mould growth. "
                    "Call a licensed NRPG-accredited restorer immediately after the event."
                ),
            },
            {
                "question": "Does insurance cover water damage restoration in Australia?",
                "answer": (
                    "Most home and contents policies cover sudden and accidental water damage. "
                    "Gradual damage (e.g., slow leaks) is typically excluded. Always check your PDS."
                ),
            },
            {
                "question": "What is the IICRC S500 standard?",
                "answer": (
                    "The IICRC S500 is the international standard for professional water damage "
                    "restoration, covering assessment, drying, documentation, and occupant safety."
                ),
            },
        ],
        "author_name": "CARSI Editorial Team",
        "status": ArticleStatus.PUBLISHED,
    },
    {
        "slug": "mould-remediation-australian-guide",
        "title": "Mould Remediation in Australian Homes: What You Need to Know",
        "excerpt": (
            "Mould is a serious health risk in Australian homes, particularly post-flood. "
            "This guide covers identification, safe removal, and prevention strategies."
        ),
        "content": """<h2>Understanding Mould in Australian Homes</h2>
<p>Australia's humid climate makes mould a common problem, especially in Queensland, NSW, and Victoria.
Mould can begin growing within 24-48 hours of water damage if not properly dried.</p>
<h2>Health Risks</h2>
<p>Exposure to mould spores can cause respiratory issues, allergic reactions, and in severe cases,
neurological symptoms. Vulnerable populations including children and the elderly are at highest risk.</p>
<h2>Professional Remediation Standards</h2>
<p>In Australia, mould remediation should follow the IICRC S520 Standard for Professional Mould Remediation.
Always use a licensed Indoor Environment Professional (IEP) for assessment.</p>
<p><em>This article will be expanded by the CARSI editorial team. Placeholder content for COO review.</em></p>""",
        "category": "Mould & Remediation",
        "tags": ["mould", "remediation", "indoor air quality", "health", "IICRC S520"],
        "seo_title": "Mould Remediation Australia — Health Risks & Professional Standards | CARSI",
        "seo_description": (
            "Complete guide to mould remediation in Australian homes. Health risks, "
            "IICRC S520 standards, and when to call a professional."
        ),
        "canonical_url": "https://carsi.com.au/research/mould-remediation-australian-guide",
        "faq_items": [
            {
                "question": "Can I remove mould myself?",
                "answer": (
                    "Small surface mould (under 1m²) can be cleaned with appropriate PPE. "
                    "Larger infestations or porous materials require a licensed mould remediator."
                ),
            },
            {
                "question": "How long does mould remediation take?",
                "answer": (
                    "Depending on the extent of contamination, mould remediation typically takes "
                    "1-5 days for residential properties, followed by post-remediation verification testing."
                ),
            },
        ],
        "author_name": "CARSI Editorial Team",
        "status": ArticleStatus.PUBLISHED,
    },
    {
        "slug": "fire-restoration-process-explained",
        "title": "Fire Damage Restoration: The Step-by-Step Process",
        "excerpt": (
            "From emergency board-up to final reconstruction, this guide walks through every "
            "stage of professional fire damage restoration in Australia."
        ),
        "content": """<h2>Immediate Response After Fire Damage</h2>
<p>The first 24-48 hours after a fire are critical. Soot and smoke residues continue to cause damage
long after the flames are extinguished through acid etching on surfaces.</p>
<h2>Scope of Work</h2>
<p>Fire restoration encompasses: emergency stabilisation, soot/smoke removal, odour elimination,
water removal (from firefighting), structural drying, and full reconstruction.</p>
<p><em>This article will be expanded by the CARSI editorial team. Placeholder content for COO review.</em></p>""",
        "category": "Fire Restoration",
        "tags": ["fire damage", "smoke damage", "soot removal", "restoration"],
        "seo_title": "Fire Damage Restoration Australia — Step-by-Step Process | CARSI",
        "seo_description": (
            "Professional fire damage restoration process in Australia. "
            "Emergency response, soot removal, odour treatment, and reconstruction."
        ),
        "canonical_url": "https://carsi.com.au/research/fire-restoration-process-explained",
        "faq_items": [
            {
                "question": "How soon can I re-enter my home after a fire?",
                "answer": (
                    "Re-entry is only safe after the fire brigade and a structural engineer have "
                    "cleared the property. Do not enter until authorised — structural damage and "
                    "air quality hazards may be present."
                ),
            },
        ],
        "author_name": "CARSI Editorial Team",
        "status": ArticleStatus.PUBLISHED,
    },
    {
        "slug": "indoor-air-quality-restoration-industry",
        "title": "Indoor Air Quality: Why It Matters for the Restoration Industry",
        "excerpt": (
            "Indoor air quality (IAQ) is central to occupant health and restoration outcomes. "
            "This article explores IAQ standards, assessment methods, and how restorers can improve them."
        ),
        "content": """<h2>What is Indoor Air Quality?</h2>
<p>Indoor Air Quality (IAQ) refers to the air quality within and around buildings as it relates to
the health and comfort of building occupants. Poor IAQ can cause sick building syndrome,
reduced productivity, and long-term health effects.</p>
<h2>IAQ After Water Damage</h2>
<p>Water damage events dramatically worsen IAQ through mould spores, bacterial growth, and
chemical off-gassing from damaged materials. Proper restoration is essential to restoring safe IAQ.</p>
<p><em>This article will be expanded by the CARSI editorial team. Placeholder content for COO review.</em></p>""",
        "category": "Indoor Air Quality",
        "tags": ["indoor air quality", "IAQ", "mould spores", "restoration", "health"],
        "seo_title": "Indoor Air Quality in Restoration — CARSI Industry Guide",
        "seo_description": (
            "How restoration events affect indoor air quality and what professionals "
            "can do to restore safe, healthy air in Australian homes and workplaces."
        ),
        "canonical_url": "https://carsi.com.au/research/indoor-air-quality-restoration-industry",
        "faq_items": [
            {
                "question": "How is indoor air quality tested?",
                "answer": (
                    "IAQ testing is performed by licensed Indoor Environment Professionals (IEPs) "
                    "using air sampling, surface sampling, and real-time monitoring equipment."
                ),
            },
        ],
        "author_name": "CARSI Editorial Team",
        "status": ArticleStatus.PUBLISHED,
    },
    {
        "slug": "hvac-and-restoration-what-you-need-to-know",
        "title": "HVAC Systems and Water Damage: What Every Restorer Needs to Know",
        "excerpt": (
            "HVAC systems are often overlooked in water damage events but can harbour mould and "
            "cross-contaminate buildings. Learn the assessment and cleaning protocols."
        ),
        "content": """<h2>Why HVAC Matters in Restoration</h2>
<p>Heating, ventilation, and air conditioning (HVAC) systems can spread mould spores, soot, and
contaminants throughout an entire building if not properly inspected and treated after a damage event.</p>
<h2>HVAC Inspection Protocol</h2>
<p>All HVAC components — ducts, coils, drain pans, air handlers — should be inspected by a
qualified HVAC technician and an IEP following water or fire damage events.</p>
<p><em>This article will be expanded by the CARSI editorial team. Placeholder content for COO review.</em></p>""",
        "category": "HVAC",
        "tags": ["HVAC", "ductwork", "mould", "water damage", "restoration"],
        "seo_title": "HVAC Systems and Restoration — Complete Guide | CARSI",
        "seo_description": (
            "HVAC inspection and cleaning protocols after water and fire damage events. "
            "Why HVAC is critical to restoration outcomes in Australian buildings."
        ),
        "canonical_url": "https://carsi.com.au/research/hvac-and-restoration-what-you-need-to-know",
        "faq_items": [
            {
                "question": "Should HVAC be turned off after a flood?",
                "answer": (
                    "Yes. Turn off HVAC immediately after a flood event to prevent spreading "
                    "contaminants throughout the building until professional inspection is complete."
                ),
            },
        ],
        "author_name": "CARSI Editorial Team",
        "status": ArticleStatus.PUBLISHED,
    },
    {
        "slug": "insurance-claims-process-australia-restoration",
        "title": "Navigating Insurance Claims for Restoration Work in Australia",
        "excerpt": (
            "Insurance claims for restoration work can be complex. This guide explains the claims "
            "process, documentation requirements, and how to work effectively with insurers and assessors."
        ),
        "content": """<h2>The Australian Insurance Claims Process</h2>
<p>After a damage event, most Australians must navigate their insurer's claims process before
restoration work can begin. Understanding this process helps restorers and homeowners work together effectively.</p>
<h2>Key Documentation Requirements</h2>
<p>Comprehensive photo/video documentation, moisture mapping, scope of works, and cost estimates
are essential. Use a licensed NRPG-accredited restorer who understands insurance requirements.</p>
<p><em>This article will be expanded by the CARSI editorial team. Placeholder content for COO review.</em></p>""",
        "category": "Insurance & Claims",
        "tags": ["insurance", "claims", "restoration", "assessment", "documentation"],
        "seo_title": "Insurance Claims for Restoration Work Australia | CARSI",
        "seo_description": (
            "How to navigate insurance claims for restoration work in Australia. "
            "Documentation, assessors, and working with insurers as a restoration professional."
        ),
        "canonical_url": "https://carsi.com.au/research/insurance-claims-process-australia-restoration",
        "faq_items": [
            {
                "question": "Can I choose my own restorer for an insurance claim?",
                "answer": (
                    "In Australia, you generally have the right to choose your own licensed restorer. "
                    "Check your policy PDS for any preferred supplier clauses."
                ),
            },
            {
                "question": "What is a scope of works in restoration?",
                "answer": (
                    "A scope of works is a detailed written document outlining all restoration tasks, "
                    "materials, and estimated costs. It is required by insurers before work begins."
                ),
            },
        ],
        "author_name": "CARSI Editorial Team",
        "status": ArticleStatus.PUBLISHED,
    },
    {
        "slug": "restoration-industry-standards-australia",
        "title": "Understanding Australian Restoration Industry Standards",
        "excerpt": (
            "A guide to the key IICRC, AS/NZS, and industry standards governing restoration "
            "work in Australia — what they mean and why compliance matters."
        ),
        "content": """<h2>Key Standards Governing Australian Restoration</h2>
<p>The Australian restoration industry is governed by a combination of IICRC international standards,
AS/NZS Australian standards, and state-based regulatory requirements.</p>
<h2>IICRC Standards Overview</h2>
<ul>
<li><strong>S500</strong> — Water Damage Restoration</li>
<li><strong>S520</strong> — Mould Remediation</li>
<li><strong>S600</strong> — Upholstery and Fabric Cleaning</li>
<li><strong>S700</strong> — Carpet Cleaning</li>
</ul>
<p><em>This article will be expanded by the CARSI editorial team. Placeholder content for COO review.</em></p>""",
        "category": "Standards & Compliance",
        "tags": ["IICRC", "standards", "compliance", "AS/NZS", "restoration"],
        "seo_title": "Australian Restoration Industry Standards — IICRC & AS/NZS | CARSI",
        "seo_description": (
            "Complete guide to IICRC and AS/NZS standards governing professional "
            "restoration work in Australia. What each standard covers and why it matters."
        ),
        "canonical_url": "https://carsi.com.au/research/restoration-industry-standards-australia",
        "faq_items": [
            {
                "question": "Are IICRC certifications mandatory in Australia?",
                "answer": (
                    "IICRC certifications are not legally mandated in all Australian states, "
                    "but they are the recognised industry benchmark. Many insurers prefer or require "
                    "IICRC-certified restorers."
                ),
            },
        ],
        "author_name": "CARSI Editorial Team",
        "status": ArticleStatus.PUBLISHED,
    },
    {
        "slug": "flooring-restoration-after-water-damage",
        "title": "Flooring Restoration After Water Damage: Timber, Carpet, and Tiles",
        "excerpt": (
            "Different flooring materials respond differently to water damage. This guide covers "
            "assessment, drying protocols, and when to restore vs replace."
        ),
        "content": """<h2>Timber Flooring</h2>
<p>Solid timber and engineered timber floors are susceptible to cupping, crowning, and permanent
warping if not dried within correct moisture content ranges. Early intervention is critical.</p>
<h2>Carpet and Underlay</h2>
<p>Carpet can often be dried in-place if Category 1 (clean) water is involved and response is rapid.
Category 2 or 3 water contamination typically requires removal and replacement.</p>
<h2>Tiles and Grout</h2>
<p>Ceramic and porcelain tiles are largely water-resistant, but water can penetrate grout lines
and the substrate. Subfloor moisture mapping is essential.</p>
<p><em>This article will be expanded by the CARSI editorial team. Placeholder content for COO review.</em></p>""",
        "category": "Flooring",
        "tags": ["flooring", "timber floors", "carpet", "water damage", "restoration"],
        "seo_title": "Flooring Restoration After Water Damage Australia | CARSI",
        "seo_description": (
            "How to restore timber, carpet, and tile flooring after water damage in Australia. "
            "Assessment methods, drying protocols, and restore vs replace guidance."
        ),
        "canonical_url": "https://carsi.com.au/research/flooring-restoration-after-water-damage",
        "faq_items": [
            {
                "question": "Can wet timber flooring be saved?",
                "answer": (
                    "Yes, in many cases. Rapid drying to pre-loss moisture content (typically 6-9% "
                    "for Australian hardwood) can save wet timber floors. Response within 48 hours "
                    "significantly improves outcomes."
                ),
            },
        ],
        "author_name": "CARSI Editorial Team",
        "status": ArticleStatus.PUBLISHED,
    },
    {
        "slug": "nrpg-professional-directory-why-it-matters",
        "title": "The NRPG Professional Directory: Why Choosing Accredited Restorers Matters",
        "excerpt": (
            "The National Restoration Professional Group (NRPG) directory is Australia's authoritative "
            "source for verified, accredited restoration professionals. Here's why it matters."
        ),
        "content": """<h2>What is the NRPG?</h2>
<p>The National Restoration Professional Group (NRPG) is Australia's peak industry body for
restoration and indoor environment professionals. NRPG-accredited members meet rigorous standards
for training, insurance, and professional conduct.</p>
<h2>How to Find a Verified Restorer</h2>
<p>Use the NRPG member directory to find accredited restoration professionals in your area.
All listed members hold current IICRC certifications and meet NRPG's conduct requirements.</p>
<p><em>This article will be expanded by the CARSI editorial team. Placeholder content for COO review.</em></p>""",
        "category": "Standards & Compliance",
        "tags": ["NRPG", "professional directory", "accreditation", "restoration", "industry body"],
        "seo_title": "NRPG Professional Directory — Why Accredited Restorers Matter | CARSI",
        "seo_description": (
            "Why the NRPG professional directory is the trusted source for verified "
            "restoration professionals in Australia — and how to use it."
        ),
        "canonical_url": "https://carsi.com.au/research/nrpg-professional-directory-why-it-matters",
        "faq_items": [
            {
                "question": "How do I verify an NRPG member?",
                "answer": (
                    "Search the NRPG member directory at nrpg.com.au or through the CARSI Hub "
                    "Professional Directory. You can verify current accreditation status and "
                    "specialisation areas."
                ),
            },
        ],
        "author_name": "CARSI Editorial Team",
        "status": ArticleStatus.PUBLISHED,
    },
    {
        "slug": "technology-transformation-restoration-industry",
        "title": "Technology Transformation in the Australian Restoration Industry",
        "excerpt": (
            "From thermal imaging to AI-powered pricing, technology is reshaping how restoration "
            "professionals work. This article surveys the key tools and their impact."
        ),
        "content": """<h2>Drying Technology</h2>
<p>Modern LGR (Low Grain Refrigerant) dehumidifiers and desiccant dehumidifiers have dramatically
improved drying performance and efficiency compared to equipment used a decade ago.</p>
<h2>Thermal Imaging and Moisture Mapping</h2>
<p>Thermal imaging cameras and digital moisture mapping software allow restorers to document
moisture migration accurately and prove drying performance to insurers.</p>
<h2>Pricing and Project Management Software</h2>
<p>Platforms like RestoreAssist are replacing spreadsheets with purpose-built restoration pricing
and project management tools designed specifically for the Australian market.</p>
<p><em>This article will be expanded by the CARSI editorial team. Placeholder content for COO review.</em></p>""",
        "category": "Technology",
        "tags": ["technology", "thermal imaging", "drying equipment", "restoration software", "RestoreAssist"],
        "seo_title": "Technology in Australian Restoration — Industry Transformation | CARSI",
        "seo_description": (
            "How technology is transforming the Australian restoration industry — "
            "from advanced drying equipment to AI-powered pricing platforms like RestoreAssist."
        ),
        "canonical_url": "https://carsi.com.au/research/technology-transformation-restoration-industry",
        "faq_items": [
            {
                "question": "What is RestoreAssist?",
                "answer": (
                    "RestoreAssist is Australia's first national restoration pricing and project "
                    "management platform. It helps restoration businesses quote accurately, "
                    "manage jobs, and document work for insurance claims."
                ),
            },
        ],
        "related_restore_assist": [
            {"feature": "Restoration Pricing Tool", "url": "https://restoreassist.app/pricing"},
            {"feature": "Job Management", "url": "https://restoreassist.app/jobs"},
        ],
        "author_name": "CARSI Editorial Team",
        "status": ArticleStatus.PUBLISHED,
    },
]


async def seed():
    db_url = os.environ.get("DATABASE_URL", "postgresql+asyncpg://starter_user:local_dev_password@localhost:5432/starter_db")
    if db_url.startswith("postgresql://"):
        db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

    engine = create_async_engine(db_url, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        created = 0
        skipped = 0
        for data in ARTICLES:
            from sqlalchemy import select
            existing = await session.execute(
                select(ResearchArticle).where(ResearchArticle.slug == data["slug"])
            )
            if existing.scalar_one_or_none():
                print(f"  skip (exists): {data['slug']}")
                skipped += 1
                continue

            from datetime import UTC, datetime
            article = ResearchArticle(
                slug=data["slug"],
                title=data["title"],
                excerpt=data.get("excerpt"),
                content=data["content"],
                category=data.get("category"),
                tags=data.get("tags", []),
                seo_title=data.get("seo_title"),
                seo_description=data.get("seo_description"),
                canonical_url=data.get("canonical_url"),
                og_image_url=data.get("og_image_url"),
                faq_items=data.get("faq_items", []),
                author_name=data.get("author_name"),
                related_restore_assist=data.get("related_restore_assist", []),
                status=data.get("status", ArticleStatus.DRAFT),
                published_at=datetime.now(UTC) if data.get("status") == ArticleStatus.PUBLISHED else None,
            )
            session.add(article)
            print(f"  create: {data['slug']}")
            created += 1

        await session.commit()
        print(f"\nDone. Created: {created}, Skipped: {skipped}")

    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
