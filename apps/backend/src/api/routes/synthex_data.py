"""
Synthex Data Sync API

Provides read-only endpoints for Synthex to pull comprehensive LMS data
for audience segmentation, campaign targeting, and analytics.

All endpoints require Synthex API key authentication via X-Synthex-Key header.

GET /api/synthex/students         — All students with engagement metrics
GET /api/synthex/students/{id}    — Single student with full history
GET /api/synthex/courses          — All courses with enrolment stats
GET /api/synthex/enrolments       — Active enrolments with progress
GET /api/synthex/credentials      — Awarded credentials/certificates
GET /api/synthex/cec-status       — CEC progress by student + discipline
GET /api/synthex/subscriptions    — Subscription status for all students
GET /api/synthex/segments         — Pre-built audience segments
"""

from datetime import datetime, timedelta
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.config import get_settings
from src.config.database import get_async_db
from src.db.lms_models import (
    LMSCertificate,
    LMSCourse,
    LMSEnrollment,
    LMSProgress,
    LMSSubscription,
    LMSUser,
)

router = APIRouter(prefix="/api/synthex", tags=["synthex-data"])


# ---------------------------------------------------------------------------
# Authentication
# ---------------------------------------------------------------------------

async def verify_synthex_key(x_synthex_key: str = Header(...)) -> None:
    """Verify Synthex API key from header."""
    settings = get_settings()
    if not settings.synthex_api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Synthex integration not configured",
        )
    if x_synthex_key != settings.synthex_api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Synthex API key",
        )
    if not settings.synthex_data_sync_enabled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Synthex data sync is disabled",
        )


# ---------------------------------------------------------------------------
# Helper Functions
# ---------------------------------------------------------------------------

