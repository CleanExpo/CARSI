"""LMS Admin routes — Phase 13 (GP-109)."""

from datetime import timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.api.deps_lms import get_current_lms_user
from src.config.database import get_async_db
from src.db.lms_models import LMSCourse, LMSEnrollment, LMSRole, LMSUser, LMSUserRole

router = APIRouter(prefix="/api/lms/admin", tags=["lms-admin"])

_VALID_ROLES = frozenset({"admin", "instructor", "student"})


def _require_admin(user: LMSUser) -> None:
    roles = {ur.role.name for ur in user.user_roles}
    if "admin" not in roles:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")


# ---------------------------------------------------------------------------
# Users list
# ---------------------------------------------------------------------------


class AdminUserOut(BaseModel):
    id: UUID
    email: str
    full_name: str
    is_active: bool
    roles: list[str]

    model_config = {"from_attributes": True}


@router.get("/users", response_model=list[AdminUserOut])
async def list_users(
    db: AsyncSession = Depends(get_async_db),
    current_user: LMSUser = Depends(get_current_lms_user),
) -> list[AdminUserOut]:
    """Return all users with their roles (admin only)."""
    _require_admin(current_user)

    result = await db.execute(
        select(LMSUser).options(selectinload(LMSUser.user_roles).selectinload(LMSUserRole.role))
    )
    users = result.scalars().all()

    return [
        AdminUserOut(
            id=u.id,
            email=u.email,
            full_name=u.full_name,
            is_active=u.is_active or False,
            roles=[ur.role.name for ur in u.user_roles],
        )
        for u in users
    ]


# ---------------------------------------------------------------------------
# Role update
# ---------------------------------------------------------------------------


class RoleUpdate(BaseModel):
    role: str


