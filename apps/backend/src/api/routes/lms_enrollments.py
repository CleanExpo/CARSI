"""
CARSI LMS Enrollment Routes

POST   /api/lms/enrollments         — enrol in a course (any authenticated user)
GET    /api/lms/enrollments/me      — list my enrolments (current user)
"""

import asyncio

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps_lms import get_current_lms_user
from src.api.schemas.lms_enrollments import EnrollmentCreate, EnrollmentWithCourseOut
from src.config.database import get_async_db
from src.db.lms_models import LMSCourse, LMSEnrollment, LMSUser

router = APIRouter(prefix="/api/lms/enrollments", tags=["lms-enrollments"])


@router.post("", response_model=EnrollmentWithCourseOut, status_code=status.HTTP_201_CREATED)
async def enrol_in_course(
    data: EnrollmentCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user: LMSUser = Depends(get_current_lms_user),
) -> EnrollmentWithCourseOut:
    """Enrol the current user in a published course. Returns 409 if already enrolled."""
    # Check for duplicate enrolment
    existing = await db.execute(
        select(LMSEnrollment).where(
            LMSEnrollment.student_id == current_user.id,
            LMSEnrollment.course_id == data.course_id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You are already enrolled in this course",
        )

    # Verify the course exists and is published
    result = await db.execute(
        select(LMSCourse).where(
            LMSCourse.id == data.course_id,
            LMSCourse.status == "published",
        )
    )
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Course not found or not available for enrolment",
        )

    enrollment = LMSEnrollment(
        student_id=current_user.id,
        course_id=data.course_id,
        status="active",
    )
    db.add(enrollment)
    await db.flush()
    await db.commit()
    await db.refresh(enrollment)

    # Fire-and-forget: push enrolment event to Unite-Hub Nexus
    from src.services.nexus_connector import push_event

    asyncio.create_task(push_event("student.enrolled", {
        "student_id": str(current_user.id),
        "course_id": str(enrollment.course_id),
        "enrolled_at": enrollment.enrolled_at.isoformat() if enrollment.enrolled_at else None,
    }))

    # Fire-and-forget: push to Synthex for marketing automation
    from src.services.synthex_connector import notify_student_enrolled

    asyncio.create_task(notify_student_enrolled(
        student_id=current_user.id,
        course_id=enrollment.course_id,
        course_title=course.title,
        discipline=course.iicrc_discipline,
        cec_hours=float(course.cec_hours) if course.cec_hours else None,
        price_aud=float(course.price_aud) if course.price_aud else None,
        is_free=course.is_free or False,
    ))

    # Day 0 welcome email — fire-and-forget (Redis may not be available in all envs)
    try:
        from src.worker.tasks import send_welcome_email

        send_welcome_email.delay({
            "student_id": str(current_user.id),
            "course_title": course.title,
            "course_slug": course.slug or "",
        })
    except Exception:
        pass  # Non-fatal — enrollment still succeeds without email dispatch

    return EnrollmentWithCourseOut(
        id=enrollment.id,
        student_id=enrollment.student_id,
        course_id=enrollment.course_id,
        status=enrollment.status,
        enrolled_at=enrollment.enrolled_at,
        completed_at=enrollment.completed_at,
        payment_reference=enrollment.payment_reference,
        course_title=course.title,
        course_slug=course.slug,
    )


@router.get("/me", response_model=list[EnrollmentWithCourseOut])
async def list_my_enrolments(
    db: AsyncSession = Depends(get_async_db),
    current_user: LMSUser = Depends(get_current_lms_user),
) -> list[EnrollmentWithCourseOut]:
    """Return all enrolments for the current user."""
    result = await db.execute(
        select(LMSEnrollment).where(LMSEnrollment.student_id == current_user.id)
    )
    enrollments = result.scalars().all()

    return [
        EnrollmentWithCourseOut(
            id=e.id,
            student_id=e.student_id,
            course_id=e.course_id,
            status=e.status,
            enrolled_at=e.enrolled_at,
            completed_at=e.completed_at,
            payment_reference=e.payment_reference,
            course_title=e.course.title if e.course else None,
            course_slug=e.course.slug if e.course else None,
        )
        for e in enrollments
    ]
