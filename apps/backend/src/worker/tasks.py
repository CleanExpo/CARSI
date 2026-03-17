"""
Celery tasks for the CARSI achievement engine.

Tasks run synchronously (outside the async FastAPI context) using the
SyncSessionLocal session factory.
"""

import json
import os
import uuid
from datetime import datetime, timezone

from src.config.database import SyncSessionLocal
from src.services.audit_service import audit_log_sync
from src.services.certificate_service import create_certificate
from src.worker.celery_app import celery_app


# ---------------------------------------------------------------------------
# Lesson Completed
# ---------------------------------------------------------------------------


@celery_app.task(name="handle_lesson_completed")
def handle_lesson_completed(data: dict) -> dict:
    """
    Mark a lesson complete and update the student's progress record.

    Triggers ``handle_course_completed`` if all lessons are now done.
    """
    from sqlalchemy import select

    from src.db.lms_models import LMSEnrollment, LMSLesson, LMSProgress

    student_id = uuid.UUID(data["student_id"])
    lesson_id = uuid.UUID(data["lesson_id"])
    course_id = uuid.UUID(data["course_id"])
    time_spent = int(data.get("time_spent_seconds", 0))

    with SyncSessionLocal() as db:
        enrollment = db.execute(
            select(LMSEnrollment).where(
                LMSEnrollment.student_id == student_id,
                LMSEnrollment.course_id == course_id,
                LMSEnrollment.status == "active",
            )
        ).scalar_one_or_none()

        if not enrollment:
            return {"status": "no_enrollment"}

        progress = db.execute(
            select(LMSProgress).where(
                LMSProgress.enrollment_id == enrollment.id,
                LMSProgress.lesson_id == lesson_id,
            )
        ).scalar_one_or_none()

        if not progress:
            progress = LMSProgress(
                enrollment_id=enrollment.id,
                lesson_id=lesson_id,
            )
            db.add(progress)

        progress.completed_at = datetime.now(timezone.utc)
        progress.time_spent_seconds = time_spent
        db.commit()

        # Award XP for lesson completion
        award_xp.delay(str(student_id), "lesson_completed", str(lesson_id), 10)

        # Check if all lessons in the course are now complete
        _check_course_completion(db, enrollment)

    return {"status": "ok"}


def _check_course_completion(db, enrollment: "LMSEnrollment") -> None:  # type: ignore[name-defined]
    from sqlalchemy import func, select

    from src.db.lms_models import LMSLesson, LMSModule, LMSProgress

    total = db.execute(
        select(func.count(LMSLesson.id))
        .join(LMSModule)
        .where(LMSModule.course_id == enrollment.course_id)
    ).scalar() or 0

    completed = db.execute(
        select(func.count(LMSProgress.id)).where(
            LMSProgress.enrollment_id == enrollment.id,
            LMSProgress.completed_at.isnot(None),
        )
    ).scalar() or 0

    if total > 0 and completed >= total:
        handle_course_completed.delay(
            {
                "student_id": str(enrollment.student_id),
                "course_id": str(enrollment.course_id),
            }
        )


# ---------------------------------------------------------------------------
# Quiz Passed → Cert Chain
# ---------------------------------------------------------------------------


