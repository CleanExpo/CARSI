"""
CARSI Hub — Submission Processing Routes

Admin-facing endpoints to list, view, and review incoming Hub content submissions.
Webhook endpoint to acknowledge new submissions from Supabase INSERT events.

Tables (Supabase / Postgres):
  hub_submissions       — master intake queue
  submission_email_log  — audit trail of emails sent to submitters

All admin routes require a valid LMS user (admin role enforced).
The webhook endpoint is verified by X-Webhook-Secret header.
"""

import asyncio
import logging
from datetime import UTC, datetime
from enum import Enum
from typing import Any, Optional

import httpx
from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, status
from pydantic import BaseModel

from src.api.deps_lms import get_current_lms_user
from src.config.settings import get_settings
from src.db.lms_models import LMSUser
from src.services.email_service import email_service
from src.utils import get_logger

logger = get_logger(__name__)

router = APIRouter(tags=["hub-submissions"])


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


# ---------------------------------------------------------------------------
# Supabase REST helpers
# ---------------------------------------------------------------------------


def _supabase_headers() -> dict[str, str]:
    """Return headers required for authenticated Supabase REST API calls."""
    settings = get_settings()
    return {
        "apikey": settings.supabase_service_role_key,
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }


def _supabase_rest_url(path: str) -> str:
    """Build a Supabase REST API URL from a table/path segment."""
    settings = get_settings()
    base = settings.supabase_url.rstrip("/")
    return f"{base}/rest/v1/{path.lstrip('/')}"


def _to_submission_out(row: dict[str, Any]) -> SubmissionOut:
    return SubmissionOut(
        id=row["id"],
        submission_type=row["submission_type"],
        status=row["status"],
        submitter_name=row["submitter_name"],
        submitter_email=row["submitter_email"],
        submitter_phone=row.get("submitter_phone"),
        submitter_company=row.get("submitter_company"),
        submitter_role=row.get("submitter_role"),
        submission_title=row["submission_title"],
        submission_url=row.get("submission_url"),
        submission_description=row.get("submission_description"),
        submission_data=row.get("submission_data") or {},
        reviewed_by=row.get("reviewed_by"),
        reviewed_at=row.get("reviewed_at"),
        review_notes=row.get("review_notes"),
        rejection_reason=row.get("rejection_reason"),
        needs_info_message=row.get("needs_info_message"),
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def _require_admin(current_user: LMSUser) -> None:
    """Raise 403 if the current user is not an admin."""
    roles = {ur.role.name for ur in current_user.user_roles if ur.role}
    if "admin" not in roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
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

    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase not configured — set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
        )

    offset = (page - 1) * limit
    params: dict[str, str] = {
        "order": "created_at.desc",
        "limit": str(limit),
        "offset": str(offset),
    }
    if submission_status:
        params["status"] = f"eq.{submission_status.value}"
    if submission_type:
        params["submission_type"] = f"eq.{submission_type}"

    # Fetch matching rows + total count in parallel
    count_params = dict(params)
    count_params.pop("limit", None)
    count_params.pop("offset", None)

    headers = _supabase_headers()
    url = _supabase_rest_url("hub_submissions")

    async with httpx.AsyncClient(timeout=10.0) as client:
        data_resp, count_resp = await asyncio.gather(
            client.get(url, params=params, headers=headers),
            client.get(
                url,
                params=count_params,
                headers={**headers, "Prefer": "count=exact"},
            ),
        )

    if data_resp.status_code != 200:
        logger.error("Supabase list_submissions failed", status=data_resp.status_code, body=data_resp.text)
        raise HTTPException(status_code=502, detail="Failed to fetch submissions from Supabase")

    rows: list[dict] = data_resp.json()

    # Parse total from Content-Range header: "0-19/143"
    total = len(rows)
    content_range = count_resp.headers.get("content-range", "")
    if "/" in content_range:
        try:
            total = int(content_range.split("/")[1])
        except (ValueError, IndexError):
            pass

    return SubmissionListResponse(
        data=[_to_submission_out(r) for r in rows],
        total=total,
        page=page,
        limit=limit,
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

    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise HTTPException(status_code=503, detail="Supabase not configured")

    url = _supabase_rest_url("hub_submissions")
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            url,
            params={"id": f"eq.{submission_id}", "limit": "1"},
            headers=_supabase_headers(),
        )

    if resp.status_code != 200:
        raise HTTPException(status_code=502, detail="Failed to fetch submission from Supabase")

    rows = resp.json()
    if not rows:
        raise HTTPException(status_code=404, detail="Submission not found")

    return _to_submission_out(rows[0])


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

    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise HTTPException(status_code=503, detail="Supabase not configured")

    headers = _supabase_headers()
    url = _supabase_rest_url("hub_submissions")

    # Fetch current row first (need submitter_email for email log)
    async with httpx.AsyncClient(timeout=10.0) as client:
        fetch_resp = await client.get(
            url,
            params={"id": f"eq.{submission_id}", "limit": "1"},
            headers=headers,
        )

    if fetch_resp.status_code != 200 or not fetch_resp.json():
        raise HTTPException(status_code=404, detail="Submission not found")

    existing = fetch_resp.json()[0]

    # Build PATCH payload
    now_iso = datetime.now(UTC).isoformat()
    patch_data: dict[str, Any] = {
        "status": body.status.value,
        "reviewed_by": str(current_user.id),
        "reviewed_at": now_iso,
        "updated_at": now_iso,
    }
    if body.review_notes is not None:
        patch_data["review_notes"] = body.review_notes
    if body.rejection_reason is not None:
        patch_data["rejection_reason"] = body.rejection_reason
    if body.needs_info_message is not None:
        patch_data["needs_info_message"] = body.needs_info_message

    async with httpx.AsyncClient(timeout=10.0) as client:
        patch_resp = await client.patch(
            url,
            params={"id": f"eq.{submission_id}"},
            headers=headers,
            json=patch_data,
        )

    if patch_resp.status_code not in (200, 204):
        logger.error(
            "Supabase PATCH failed",
            submission_id=submission_id,
            status=patch_resp.status_code,
            body=patch_resp.text,
        )
        raise HTTPException(status_code=502, detail="Failed to update submission")

    # Log email record for status-change notifications
    notify_statuses = {SubmissionStatus.approved, SubmissionStatus.rejected, SubmissionStatus.needs_info}
    if body.status in notify_statuses:
        email_type = body.status.value  # 'approved' | 'rejected' | 'needs_info'
        await _log_submission_email(
            submission_id=submission_id,
            email_type=email_type,
            recipient_email=existing["submitter_email"],
        )
        # Fire-and-forget status notification email
        asyncio.create_task(
            _send_status_notification_email(
                submitter_name=existing["submitter_name"],
                submitter_email=existing["submitter_email"],
                submission_title=existing["submission_title"],
                submission_type=existing["submission_type"],
                new_status=body.status.value,
                needs_info_message=body.needs_info_message,
                rejection_reason=body.rejection_reason,
            )
        )

    # Return updated row
    async with httpx.AsyncClient(timeout=10.0) as client:
        updated_resp = await client.get(
            url,
            params={"id": f"eq.{submission_id}", "limit": "1"},
            headers=headers,
        )

    updated_rows = updated_resp.json()
    if not updated_rows:
        raise HTTPException(status_code=502, detail="Could not retrieve updated submission")

    logger.info(
        "Submission updated",
        submission_id=submission_id,
        new_status=body.status.value,
        reviewed_by=str(current_user.id),
    )
    return _to_submission_out(updated_rows[0])


