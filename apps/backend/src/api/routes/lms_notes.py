"""
CARSI LMS Lesson Notes Routes

GET    /api/lms/notes/me              — list all notes for current user
PUT    /api/lms/notes/{lesson_id}     — upsert note for a lesson
DELETE /api/lms/notes/{lesson_id}     — delete note for a lesson
"""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.api.deps_lms import get_current_lms_user
from src.config.database import get_async_db
from src.db.lms_models import LMSLesson, LMSLessonNote, LMSModule, LMSUser

router = APIRouter(prefix="/api/lms/notes", tags=["lms-notes"])


class NoteUpsert(BaseModel):
    content: str = Field(max_length=50_000)


class LessonNoteOut(BaseModel):
    id: str
    lesson_id: str
    lesson_title: str
    module_title: str | None = None
    course_title: str
    course_slug: str
    content: str | None = None
    updated_at: str | None = None


@router.get("/me", response_model=list[LessonNoteOut])
async def get_my_notes(
    db: AsyncSession = Depends(get_async_db),
    current_user: LMSUser = Depends(get_current_lms_user),
) -> list[LessonNoteOut]:
    """Return all lesson notes for the current student, with lesson/course metadata."""
    result = await db.execute(
        select(LMSLessonNote)
        .where(LMSLessonNote.student_id == current_user.id)
        .options(
            selectinload(LMSLessonNote.lesson)
            .selectinload(LMSLesson.module)
            .selectinload(LMSModule.course)
        )
        .order_by(LMSLessonNote.updated_at.desc())
    )
    notes = result.scalars().all()

    out = []
    for n in notes:
        lesson = n.lesson
        module = lesson.module if lesson else None
        course = module.course if module else None
        out.append(
            LessonNoteOut(
                id=str(n.id),
                lesson_id=str(n.lesson_id),
                lesson_title=lesson.title if lesson else "Unknown lesson",
                module_title=module.title if module else None,
                course_title=course.title if course else "Unknown course",
                course_slug=course.slug if course else "",
                content=n.content,
                updated_at=n.updated_at.isoformat() if n.updated_at else None,
            )
        )
    return out


@router.put("/{lesson_id}", response_model=LessonNoteOut)
async def upsert_note(
    lesson_id: str,
    data: NoteUpsert,
    db: AsyncSession = Depends(get_async_db),
    current_user: LMSUser = Depends(get_current_lms_user),
) -> LessonNoteOut:
    """Create or update the current student's note for a lesson."""
    try:
        lid = UUID(lesson_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")

    result = await db.execute(
        select(LMSLessonNote).where(
            LMSLessonNote.student_id == current_user.id,
            LMSLessonNote.lesson_id == lid,
        )
    )
    note = result.scalar_one_or_none()

    if note:
        note.content = data.content
    else:
        note = LMSLessonNote(
            student_id=current_user.id,
            lesson_id=lid,
            content=data.content,
        )
        db.add(note)

    await db.commit()
    await db.refresh(note)

    # Re-fetch with lesson/course metadata for response
    result2 = await db.execute(
        select(LMSLessonNote)
        .where(LMSLessonNote.id == note.id)
        .options(
            selectinload(LMSLessonNote.lesson)
            .selectinload(LMSLesson.module)
            .selectinload(LMSModule.course)
        )
    )
    note = result2.scalar_one_or_none()
    lesson = note.lesson if note else None
    module = lesson.module if lesson else None
    course = module.course if module else None

    return LessonNoteOut(
        id=str(note.id),
        lesson_id=str(note.lesson_id),
        lesson_title=lesson.title if lesson else "Unknown lesson",
        module_title=module.title if module else None,
        course_title=course.title if course else "Unknown course",
        course_slug=course.slug if course else "",
        content=note.content,
        updated_at=note.updated_at.isoformat() if note.updated_at else None,
    )


@router.delete("/{lesson_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(
    lesson_id: str,
    db: AsyncSession = Depends(get_async_db),
    current_user: LMSUser = Depends(get_current_lms_user),
) -> None:
    """Delete the current student's note for a lesson."""
    try:
        lid = UUID(lesson_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")

    result = await db.execute(
        select(LMSLessonNote).where(
            LMSLessonNote.student_id == current_user.id,
            LMSLessonNote.lesson_id == lid,
        )
    )
    note = result.scalar_one_or_none()
    if not note:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Note not found")

    await db.delete(note)
    await db.commit()
