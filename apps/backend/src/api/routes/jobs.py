"""
CARSI Hub — Job Board API

Public endpoints: browse published listings (with filters), get by ID.
Submission endpoint: public form POST → published=False, awaiting admin approval.
Admin endpoints: list all, approve/reject, delete.
30-day auto-expiry: valid_through = submitted_at + 30d; backend filters on valid_through >= now().
"""

from datetime import UTC, datetime, timedelta
from uuid import UUID

import redis as redis_lib
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr, Field, field_validator
from sqlalchemy import asc, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import get_settings
from src.config.database import get_async_db
from src.db.models import JobListing
from src.utils import get_logger

_settings = get_settings()

logger = get_logger(__name__)
router = APIRouter(prefix="/api/jobs", tags=["Job Board"])

_RATE_LIMIT_TTL = 86_400  # 24 hours in seconds
_RATE_LIMIT_PREFIX = "ratelimit:jobsubmit:"


def _get_redis() -> redis_lib.Redis:
    return redis_lib.from_url(_settings.redis_url, decode_responses=True)


def _check_submission_rate_limit(email: str) -> None:
    """Raise HTTP 429 if this email has submitted a job in the last 24 hours."""
    try:
        r = _get_redis()
        key = f"{_RATE_LIMIT_PREFIX}{email.lower()}"
        if r.exists(key):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="You have already submitted a job listing in the last 24 hours. Please try again tomorrow.",
            )
        r.setex(key, _RATE_LIMIT_TTL, "1")
    except HTTPException:
        raise
    except Exception as exc:
        # Redis unavailable — fail open (log and continue)
        logger.warning("Redis rate limit check failed, continuing without limit", error=str(exc))

VALID_EMPLOYMENT_TYPES = {"FULL_TIME", "PART_TIME", "CONTRACTOR", "CASUAL", "INTERNSHIP"}
VALID_STATES = {"QLD", "NSW", "VIC", "SA", "WA", "TAS", "NT", "ACT"}

INDUSTRY_CATEGORIES = [
    "Restoration",
    "HVAC",
    "Flooring",
    "Indoor Air Quality",
    "Building & Construction",
    "Insurance & Claims",
    "Carpet & Upholstery Cleaning",
    "Pest Control",
    "Mould Remediation",
    "Water Damage",
    "Fire Restoration",
]


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------


class JobSummary(BaseModel):
    id: str
    title: str
    company_name: str
    company_logo_url: str | None
    employment_type: str
    industry_categories: list[str]
    location_city: str | None
    location_state: str | None
    is_remote: bool
    salary_min: int | None
    salary_max: int | None
    valid_through: datetime
    featured: bool
    source: str
    apply_url: str | None
    created_at: datetime


class JobDetail(JobSummary):
    company_website: str | None
    description: str
    apply_url: str | None
    apply_email: str | None
    location_postcode: str | None
    updated_at: datetime


class JobListResponse(BaseModel):
    data: list[JobSummary]
    total: int
    limit: int
    offset: int


class JobSubmitRequest(BaseModel):
    """Public submission form — goes to pending approval queue."""
    title: str = Field(min_length=2, max_length=500)
    company_name: str = Field(min_length=2, max_length=255)
    company_website: str | None = Field(None, max_length=1000)
    description: str = Field(min_length=50, max_length=10000)
    employment_type: str = Field(default="FULL_TIME", max_length=50)
    industry_categories: list[str] = Field(default_factory=list, max_length=5)
    location_city: str | None = Field(None, max_length=100)
    location_state: str | None = Field(None, max_length=10)
    location_postcode: str | None = Field(None, max_length=10)
    is_remote: bool = False
    salary_min: int | None = Field(None, ge=0, le=1000000)
    salary_max: int | None = Field(None, ge=0, le=1000000)
    apply_url: str | None = Field(None, max_length=1000)
    apply_email: str | None = Field(None, max_length=255)
    submitter_name: str = Field(min_length=2, max_length=255)
    submitter_email: str = Field(max_length=255)
    submitter_phone: str | None = Field(None, max_length=50)

    @field_validator("employment_type")
    @classmethod
    def validate_employment_type(cls, v: str) -> str:
        if v.upper() not in VALID_EMPLOYMENT_TYPES:
            raise ValueError(f"employment_type must be one of: {', '.join(VALID_EMPLOYMENT_TYPES)}")
        return v.upper()

    @field_validator("location_state")
    @classmethod
    def validate_state(cls, v: str | None) -> str | None:
        if v and v.upper() not in VALID_STATES:
            raise ValueError(f"location_state must be an Australian state/territory code")
        return v.upper() if v else None

    def validate_apply_method(self) -> None:
        if not self.apply_url and not self.apply_email:
            raise ValueError("Either apply_url or apply_email is required")


class JobApproveRequest(BaseModel):
    published: bool
    featured: bool = False


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _to_summary(j: JobListing) -> JobSummary:
    return JobSummary(
        id=str(j.id),
        title=j.title,
        company_name=j.company_name,
        company_logo_url=j.company_logo_url,
        employment_type=j.employment_type,
        industry_categories=j.industry_categories or [],
        location_city=j.location_city,
        location_state=j.location_state,
        is_remote=j.is_remote,
        salary_min=j.salary_min,
        salary_max=j.salary_max,
        valid_through=j.valid_through,
        featured=j.featured,
        source=j.source,
        apply_url=j.apply_url,
        created_at=j.created_at,
    )


