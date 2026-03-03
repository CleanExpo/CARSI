"""LMS Module CRUD routes — Phase 12 (GP-108)."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.api.deps_lms import get_current_lms_user
from src.api.schemas.lms_modules import ModuleCreate, ModuleOut, ModuleUpdate
from src.config.database import get_async_db
from src.db.lms_models import LMSCourse, LMSModule, LMSUser

router = APIRouter(prefix="/api/lms", tags=["lms-modules"])


def _require_instructor_or_admin(user: LMSUser) -> None:
    roles = {ur.role.name for ur in user.user_roles}
    if not roles & {"instructor", "admin"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Instructor access required")


@router.get("/courses/{slug}/modules", response_model=list[ModuleOut])
async def list_modules(
    slug: str,
    db: AsyncSession = Depends(get_async_db),
    current_user: LMSUser = Depends(get_current_lms_user),
) -> list[ModuleOut]:
    """List all modules (with lessons) for a course."""
    result = await db.execute(
        select(LMSCourse)
        .options(selectinload(LMSCourse.modules).selectinload(LMSModule.lessons))
        .where(LMSCourse.slug == slug)
    )
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    return [
        ModuleOut(
            id=m.id,
            course_id=m.course_id,
            title=m.title,
            description=m.description,
            order_index=m.order_index,
            is_preview=m.is_preview or False,
            lessons=[
                _lesson_out(lesson) for lesson in m.lessons
            ],
        )
        for m in sorted(course.modules, key=lambda x: x.order_index)
    ]


@router.post("/courses/{slug}/modules", response_model=ModuleOut, status_code=status.HTTP_201_CREATED)
async def create_module(
    slug: str,
    body: ModuleCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user: LMSUser = Depends(get_current_lms_user),
) -> ModuleOut:
    """Create a new module in a course."""
    _require_instructor_or_admin(current_user)

    result = await db.execute(select(LMSCourse).where(LMSCourse.slug == slug))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    module = LMSModule(
        course_id=course.id,
        title=body.title,
        description=body.description,
        order_index=body.order_index,
        is_preview=body.is_preview,
    )
    db.add(module)
    await db.commit()
    await db.refresh(module)

    return ModuleOut(
        id=module.id,
        course_id=module.course_id,
        title=module.title,
        description=module.description,
        order_index=module.order_index,
        is_preview=module.is_preview or False,
        lessons=[],
    )


@router.patch("/modules/{module_id}", response_model=ModuleOut)
async def update_module(
    module_id: UUID,
    body: ModuleUpdate,
    db: AsyncSession = Depends(get_async_db),
    current_user: LMSUser = Depends(get_current_lms_user),
) -> ModuleOut:
    """Partially update a module."""
    _require_instructor_or_admin(current_user)

    result = await db.execute(
        select(LMSModule)
        .options(selectinload(LMSModule.lessons))
        .where(LMSModule.id == module_id)
    )
    module = result.scalar_one_or_none()
    if not module:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Module not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(module, field, value)
    await db.commit()

    return ModuleOut(
        id=module.id,
        course_id=module.course_id,
        title=module.title,
        description=module.description,
        order_index=module.order_index,
        is_preview=module.is_preview or False,
        lessons=[_lesson_out(l) for l in (module.lessons or [])],
    )


@router.delete("/modules/{module_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_module(
    module_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    current_user: LMSUser = Depends(get_current_lms_user),
) -> None:
    """Delete a module and all its lessons."""
    _require_instructor_or_admin(current_user)

    result = await db.execute(select(LMSModule).where(LMSModule.id == module_id))
    module = result.scalar_one_or_none()
    if not module:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Module not found")

    await db.delete(module)
    await db.commit()


# ---------------------------------------------------------------------------
# Internal helper
# ---------------------------------------------------------------------------

def _lesson_out(lesson) -> dict:
    from src.api.schemas.lms_lessons import LessonOut
    return LessonOut(
        id=lesson.id,
        title=lesson.title,
        content_type=lesson.content_type,
        content_body=lesson.content_body,
        drive_file_id=lesson.drive_file_id,
        duration_minutes=lesson.duration_minutes,
        is_preview=lesson.is_preview or False,
        order_index=lesson.order_index,
        course_id=lesson.module.course_id if hasattr(lesson, 'module') and lesson.module else lesson.module_id,
    )
