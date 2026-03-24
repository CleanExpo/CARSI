"""
CARSI Hub — Submission Processing Routes

Admin-facing endpoints for incoming Hub content submissions (storage not wired).
Webhook endpoint for external triggers (e.g. database INSERT notifications).

Tables (when backed by PostgreSQL):
  hub_submissions       — master intake queue
  submission_email_log  — audit trail of emails sent to submitters

All admin routes require a valid LMS user (admin role enforced).
The webhook endpoint is verified by X-Webhook-Secret header.
"""

import asyncio
from enum import Enum
from typing import Any, Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, status
from pydantic import BaseModel, Field

from src.api.deps_lms import get_current_lms_user
from src.config.settings import get_settings
from src.db.lms_models import LMSUser
from src.services.email_service import email_service
from src.utils import get_logger

logger = get_logger(__name__)

router = APIRouter(tags=["hub-submissions"])

_HUB_STORAGE_UNAVAILABLE = (
    "Hub submissions storage is not configured. "
    "Wire hub_submissions to PostgreSQL (e.g. SQLAlchemy) to enable this feature."
)


# ---------------------------------------------------------------------------
# Enums + request/response models
# ---------------------------------------------------------------------------


class SubmissionStatus(str, Enum):
    pending = "pending"
    under_review = "under_review"
    approved = "approved"
    rejected = "rejected"
    needs_info = "needs_info"


class SubmissionUpdateRequest(BaseModel):
    status: SubmissionStatus
    review_notes: Optional[str] = None
    rejection_reason: Optional[str] = None
    needs_info_message: Optional[str] = None


class SubmissionOut(BaseModel):
    id: str
    submission_type: str
    status: str
    submitter_name: str
    submitter_email: str
    submitter_phone: Optional[str]
    submitter_company: Optional[str]
    submitter_role: Optional[str]
    submission_title: str
    submission_url: Optional[str]
    submission_description: Optional[str]
    submission_data: dict[str, Any]
    reviewed_by: Optional[str]
    reviewed_at: Optional[str]
    review_notes: Optional[str]
    rejection_reason: Optional[str]
    needs_info_message: Optional[str]
    created_at: str
    updated_at: str


class SubmissionListResponse(BaseModel):
    data: list[SubmissionOut]
    total: int
    page: int
    limit: int


class HubSubmissionIntakeBody(BaseModel):
    """Public form payload (mirrors frontend hub submission insert shape)."""

    submission_type: str
    status: str = "pending"
    submitter_name: str
    submitter_email: str
    submitter_phone: Optional[str] = None
    submitter_company: Optional[str] = None
    submitter_role: Optional[str] = None
    submission_title: str
    submission_url: Optional[str] = None
    submission_description: Optional[str] = None
    submission_data: dict[str, Any] = Field(default_factory=dict)
    terms_accepted: bool = True
    guidelines_accepted: bool = True
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None


def _require_admin(current_user: LMSUser) -> None:
    """Raise 403 if the current user is not an admin."""
    roles = {ur.role.name for ur in current_user.user_roles if ur.role}
    if "admin" not in roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )


# ---------------------------------------------------------------------------
# Public intake (used by Next.js API route)
# ---------------------------------------------------------------------------


@router.post("/submissions/intake")
async def public_submission_intake(_body: HubSubmissionIntakeBody) -> None:
    """Accept a public Hub submission; persists when PostgreSQL storage is configured."""
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail=_HUB_STORAGE_UNAVAILABLE,
    )


# ---------------------------------------------------------------------------
# Admin: list submissions
# ---------------------------------------------------------------------------


@router.get("/submissions", response_model=SubmissionListResponse)
async def list_submissions(
    submission_status: Optional[SubmissionStatus] = Query(None, alias="status"),
    submission_type: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: LMSUser = Depends(get_current_lms_user),
) -> SubmissionListResponse:
    """Admin: list Hub submissions with optional filters. Ordered newest first."""
    _require_admin(current_user)
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail=_HUB_STORAGE_UNAVAILABLE,
    )


# ---------------------------------------------------------------------------
# Admin: get single submission
# ---------------------------------------------------------------------------


@router.get("/submissions/{submission_id}", response_model=SubmissionOut)
async def get_submission(
    submission_id: str,
    current_user: LMSUser = Depends(get_current_lms_user),
) -> SubmissionOut:
    """Admin: retrieve a single Hub submission by ID."""
    _require_admin(current_user)
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail=_HUB_STORAGE_UNAVAILABLE,
    )


