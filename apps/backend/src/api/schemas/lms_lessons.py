"""Pydantic schemas for LMS Lesson endpoints."""

from uuid import UUID

from pydantic import BaseModel


class LessonOut(BaseModel):
    id: UUID
    title: str
    content_type: str | None
    content_body: str | None
    drive_file_id: str | None
    duration_minutes: int | None
    is_preview: bool
    order_index: int
    course_id: UUID
    quiz_id: UUID | None = None

    model_config = {"from_attributes": True}