@router.patch("/users/{user_id}/role", response_model=AdminUserOut)
async def update_user_role(
    user_id: UUID,
    body: RoleUpdate,
    db: AsyncSession = Depends(get_async_db),
    current_user: LMSUser = Depends(get_current_lms_user),
) -> AdminUserOut:
    """Set a user's primary role (replaces existing roles)."""
    _require_admin(current_user)

    if body.role not in _VALID_ROLES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid role '{body.role}'. Must be one of: {', '.join(sorted(_VALID_ROLES))}",
        )

    result = await db.execute(
        select(LMSUser)
        .options(selectinload(LMSUser.user_roles).selectinload(LMSUserRole.role))
        .where(LMSUser.id == user_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    # Find the target role record
    role_result = await db.execute(select(LMSRole).where(LMSRole.name == body.role))
    role = role_result.scalar_one_or_none()
    if not role:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Unknown role: {body.role}")

    # Remove existing roles and add new one
    for ur in list(user.user_roles):
        await db.delete(ur)
    db.add(LMSUserRole(user_id=user.id, role_id=role.id))
    await db.commit()

    return AdminUserOut(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        is_active=user.is_active or False,
        roles=[body.role],
    )


# ---------------------------------------------------------------------------
# Platform metrics
# ---------------------------------------------------------------------------


class MetricsOut(BaseModel):
    total_users: int
    total_courses: int
    total_enrollments: int


@router.get("/metrics", response_model=MetricsOut)
async def get_metrics(
    db: AsyncSession = Depends(get_async_db),
    current_user: LMSUser = Depends(get_current_lms_user),
) -> MetricsOut:
    """Return platform-wide metrics (admin only)."""
    _require_admin(current_user)

    user_count = (await db.execute(select(func.count(LMSUser.id)))).scalar() or 0
    course_count = (await db.execute(select(func.count(LMSCourse.id)))).scalar() or 0
    enroll_count = (await db.execute(select(func.count(LMSEnrollment.id)))).scalar() or 0

    return MetricsOut(
        total_users=user_count,
        total_courses=course_count,
        total_enrollments=enroll_count,
    )


# ---------------------------------------------------------------------------
# CEC Reports
# ---------------------------------------------------------------------------


class CECReportOut(BaseModel):
    id: str
    student_id: str
    course_id: str
    iicrc_member_number: str
    email_to: str
    status: str
    sent_at: str | None
    error_message: str | None
    retry_count: int
    created_at: str


@router.get("/cec-reports", response_model=list[CECReportOut])
async def list_cec_reports(
    status_filter: str | None = None,
    db: AsyncSession = Depends(get_async_db),
    current_user: LMSUser = Depends(get_current_lms_user),
) -> list[CECReportOut]:
    """Admin: list all CEC report submissions. Filter by ?status_filter=pending|sent|failed."""
    _require_admin(current_user)

    from src.db.lms_models import LMSCECReport

    query = select(LMSCECReport).order_by(LMSCECReport.created_at.desc())
    if status_filter:
        query = query.where(LMSCECReport.status == status_filter)

    result = await db.execute(query)
    reports = result.scalars().all()
    return [
        CECReportOut(
            id=str(r.id),
            student_id=str(r.student_id),
            course_id=str(r.course_id),
            iicrc_member_number=r.iicrc_member_number,
            email_to=r.email_to,
            status=r.status,
            sent_at=r.sent_at.isoformat() if r.sent_at else None,
            error_message=r.error_message,
            retry_count=r.retry_count,
            created_at=r.created_at.isoformat(),
        )
        for r in reports
    ]


@router.post("/cec-reports/{report_id}/retry")
async def retry_cec_report(
    report_id: str,
    db: AsyncSession = Depends(get_async_db),
    current_user: LMSUser = Depends(get_current_lms_user),
) -> dict:
    """Admin: manually retry a failed CEC report email."""
    _require_admin(current_user)

    from src.db.lms_models import LMSCECReport
    from src.worker.tasks import send_iicrc_cec_report

    result = await db.execute(
        select(LMSCECReport).where(LMSCECReport.id == UUID(report_id))
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="CEC report not found.")

    report.status = "pending"
    report.error_message = None
    await db.commit()

    send_iicrc_cec_report.delay({"report_id": report_id})
    return {"queued": True}


# ---------------------------------------------------------------------------
# Instructor analytics
# ---------------------------------------------------------------------------


class InstructorCourseStatsOut(BaseModel):
    course_id: UUID
    title: str
    total_enrollments: int
    completions: int
    completion_rate_pct: float
    avg_quiz_score: float | None


class InstructorAnalyticsOut(BaseModel):
    courses: list[InstructorCourseStatsOut]
    total_students: int
    total_completions: int


@router.get("/instructor-analytics", response_model=InstructorAnalyticsOut)
async def get_instructor_analytics(
    db: AsyncSession = Depends(get_async_db),
    current_user: LMSUser = Depends(get_current_lms_user),
) -> InstructorAnalyticsOut:
    """Course performance analytics for instructors (and admins see all)."""
    from src.db.lms_models import LMSLesson, LMSModule, LMSQuiz, LMSQuizAttempt

    roles = {ur.role.name for ur in current_user.user_roles}
    is_admin = "admin" in roles
    is_instructor = "instructor" in roles

    if not is_admin and not is_instructor:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Instructor access required")

    # Get courses belonging to this instructor (or all if admin)
    if is_admin:
        courses_result = await db.execute(select(LMSCourse).where(LMSCourse.is_published == True))  # noqa: E712
    else:
        courses_result = await db.execute(
            select(LMSCourse).where(
                LMSCourse.instructor_id == current_user.id,
                LMSCourse.is_published == True,  # noqa: E712
            )
        )
    courses = courses_result.scalars().all()

    stats = []
    total_students = 0
    total_completions = 0

    for course in courses:
        enroll_result = await db.execute(
            select(func.count(LMSEnrollment.id)).where(LMSEnrollment.course_id == course.id)
        )
        enroll_count = enroll_result.scalar() or 0

        completion_result = await db.execute(
            select(func.count(LMSEnrollment.id)).where(
                LMSEnrollment.course_id == course.id,
                LMSEnrollment.status == "completed",
            )
        )
        completions = completion_result.scalar() or 0

        completion_rate = round((completions / enroll_count * 100) if enroll_count > 0 else 0.0, 1)

        # Avg quiz score for this course
        avg_score_result = await db.execute(
            select(func.avg(LMSQuizAttempt.score_percentage))
            .join(LMSQuiz, LMSQuizAttempt.quiz_id == LMSQuiz.id)
            .join(LMSLesson, LMSQuiz.lesson_id == LMSLesson.id)
            .join(LMSModule, LMSLesson.module_id == LMSModule.id)
            .where(LMSModule.course_id == course.id)
        )
        avg_score = avg_score_result.scalar()

        total_students += enroll_count
        total_completions += completions

        stats.append(InstructorCourseStatsOut(
            course_id=course.id,
            title=course.title,
            total_enrollments=enroll_count,
            completions=completions,
            completion_rate_pct=completion_rate,
            avg_quiz_score=round(float(avg_score), 1) if avg_score is not None else None,
        ))

    return InstructorAnalyticsOut(
        courses=stats,
        total_students=total_students,
        total_completions=total_completions,
    )


# ---------------------------------------------------------------------------
# BI Analytics (Phase B)
# ---------------------------------------------------------------------------


class AdminAnalyticsOut(BaseModel):
    # Totals
    total_users: int
    total_students: int
    active_students_30d: int
    total_enrollments: int
    total_completions: int
    completion_rate_pct: float
    # Subscriptions
    trialling: int
    active_subscriptions: int
    trial_to_paid_rate_pct: float
    # Certificates
    total_certs_issued: int
    cec_reports_sent: int
    # Top courses (by completion)
    top_courses: list[dict]


@router.get("/analytics", response_model=AdminAnalyticsOut)
async def get_admin_analytics(
    db: AsyncSession = Depends(get_async_db),
    current_user: LMSUser = Depends(get_current_lms_user),
) -> AdminAnalyticsOut:
    """Business intelligence dashboard metrics (admin only)."""
    _require_admin(current_user)

    from datetime import datetime, timezone

    from sqlalchemy import distinct, func, select

    from src.db.lms_models import (
        LMSCECReport,
        LMSCertificate,
        LMSSubscription,
    )

    now = datetime.now(timezone.utc)
    thirty_days_ago = now - timedelta(days=30)

    # Total users
    total_users = (await db.execute(select(func.count(LMSUser.id)))).scalar() or 0

    # Total students (users with student role)
    student_role_sq = (
        select(LMSUserRole.user_id)
        .join(LMSRole, LMSUserRole.role_id == LMSRole.id)
        .where(LMSRole.name == "student")
        .subquery()
    )
    total_students = (
        await db.execute(select(func.count()).select_from(student_role_sq))
    ).scalar() or 0

    # Active students in last 30 days (enrolled within window)
    active_students_30d = (
        await db.execute(
            select(func.count(distinct(LMSEnrollment.student_id))).where(
                LMSEnrollment.enrolled_at >= thirty_days_ago
            )
        )
    ).scalar() or 0

    # Enrollments
    total_enrollments = (await db.execute(select(func.count(LMSEnrollment.id)))).scalar() or 0
    total_completions = (
        await db.execute(
            select(func.count(LMSEnrollment.id)).where(LMSEnrollment.status == "completed")
        )
    ).scalar() or 0
    completion_rate_pct = round(
        (total_completions / total_enrollments * 100) if total_enrollments > 0 else 0.0, 1
    )

    # Subscriptions
    trialling = (
        await db.execute(
            select(func.count(LMSSubscription.id)).where(LMSSubscription.status == "trialling")
        )
    ).scalar() or 0
    active_subs = (
        await db.execute(
            select(func.count(LMSSubscription.id)).where(LMSSubscription.status == "active")
        )
    ).scalar() or 0
    total_trials_ever = (
        await db.execute(select(func.count(LMSSubscription.id)))
    ).scalar() or 0
    trial_to_paid_rate_pct = round(
        (active_subs / total_trials_ever * 100) if total_trials_ever > 0 else 0.0, 1
    )

    # Certs + CEC
    total_certs = (await db.execute(select(func.count(LMSCertificate.id)))).scalar() or 0
    cec_sent = (
        await db.execute(
            select(func.count(LMSCECReport.id)).where(LMSCECReport.status == "sent")
        )
    ).scalar() or 0

    # Top 5 courses by completion count
    top_courses_result = await db.execute(
        select(LMSCourse.title, func.count(LMSEnrollment.id).label("completions"))
        .join(LMSEnrollment, LMSEnrollment.course_id == LMSCourse.id)
        .where(LMSEnrollment.status == "completed")
        .group_by(LMSCourse.id, LMSCourse.title)
        .order_by(func.count(LMSEnrollment.id).desc())
        .limit(5)
    )
    top_courses = [
        {"title": row.title, "completions": row.completions}
        for row in top_courses_result
    ]

    return AdminAnalyticsOut(
        total_users=total_users,
        total_students=total_students,
        active_students_30d=active_students_30d,
        total_enrollments=total_enrollments,
        total_completions=total_completions,
        completion_rate_pct=completion_rate_pct,
        trialling=trialling,
        active_subscriptions=active_subs,
        trial_to_paid_rate_pct=trial_to_paid_rate_pct,
        total_certs_issued=total_certs,
        cec_reports_sent=cec_sent,
        top_courses=top_courses,
    )
