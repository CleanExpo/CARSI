"""
CARSI LMS Bundle Routes

GET    /api/lms/bundles              — list active bundles with course count + savings
GET    /api/lms/bundles/{slug}       — bundle detail including courses
POST   /api/lms/bundles              — create bundle (admin only)
POST   /api/lms/bundles/{id}/enrol   — enrol in all courses in bundle
"""

import uuid as _uuid
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.api.deps_lms import get_current_lms_user, require_role
from src.config.database import get_async_db
from src.db.lms_models import (
    LMSBundle,
    LMSBundleCourse,
    LMSCourse,
    LMSEnrollment,
    LMSUser,
)

router = APIRouter(prefix="/api/lms/bundles", tags=["lms-bundles"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class BundleCourseOut(BaseModel):
    id: str
    title: str
    slug: str
    iicrc_discipline: str | None = None
    price_aud: Decimal | None = None
    is_free: bool = False

    model_config = {"from_attributes": True}


class BundleListItem(BaseModel):
    id: str
    name: str
    slug: str
    description: str | None = None
    price_aud: Decimal
    original_price_aud: Decimal | None = None
    savings_aud: Decimal | None = None
    industry_tag: str | None = None
    course_count: int = 0
    courses: list[BundleCourseOut] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class BundleDetailOut(BundleListItem):
    is_active: bool = True


class BundleCreate(BaseModel):
    name: str
    slug: str
    description: str | None = None
    price_aud: Decimal
    original_price_aud: Decimal | None = None
    industry_tag: str | None = None
    course_ids: list[str] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _user_is_admin(user: LMSUser) -> bool:
    return any(ur.role.name == "admin" for ur in user.user_roles if ur.role)


def _bundle_to_list_item(bundle: LMSBundle) -> BundleListItem:
    courses_out = [
        BundleCourseOut(
            id=str(c.id),
            title=c.title,
            slug=c.slug,
            iicrc_discipline=c.iicrc_discipline,
            price_aud=c.price_aud,
            is_free=c.is_free,
        )
        for c in bundle.courses
    ]
    savings = (
        bundle.original_price_aud - bundle.price_aud
        if bundle.original_price_aud
        else None
    )
    return BundleListItem(
        id=str(bundle.id),
        name=bundle.name,
        slug=bundle.slug,
        description=bundle.description,
        price_aud=bundle.price_aud,
        original_price_aud=bundle.original_price_aud,
        savings_aud=savings,
        industry_tag=bundle.industry_tag,
        course_count=len(bundle.courses),
        courses=courses_out,
    )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.get("", response_model=list[BundleListItem])
async def list_bundles(
    db: AsyncSession = Depends(get_async_db),
) -> list[BundleListItem]:
    """List all active bundles with course count and computed savings."""
    result = await db.execute(
        select(LMSBundle)
        .where(LMSBundle.is_active.is_(True))
        .options(selectinload(LMSBundle.courses))
        .order_by(LMSBundle.created_at.desc())
    )
    bundles = result.scalars().all()
    return [_bundle_to_list_item(b) for b in bundles]


@router.get("/{slug}", response_model=BundleDetailOut)
async def get_bundle(
    slug: str,
    db: AsyncSession = Depends(get_async_db),
) -> BundleDetailOut:
    """Retrieve a single bundle by slug, including its courses."""
    result = await db.execute(
        select(LMSBundle)
        .where(LMSBundle.slug == slug)
        .options(selectinload(LMSBundle.courses))
    )
    bundle = result.scalar_one_or_none()
    if not bundle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bundle not found")

    item = _bundle_to_list_item(bundle)
    return BundleDetailOut(**item.model_dump(), is_active=bundle.is_active)


@router.post("", response_model=BundleDetailOut, status_code=status.HTTP_201_CREATED)
async def create_bundle(
    data: BundleCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user: LMSUser = Depends(require_role(["admin"])),
) -> BundleDetailOut:
    """Create a new course bundle (admin only)."""
    # Check slug uniqueness
    existing = await db.execute(select(LMSBundle).where(LMSBundle.slug == data.slug))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A bundle with this slug already exists",
        )

    bundle = LMSBundle(
        name=data.name,
        slug=data.slug,
        description=data.description,
        price_aud=data.price_aud,
        original_price_aud=data.original_price_aud,
        industry_tag=data.industry_tag,
    )
    db.add(bundle)
    await db.flush()

    # Link courses
    for idx, course_id in enumerate(data.course_ids):
        db.add(LMSBundleCourse(
            bundle_id=bundle.id,
            course_id=_uuid.UUID(course_id),
            display_order=idx,
        ))

    await db.commit()
    await db.refresh(bundle)

    # Re-fetch with courses loaded
    result = await db.execute(
        select(LMSBundle)
        .where(LMSBundle.id == bundle.id)
        .options(selectinload(LMSBundle.courses))
    )
    bundle = result.scalar_one()

    item = _bundle_to_list_item(bundle)
    return BundleDetailOut(**item.model_dump(), is_active=bundle.is_active)


@router.post("/{bundle_id}/enrol", status_code=status.HTTP_201_CREATED)
async def enrol_in_bundle(
    bundle_id: str,
    db: AsyncSession = Depends(get_async_db),
    current_user: LMSUser = Depends(get_current_lms_user),
) -> dict:
    """Enrol the current user in all courses within a bundle."""
    result = await db.execute(
        select(LMSBundle)
        .where(LMSBundle.id == _uuid.UUID(bundle_id), LMSBundle.is_active.is_(True))
        .options(selectinload(LMSBundle.courses))
    )
    bundle = result.scalar_one_or_none()
    if not bundle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bundle not found")

    enrolled_courses: list[str] = []
    skipped_courses: list[str] = []

    for course in bundle.courses:
        # Skip if already enrolled
        existing = await db.execute(
            select(LMSEnrollment).where(
                LMSEnrollment.student_id == current_user.id,
                LMSEnrollment.course_id == course.id,
            )
        )
        if existing.scalar_one_or_none():
            skipped_courses.append(course.title)
            continue

        # Only enrol in published courses
        if course.status != "published":
            skipped_courses.append(course.title)
            continue

        enrollment = LMSEnrollment(
            student_id=current_user.id,
            course_id=course.id,
            status="active",
            payment_reference=f"bundle:{bundle.slug}",
        )
        db.add(enrollment)
        enrolled_courses.append(course.title)

    await db.commit()

    return {
        "bundle": bundle.name,
        "enrolled_count": len(enrolled_courses),
        "enrolled_courses": enrolled_courses,
        "skipped_count": len(skipped_courses),
        "skipped_courses": skipped_courses,
    }


# ---------------------------------------------------------------------------
# Seed Data
# ---------------------------------------------------------------------------


async def seed_industry_bundles(db: AsyncSession) -> None:
    """Create default industry bundles if the table is empty."""
    count_result = await db.execute(select(func.count()).select_from(LMSBundle))
    if (count_result.scalar() or 0) > 0:
        return

    bundle_defs = [
        {
            "name": "Mining Safety Bundle",
            "slug": "mining-safety-bundle",
            "description": "Essential restoration courses for the mining industry — covering water damage and applied structural drying.",
            "price_aud": Decimal("295.00"),
            "industry_tag": "mining",
            "disciplines": ["WRT", "ASD"],
        },
        {
            "name": "Commercial Cleaning Bundle",
            "slug": "commercial-cleaning-bundle",
            "description": "Professional cleaning certification courses — carpet restoration and commercial carpet care.",
            "price_aud": Decimal("195.00"),
            "industry_tag": "commercial-cleaning",
            "disciplines": ["CRT", "CCT"],
        },
        {
            "name": "Aged Care Infection Control Bundle",
            "slug": "aged-care-infection-control-bundle",
            "description": "Infection control and mould remediation courses for aged care facilities.",
            "price_aud": Decimal("245.00"),
            "industry_tag": "aged-care",
            "disciplines": ["CRT", "AMRT"],
        },
    ]

    for bdef in bundle_defs:
        disciplines = bdef.pop("disciplines")

        # Find matching courses by discipline
        course_result = await db.execute(
            select(LMSCourse).where(
                LMSCourse.iicrc_discipline.in_(disciplines),
                LMSCourse.is_free.is_(False),
            )
        )
        courses = course_result.scalars().all()

        original_price = sum(c.price_aud for c in courses if c.price_aud) or None

        bundle = LMSBundle(
            **bdef,
            original_price_aud=original_price,
        )
        db.add(bundle)
        await db.flush()

        for idx, course in enumerate(courses):
            db.add(LMSBundleCourse(
                bundle_id=bundle.id,
                course_id=course.id,
                display_order=idx,
            ))

    await db.commit()
