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
# Quiz Passed (stub — expanded in Phase 10)
# ---------------------------------------------------------------------------


@celery_app.task(name="handle_quiz_passed")
def handle_quiz_passed(data: dict) -> dict:
    """Process a quiz-passed event (expanded in Phase 10)."""
    return {"status": "ok"}


# ---------------------------------------------------------------------------
# Course Completed → Award CECs + Generate Certificate
# ---------------------------------------------------------------------------


@celery_app.task(name="handle_course_completed")
def handle_course_completed(data: dict) -> dict:
    """
    Award IICRC CECs and generate a certificate when a course is completed.

    Creates LMSCECTransaction + LMSCertificate records.
    Marks the enrollment as completed.
    """
    from sqlalchemy import select

    from src.db.lms_models import LMSCECTransaction, LMSCourse, LMSEnrollment

    student_id = uuid.UUID(data["student_id"])
    course_id = uuid.UUID(data["course_id"])

    with SyncSessionLocal() as db:
        course = db.execute(
            select(LMSCourse).where(LMSCourse.id == course_id)
        ).scalar_one_or_none()

        if not course:
            return {"status": "course_not_found"}

        if not course.cec_hours:
            return {"status": "no_cec_hours"}

        # Award CECs
        tx = LMSCECTransaction(
            student_id=student_id,
            course_id=course_id,
            iicrc_discipline=course.iicrc_discipline,
            cec_hours=course.cec_hours,
        )
        db.add(tx)
        db.flush()

        # Generate certificate record
        cert = create_certificate(db, student_id, course, tx.id)

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

        db.commit()

        # Award XP for course completion
        award_xp.delay(str(student_id), "course_completed", str(course_id), 100)

        # Trigger IICRC CEC report if student has a member number
        _maybe_send_cec_report(db, student_id, course_id, str(cert.credential_id))

    return {"status": "ok", "credential_id": cert.credential_id}


# ---------------------------------------------------------------------------
# Helper — IICRC CEC eligibility check + report trigger
# ---------------------------------------------------------------------------


def _maybe_send_cec_report(
    db,
    student_id: uuid.UUID,
    course_id: uuid.UUID,
    certificate_id: str,
) -> None:
    """Create a CEC report row and trigger the email task if eligible."""
    from datetime import date

    from sqlalchemy import select

    from src.db.lms_models import LMSCECReport, LMSCourse, LMSUser

    user = db.execute(
        select(LMSUser).where(LMSUser.id == student_id)
    ).scalar_one_or_none()

    if not user or not user.iicrc_member_number:
        return

    course = db.execute(
        select(LMSCourse).where(LMSCourse.id == course_id)
    ).scalar_one_or_none()

    if not course or not getattr(course, "cec_hours", None) or course.cec_hours <= 0:
        return

    if not getattr(course, "iicrc_discipline", None):
        return

    # Idempotency guard
    existing = db.execute(
        select(LMSCECReport).where(
            LMSCECReport.student_id == student_id,
            LMSCECReport.course_id == course_id,
            LMSCECReport.status == "sent",
        )
    ).scalar_one_or_none()

    if existing:
        return

    report = LMSCECReport(
        student_id=student_id,
        course_id=course_id,
        iicrc_member_number=user.iicrc_member_number,
        email_to="cec@iicrc.org",
        status="pending",
    )
    db.add(report)
    db.flush()

    send_iicrc_cec_report.delay({
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
        "certificate_id": certificate_id,
    })


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
    Send a CEC completion report to IICRC Las Vegas (cec@iicrc.org).

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
