"""Pydantic schemas for LMS Enrollment endpoints."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class EnrollmentCreate(BaseModel):
    course_id: UUID


class EnrollmentOut(BaseModel):
    id: UUID
    student_id: UUID
    course_id: UUID
    status: str
    enrolled_at: datetime
    completed_at: datetime | None = None
    payment_reference: str | None = None

    model_config = {"from_attributes": True}


class EnrollmentWithCourseOut(EnrollmentOut):
    """Enrollment with embedded course title for the 'my courses' list."""

    course_title: str | None = None
    course_slug: str | None = None
