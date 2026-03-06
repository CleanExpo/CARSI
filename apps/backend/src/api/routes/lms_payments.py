"""
CARSI LMS Course Payment Routes

POST /api/lms/courses/{slug}/checkout — Stripe Checkout for paid course enrolment
"""

import os

import stripe
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps_lms import get_current_lms_user
from src.config.database import get_async_db
from src.db.lms_models import LMSCourse, LMSEnrollment, LMSUser

stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3009")

router = APIRouter(prefix="/api/lms/courses", tags=["lms-payments"])


class CheckoutResponse(BaseModel):
    checkout_url: str | None = None
    enrolled: bool = False


@router.post("/{slug}/checkout", response_model=CheckoutResponse)
async def create_course_checkout(
    slug: str,
    db: AsyncSession = Depends(get_async_db),
    current_user: LMSUser = Depends(get_current_lms_user),
) -> CheckoutResponse:
    """
    Create a Stripe Checkout Session for a paid course, or directly enrol if free.

    - price_aud == 0 or is_free: creates enrolment immediately, returns {"enrolled": true}
    - price_aud > 0: creates Stripe Checkout Session, returns {"checkout_url": "..."}
    - Already enrolled: 409 Conflict
    """
    # Look up the course by slug
    result = await db.execute(
        select(LMSCourse).where(
            LMSCourse.slug == slug,
            LMSCourse.status == "published",
        )
    )
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found or not available for enrolment",
        )

    # Check if student is already enrolled
    existing = await db.execute(
        select(LMSEnrollment).where(
            LMSEnrollment.student_id == current_user.id,
            LMSEnrollment.course_id == course.id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You are already enrolled in this course",
        )

    # Free course — enrol directly
    price = float(course.price_aud or 0)
    if course.is_free or price == 0:
        enrollment = LMSEnrollment(
            student_id=current_user.id,
            course_id=course.id,
            status="active",
        )
        db.add(enrollment)
        await db.flush()
        await db.commit()
        return CheckoutResponse(enrolled=True)

    # Paid course — create Stripe Checkout Session
    price_cents = int(price * 100)
    session = stripe.checkout.Session.create(
        mode="payment",
        payment_method_types=["card"],
        customer_email=current_user.email,
        line_items=[
            {
                "price_data": {
                    "currency": "aud",
                    "unit_amount": price_cents,
                    "product_data": {
                        "name": course.title,
                    },
                },
                "quantity": 1,
            }
        ],
        success_url=f"{FRONTEND_URL}/courses/{slug}/payment-success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{FRONTEND_URL}/courses/{slug}",
        metadata={
            "course_id": str(course.id),
            "student_id": str(current_user.id),
        },
    )
    return CheckoutResponse(checkout_url=session.url)