@celery_app.task(name="handle_quiz_passed")
def handle_quiz_passed(data: dict) -> dict:
    """
    Process a quiz-passed event.

    Traverses quiz → lesson → module → course, verifies active enrollment,
    guards against duplicate certs, awards XP, then triggers
    handle_course_completed to issue the certificate and IICRC CEC report.
    """
    from sqlalchemy import select

    from src.db.lms_models import LMSCertificate, LMSEnrollment, LMSLesson, LMSModule, LMSQuiz

    student_id = uuid.UUID(data["student_id"])
    quiz_id = uuid.UUID(data["quiz_id"])
    score_pct = float(data.get("score_percentage", 100.0))

    with SyncSessionLocal() as db:
        quiz = db.execute(select(LMSQuiz).where(LMSQuiz.id == quiz_id)).scalar_one_or_none()
        if not quiz:
            return {"status": "quiz_not_found"}

        lesson = db.execute(
            select(LMSLesson).where(LMSLesson.id == quiz.lesson_id)
        ).scalar_one_or_none()
        if not lesson:
            return {"status": "lesson_not_found"}

        module = db.execute(
            select(LMSModule).where(LMSModule.id == lesson.module_id)
        ).scalar_one_or_none()
        if not module:
            return {"status": "module_not_found"}

        course_id = module.course_id

        enrollment = db.execute(
            select(LMSEnrollment).where(
                LMSEnrollment.student_id == student_id,
                LMSEnrollment.course_id == course_id,
                LMSEnrollment.status == "active",
            )
        ).scalar_one_or_none()
        if not enrollment:
            return {"status": "no_enrollment"}

        # Idempotency — don't trigger cert chain if cert already issued
        existing_cert = db.execute(
            select(LMSCertificate).where(
                LMSCertificate.student_id == student_id,
                LMSCertificate.course_id == course_id,
            )
        ).scalar_one_or_none()
        if existing_cert:
            return {"status": "cert_already_exists", "credential_id": existing_cert.credential_id}

    # Award XP: 50 for pass, extra 50 for perfect score
    award_xp.delay(str(student_id), "quiz_passed", str(quiz_id), 50)
    if score_pct >= 100.0:
        award_xp.delay(str(student_id), "quiz_perfect", str(quiz_id), 50)

    # Trigger full completion chain: cert + CEC report + email
    handle_course_completed.delay({"student_id": str(student_id), "course_id": str(course_id)})

    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Course Completed → Award CECs + Generate Certificate + Email Student
# ---------------------------------------------------------------------------


