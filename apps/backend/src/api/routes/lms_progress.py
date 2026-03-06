"""
CARSI LMS Progress Routes

POST /api/lms/lessons/{lesson_id}/complete  — mark a lesson complete
GET  /api/lms/courses/{course_id}/progress  — get course progress for current user
"""

import asyncio
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps_lms import get_current_lms_user
from src.api.schemas.lms_progress import CourseProgressOut, LessonCompleteRequest, ProgressOut
from src.config.database import get_async_db
from src.db.lms_models import LMSCourse, LMSEnrollment, LMSLesson, LMSModule, LMSProgress, LMSUser

router = APIRouter(tags=["lms-progress"])


@router.post(
    "/api/lms/lessons/{lesson_id}/complete",
    response_model=ProgressOut,
    status_code=status.HTTP_200_OK,
)
async def mark_lesson_complete(
    lesson_id: UUID,
    body: LessonCompleteRequest,
    db: AsyncSession = Depends(get_async_db),
    current_user: LMSUser = Depends(get_current_lms_user),
) -> ProgressOut:
    """
    Mark a lesson as complete for the current student.

    Fires a ``lesson_completed`` event via Celery so the achievement engine
    can check if the course is now fully completed.
    """
    # Verify lesson exists (with its course id)
    lesson_result = await db.execute(
        select(LMSLesson).join(LMSModule).where(LMSLesson.id == lesson_id)
    )
    lesson = lesson_result.scalar_one_or_none()
    if not lesson:
        raise HTTPException(status_code=404, detail="Lesson not found")

    course_id = lesson.module.course_id

    # Verify student is enrolled
    enrollment_result = await db.execute(
        select(LMSEnrollment).where(
            LMSEnrollment.student_id == current_user.id,
            LMSEnrollment.course_id == course_id,
            LMSEnrollment.status == "active",
        )
    )
    enrollment = enrollment_result.scalar_one_or_none()
    if not enrollment:
        raise HTTPException(status_code=403, detail="You are not enrolled in this course")

    # Upsert progress record
    progress_result = await db.execute(
        select(LMSProgress).where(
            LMSProgress.enrollment_id == enrollment.id,
            LMSProgress.lesson_id == lesson_id,
        )
    )
    progress = progress_result.scalar_one_or_none()

    if not progress:
        progress = LMSProgress(
            enrollment_id=enrollment.id,
            lesson_id=lesson_id,
            time_spent_seconds=body.time_spent_seconds,
        )
        db.add(progress)
    else:
        progress.time_spent_seconds = (progress.time_spent_seconds or 0) + body.time_spent_seconds

    from datetime import datetime, timezone

    progress.completed_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(progress)

    # Dispatch Celery task (fire-and-forget — does not block the response)
    try:
        from src.worker.tasks import handle_lesson_completed

        handle_lesson_completed.delay(
            {
                "student_id": str(current_user.id),
                "lesson_id": str(lesson_id),
                "course_id": str(course_id),
                "time_spent_seconds": body.time_spent_seconds,
            }
        )
    except Exception:
        # Worker not running in dev is acceptable — progress is already saved above
        pass

    # Check if course is now 100% complete — push event to Unite-Hub Nexus
    total_r = await db.execute(
        select(func.count(LMSLesson.id))
        .join(LMSModule)
        .where(LMSModule.course_id == course_id)
    )
    total_lessons = total_r.scalar() or 0
    completed_r = await db.execute(
        select(func.count(LMSProgress.id)).where(
            LMSProgress.enrollment_id == enrollment.id,
            LMSProgress.completed_at.isnot(None),
        )
    )
    completed_lessons = completed_r.scalar() or 0
    if total_lessons > 0 and completed_lessons >= total_lessons:
        from src.services.nexus_connector import push_event

        asyncio.create_task(push_event("course.completed", {
            "student_id": str(current_user.id),
            "course_id": str(course_id),
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }))

        # Fire-and-forget: push to Synthex for marketing automation
        from src.services.synthex_connector import notify_course_completed

        # Fetch course details for Synthex
        course_result = await db.execute(
            select(LMSCourse).where(LMSCourse.id == course_id)
        )
        course = course_result.scalar_one_or_none()
        if course:
            asyncio.create_task(notify_course_completed(
                student_id=current_user.id,
                course_id=course_id,
                course_title=course.title,
                discipline=course.iicrc_discipline,
                cec_hours_earned=float(course.cec_hours) if course.cec_hours else None,
            ))

    return ProgressOut(
        lesson_id=progress.lesson_id,
        completed_at=progress.completed_at,
        time_spent_seconds=progress.time_spent_seconds,
    )


@router.get(
    "/api/lms/courses/{course_id}/progress",
    response_model=CourseProgressOut,
)
async def get_course_progress(
    course_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    current_user: LMSUser = Depends(get_current_lms_user),
) -> CourseProgressOut:
    """Return the current student's progress in a course."""
    enrollment_result = await db.execute(
        select(LMSEnrollment).where(
            LMSEnrollment.student_id == current_user.id,
            LMSEnrollment.course_id == course_id,
        )
    )
    enrollment = enrollment_result.scalar_one_or_none()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrolment not found")

    total_result = await db.execute(
        select(func.count(LMSLesson.id))
        .join(LMSModule)
        .where(LMSModule.course_id == course_id)
    )
    total = total_result.scalar() or 0

    completed_result = await db.execute(
        select(func.count(LMSProgress.id)).where(
            LMSProgress.enrollment_id == enrollment.id,
            LMSProgress.completed_at.isnot(None),
        )
    )
    completed = completed_result.scalar() or 0

    pct = round((completed / total) * 100, 1) if total > 0 else 0.0

    return CourseProgressOut(
        course_id=course_id,
        enrollment_status=enrollment.status,
        total_lessons=total,
        completed_lessons=completed,
        completion_percentage=pct,
    )
