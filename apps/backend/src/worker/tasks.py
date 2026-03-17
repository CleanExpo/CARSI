"""
Celery tasks for the CARSI achievement engine.

Tasks run synchronously (outside the async FastAPI context) using the
SyncSessionLocal session factory.
"""

import uuid
from datetime import datetime, timezone

from src.config.database import SyncSessionLocal
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