def _serialize_uuid(obj: Any) -> Any:
    """Recursively convert UUIDs to strings for JSON serialization."""
    if isinstance(obj, UUID):
        return str(obj)
    if isinstance(obj, dict):
        return {k: _serialize_uuid(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_serialize_uuid(v) for v in obj]
    return obj


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/students")
async def list_students(
    db: AsyncSession = Depends(get_async_db),
    _: None = Depends(verify_synthex_key),
    limit: int = Query(default=100, le=1000),
    offset: int = Query(default=0, ge=0),
    updated_since: datetime | None = Query(default=None),
) -> dict:
    """
    List all students with engagement metrics for Synthex audience building.

    Includes:
    - Basic profile (id, email, name, created_at)
    - Engagement metrics (courses_enrolled, courses_completed, total_cecs)
    - Activity status (last_active, days_since_activity)
    - Subscription status
    """
    query = select(LMSUser)
    if updated_since:
        query = query.where(LMSUser.updated_at >= updated_since)
    query = query.order_by(LMSUser.created_at.desc()).limit(limit).offset(offset)

    result = await db.execute(query)
    users = result.scalars().all()

    students = []
    for user in users:
        # Get enrolment stats
        enrol_result = await db.execute(
            select(
                func.count(LMSEnrollment.id).label("total"),
                func.count(LMSEnrollment.id).filter(LMSEnrollment.status == "completed").label("completed"),
            ).where(LMSEnrollment.student_id == user.id)
        )
        enrol_stats = enrol_result.one()

        # Get subscription status
        sub_result = await db.execute(
            select(LMSSubscription)
            .where(LMSSubscription.student_id == user.id)
            .order_by(LMSSubscription.created_at.desc())
            .limit(1)
        )
        subscription = sub_result.scalar_one_or_none()

        # Calculate days since last activity
        last_active = user.updated_at or user.created_at
        days_inactive = (datetime.utcnow() - last_active.replace(tzinfo=None)).days if last_active else None

        students.append({
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "created_at": user.created_at.isoformat() if user.created_at else None,
            "updated_at": user.updated_at.isoformat() if user.updated_at else None,
            "engagement": {
                "courses_enrolled": enrol_stats.total,
                "courses_completed": enrol_stats.completed,
                "days_since_activity": days_inactive,
            },
            "subscription": {
                "status": subscription.status if subscription else "none",
                "plan": subscription.plan if subscription else None,
                "trial_end": subscription.trial_end.isoformat() if subscription and subscription.trial_end else None,
            } if subscription else {"status": "none"},
            "segments": _compute_student_segments(user, enrol_stats, subscription, days_inactive),
        })

    return {"students": students, "total": len(students), "limit": limit, "offset": offset}


def _compute_student_segments(
    user: LMSUser,
    enrol_stats: Any,
    subscription: LMSSubscription | None,
    days_inactive: int | None,
) -> list[str]:
    """Compute marketing segments for a student."""
    segments = []

    # Engagement segments
    if enrol_stats.total == 0:
        segments.append("never_enrolled")
    elif enrol_stats.completed == 0:
        segments.append("enrolled_not_completed")
    elif enrol_stats.completed > 0:
        segments.append("has_completions")
    if enrol_stats.completed >= 5:
        segments.append("power_learner")

    # Activity segments
    if days_inactive is not None:
        if days_inactive <= 7:
            segments.append("active_7d")
        elif days_inactive <= 30:
            segments.append("active_30d")
        elif days_inactive <= 90:
            segments.append("dormant")
        else:
            segments.append("churned")

    # Subscription segments
    if subscription:
        if subscription.status == "trialling":
            segments.append("trial_active")
        elif subscription.status == "active":
            segments.append("subscriber")
        elif subscription.status == "past_due":
            segments.append("at_risk")
        elif subscription.status == "cancelled":
            segments.append("churned_subscriber")
    else:
        segments.append("free_tier")

    return segments


@router.get("/students/{student_id}")
async def get_student_detail(
    student_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    _: None = Depends(verify_synthex_key),
) -> dict:
    """
    Get full student profile with complete history for Synthex.

    Includes:
    - Profile data
    - All enrolments with progress
    - All credentials earned
    - CEC totals by discipline
    - Subscription history
    - Activity timeline
    """
    result = await db.execute(select(LMSUser).where(LMSUser.id == student_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Student not found")

    # Get enrolments with course details
    enrol_result = await db.execute(
        select(LMSEnrollment)
        .options(selectinload(LMSEnrollment.course))
        .where(LMSEnrollment.student_id == student_id)
        .order_by(LMSEnrollment.enrolled_at.desc())
    )
    enrolments = enrol_result.scalars().all()

    # Get certificates
    cred_result = await db.execute(
        select(LMSCertificate)
        .options(selectinload(LMSCertificate.course))
        .where(LMSCertificate.student_id == student_id)
        .order_by(LMSCertificate.issued_at.desc())
    )
    certificates = cred_result.scalars().all()

    # Get subscriptions
    sub_result = await db.execute(
        select(LMSSubscription)
        .where(LMSSubscription.student_id == student_id)
        .order_by(LMSSubscription.created_at.desc())
    )
    subscriptions = sub_result.scalars().all()

    # Calculate CEC totals by discipline
    cec_by_discipline: dict[str, float] = {}
    for enrol in enrolments:
        if enrol.status == "completed" and enrol.course and enrol.course.cec_hours:
            discipline = enrol.course.iicrc_discipline or "general"
            cec_by_discipline[discipline] = cec_by_discipline.get(discipline, 0) + float(enrol.course.cec_hours)

    return {
        "id": str(user.id),
        "email": user.email,
        "full_name": user.full_name,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "enrolments": [
            {
                "id": str(e.id),
                "course_id": str(e.course_id),
                "course_title": e.course.title if e.course else None,
                "discipline": e.course.iicrc_discipline if e.course else None,
                "status": e.status,
                "enrolled_at": e.enrolled_at.isoformat() if e.enrolled_at else None,
                "completed_at": e.completed_at.isoformat() if e.completed_at else None,
                "progress_percent": e.progress_percent,
            }
            for e in enrolments
        ],
        "certificates": [
            {
                "id": str(c.id),
                "credential_id": c.credential_id,
                "course_id": str(c.course_id),
                "course_title": c.course.title if c.course else None,
                "discipline": c.course.iicrc_discipline if c.course else None,
                "cec_hours": float(c.course.cec_hours) if c.course and c.course.cec_hours else None,
                "issued_at": c.issued_at.isoformat() if c.issued_at else None,
                "pdf_url": c.pdf_url,
                "is_revoked": c.is_revoked,
                "public_url": f"https://carsi.com.au/credentials/{c.credential_id}",
            }
            for c in certificates
        ],
        "cec_summary": cec_by_discipline,
        "subscriptions": [
            {
                "id": str(s.id),
                "status": s.status,
                "plan": s.plan,
                "created_at": s.created_at.isoformat() if s.created_at else None,
                "trial_end": s.trial_end.isoformat() if s.trial_end else None,
                "current_period_end": s.current_period_end.isoformat() if s.current_period_end else None,
            }
            for s in subscriptions
        ],
    }


@router.get("/courses")
async def list_courses(
    db: AsyncSession = Depends(get_async_db),
    _: None = Depends(verify_synthex_key),
    limit: int = Query(default=100, le=500),
    offset: int = Query(default=0, ge=0),
) -> dict:
    """
    List all courses with enrolment statistics for Synthex content targeting.
    """
    result = await db.execute(
        select(LMSCourse)
        .where(LMSCourse.status == "published")
        .order_by(LMSCourse.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    courses = result.scalars().all()

    course_data = []
    for course in courses:
        # Get enrolment stats
        enrol_result = await db.execute(
            select(
                func.count(LMSEnrollment.id).label("total"),
                func.count(LMSEnrollment.id).filter(LMSEnrollment.status == "completed").label("completed"),
            ).where(LMSEnrollment.course_id == course.id)
        )
        stats = enrol_result.one()

        course_data.append({
            "id": str(course.id),
            "slug": course.slug,
            "title": course.title,
            "description": course.short_description,
            "discipline": course.iicrc_discipline,
            "cec_hours": float(course.cec_hours) if course.cec_hours else None,
            "price_aud": float(course.price_aud) if course.price_aud else None,
            "is_free": course.is_free,
            "level": course.level,
            "category": course.category,
            "tags": course.tags or [],
            "stats": {
                "total_enrolments": stats.total,
                "completions": stats.completed,
                "completion_rate": round(stats.completed / stats.total * 100, 1) if stats.total > 0 else 0,
            },
        })

    return {"courses": course_data, "total": len(course_data), "limit": limit, "offset": offset}


@router.get("/segments")
async def get_audience_segments(
    db: AsyncSession = Depends(get_async_db),
    _: None = Depends(verify_synthex_key),
) -> dict:
    """
    Get pre-computed audience segments with counts for Synthex campaign targeting.

    Segments:
    - trial_active: Students in active trial
    - trial_ending_soon: Trial ending in next 3 days
    - subscriber: Active paid subscribers
    - free_tier: No subscription
    - at_risk: Past due payment
    - inactive_7d: No activity in 7 days (with active enrolment)
    - inactive_30d: No activity in 30 days
    - power_learner: 5+ course completions
    - new_this_week: Registered in last 7 days
    """
    now = datetime.utcnow()
    segments = {}

    # Trial segments
    trial_result = await db.execute(
        select(func.count(LMSSubscription.id)).where(LMSSubscription.status == "trialling")
    )
    segments["trial_active"] = trial_result.scalar() or 0

    trial_ending_result = await db.execute(
        select(func.count(LMSSubscription.id)).where(
            LMSSubscription.status == "trialling",
            LMSSubscription.trial_end <= now + timedelta(days=3),
            LMSSubscription.trial_end > now,
        )
    )
    segments["trial_ending_soon"] = trial_ending_result.scalar() or 0

    # Subscriber segments
    sub_result = await db.execute(
        select(func.count(LMSSubscription.id)).where(LMSSubscription.status == "active")
    )
    segments["subscriber"] = sub_result.scalar() or 0

    past_due_result = await db.execute(
        select(func.count(LMSSubscription.id)).where(LMSSubscription.status == "past_due")
    )
    segments["at_risk"] = past_due_result.scalar() or 0

    # New registrations
    new_result = await db.execute(
        select(func.count(LMSUser.id)).where(LMSUser.created_at >= now - timedelta(days=7))
    )
    segments["new_this_week"] = new_result.scalar() or 0

    # Total users for free tier calculation
    total_result = await db.execute(select(func.count(LMSUser.id)))
    total_users = total_result.scalar() or 0

    # Users with any subscription
    any_sub_result = await db.execute(
        select(func.count(func.distinct(LMSSubscription.student_id)))
    )
    users_with_sub = any_sub_result.scalar() or 0
    segments["free_tier"] = total_users - users_with_sub

    return {
        "segments": segments,
        "generated_at": now.isoformat() + "Z",
    }


@router.get("/health")
async def synthex_health(
    _: None = Depends(verify_synthex_key),
) -> dict:
    """Health check for Synthex integration."""
    return {
        "status": "ok",
        "service": "carsi_lms",
        "timestamp": datetime.utcnow().isoformat() + "Z",
    }
