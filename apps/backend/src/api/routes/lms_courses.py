"""
CARSI LMS Course CRUD Routes

POST   /api/lms/courses                     — create course (instructor/admin)
GET    /api/lms/courses                     — list published courses (public)
GET    /api/lms/courses/{slug}              — course detail (public)
PATCH  /api/lms/courses/{slug}              — update course (owner or admin)
DELETE /api/lms/courses/{slug}              — delete course (owner or admin)
POST   /api/lms/courses/{slug}/publish      — publish course (admin only)
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps_lms import get_current_lms_user, require_role
from src.api.schemas.lms_courses import CourseCreate, CourseListOut, CourseOut, CourseUpdate
from src.config.database import get_async_db
from src.db.lms_models import LMSCourse, LMSUser

router = APIRouter(prefix="/api/lms/courses", tags=["lms-courses"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _user_is_admin(user: LMSUser) -> bool:
    return any(ur.role.name == "admin" for ur in user.user_roles if ur.role)


def _user_is_instructor(user: LMSUser) -> bool:
    return any(ur.role.name == "instructor" for ur in user.user_roles if ur.role)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.post("", response_model=CourseOut, status_code=status.HTTP_201_CREATED)
async def create_course(
    data: CourseCreate,
    db: AsyncSession = Depends(get_async_db),
    current_user: LMSUser = Depends(require_role(["instructor", "admin"])),
) -> CourseOut:
    """Create a new course (instructors create in draft; admins can too)."""
    # Enforce slug uniqueness
    existing = await db.execute(select(LMSCourse).where(LMSCourse.slug == data.slug))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A course with this slug already exists",
        )

    course = LMSCourse(
        **data.model_dump(),
        instructor_id=current_user.id,
        status="draft",
    )
    db.add(course)
    await db.flush()
    await db.commit()
    await db.refresh(course)
    return CourseOut.model_validate(course)


@router.get("", response_model=CourseListOut)
async def list_courses(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    category: str | None = None,
    level: str | None = None,
    iicrc_discipline: str | None = None,
    db: AsyncSession = Depends(get_async_db),
) -> CourseListOut:
    """List published courses (public). Supports filtering and pagination."""
    base_filter = [LMSCourse.status == "published"]
    if category:
        base_filter.append(LMSCourse.category == category)
    if level:
        base_filter.append(LMSCourse.level == level)
    if iicrc_discipline:
        base_filter.append(LMSCourse.iicrc_discipline == iicrc_discipline)

    # Total count
    count_stmt = select(func.count()).select_from(LMSCourse).where(*base_filter)
    total_result = await db.execute(count_stmt)
    total = total_result.scalar() or 0

    # Paginated items
    items_stmt = (
        select(LMSCourse)
        .where(*base_filter)
        .order_by(LMSCourse.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    items_result = await db.execute(items_stmt)
    courses = items_result.scalars().all()

    return CourseListOut(
        items=[CourseOut.model_validate(c) for c in courses],
        total=total,
        page=page,
        per_page=per_page,
    )


@router.get("/{slug}", response_model=CourseOut)
async def get_course(
    slug: str,
    db: AsyncSession = Depends(get_async_db),
) -> CourseOut:
    """Retrieve a single published course by slug (public)."""
    result = await db.execute(
        select(LMSCourse).where(LMSCourse.slug == slug, LMSCourse.status == "published")
    )
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    return CourseOut.model_validate(course)


@router.patch("/{slug}", response_model=CourseOut)
async def update_course(
    slug: str,
    data: CourseUpdate,
    db: AsyncSession = Depends(get_async_db),
    current_user: LMSUser = Depends(require_role(["instructor", "admin"])),
) -> CourseOut:
    """Update a course. Instructors may only edit their own courses."""
    result = await db.execute(select(LMSCourse).where(LMSCourse.slug == slug))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    # Instructors can only update their own courses
    if _user_is_instructor(current_user) and not _user_is_admin(current_user):
        if course.instructor_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only update your own courses",
            )

    for field, value in data.model_dump(exclude_none=True).items():
        setattr(course, field, value)

    await db.commit()
    await db.refresh(course)
    return CourseOut.model_validate(course)


@router.post("/{slug}/publish", response_model=CourseOut)
async def publish_course(
    slug: str,
    db: AsyncSession = Depends(get_async_db),
    current_user: LMSUser = Depends(require_role(["admin"])),
) -> CourseOut:
    """Publish a course (admin only). Changes status from draft → published."""
    result = await db.execute(select(LMSCourse).where(LMSCourse.slug == slug))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    course.status = "published"
    await db.commit()
    await db.refresh(course)
    return CourseOut.model_validate(course)


@router.delete("/{slug}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_course(
    slug: str,
    db: AsyncSession = Depends(get_async_db),
    current_user: LMSUser = Depends(require_role(["instructor", "admin"])),
) -> None:
    """Delete a course. Instructors may only delete their own draft courses."""
    result = await db.execute(select(LMSCourse).where(LMSCourse.slug == slug))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    if _user_is_instructor(current_user) and not _user_is_admin(current_user):
        if course.instructor_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only delete your own courses",
            )
        if course.status != "draft":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only draft courses can be deleted by instructors",
            )

    await db.delete(course)
    await db.commit()
