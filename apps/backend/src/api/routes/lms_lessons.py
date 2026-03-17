"""LMS Lesson routes — Phase 10 + 12 (GP-106, GP-108)."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from src.api.deps_lms import get_current_lms_user
from src.api.schemas.lms_lessons import LessonOut
from src.config.database import get_async_db
from src.db.lms_models import LMSLesson, LMSLessonView, LMSModule, LMSSubscription, LMSUser

router = APIRouter(prefix="/api/lms/lessons", tags=["lms-lessons"])
modules_router = APIRouter(prefix="/api/lms/modules", tags=["lms-lessons"])


# ---------------------------------------------------------------------------
# Schemas (inline — keeps lesson CRUD co-located)
# ---------------------------------------------------------------------------


class LessonCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    content_type: str | None = "text"
    content_body: str | None = None
    drive_file_id: str | None = None
    duration_minutes: int | None = None
    is_preview: bool = False
    order_index: int = Field(..., ge=0)


class LessonUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=500)
    content_type: str | None = None
    content_body: str | None = None
    drive_file_id: str | None = None
    duration_minutes: int | None = None
    is_preview: bool | None = None
    order_index: int | None = Field(None, ge=0)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _require_instructor_or_admin(user: LMSUser) -> None:
    roles = {ur.role.name for ur in user.user_roles}
    if not roles & {"instructor", "admin"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Instructor access required"
        )


def _to_out(lesson: LMSLesson, course_id: UUID) -> LessonOut:
    return LessonOut(
        id=lesson.id,
        title=lesson.title,
        content_type=lesson.content_type,
        content_body=lesson.content_body,
        drive_file_id=lesson.drive_file_id,
        duration_minutes=lesson.duration_minutes,
        is_preview=lesson.is_preview or False,
        order_index=lesson.order_index,
        course_id=course_id,
    )


# ---------------------------------------------------------------------------
# GET /api/lms/lessons/{lesson_id}
# ---------------------------------------------------------------------------


@router.get("/{lesson_id}", response_model=LessonOut)
async def get_lesson(
    lesson_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    current_user: LMSUser = Depends(get_current_lms_user),
) -> LessonOut:
    """Return lesson detail. Preview lessons are free; all others require an active subscription."""
    result = await db.execute(
        select(LMSLesson)
        .options(joinedload(LMSLesson.module))
        .where(LMSLesson.id == lesson_id)
    )
    lesson = result.scalar_one_or_none()
    if not lesson:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")

    # Subscription gate: admins and instructors always bypass
    if not lesson.is_preview:
        roles = {ur.role.name for ur in current_user.user_roles}
        if not roles & {"admin", "instructor"}:
            sub_result = await db.execute(
                select(LMSSubscription).where(
                    LMSSubscription.student_id == current_user.id,
                    LMSSubscription.status.in_(["trialling", "active"]),
                )
            )
            if not sub_result.scalar_one_or_none():
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="An active subscription is required to access course content.",
                )

    # Record lesson view for analytics (best-effort — never blocks the response)
    try:
        db.add(LMSLessonView(
            student_id=current_user.id,
            lesson_id=lesson.id,
            course_id=lesson.module.course_id,
        ))
        await db.commit()
    except Exception:
        await db.rollback()

    return _to_out(lesson, lesson.module.course_id)


# ---------------------------------------------------------------------------
# POST /api/lms/modules/{module_id}/lessons
# ---------------------------------------------------------------------------


@modules_router.post("/{module_id}/lessons", response_model=LessonOut, status_code=status.HTTP_201_CREATED)
async def create_lesson(
    module_id: UUID,
    body: LessonCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user: LMSUser = Depends(get_current_lms_user),
) -> LessonOut:
    """Create a new lesson within a module."""
    _require_instructor_or_admin(current_user)

    result = await db.execute(select(LMSModule).where(LMSModule.id == module_id))
    module = result.scalar_one_or_none()
    if not module:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Module not found")

    lesson = LMSLesson(
        module_id=module_id,
        title=body.title,
        content_type=body.content_type,
        content_body=body.content_body,
        drive_file_id=body.drive_file_id,
        duration_minutes=body.duration_minutes,
        is_preview=body.is_preview,
        order_index=body.order_index,
    )
    db.add(lesson)
    await db.commit()
    await db.refresh(lesson)

    # lesson.module may not be loaded — use module.course_id directly
    lesson.module = module  # type: ignore[assignment]
    return _to_out(lesson, module.course_id)


# ---------------------------------------------------------------------------
# PATCH /api/lms/lessons/{lesson_id}
# ---------------------------------------------------------------------------


@router.patch("/{lesson_id}", response_model=LessonOut)
async def update_lesson(
    lesson_id: UUID,
    body: LessonUpdate,
    db: AsyncSession = Depends(get_async_db),
    current_user: LMSUser = Depends(get_current_lms_user),
) -> LessonOut:
    """Partially update a lesson."""
    _require_instructor_or_admin(current_user)

    result = await db.execute(
        select(LMSLesson)
        .options(joinedload(LMSLesson.module))
        .where(LMSLesson.id == lesson_id)
    )
    lesson = result.scalar_one_or_none()
    if not lesson:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(lesson, field, value)
    await db.commit()

    return _to_out(lesson, lesson.module.course_id)


# ---------------------------------------------------------------------------
# DELETE /api/lms/lessons/{lesson_id}
# ---------------------------------------------------------------------------


@router.delete("/{lesson_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_lesson(
    lesson_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    current_user: LMSUser = Depends(get_current_lms_user),
) -> None:
    """Delete a lesson."""
    _require_instructor_or_admin(current_user)

    result = await db.execute(select(LMSLesson).where(LMSLesson.id == lesson_id))
    lesson = result.scalar_one_or_none()
    if not lesson:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")

    await db.delete(lesson)
    await db.commit()
