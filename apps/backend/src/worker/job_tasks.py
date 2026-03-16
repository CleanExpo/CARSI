"""
Job Board Celery Tasks (UNI-83)

- send_job_submission_confirmation: email confirmation to submitter
- expire_stale_job_listings: daily cron — unpublishes listings where valid_through < NOW()
"""

from celery import shared_task
from sqlalchemy import create_engine, text, update
from sqlalchemy.orm import Session

from src.config import get_settings
from src.services.email_service import email_service
from src.utils import get_logger

logger = get_logger(__name__)
settings = get_settings()


@shared_task(name="send_job_submission_confirmation", bind=True, max_retries=3, default_retry_delay=60)
def send_job_submission_confirmation(
    self,
    *,
    to_email: str,
    submitter_name: str,
    job_title: str,
    company_name: str,
) -> None:
    """Send HTML confirmation email to the job listing submitter."""
    subject = f"Job listing submitted — {job_title} at {company_name}"
    html_body = f"""
<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"></head>
<body style="background:#050505;color:#fff;font-family:sans-serif;padding:40px;max-width:600px;margin:auto">
  <img src="https://carsi.com.au/logo.png" alt="CARSI" style="height:40px;margin-bottom:24px" />
  <h1 style="font-size:22px;font-weight:700;color:#fff;margin-bottom:12px">
    Job listing received
  </h1>
  <p style="color:rgba(255,255,255,0.6);line-height:1.6">Hi {submitter_name},</p>
  <p style="color:rgba(255,255,255,0.6);line-height:1.6">
    We've received your job listing for <strong style="color:#fff">{job_title}</strong>
    at <strong style="color:#fff">{company_name}</strong>.
  </p>
  <p style="color:rgba(255,255,255,0.6);line-height:1.6">
    Our team will review it and it will appear on the job board within 24 hours if approved.
    Listings are active for 30 days.
  </p>
  <a href="https://carsi.com.au/jobs"
     style="display:inline-block;margin-top:20px;background:#2490ed;color:#fff;
            text-decoration:none;padding:12px 24px;border-radius:10px;font-weight:600">
    View Job Board
  </a>
  <p style="margin-top:40px;color:rgba(255,255,255,0.3);font-size:12px">
    CARSI Industry Hub — carsi.com.au<br>
    If you did not submit this listing, please ignore this email.
  </p>
</body>
</html>
"""
    try:
        email_service.send_email(to=to_email, subject=subject, html_body=html_body)
        logger.info("Job confirmation email sent", to=to_email, job_title=job_title)
    except Exception as exc:
        logger.warning("Job confirmation email failed", to=to_email, error=str(exc))
        raise self.retry(exc=exc)


@shared_task(name="expire_stale_job_listings")
def expire_stale_job_listings() -> dict:
    """
    Unpublish job listings whose valid_through has passed.
    Runs daily via Celery Beat.
    """
    sync_url = settings.database_url.replace("+asyncpg", "").replace("postgresql+psycopg2", "postgresql")
    engine = create_engine(sync_url, pool_pre_ping=True)

    with Session(engine) as session:
        result = session.execute(
            text(
                "UPDATE job_listings SET published = false "
                "WHERE published = true AND valid_through < NOW() "
                "RETURNING id"
            )
        )
        expired_ids = [str(row[0]) for row in result.fetchall()]
        session.commit()

    count = len(expired_ids)
    logger.info("Expired stale job listings", count=count)
    return {"expired": count, "ids": expired_ids}
