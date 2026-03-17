"""
CARSI LMS Subscription Routes

POST /api/lms/subscription/checkout  — Stripe Checkout ($795 AUD/year, 7-day trial)
GET  /api/lms/subscription/status    — current subscription status
POST /api/lms/subscription/portal    — Stripe Billing Portal for self-service
"""

import hashlib
import os

import stripe
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps_lms import get_current_lms_user
from src.config.database import get_async_db
from src.config.settings import get_settings
from src.db.lms_models import LMSSubscription, LMSUser


def _configure_stripe() -> None:
    """Set the Stripe API key from settings at request time."""
    stripe.api_key = get_settings().stripe_secret_key


_PLAN_PRICE_MAP = {
    "foundation": "stripe_foundation_price_id",
    "growth": "stripe_growth_price_id",
    # Legacy yearly plan — maps to Growth access level
    "yearly": "stripe_yearly_price_id",
}


def _get_stripe_price_id(plan: str) -> str:
    s = get_settings()
    attr = _PLAN_PRICE_MAP.get(plan, "stripe_growth_price_id")
    price_id = getattr(s, attr, "") or os.getenv(attr.upper(), "")
    # Fallback to yearly price if the specific plan price is not yet configured
    if not price_id:
        price_id = s.stripe_yearly_price_id or os.getenv("STRIPE_YEARLY_PRICE_ID", "")
    if not price_id:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Subscription not configured — contact support",
        )
    return price_id

router = APIRouter(prefix="/api/lms/subscription", tags=["lms-subscription"])


class CheckoutRequest(BaseModel):
    success_url: str
    cancel_url: str
    plan: str = "growth"  # foundation | growth


class CheckoutResponse(BaseModel):
    url: str


class SubscriptionStatusOut(BaseModel):
    has_subscription: bool
    status: str | None = None
    plan: str | None = None
    current_period_end: str | None = None
    trial_end: str | None = None


class PortalResponse(BaseModel):
    url: str


@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout_session(
    data: CheckoutRequest,
    db: AsyncSession = Depends(get_async_db),
    current_user: LMSUser = Depends(get_current_lms_user),
) -> CheckoutResponse:
    """Create a Stripe Checkout Session for Foundation or Growth plan. 7-day free trial."""
    plan = data.plan if data.plan in ("foundation", "growth") else "growth"
    _configure_stripe()
    price_id = _get_stripe_price_id(plan)

    existing = await db.execute(
        select(LMSSubscription).where(
            LMSSubscription.student_id == current_user.id,
            LMSSubscription.status.in_(["trialling", "active"]),
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You already have an active subscription.",
        )

    idempotency_key = hashlib.sha256(f"checkout_{current_user.id}".encode()).hexdigest()[:32]

    session = stripe.checkout.Session.create(
        mode="subscription",
        payment_method_types=["card"],
        customer_email=current_user.email,
        line_items=[{"price": price_id, "quantity": 1}],
        subscription_data={
            "trial_period_days": 7,
            # Metadata on the subscription object itself — read by customer.subscription.created
            "metadata": {"student_id": str(current_user.id), "plan": plan},
        },
        success_url=data.success_url + "?session_id={CHECKOUT_SESSION_ID}",
        cancel_url=data.cancel_url,
        # Metadata on the checkout session — for checkout.session.completed
        metadata={"student_id": str(current_user.id), "plan": plan},
        idempotency_key=idempotency_key,
    )
    return CheckoutResponse(url=session.url)


@router.get("/status", response_model=SubscriptionStatusOut)
async def get_subscription_status(
    db: AsyncSession = Depends(get_async_db),
    current_user: LMSUser = Depends(get_current_lms_user),
) -> SubscriptionStatusOut:
    """Return the current user's most recent subscription record."""
    result = await db.execute(
        select(LMSSubscription)
        .where(LMSSubscription.student_id == current_user.id)
        .order_by(LMSSubscription.created_at.desc())
        .limit(1)
    )
    sub = result.scalar_one_or_none()
    if sub is None:
        return SubscriptionStatusOut(has_subscription=False)

    return SubscriptionStatusOut(
        has_subscription=True,
        status=sub.status,
        plan=sub.plan,
        current_period_end=sub.current_period_end.isoformat() if sub.current_period_end else None,
        trial_end=sub.trial_end.isoformat() if sub.trial_end else None,
    )


@router.post("/portal", response_model=PortalResponse)
async def create_billing_portal(
    return_url: str = "http://localhost:3009/student",
    db: AsyncSession = Depends(get_async_db),
    current_user: LMSUser = Depends(get_current_lms_user),
) -> PortalResponse:
    """Create a Stripe Billing Portal session for subscription self-management."""
    _configure_stripe()
    result = await db.execute(
        select(LMSSubscription)
        .where(LMSSubscription.student_id == current_user.id)
        .order_by(LMSSubscription.created_at.desc())
        .limit(1)
    )
    sub = result.scalar_one_or_none()
    if not sub:
        raise HTTPException(status_code=404, detail="No subscription found.")

    portal = stripe.billing_portal.Session.create(
        customer=sub.stripe_customer_id,
        return_url=return_url,
    )
    return PortalResponse(url=portal.url)