def _to_detail(j: JobListing) -> JobDetail:
    return JobDetail(
        id=str(j.id),
        title=j.title,
        company_name=j.company_name,
        company_website=j.company_website,
        company_logo_url=j.company_logo_url,
        description=j.description,
        employment_type=j.employment_type,
        industry_categories=j.industry_categories or [],
        location_city=j.location_city,
        location_state=j.location_state,
        location_postcode=j.location_postcode,
        is_remote=j.is_remote,
        salary_min=j.salary_min,
        salary_max=j.salary_max,
        apply_url=j.apply_url,
        apply_email=j.apply_email,
        valid_through=j.valid_through,
        featured=j.featured,
        created_at=j.created_at,
        updated_at=j.updated_at,
    )


# ---------------------------------------------------------------------------
# Public endpoints
# ---------------------------------------------------------------------------


@router.get("", response_model=JobListResponse, summary="List published, active job listings")
async def list_jobs(
    category: str | None = Query(None, description="Filter by industry category"),
    state: str | None = Query(None, description="Filter by state (QLD, NSW, VIC, etc.)"),
    is_remote: bool | None = Query(None, description="Filter remote-only jobs"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_async_db),
) -> JobListResponse:
    """Return published, non-expired job listings, newest first."""
    now = datetime.now(UTC)
    query = select(JobListing).where(
        JobListing.published.is_(True),
        JobListing.valid_through >= now,
    )

    if category:
        query = query.where(JobListing.industry_categories.contains([category]))
    if state:
        query = query.where(JobListing.location_state == state.upper())
    if is_remote is not None:
        query = query.where(JobListing.is_remote.is_(is_remote))

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar_one()

    query = (
        query.order_by(desc(JobListing.featured), desc(JobListing.created_at))
        .limit(limit)
        .offset(offset)
    )
    rows = (await db.execute(query)).scalars().all()

    return JobListResponse(
        data=[_to_summary(j) for j in rows],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/{job_id}", response_model=JobDetail, summary="Get job listing by ID")
async def get_job(
    job_id: UUID,
    db: AsyncSession = Depends(get_async_db),
) -> JobDetail:
    """Return a single published, non-expired job listing."""
    now = datetime.now(UTC)
    result = await db.execute(
        select(JobListing).where(
            JobListing.id == job_id,
            JobListing.published.is_(True),
            JobListing.valid_through >= now,
        )
    )
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job listing not found")
    return _to_detail(job)


@router.post(
    "/submit",
    status_code=status.HTTP_201_CREATED,
    summary="Submit a job listing for review",
    response_model=dict,
)
async def submit_job(
    body: JobSubmitRequest,
    db: AsyncSession = Depends(get_async_db),
) -> dict:
    """Public submission — creates listing with published=False, valid_through=now+30d."""
    body.validate_apply_method()
    _check_submission_rate_limit(body.submitter_email)

    job = JobListing(
        title=body.title,
        company_name=body.company_name,
        company_website=body.company_website,
        description=body.description,
        employment_type=body.employment_type,
        industry_categories=body.industry_categories,
        location_city=body.location_city,
        location_state=body.location_state,
        location_postcode=body.location_postcode,
        is_remote=body.is_remote,
        salary_min=body.salary_min,
        salary_max=body.salary_max,
        apply_url=body.apply_url,
        apply_email=body.apply_email,
        submitter_name=body.submitter_name,
        submitter_email=body.submitter_email,
        submitter_phone=body.submitter_phone,
        source="manual",
        valid_through=datetime.now(UTC) + timedelta(days=30),
        published=False,
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)
    logger.info("Job submitted", job_id=str(job.id), company=job.company_name)

    # Fire-and-forget confirmation email via Celery
    try:
        from src.worker.job_tasks import send_job_submission_confirmation
        send_job_submission_confirmation.delay(
            to_email=body.submitter_email,
            submitter_name=body.submitter_name,
            job_title=body.title,
            company_name=body.company_name,
        )
    except Exception as exc:
        logger.warning("Failed to enqueue confirmation email", job_id=str(job.id), error=str(exc))

    return {
        "id": str(job.id),
        "message": "Job submitted successfully. It will appear on the board after review (typically within 24 hours).",
    }


# ---------------------------------------------------------------------------
# Admin endpoints
# ---------------------------------------------------------------------------


@router.get("/admin/pending", response_model=JobListResponse, summary="Admin: list pending jobs")
async def admin_list_pending(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_async_db),
) -> JobListResponse:
    """Admin view — unpublished listings awaiting moderation."""
    query = select(JobListing).where(JobListing.published.is_(False))
    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar_one()
    query = query.order_by(asc(JobListing.created_at)).limit(limit).offset(offset)
    rows = (await db.execute(query)).scalars().all()
    return JobListResponse(data=[_to_summary(j) for j in rows], total=total, limit=limit, offset=offset)


@router.patch(
    "/{job_id}/approve",
    response_model=JobDetail,
    summary="Admin: approve or reject a job listing",
)
async def approve_job(
    job_id: UUID,
    body: JobApproveRequest,
    db: AsyncSession = Depends(get_async_db),
) -> JobDetail:
    """Approve (publish=True) or reject (publish=False) a submitted listing."""
    result = await db.execute(select(JobListing).where(JobListing.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job listing not found")
    job.published = body.published
    job.featured = body.featured
    await db.commit()
    await db.refresh(job)
    logger.info("Job moderated", job_id=str(job_id), published=body.published)
    return _to_detail(job)


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Admin: delete job")
async def delete_job(
    job_id: UUID,
    db: AsyncSession = Depends(get_async_db),
) -> None:
    result = await db.execute(select(JobListing).where(JobListing.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job listing not found")
    await db.delete(job)
    await db.commit()
    logger.info("Job deleted", job_id=str(job_id))
