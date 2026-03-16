"""
Stripe Webhook Handler

POST /api/lms/webhooks/stripe

Handles subscription lifecycle events:
  customer.subscription.created  → create LMSSubscription row
  customer.subscription.deleted  → set status=cancelled
  invoice.payment_succeeded       → set status=active
  invoice.payment_failed          → set status=past_due

IMPORTANT: This endpoint receives the RAW request body (bytes) for
Stripe signature verification — do NOT use Pydantic body parsing here.
"""

from datetime import datetime, timezone

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.config.database import get_async_db
from src.config.settings import get_settings
from src.db.lms_models import LMSEnrollment, LMSSubscription
from src.utils import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/api/lms/webhooks", tags=["lms-webhooks"])

# Keep module-level name for patching in tests — populated at request time via helper
WEBHOOK_SECRET = ""


def _get_webhook_secret() -> str:
    return get_settings().stripe_webhook_secret


def _ts_to_dt(ts: int | None) -> datetime | None:
    if ts is None:
        return None
    return datetime.fromtimestamp(ts, tz=timezone.utc)


@router.post("/stripe")
async def stripe_webhook(
    request: Request,
    db: AsyncSession = Depends(get_async_db),
) -> dict:
    """
    Receive and verify Stripe webhook events. Updates subscription state in DB.
    Exempt from JSON body parsing — raw bytes required for signature check.
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    webhook_secret = _get_webhook_secret()
    if not webhook_secret:
        logger.error("STRIPE_WEBHOOK_SECRET not configured — rejecting webhook")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Webhook endpoint not configured",
        )
    try:
        event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid Stripe signature")

    event_type: str = event["type"]
    obj = event["data"]["object"]

    if event_type == "checkout.session.completed":
        await _handle_checkout_completed(db, obj)
    elif event_type == "customer.subscription.created":
        await _handle_subscription_created(db, obj)
    elif event_type == "customer.subscription.deleted":
        await _handle_subscription_deleted(db, obj)
    elif event_type == "invoice.payment_succeeded":
        await _handle_payment_succeeded(db, obj)
    elif event_type == "invoice.payment_failed":
        await _handle_payment_failed(db, obj)

    return {"received": True}


async def _handle_checkout_completed(db: AsyncSession, obj: dict) -> None:
    """Handle checkout.session.completed — enrol student in paid course."""
    from uuid import UUID

    metadata = obj.get("metadata") or {}
    course_id_str = metadata.get("course_id")
    student_id_str = metadata.get("student_id")

    if not course_id_str or not student_id_str:
        return

    try:
        course_id = UUID(course_id_str)
        student_id = UUID(student_id_str)
    except ValueError:
        return

    try:
        # Idempotent — skip if already enrolled
        existing = await db.execute(
            select(LMSEnrollment).where(
                LMSEnrollment.student_id == student_id,
                LMSEnrollment.course_id == course_id,
            )
        )
        if existing.scalar_one_or_none():
            return

        enrollment = LMSEnrollment(
            student_id=student_id,
            course_id=course_id,
            status="active",
            payment_reference=obj.get("id", ""),
        )
        db.add(enrollment)
        await db.commit()
    except Exception as exc:
        await db.rollback()
        logger.error("Webhook handler failed", error=str(exc))
        raise


async def _handle_subscription_created(db: AsyncSession, obj: dict) -> None:
    from uuid import UUID

    student_id_str = (obj.get("metadata") or {}).get("student_id")
    if not student_id_str:
        return
    try:
        student_id = UUID(student_id_str)
    except ValueError:
        return

    try:
        existing = await db.execute(
            select(LMSSubscription).where(
                LMSSubscription.stripe_subscription_id == obj["id"]
            )
        )
        if existing.scalar_one_or_none():
            return  # idempotent

        sub = LMSSubscription(
            student_id=student_id,
            stripe_subscription_id=obj["id"],
            stripe_customer_id=obj["customer"],
            status=obj.get("status", "trialling"),
            plan="yearly",
            current_period_start=_ts_to_dt(obj.get("current_period_start")),
            current_period_end=_ts_to_dt(obj.get("current_period_end")),
            trial_end=_ts_to_dt(obj.get("trial_end")),
        )
        db.add(sub)
        await db.commit()
    except Exception as exc:
        await db.rollback()
        logger.error("Webhook handler failed", error=str(exc))
        raise

    # Fire-and-forget: push to Synthex for marketing automation
    import asyncio
    from src.services.synthex_connector import notify_subscription_event, SynthexEvents

    asyncio.create_task(notify_subscription_event(
        student_id=student_id,
        event_type=SynthexEvents.SUBSCRIPTION_CREATED,
        plan="yearly",
        amount_aud=795.0,
    ))


async def _handle_subscription_deleted(db: AsyncSession, obj: dict) -> None:
    try:
        result = await db.execute(
            select(LMSSubscription).where(
                LMSSubscription.stripe_subscription_id == obj["id"]
            )
        )
        sub = result.scalar_one_or_none()
        if sub:
            sub.status = "cancelled"
            sub.cancelled_at = datetime.now(timezone.utc)
            await db.commit()

            # Fire-and-forget: push to Synthex for marketing automation
            import asyncio
            from src.services.synthex_connector import notify_subscription_event, SynthexEvents

            asyncio.create_task(notify_subscription_event(
                student_id=sub.student_id,
                event_type=SynthexEvents.SUBSCRIPTION_CANCELLED,
                plan=sub.plan,
            ))
    except Exception as exc:
        await db.rollback()
        logger.error("Webhook handler failed", error=str(exc))
        raise


async def _handle_payment_succeeded(db: AsyncSession, obj: dict) -> None:
    sub_id = obj.get("subscription")
    if not sub_id:
        return
    try:
        result = await db.execute(
            select(LMSSubscription).where(
                LMSSubscription.stripe_subscription_id == sub_id
            )
        )
        sub = result.scalar_one_or_none()
        if sub:
            sub.status = "active"
            await db.commit()
    except Exception as exc:
        await db.rollback()
        logger.error("Webhook handler failed", error=str(exc))
        raise


async def _handle_payment_failed(db: AsyncSession, obj: dict) -> None:
    sub_id = obj.get("subscription")
    if not sub_id:
        return
    try:
        result = await db.execute(
            select(LMSSubscription).where(
                LMSSubscription.stripe_subscription_id == sub_id
            )
        )
        sub = result.scalar_one_or_none()
        if sub:
            sub.status = "past_due"
            await db.commit()
    except Exception as exc:
        await db.rollback()
        logger.error("Webhook handler failed", error=str(exc))
        raise