@celery_app.task(name="handle_course_completed")
def handle_course_completed(data: dict) -> dict:
    """
    Award IICRC CECs, generate a certificate, and email the student.

    All DB writes are in a single transaction. Celery tasks fire after commit.
    Idempotent — safe to call multiple times for the same student+course.
    """
    from datetime import date

    from sqlalchemy import select

    from src.db.lms_models import (
        LMSCECReport,
        LMSCECTransaction,
        LMSCertificate,
        LMSCourse,
        LMSEnrollment,
        LMSUser,
    )

    student_id = uuid.UUID(data["student_id"])
    course_id = uuid.UUID(data["course_id"])

    cec_report_payload: dict | None = None
    credential_id: str = ""
    course_title: str = ""

    with SyncSessionLocal() as db:
        # Idempotency — don't issue duplicate certs
        existing_cert = db.execute(
            select(LMSCertificate).where(
                LMSCertificate.student_id == student_id,
                LMSCertificate.course_id == course_id,
            )
        ).scalar_one_or_none()
        if existing_cert:
            return {"status": "cert_already_exists", "credential_id": existing_cert.credential_id}

        course = db.execute(
            select(LMSCourse).where(LMSCourse.id == course_id)
        ).scalar_one_or_none()
        if not course:
            return {"status": "course_not_found"}

        course_title = course.title

        # Award CECs if course has them
        cec_tx_id: uuid.UUID | None = None
        if course.cec_hours and float(course.cec_hours) > 0:
            tx = LMSCECTransaction(
                student_id=student_id,
                course_id=course_id,
                iicrc_discipline=course.iicrc_discipline,
                cec_hours=course.cec_hours,
            )
            db.add(tx)
            db.flush()
            cec_tx_id = tx.id

        # Always generate a certificate regardless of CEC status
        cert = create_certificate(db, student_id, course, cec_tx_id)
        credential_id = cert.credential_id

        # Audit: certificate issued
        audit_log_sync(
            db,
            "certificate.issued",
            actor_id=student_id,
            resource_type="LMSCertificate",
            resource_id=credential_id,
            details={"course_id": str(course_id), "course_title": course.title},
        )

        # Mark enrollment completed
        enrollment = db.execute(
            select(LMSEnrollment).where(
                LMSEnrollment.student_id == student_id,
                LMSEnrollment.course_id == course_id,
            )
        ).scalar_one_or_none()
        if enrollment:
            enrollment.status = "completed"
            enrollment.completed_at = datetime.now(timezone.utc)

        # Build CEC report if student has IICRC member number and course has CECs
        if cec_tx_id and getattr(course, "iicrc_discipline", None):
            user = db.execute(
                select(LMSUser).where(LMSUser.id == student_id)
            ).scalar_one_or_none()

            if user and user.iicrc_member_number:
                already_sent = db.execute(
                    select(LMSCECReport).where(
                        LMSCECReport.student_id == student_id,
                        LMSCECReport.course_id == course_id,
                        LMSCECReport.status == "sent",
                    )
                ).scalar_one_or_none()

                if not already_sent:
                    report = LMSCECReport(
                        student_id=student_id,
                        course_id=course_id,
                        iicrc_member_number=user.iicrc_member_number,
                        email_to="jenyferr@iicrcnet.org",
                        status="pending",
                    )
                    db.add(report)
                    db.flush()
                    cec_report_payload = {
                        "report_id": str(report.id),
                        "student_id": str(student_id),
                        "course_id": str(course_id),
                        "student_name": user.full_name,
                        "iicrc_member_number": user.iicrc_member_number,
                        "student_email": user.email,
                        "course_title": course.title,
                        "iicrc_discipline": course.iicrc_discipline,
                        "cec_hours": float(course.cec_hours),
                        "completion_date": date.today().isoformat(),
                        "certificate_id": credential_id,
                    }

        # In-app notification for cert issuance
        _create_notification(
            db,
            student_id,
            "cert_issued",
            f"Certificate issued — {course_title}",
            f"Your {course_title} certificate is ready to view and share.",
            action_url=f"/student/credentials",
        )

        # Single commit — all records in one transaction
        db.commit()

    # Post-commit: fire Celery tasks (DB transaction safely closed)
    award_xp.delay(str(student_id), "course_completed", str(course_id), 100)
    send_certificate_email.delay({
        "student_id": str(student_id),
        "credential_id": credential_id,
        "course_title": course_title,
    })
    if cec_report_payload:
        send_iicrc_cec_report.delay(cec_report_payload)

    return {"status": "ok", "credential_id": credential_id}


# ---------------------------------------------------------------------------
# Notification Helper
# ---------------------------------------------------------------------------


def _create_notification(
    db,
    student_id: uuid.UUID,
    type_: str,
    title: str,
    body: str,
    action_url: str | None = None,
) -> None:
    """Create an in-app notification record (call inside an open SyncSessionLocal context)."""
    from src.db.lms_models import LMSNotification

    n = LMSNotification(
        student_id=student_id,
        type=type_,
        title=title,
        body=body,
        action_url=action_url,
    )
    db.add(n)
    # Caller is responsible for committing


# ---------------------------------------------------------------------------
# Certificate Email
# ---------------------------------------------------------------------------


