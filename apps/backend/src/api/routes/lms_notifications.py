"""LMS In-App Notifications — Phase B5 + D4 (PWA Push)."""

from uuid import UUID
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy import delete, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps_lms import get_current_lms_user
from src.config.database import get_async_db
from src.db.lms_models import LMSNotification, LMSPushSubscription, LMSUser

router = APIRouter(prefix="/api/lms/notifications", tags=["lms-notifications"])


class NotificationOut(BaseModel):
    id: UUID
    type: str
    title: str
    body: str
    action_url: str | None
    is_read: bool
    created_at: datetime
    model_config = {"from_attributes": True}


class NotificationSummaryOut(BaseModel):
    notifications: list[NotificationOut]
    unread_count: int


@router.get("/me", response_model=NotificationSummaryOut)
async def get_my_notifications(
    db: AsyncSession = Depends(get_async_db),
    current_user: LMSUser = Depends(get_current_lms_user),
) -> NotificationSummaryOut:
    """Return the 20 most recent notifications for the current user."""
    result = await db.execute(
        select(LMSNotification)
        .where(LMSNotification.student_id == current_user.id)
        .order_by(LMSNotification.created_at.desc())
        .limit(20)
    )
    notifications = result.scalars().all()
    unread = sum(1 for n in notifications if not n.is_read)

    return NotificationSummaryOut(
        notifications=[NotificationOut.model_validate(n) for n in notifications],
        unread_count=unread,
    )


@router.patch("/{notification_id}/read", response_model=NotificationOut)
async def mark_notification_read(
    notification_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    current_user: LMSUser = Depends(get_current_lms_user),
) -> NotificationOut:
    """Mark a notification as read."""
    result = await db.execute(
        select(LMSNotification).where(
            LMSNotification.id == notification_id,
            LMSNotification.student_id == current_user.id,
        )
    )
    n = result.scalar_one_or_none()
    if not n:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")

    n.is_read = True
    n.read_at = datetime.now(timezone.utc)
    await db.commit()
    return NotificationOut.model_validate(n)


@router.post("/me/read-all", status_code=200)
async def mark_all_read(
    db: AsyncSession = Depends(get_async_db),
    current_user: LMSUser = Depends(get_current_lms_user),
) -> dict:
    """Mark all of the current user's notifications as read."""
    await db.execute(
        update(LMSNotification)
        .where(
            LMSNotification.student_id == current_user.id,
            LMSNotification.is_read == False,  # noqa: E712
        )
        .values(is_read=True, read_at=datetime.now(timezone.utc))
    )
    await db.commit()
    return {"ok": True}


# ---------------------------------------------------------------------------
# PWA Push Subscriptions (Phase D4)
# ---------------------------------------------------------------------------


class PushSubscribeRequest(BaseModel):
    endpoint: str
    p256dh: str
    auth: str


@router.post("/me/push-subscribe", status_code=201)
async def push_subscribe(
    body: PushSubscribeRequest,
    request: Request,
    db: AsyncSession = Depends(get_async_db),
    current_user: LMSUser = Depends(get_current_lms_user),
) -> dict:
    """Register a Web Push subscription for the current user."""
    existing = await db.execute(
        select(LMSPushSubscription).where(
            LMSPushSubscription.student_id == current_user.id,
            LMSPushSubscription.endpoint == body.endpoint,
        )
    )
    sub = existing.scalar_one_or_none()
    if sub:
        sub.p256dh = body.p256dh
        sub.auth = body.auth
    else:
        db.add(
            LMSPushSubscription(
                student_id=current_user.id,
                endpoint=body.endpoint,
                p256dh=body.p256dh,
                auth=body.auth,
                user_agent=request.headers.get("User-Agent"),
            )
        )
    await db.commit()
    return {"subscribed": True}


@router.delete("/me/push-subscribe")
async def push_unsubscribe(
    endpoint: str,
    db: AsyncSession = Depends(get_async_db),
    current_user: LMSUser = Depends(get_current_lms_user),
) -> dict:
    """Remove a Web Push subscription."""
    await db.execute(
        delete(LMSPushSubscription).where(
            LMSPushSubscription.student_id == current_user.id,
            LMSPushSubscription.endpoint == endpoint,
        )
    )
    await db.commit()
    return {"unsubscribed": True}
