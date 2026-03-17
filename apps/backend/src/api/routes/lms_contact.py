"""Contact form endpoint — Phase A (GP-Phase-A)."""

import logging

from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel, EmailStr

from src.services.email_service import email_service

logger = logging.getLogger(__name__)

router = APIRouter(tags=["contact"])


class ContactRequest(BaseModel):
    firstName: str
    lastName: str
    email: EmailStr
    message: str


def _send_contact_notification(body: ContactRequest) -> None:
    """Send contact form submission to admin. Runs in FastAPI thread pool."""
    full_name = f"{body.firstName} {body.lastName}".strip()
    subject = f"New Contact Enquiry from {full_name}"

    html_body = f"""
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;
             background: #060a14; color: #fff; padding: 32px;">
  <h2 style="color: #2490ed; font-size: 20px; margin: 0 0 20px;">
    New Contact Enquiry
  </h2>

  <table style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 8px 0; color: rgba(255,255,255,0.4); font-size: 12px;
                 width: 120px; vertical-align: top;">Name</td>
      <td style="padding: 8px 0; color: rgba(255,255,255,0.85); font-size: 14px;">
        {full_name}
      </td>
    </tr>
    <tr>
      <td style="padding: 8px 0; color: rgba(255,255,255,0.4); font-size: 12px;
                 vertical-align: top;">Email</td>
      <td style="padding: 8px 0; font-size: 14px;">
        <a href="mailto:{body.email}" style="color: #2490ed;">{body.email}</a>
      </td>
    </tr>
    <tr>
      <td style="padding: 8px 0; color: rgba(255,255,255,0.4); font-size: 12px;
                 vertical-align: top;">Message</td>
      <td style="padding: 8px 0; color: rgba(255,255,255,0.8); font-size: 14px;
                 line-height: 1.6; white-space: pre-wrap;">{body.message}</td>
    </tr>
  </table>

  <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.08); margin: 24px 0 16px;">
  <p style="color: rgba(255,255,255,0.25); font-size: 11px; margin: 0;">
    Submitted via carsi.com.au/contact
  </p>
</div>
"""

    try:
        email_service.send_email(
            to="admin@carsi.com.au",
            subject=subject,
            html_body=html_body,
        )
        logger.info("Contact notification sent from %s", body.email)
    except Exception:
        logger.exception("Failed to send contact notification from %s", body.email)


@router.post("/api/contact", status_code=200)
async def submit_contact(body: ContactRequest, background_tasks: BackgroundTasks) -> dict:
    """
    Receive a contact form submission and email admin@carsi.com.au.

    Always returns 200 immediately — email sends in the background.
    This endpoint is public (no auth required).
    """
    if not body.firstName or not body.lastName or not body.message:
        return {"ok": False, "error": "Missing required fields"}

    background_tasks.add_task(_send_contact_notification, body)
    return {"ok": True}