@celery_app.task(name="send_certificate_email", bind=True, max_retries=3, default_retry_delay=60)
def send_certificate_email(self, data: dict) -> dict:
    """
    Email the student their certificate credential ID and public verification URL.

    data keys: student_id, credential_id, course_title
    """
    import os

    from sqlalchemy import select

    from src.db.lms_models import LMSUser
    from src.services.email_service import email_service

    student_id = uuid.UUID(data["student_id"])
    credential_id = data["credential_id"]
    course_title = data["course_title"]

    with SyncSessionLocal() as db:
        user = db.execute(
            select(LMSUser).where(LMSUser.id == student_id)
        ).scalar_one_or_none()
        if not user:
            return {"status": "user_not_found"}
        student_name = user.full_name or user.email
        student_email = user.email

    frontend_url = os.getenv("NEXT_PUBLIC_FRONTEND_URL", "https://carsi.com.au")
    cert_url = f"{frontend_url}/credentials/{credential_id}"

    html_body = f"""
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;
             background: #060a14; color: #fff; padding: 40px 40px 32px;">
  <div style="margin-bottom: 32px;">
    <span style="font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase;
                 color: rgba(255,255,255,0.35);">CARSI Learning</span>
  </div>

  <h1 style="color: #2490ed; font-size: 26px; font-weight: 700; margin: 0 0 8px;">
    Certificate Issued
  </h1>
  <p style="color: rgba(255,255,255,0.5); font-size: 14px; margin: 0 0 28px;">
    Congratulations, {student_name}!
  </p>

  <p style="color: rgba(255,255,255,0.8); font-size: 15px; line-height: 1.6; margin: 0 0 24px;">
    You have successfully completed
    <strong style="color: #fff;">{course_title}</strong>.
    Your certificate is ready to view and share.
  </p>

  <div style="background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08);
              border-radius: 6px; padding: 16px 20px; margin-bottom: 28px;">
    <p style="margin: 0; font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em;
              color: rgba(255,255,255,0.3);">Credential ID</p>
    <p style="margin: 6px 0 0; font-family: monospace; font-size: 20px;
              color: #2490ed; font-weight: 600;">{credential_id}</p>
  </div>

  <a href="{cert_url}"
     style="display: inline-block; background: #2490ed; color: #fff;
            padding: 14px 28px; text-decoration: none; border-radius: 4px;
            font-weight: 600; font-size: 14px; margin-bottom: 32px;">
    View Certificate →
  </a>

  <p style="color: rgba(255,255,255,0.35); font-size: 12px; margin: 0 0 4px;">
    Share this verification link with employers:
  </p>
  <p style="color: rgba(255,255,255,0.25); font-size: 11px; margin: 0 0 28px;
            word-break: break-all;">{cert_url}</p>

  <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.08); margin: 0 0 20px;">
  <p style="color: rgba(255,255,255,0.25); font-size: 11px; margin: 0;">
    CARSI — Cleaning and Restoration Science Institute · carsi.com.au
  </p>
</div>
"""

    try:
        email_service.send_email(
            to=student_email,
            subject=f"Your CARSI Certificate — {course_title}",
            html_body=html_body,
        )
        return {"status": "sent", "to": student_email}
    except Exception as exc:
        raise self.retry(exc=exc, countdown=60)


# ---------------------------------------------------------------------------
# XP Award
# ---------------------------------------------------------------------------

LEVEL_THRESHOLDS = {1: 0, 2: 500, 3: 1_500, 4: 3_500, 5: 7_000, 6: 12_000}


def _compute_level(total_xp: int) -> int:
    level = 1
    for lvl, threshold in sorted(LEVEL_THRESHOLDS.items(), reverse=True):
        if total_xp >= threshold:
            level = lvl
            break
    return level


@celery_app.task(name="award_xp")
def award_xp(
    student_id: str,
    source_type: str,
    source_id: str | None,
    xp_amount: int,
) -> dict:
    """
    Award XP to a student for a learning event.

    source_type: lesson_completed | quiz_passed | quiz_perfect |
                 course_completed | streak_bonus
    """
    from datetime import date, timedelta

    from sqlalchemy import select

    from src.db.lms_models import LMSUserLevel, LMSXPEvent

    sid = uuid.UUID(student_id)
    src_id = uuid.UUID(source_id) if source_id else None
    today = date.today()

    with SyncSessionLocal() as db:
        db.add(LMSXPEvent(
            student_id=sid,
            source_type=source_type,
            source_id=src_id,
            xp_awarded=xp_amount,
        ))

        level_row = db.execute(
            select(LMSUserLevel).where(LMSUserLevel.student_id == sid)
        ).scalar_one_or_none()

        if level_row is None:
            level_row = LMSUserLevel(
                student_id=sid,
                total_xp=xp_amount,
                current_level=_compute_level(xp_amount),
                current_streak=1,
                longest_streak=1,
                last_active_date=today,
            )
            db.add(level_row)
        else:
            level_row.total_xp += xp_amount
            level_row.current_level = _compute_level(level_row.total_xp)

            last = level_row.last_active_date
            if last is None or last < today - timedelta(days=1):
                level_row.current_streak = 1
            elif last == today - timedelta(days=1):
                level_row.current_streak += 1
            # same day — no streak change

            if level_row.current_streak > level_row.longest_streak:
                level_row.longest_streak = level_row.current_streak
            level_row.last_active_date = today

        db.commit()

    # Streak milestone bonuses (fire-and-forget)
    streak = level_row.current_streak
    bonus_xp = {7: 50, 30: 200, 100: 500}.get(streak, 0)
    if bonus_xp:
        award_xp.delay(student_id, "streak_bonus", None, bonus_xp)

    return {"status": "ok", "xp_awarded": xp_amount}


