"""
Synthex Marketing Automation Connector

Pushes LMS events to Synthex for campaign automation, retargeting, and analytics.
Synthex uses this data for:
- Onboarding email sequences
- Course completion upsells
- CEC milestone celebrations
- Subscription lifecycle campaigns
- Industry-specific retargeting

Events are fire-and-forget with single retry on failure.
"""

import asyncio
from datetime import datetime
from typing import Any
from uuid import UUID

import httpx

from src.config import get_settings
from src.utils import get_logger

logger = get_logger(__name__)


# ---------------------------------------------------------------------------
# Event Types (for Synthex campaign triggers)
# ---------------------------------------------------------------------------

class SynthexEvents:
    """Canonical event types for Synthex integration."""

    # Student lifecycle
    STUDENT_REGISTERED = "student.registered"
    STUDENT_PROFILE_UPDATED = "student.profile_updated"

    # Enrolment events
    ENROLMENT_CREATED = "enrolment.created"
    ENROLMENT_STARTED = "enrolment.started"  # First lesson accessed

    # Progress events
    LESSON_COMPLETED = "lesson.completed"
    MODULE_COMPLETED = "module.completed"
    QUIZ_PASSED = "quiz.passed"
    QUIZ_FAILED = "quiz.failed"

    # Course completion
    COURSE_COMPLETED = "course.completed"
    CERTIFICATION_AWARDED = "certification.awarded"

    # CEC milestones
    CEC_MILESTONE_REACHED = "cec.milestone_reached"  # 25%, 50%, 75%, 100% of cycle
    CEC_CYCLE_COMPLETE = "cec.cycle_complete"

    # Subscription events
    SUBSCRIPTION_CREATED = "subscription.created"
    SUBSCRIPTION_ACTIVATED = "subscription.activated"
    SUBSCRIPTION_RENEWED = "subscription.renewed"
    SUBSCRIPTION_CANCELLED = "subscription.cancelled"
    SUBSCRIPTION_PAST_DUE = "subscription.past_due"
    TRIAL_ENDING_SOON = "subscription.trial_ending"  # 3 days before trial ends

    # Engagement events
    INACTIVITY_7_DAYS = "engagement.inactive_7d"
    INACTIVITY_30_DAYS = "engagement.inactive_30d"
    REACTIVATED = "engagement.reactivated"

    # Achievement events
    STREAK_ACHIEVED = "achievement.streak"
    LEVEL_UP = "achievement.level_up"
    BADGE_EARNED = "achievement.badge"


# ---------------------------------------------------------------------------
# Core Connector
# ---------------------------------------------------------------------------

async def push_to_synthex(
    event_type: str,
    payload: dict[str, Any],
    *,
    student_id: UUID | str | None = None,
    course_id: UUID | str | None = None,
    metadata: dict[str, Any] | None = None,
) -> bool:
    """
    Push an event to Synthex for marketing automation.

    Fire-and-forget with single retry. Returns True if delivered, False otherwise.
    Never raises exceptions — marketing integration should never block LMS operations.

    Args:
        event_type: Event type from SynthexEvents
        payload: Event-specific data
        student_id: Student UUID for audience segmentation
        course_id: Course UUID for content-based targeting
        metadata: Additional context (industry, discipline, etc.)
    """
    settings = get_settings()

    # Skip if not configured
    if not settings.synthex_api_key:
        logger.debug("Synthex connector: no API key configured, skipping", event_type=event_type)
        return False

    # Build full event payload
    event_data = {
        "source": "carsi_lms",
        "event": event_type,
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "data": payload,
    }

    if student_id:
        event_data["student_id"] = str(student_id)
    if course_id:
        event_data["course_id"] = str(course_id)
    if metadata:
        event_data["metadata"] = metadata

    headers = {
        "Authorization": f"Bearer {settings.synthex_api_key}",
        "Content-Type": "application/json",
        "X-Source": "carsi-lms",
        "X-Event-Type": event_type,
    }

    # Attempt delivery with single retry
    for attempt in range(2):
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.post(
                    settings.synthex_api_url,
                    json=event_data,
                    headers=headers,
                )
                resp.raise_for_status()
                logger.info(
                    "Synthex event pushed",
                    event_type=event_type,
                    student_id=str(student_id) if student_id else None,
                    attempt=attempt + 1,
                )
                return True
        except Exception as exc:
            if attempt == 0:
                logger.debug("Synthex push failed, retrying", event_type=event_type, error=str(exc))
                await asyncio.sleep(0.5)  # Brief backoff
            else:
                logger.warning(
                    "Synthex event push failed after retry",
                    event_type=event_type,
                    error=str(exc),
                )
    return False


