"""Pydantic schemas for LMS Course CRUD endpoints."""

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field

IICRC_DISCIPLINES = {"WRT", "CRT", "OCT", "ASD", "CCT"}
COURSE_LEVELS = {"beginner", "intermediate", "advanced"}


class CourseCreate(BaseModel):
    title: str = Field(..., min_length=2, max_length=500)
    slug: str = Field(..., min_length=2, max_length=255, pattern=r"^[a-z0-9-]+$")
    description: str | None = None
    short_description: str | None = Field(None, max_length=500)
    price_aud: Decimal = Field(default=Decimal("0"), ge=0)
    is_free: bool = False
    duration_hours: Decimal | None = Field(None, ge=0)
    level: str | None = Field(None, max_length=50)
    category: str | None = Field(None, max_length=100)
    tags: list[str] = Field(default_factory=list)
    # IICRC accreditation & CPP40421 alignment
    iicrc_discipline: str | None = Field(None, max_length=10)
    cec_hours: Decimal | None = Field(None, ge=0)
    cppp40421_unit_code: str | None = Field(None, max_length=20)
    cppp40421_unit_name: str | None = None


class CourseUpdate(BaseModel):
    """Partial update — all fields are optional."""

    title: str | None = Field(None, min_length=2, max_length=500)
    description: str | None = None
    short_description: str | None = Field(None, max_length=500)
    price_aud: Decimal | None = Field(None, ge=0)
    is_free: bool | None = None
    duration_hours: Decimal | None = Field(None, ge=0)
    level: str | None = Field(None, max_length=50)
    category: str | None = Field(None, max_length=100)
    tags: list[str] | None = None
    iicrc_discipline: str | None = Field(None, max_length=10)
    cec_hours: Decimal | None = Field(None, ge=0)
    cppp40421_unit_code: str | None = Field(None, max_length=20)
    cppp40421_unit_name: str | None = None


class CourseOut(BaseModel):
    id: UUID
    slug: str
    title: str
    description: str | None
    short_description: str | None
    price_aud: Decimal
    is_free: bool
    duration_hours: Decimal | None
    level: str | None
    category: str | None
    tags: list[str]
    iicrc_discipline: str | None
    cec_hours: Decimal | None
    cppp40421_unit_code: str | None
    cppp40421_unit_name: str | None
    instructor_id: UUID
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CourseListOut(BaseModel):
    items: list[CourseOut]
    total: int
    page: int
    per_page: int