# ---------------------------------------------------------------------------
# IICRC CEC Email Report
# ---------------------------------------------------------------------------


@celery_app.task(
    name="send_iicrc_cec_report",
    bind=True,
    max_retries=3,
    default_retry_delay=300,
)
def send_iicrc_cec_report(self, data: dict) -> dict:
    """
    Send a CEC completion report to IICRC (jenyferr@iicrcnet.org).

    data keys: report_id, student_name, iicrc_member_number, student_email,
               course_title, iicrc_discipline, cec_hours, completion_date (ISO),
               certificate_id
    """
    from datetime import date

    from sqlalchemy import select

    from src.db.lms_models import LMSCECReport
    from src.services.iicrc_reporter import send_cec_report

    report_id_str = data.get("report_id")
    if not report_id_str:
        return {"status": "no_report_id"}

    report_id = uuid.UUID(report_id_str)

    with SyncSessionLocal() as db:
        report = db.execute(
            select(LMSCECReport).where(LMSCECReport.id == report_id)
        ).scalar_one_or_none()

        if not report or report.status == "sent":
            return {"status": "already_sent_or_missing"}

        try:
            send_cec_report(
                student_name=data["student_name"],
                iicrc_member_number=data["iicrc_member_number"],
                student_email=data["student_email"],
                course_title=data["course_title"],
                iicrc_discipline=data["iicrc_discipline"],
                cec_hours=float(data["cec_hours"]),
                completion_date=date.fromisoformat(data["completion_date"]),
                certificate_id=data.get("certificate_id", ""),
            )
            report.status = "sent"
            report.sent_at = datetime.now(timezone.utc)
            db.commit()
            return {"status": "sent"}

        except Exception as exc:
            report.retry_count += 1
            report.error_message = str(exc)
            db.commit()

            # Exponential backoff: 5m → 30m → 2h
            countdown = [300, 1800, 7200][min(self.request.retries, 2)]
            raise self.retry(exc=exc, countdown=countdown)


# ---------------------------------------------------------------------------
# Welcome Email Sequence (B4)
# ---------------------------------------------------------------------------