# ---------------------------------------------------------------------------
# Webhook: new submission created (Supabase INSERT trigger)
# ---------------------------------------------------------------------------


@router.post("/webhooks/new-submission")
async def new_submission_webhook(
    request: Request,
    x_webhook_secret: Optional[str] = Header(default=None),
) -> dict[str, bool]:
    """
    Supabase webhook called on INSERT to hub_submissions.

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

    # Supabase INSERT webhook shape: { type: "INSERT", record: {...}, ... }
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
    """Insert a row into submission_email_log via Supabase REST API."""
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_role_key:
        return  # Supabase not configured — skip silently

    url = _supabase_rest_url("submission_email_log")
    log_entry = {
        "submission_id": submission_id,
        "email_type": email_type,
        "recipient_email": recipient_email,
        "sent_at": datetime.now(UTC).isoformat(),
        "delivery_status": "sent",
    }

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(url, headers=_supabase_headers(), json=log_entry)
        if resp.status_code not in (200, 201):
            logger.warning(
                "submission_email_log insert failed",
                status=resp.status_code,
                body=resp.text,
            )
    except Exception as exc:
        logger.error("submission_email_log insert error", error=str(exc))


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


async def _send_status_notification_email(
    *,
    submitter_name: str,
    submitter_email: str,
    submission_title: str,
    submission_type: str,
    new_status: str,
    needs_info_message: Optional[str] = None,
    rejection_reason: Optional[str] = None,
) -> None:
    """Send a status update email when a submission is approved, rejected, or needs info."""
    type_label = submission_type.replace("_", " ").title()

    if new_status == "approved":
        subject = f"CARSI Hub — Your {type_label} submission has been approved"
        body_detail = "<p>Your submission has been approved and will be published to the CARSI Hub directory shortly.</p>"
    elif new_status == "rejected":
        reason_block = (
            f"<p><strong>Reason:</strong> {rejection_reason}</p>" if rejection_reason else ""
        )
        subject = f"CARSI Hub — Your {type_label} submission was not approved"
        body_detail = (
            "<p>After review, we're unable to list your submission at this time.</p>"
            + reason_block
            + "<p>You're welcome to resubmit in the future once you've addressed the feedback above.</p>"
        )
    elif new_status == "needs_info":
        info_block = (
            f"<p><strong>Information needed:</strong> {needs_info_message}</p>"
            if needs_info_message
            else ""
        )
        subject = f"CARSI Hub — More information needed for your {type_label} submission"
        body_detail = (
            "<p>We'd like to list your submission but need a little more information first.</p>"
            + info_block
            + "<p>Please reply to this email with the requested details.</p>"
        )
    else:
        return  # No email for other statuses

    html_body = f"""
    <p>Hi {submitter_name or 'there'},</p>
    <p>This is an update regarding your CARSI Hub submission:
    <strong>{submission_title}</strong>.</p>
    {body_detail}
    <p>Kind regards,<br>The CARSI Team</p>
    """

    try:
        await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: email_service.send_email(
                to=submitter_email,
                subject=subject,
                html_body=html_body,
            ),
        )
        logger.info("Status notification email sent", to=submitter_email, status=new_status)
    except Exception as exc:
        logger.error(
            "Failed to send status notification email",
            to=submitter_email,
            status=new_status,
            error=str(exc),
        )
