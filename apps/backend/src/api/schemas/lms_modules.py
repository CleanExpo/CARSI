"""Pydantic schemas for LMS Module endpoints."""

from uuid import UUID

from pydantic import BaseModel, Field

from src.api.schemas.lms_lessons import LessonOut


class ModuleCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=500)
    description: str | None = None
    order_index: int = Field(..., ge=0)
    is_preview: bool = False


class ModuleUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=500)
    description: str | None = None
    order_index: int | None = Field(None, ge=0)
    is_preview: bool | None = None


class ModuleOut(BaseModel):
    id: UUID
    course_id: UUID
    title: str
    description: str | None
    order_index: int
    is_preview: bool
    lessons: list[LessonOut] = []

    model_config = {"from_attributes": True}