@celery_app.task(name="send_welcome_email")
def send_welcome_email(data: dict) -> dict:
    """
    Day 0 welcome — sent when student first enrols in a course.

    data keys: student_id, course_title, course_slug
    """
    import os

    from sqlalchemy import select

    from src.db.lms_models import LMSUser
    from src.services.email_service import email_service

    student_id = uuid.UUID(data["student_id"])
    course_title = data.get("course_title", "your course")
    course_slug = data.get("course_slug", "")

    with SyncSessionLocal() as db:
        user = db.execute(select(LMSUser).where(LMSUser.id == student_id)).scalar_one_or_none()
        if not user:
            return {"status": "user_not_found"}
        name = user.full_name or user.email
        email = user.email

    frontend_url = os.getenv("NEXT_PUBLIC_FRONTEND_URL", "https://carsi.com.au")
    course_url = f"{frontend_url}/courses/{course_slug}" if course_slug else f"{frontend_url}/student"

    html_body = f"""
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;
             background: #060a14; color: #fff; padding: 40px 40px 32px;">
  <span style="font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase;
               color: rgba(255,255,255,0.35);">Welcome to CARSI</span>
  <h1 style="color: #2490ed; font-size: 24px; font-weight: 700; margin: 16px 0 8px;">
    You're enrolled, {name}!
  </h1>
  <p style="color: rgba(255,255,255,0.7); font-size: 14px; line-height: 1.7; margin: 0 0 24px;">
    You've just enrolled in <strong style="color: #fff;">{course_title}</strong>.
    When you're ready, jump straight into your first lesson.
  </p>
  <a href="{course_url}" style="display: inline-block; background: #2490ed; color: #fff;
     padding: 14px 28px; text-decoration: none; border-radius: 4px; font-weight: 600;
     font-size: 14px; margin-bottom: 28px;">Start Learning →</a>
  <p style="color: rgba(255,255,255,0.4); font-size: 12px; margin: 0 0 4px;">
    Questions? Reply to this email or visit <a href="{frontend_url}/contact"
    style="color: #2490ed;">carsi.com.au/contact</a>
  </p>
  <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.08); margin: 24px 0 16px;">
  <p style="color: rgba(255,255,255,0.2); font-size: 11px; margin: 0;">
    CARSI — Cleaning and Restoration Science Institute · carsi.com.au
  </p>
</div>"""

    try:
        email_service.send_email(to=email, subject=f"Welcome to CARSI — {course_title}", html_body=html_body)
        return {"status": "sent"}
    except Exception:
        return {"status": "error"}


@celery_app.task(name="send_reengagement_email")
def send_reengagement_email(data: dict) -> dict:
    """
    Re-engagement nudge for inactive students.

    data keys: student_id, days_inactive (14 | 30 | 60), course_title, course_slug
    """
    import os

    from sqlalchemy import select

    from src.db.lms_models import LMSUser
    from src.services.email_service import email_service

    student_id = uuid.UUID(data["student_id"])
    days = int(data.get("days_inactive", 14))
    course_title = data.get("course_title", "your course")
    course_slug = data.get("course_slug", "")

    with SyncSessionLocal() as db:
        user = db.execute(select(LMSUser).where(LMSUser.id == student_id)).scalar_one_or_none()
        if not user:
            return {"status": "user_not_found"}
        name = user.full_name or user.email
        email = user.email

    frontend_url = os.getenv("NEXT_PUBLIC_FRONTEND_URL", "https://carsi.com.au")
    course_url = f"{frontend_url}/courses/{course_slug}" if course_slug else f"{frontend_url}/student"

    if days <= 14:
        subject = f"Still working on {course_title}?"
        message = "It looks like you haven't visited your course in a while. You're making great progress — don't lose momentum."
    elif days <= 30:
        subject = f"Your CARSI progress is waiting"
        message = f"It's been {days} days since your last lesson. Your industry peers are upskilling daily — come back and keep your edge."
    else:
        subject = "We miss you at CARSI"
        message = "It's been a while. Your course enrolment is still active and your progress is saved — pick up right where you left off."

    html_body = f"""
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;
             background: #060a14; color: #fff; padding: 40px 40px 32px;">
  <h1 style="color: #ed9d24; font-size: 22px; font-weight: 700; margin: 0 0 16px;">
    {subject}
  </h1>
  <p style="color: rgba(255,255,255,0.75); font-size: 14px; line-height: 1.7; margin: 0 0 8px;">
    Hi {name},
  </p>
  <p style="color: rgba(255,255,255,0.75); font-size: 14px; line-height: 1.7; margin: 0 0 24px;">
    {message}
  </p>
  <p style="color: rgba(255,255,255,0.6); font-size: 13px; margin: 0 0 24px;">
    Course: <strong style="color: #fff;">{course_title}</strong>
  </p>
  <a href="{course_url}" style="display: inline-block; background: #ed9d24; color: #fff;
     padding: 14px 28px; text-decoration: none; border-radius: 4px; font-weight: 600;
     font-size: 14px; margin-bottom: 28px;">Continue Learning →</a>
  <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.08); margin: 24px 0 16px;">
  <p style="color: rgba(255,255,255,0.2); font-size: 11px; margin: 0;">
    CARSI — carsi.com.au · <a href="{frontend_url}/student" style="color: rgba(255,255,255,0.3);">
    Manage notifications</a>
  </p>
</div>"""

    try:
        email_service.send_email(to=email, subject=subject, html_body=html_body)
        return {"status": "sent"}
    except Exception:
        return {"status": "error"}