# ---------------------------------------------------------------------------
# Convenience Wrappers (use these in route handlers)
# ---------------------------------------------------------------------------

async def notify_student_enrolled(
    student_id: UUID,
    course_id: UUID,
    course_title: str,
    discipline: str | None = None,
    cec_hours: float | None = None,
    price_aud: float | None = None,
    is_free: bool = False,
) -> None:
    """Notify Synthex when a student enrols in a course."""
    asyncio.create_task(
        push_to_synthex(
            SynthexEvents.ENROLMENT_CREATED,
            {
                "course_title": course_title,
                "discipline": discipline,
                "cec_hours": cec_hours,
                "price_aud": price_aud,
                "is_free": is_free,
            },
            student_id=student_id,
            course_id=course_id,
            metadata={"discipline": discipline} if discipline else None,
        )
    )


async def notify_course_completed(
    student_id: UUID,
    course_id: UUID,
    course_title: str,
    discipline: str | None = None,
    cec_hours_earned: float | None = None,
    completion_time_hours: float | None = None,
) -> None:
    """Notify Synthex when a student completes a course."""
    asyncio.create_task(
        push_to_synthex(
            SynthexEvents.COURSE_COMPLETED,
            {
                "course_title": course_title,
                "discipline": discipline,
                "cec_hours_earned": cec_hours_earned,
                "completion_time_hours": completion_time_hours,
            },
            student_id=student_id,
            course_id=course_id,
            metadata={"discipline": discipline} if discipline else None,
        )
    )


async def notify_certification_awarded(
    student_id: UUID,
    credential_id: UUID,
    credential_type: str,
    discipline: str | None = None,
    cec_hours: float | None = None,
    public_url: str | None = None,
) -> None:
    """Notify Synthex when a credential/certificate is awarded."""
    asyncio.create_task(
        push_to_synthex(
            SynthexEvents.CERTIFICATION_AWARDED,
            {
                "credential_type": credential_type,
                "discipline": discipline,
                "cec_hours": cec_hours,
                "public_url": public_url,
                "shareable": True,
            },
            student_id=student_id,
            metadata={"discipline": discipline, "credential_id": str(credential_id)},
        )
    )


async def notify_subscription_event(
    student_id: UUID,
    event_type: str,
    plan: str = "yearly",
    amount_aud: float | None = None,
    trial_days_remaining: int | None = None,
) -> None:
    """Notify Synthex of subscription lifecycle events."""
    asyncio.create_task(
        push_to_synthex(
            event_type,
            {
                "plan": plan,
                "amount_aud": amount_aud,
                "trial_days_remaining": trial_days_remaining,
            },
            student_id=student_id,
        )
    )


async def notify_cec_milestone(
    student_id: UUID,
    discipline: str,
    cecs_earned: float,
    cecs_required: float,
    percentage: int,  # 25, 50, 75, or 100
) -> None:
    """Notify Synthex when a student hits a CEC milestone (25%, 50%, 75%, 100%)."""
    asyncio.create_task(
        push_to_synthex(
            SynthexEvents.CEC_MILESTONE_REACHED,
            {
                "discipline": discipline,
                "cecs_earned": cecs_earned,
                "cecs_required": cecs_required,
                "percentage": percentage,
                "milestone_type": f"{percentage}%",
            },
            student_id=student_id,
            metadata={"discipline": discipline},
        )
    )


async def notify_achievement(
    student_id: UUID,
    achievement_type: str,  # "streak", "level_up", "badge"
    achievement_name: str,
    value: int | None = None,  # e.g., streak days, new level number
) -> None:
    """Notify Synthex of gamification achievements."""
    event_map = {
        "streak": SynthexEvents.STREAK_ACHIEVED,
        "level_up": SynthexEvents.LEVEL_UP,
        "badge": SynthexEvents.BADGE_EARNED,
    }
    event_type = event_map.get(achievement_type, SynthexEvents.BADGE_EARNED)

    asyncio.create_task(
        push_to_synthex(
            event_type,
            {
                "achievement_type": achievement_type,
                "achievement_name": achievement_name,
                "value": value,
            },
            student_id=student_id,
        )
    )


async def notify_engagement_event(
    student_id: UUID,
    event_type: str,
    days_inactive: int | None = None,
    last_activity: str | None = None,
) -> None:
    """Notify Synthex of engagement events (inactivity, reactivation)."""
    asyncio.create_task(
        push_to_synthex(
            event_type,
            {
                "days_inactive": days_inactive,
                "last_activity": last_activity,
            },
            student_id=student_id,
        )
    )
