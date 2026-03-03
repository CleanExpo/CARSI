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

    return {"status": "ok", "credential_id": cert.credential_id}