# ---------------------------------------------------------------------------
# Churn Prediction (C5)
# ---------------------------------------------------------------------------


def _compute_student_risk(db, student_id: uuid.UUID) -> dict:
    """Compute risk score components for a single student.

    Factors:
    - Last login > 30 days: +50 points
    - Last login > 14 days: +30 points
    - No lesson progress in last 7 days: +20 points
    - Broken streak: +15 points; never started: +10 points
    - No enrollments: +10 points
    Score is capped at 100.
    """
    from sqlalchemy import text as sql_text

    score = 0

    # Last login days
    login_result = db.execute(
        sql_text("""
            SELECT EXTRACT(DAY FROM NOW() - MAX(session_start)) AS days_ago
            FROM lms_user_sessions WHERE student_id = :sid
        """),
        {"sid": student_id},
    )
    row = login_result.fetchone()
    last_login_days: int | None = int(row[0]) if (row and row[0] is not None) else None
    effective_days = last_login_days if last_login_days is not None else 999

    if effective_days > 30:
        score += 50
    elif effective_days > 14:
        score += 30

    # Progress velocity (lessons completed in last 7 days)
    progress_result = db.execute(
        sql_text("""
            SELECT COUNT(*) AS recent_lessons
            FROM lms_progress
            WHERE student_id = :sid AND completed_at >= NOW() - INTERVAL '7 days'
        """),
        {"sid": student_id},
    )
    recent_lessons = progress_result.scalar() or 0
    velocity = float(recent_lessons)
    if recent_lessons == 0:
        score += 20

    # Streak status
    streak_result = db.execute(
        sql_text("SELECT current_streak FROM lms_gamification WHERE student_id = :sid"),
        {"sid": student_id},
    )
    streak_row = streak_result.fetchone()
    if streak_row is None:
        streak_status = "never"
        score += 10
    elif streak_row[0] == 0:
        streak_status = "broken"
        score += 15
    else:
        streak_status = "active"

    # No enrollments
    enroll_result = db.execute(
        sql_text("SELECT COUNT(*) FROM lms_enrollments WHERE student_id = :sid"),
        {"sid": student_id},
    )
    if (enroll_result.scalar() or 0) == 0:
        score += 10

    return {
        "total": min(score, 100),
        "last_login_days": last_login_days,
        "velocity": velocity,
        "streak_status": streak_status,
    }


@celery_app.task(name="compute_churn_scores")
def compute_churn_scores() -> dict:
    """Nightly task: compute risk score for all active students and upsert results."""
    from sqlalchemy import text as sql_text

    with SyncSessionLocal() as db:
        students_result = db.execute(
            sql_text("""
                SELECT u.id
                FROM lms_users u
                JOIN lms_user_roles ur ON ur.user_id = u.id
                JOIN lms_roles r ON r.id = ur.role_id
                WHERE r.name = 'student' AND u.is_active = true
            """)
        )
        student_ids = [row[0] for row in students_result]

        computed = 0
        for student_id in student_ids:
            score = _compute_student_risk(db, student_id)
            db.execute(
                sql_text("""
                    INSERT INTO lms_student_risk_scores
                        (id, student_id, risk_score, last_login_days_ago,
                         progress_velocity_score, streak_status, computed_at)
                    VALUES
                        (gen_random_uuid(), :sid, :score, :days, :velocity, :streak, NOW())
                    ON CONFLICT (student_id) DO UPDATE SET
                        risk_score = EXCLUDED.risk_score,
                        last_login_days_ago = EXCLUDED.last_login_days_ago,
                        progress_velocity_score = EXCLUDED.progress_velocity_score,
                        streak_status = EXCLUDED.streak_status,
                        computed_at = EXCLUDED.computed_at
                """),
                {
                    "sid": student_id,
                    "score": score["total"],
                    "days": score["last_login_days"],
                    "velocity": score["velocity"],
                    "streak": score["streak_status"],
                },
            )
            computed += 1

        db.commit()
        return {"computed": computed}