# ---------------------------------------------------------------------------
# Admin: update submission status
# ---------------------------------------------------------------------------


@router.patch("/submissions/{submission_id}", response_model=SubmissionOut)
async def update_submission(
    submission_id: str,
    body: SubmissionUpdateRequest,
    current_user: LMSUser = Depends(get_current_lms_user),
) -> SubmissionOut:
    """
    Admin: update the status of a Hub submission.

    Setting status to approved/rejected/needs_info will:
    - Stamp reviewed_by and reviewed_at on the row
    - Log an entry in submission_email_log
    - (Future) send a notification email to the submitter
    """
    _require_admin(current_user)
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail=_HUB_STORAGE_UNAVAILABLE,
    )


# ---------------------------------------------------------------------------
# Webhook: new submission created (external INSERT trigger)
# ---------------------------------------------------------------------------


@router.post("/webhooks/new-submission")
async def new_submission_webhook(
    request: Request,
    x_webhook_secret: Optional[str] = Header(default=None),
) -> dict[str, bool]:
    """
    Webhook called when a new row is inserted into hub_submissions.

    Verifies X-Webhook-Secret header, parses the record, logs an
    acknowledgement email entry, and sends a confirmation to the submitter.

    Returns 200 quickly — email send is fire-and-forget.
    """
    settings = get_settings()

    # Secret verification — skip if no secret configured (dev convenience)
    if settings.webhook_secret:
        if x_webhook_secret != settings.webhook_secret:
            logger.warning("Hub submission webhook: invalid secret")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid webhook secret",
            )

    payload: dict[str, Any] = await request.json()

    # Typical webhook shape: { type: "INSERT", record: {...}, ... }
    record: dict[str, Any] = payload.get("record") or {}

    submission_id: str = record.get("id", "")
    submitter_name: str = record.get("submitter_name", "")
    submitter_email: str = record.get("submitter_email", "")
    submission_type: str = record.get("submission_type", "submission")
    submission_title: str = record.get("submission_title", "")

    if not submitter_email:
        logger.warning("Hub submission webhook: no submitter_email in record", record_id=submission_id)
        return {"received": True}

    logger.info(
        "New Hub submission received",
        submission_id=submission_id,
        submission_type=submission_type,
        submitter_email=submitter_email,
    )

    # Log acknowledgement email entry
    if submission_id:
        await _log_submission_email(
            submission_id=submission_id,
            email_type="received_confirmation",
            recipient_email=submitter_email,
        )

    # Fire-and-forget: send acknowledgement email
    asyncio.create_task(
        _send_acknowledgement_email(
            submitter_name=submitter_name,
            submitter_email=submitter_email,
            submission_title=submission_title,
            submission_type=submission_type,
        )
    )

    return {"received": True}


# ---------------------------------------------------------------------------
# Email helpers
# ---------------------------------------------------------------------------


async def _log_submission_email(
    *,
    submission_id: str,
    email_type: str,
    recipient_email: str,
) -> None:
    """Record email dispatch when submission_email_log is backed by PostgreSQL."""
    logger.debug(
        "submission_email_log (not persisted — storage not configured)",
        submission_id=submission_id,
        email_type=email_type,
        recipient_email=recipient_email,
    )


async def _send_acknowledgement_email(
    *,
    submitter_name: str,
    submitter_email: str,
    submission_title: str,
    submission_type: str,
) -> None:
    """Send a submission received confirmation email to the submitter."""
    type_label = submission_type.replace("_", " ").title()
    subject = f"CARSI Hub — We've received your {type_label} submission"
    html_body = f"""
    <p>Hi {submitter_name or 'there'},</p>
    <p>Thanks for submitting <strong>{submission_title}</strong> to the CARSI Hub directory.</p>
    <p>Our team will review your submission within the next few business days.
    You'll receive an email once a decision has been made.</p>
    <p>If you have any questions, reply to this email or contact us at
    <a href="mailto:info@carsi.com.au">info@carsi.com.au</a>.</p>
    <p>Kind regards,<br>The CARSI Team</p>
    """
    try:
        # EmailService.send_email is synchronous — run in thread pool
        await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: email_service.send_email(
                to=submitter_email,
                subject=subject,
                html_body=html_body,
            ),
        )
        logger.info("Acknowledgement email sent", to=submitter_email)
    except Exception as exc:
        logger.error("Failed to send acknowledgement email", to=submitter_email, error=str(exc))
