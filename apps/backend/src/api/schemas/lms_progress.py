"""Pydantic schemas for LMS Progress endpoints."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class LessonCompleteRequest(BaseModel):
    time_spent_seconds: int = Field(default=0, ge=0)


class ProgressOut(BaseModel):
    lesson_id: UUID
    completed_at: datetime | None = None
    time_spent_seconds: int = 0

    model_config = {"from_attributes": True}


class CourseProgressOut(BaseModel):
    course_id: UUID
    enrollment_status: str
    total_lessons: int
    completed_lessons: int
    completion_percentage: float