# ---------------------------------------------------------------------------
# Re-engagement Scanner (D3 — Marketing Automation)
# ---------------------------------------------------------------------------


@celery_app.task(name="scan_for_reengagement")
def scan_for_reengagement() -> dict:
    """
    Scan for inactive students and dispatch re-engagement emails.

    Targets students whose last active enrollment has had no progress in
    exactly 14, 30, or 60 days.  Delegates the actual send to
    ``send_reengagement_email`` so each nudge runs in its own task slot.
    """
    from sqlalchemy import text as sql_text

    triggered = 0

    with SyncSessionLocal() as db:
        rows = db.execute(
            sql_text("""
                SELECT
                    e.student_id,
                    c.title  AS course_title,
                    c.slug   AS course_slug,
                    EXTRACT(
                        DAY FROM NOW() - MAX(COALESCE(p.completed_at, e.enrolled_at))
                    )::int AS days_inactive
                FROM lms_enrollments e
                JOIN lms_courses c ON c.id = e.course_id
                LEFT JOIN lms_progress p ON p.enrollment_id = e.id
                WHERE e.status = 'active'
                GROUP BY e.student_id, e.id, c.title, c.slug
                HAVING EXTRACT(
                    DAY FROM NOW() - MAX(COALESCE(p.completed_at, e.enrolled_at))
                )::int IN (14, 30, 60)
            """)
        ).fetchall()

        for row in rows:
            send_reengagement_email.delay(
                {
                    "student_id": str(row.student_id),
                    "days_inactive": row.days_inactive,
                    "course_title": row.course_title,
                    "course_slug": row.course_slug,
                }
            )
            triggered += 1

    return {"triggered": triggered}


# ---------------------------------------------------------------------------
# PWA Push Notifications (Phase D4)
# ---------------------------------------------------------------------------


@celery_app.task(name="send_push_notification")
def send_push_notification(student_id: str, title: str, body: str, url: str = "/student") -> dict:
    """
    Send a Web Push notification to all registered devices for a student.
    Uses pywebpush if VAPID keys are configured, otherwise no-ops gracefully.
    """
    from sqlalchemy import select

    from src.db.lms_models import LMSPushSubscription

    vapid_private_key = os.environ.get("VAPID_PRIVATE_KEY", "")
    vapid_public_key = os.environ.get("VAPID_PUBLIC_KEY", "")  # noqa: F841 — reserved for future use
    vapid_claims_email = os.environ.get("VAPID_CLAIMS_EMAIL", "admin@carsi.com.au")

    if not vapid_private_key:
        return {"status": "no_vapid_key"}

    with SyncSessionLocal() as db:
        result = db.execute(
            select(LMSPushSubscription).where(
                LMSPushSubscription.student_id == uuid.UUID(student_id)
            )
        )
        subscriptions = result.scalars().all()

    if not subscriptions:
        return {"status": "no_subscriptions"}

    payload = json.dumps({"title": title, "body": body, "url": url})
    sent = 0

    try:
        from pywebpush import webpush, WebPushException  # noqa: F401
    except ImportError:
        return {"status": "pywebpush_not_installed"}

    for sub in subscriptions:
        try:
            webpush(
                subscription_info={
                    "endpoint": sub.endpoint,
                    "keys": {"p256dh": sub.p256dh, "auth": sub.auth},
                },
                data=payload,
                vapid_private_key=vapid_private_key,
                vapid_claims={"sub": f"mailto:{vapid_claims_email}"},
            )
            sent += 1
        except Exception:  # noqa: BLE001
            pass  # Stale subscription — skip silently

    return {"status": "ok", "sent": sent}
