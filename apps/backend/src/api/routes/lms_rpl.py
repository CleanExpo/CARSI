"""
CARSI LMS — RPL Portfolio (Phase 26)

CPP40421 is used as a reference skill framework only.
CARSI does not deliver accredited VET qualifications.

GET    /api/lms/rpl/units               -- CPP40421 units from published courses (public)
GET    /api/lms/rpl/portfolio/me        -- student's own submissions
POST   /api/lms/rpl/portfolio           -- submit RPL application
DELETE /api/lms/rpl/portfolio/{id}      -- withdraw pending application
GET    /api/lms/admin/rpl               -- admin/instructor review queue
PATCH  /api/lms/admin/rpl/{id}/review   -- approve or reject a submission
"""

from datetime import datetime, timezone
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, field_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps_lms import get_current_lms_user
from src.config.database import get_async_db
from src.db.lms_models import LMSCourse, LMSRPLPortfolio, LMSUser

router = APIRouter(prefix="/api/lms/rpl", tags=["lms-rpl"])
admin_router = APIRouter(prefix="/api/lms/admin/rpl", tags=["lms-rpl-admin"])

ALLOWED_DECISIONS = {"approved", "rejected"}


# ---------------------------------------------------------------------------
# Auth helpers
# ---------------------------------------------------------------------------


def _require_instructor_or_admin(user: LMSUser) -> None:
    roles = {ur.role.name for ur in user.user_roles}
    if not roles.intersection({"instructor", "admin"}):
        raise HTTPException(status_code=403, detail="Instructor or admin access required")


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------


class UnitOut(BaseModel):
    unit_code: str
    unit_name: str


class RPLSubmissionIn(BaseModel):
    unit_code: str
    unit_name: str
    evidence_description: str
    evidence_urls: list[str] = []


class ReviewIn(BaseModel):
    decision: Literal["approved", "rejected"]
    notes: str | None = None


class RPLPortfolioOut(BaseModel):
    id: UUID
    student_id: UUID
    unit_code: str
    unit_name: str
    evidence_description: str
    evidence_urls: list[str]
    status: str
    reviewer_id: UUID | None
    reviewer_notes: str | None
    reviewed_at: datetime | None
    created_at: datetime | None
    updated_at: datetime | None

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.get("/units", response_model=list[UnitOut])
async def list_cpp_units(
    db: AsyncSession = Depends(get_async_db),
) -> list[UnitOut]:
    """List distinct CPP40421 units from published courses (reference framework)."""
    result = await db.execute(
        select(LMSCourse.cppp40421_unit_code, LMSCourse.cppp40421_unit_name)
        .where(
            LMSCourse.status == "published",
            LMSCourse.cppp40421_unit_code.isnot(None),
        )
        .distinct()
        .order_by(LMSCourse.cppp40421_unit_code)
    )
    rows = result.all()
    return [UnitOut(unit_code=r.cppp40421_unit_code, unit_name=r.cppp40421_unit_name or "") for r in rows]


@router.get("/portfolio/me", response_model=list[RPLPortfolioOut])
async def get_my_portfolio(
    db: AsyncSession = Depends(get_async_db),
    current_user: LMSUser = Depends(get_current_lms_user),
) -> list[RPLPortfolioOut]:
    """All RPL submissions for the current student."""
    result = await db.execute(
        select(LMSRPLPortfolio)
        .where(LMSRPLPortfolio.student_id == current_user.id)
        .order_by(LMSRPLPortfolio.created_at.desc())
    )
    submissions = result.scalars().all()
    return [RPLPortfolioOut.model_validate(s) for s in submissions]


@router.post("/portfolio", response_model=RPLPortfolioOut, status_code=201)
async def submit_rpl(
    body: RPLSubmissionIn,
    db: AsyncSession = Depends(get_async_db),
    current_user: LMSUser = Depends(get_current_lms_user),
) -> RPLPortfolioOut:
    """Submit an RPL application for a CPP40421 unit."""
    submission = LMSRPLPortfolio(
        student_id=current_user.id,
        unit_code=body.unit_code,
        unit_name=body.unit_name,
        evidence_description=body.evidence_description,
        evidence_urls=body.evidence_urls,
    )
    db.add(submission)
    await db.commit()
    await db.refresh(submission)
    return RPLPortfolioOut.model_validate(submission)


@router.delete("/portfolio/{submission_id}", status_code=204)
async def withdraw_rpl(
    submission_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    current_user: LMSUser = Depends(get_current_lms_user),
) -> None:
    """Withdraw a pending RPL submission. Cannot withdraw approved/rejected."""
    result = await db.execute(
        select(LMSRPLPortfolio).where(LMSRPLPortfolio.id == submission_id)
    )
    sub = result.scalar_one_or_none()

    if sub is None:
        raise HTTPException(status_code=404, detail="Submission not found")

    if sub.student_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your submission")

    if sub.status not in ("pending", "under_review"):
        raise HTTPException(
            status_code=409,
            detail=f"Cannot withdraw a submission with status '{sub.status}'",
        )

    await db.delete(sub)
    await db.commit()


# ---------------------------------------------------------------------------
# Admin routes
# ---------------------------------------------------------------------------


@admin_router.get("", response_model=list[RPLPortfolioOut])
async def admin_list_rpl(
    status: str | None = None,
    db: AsyncSession = Depends(get_async_db),
    current_user: LMSUser = Depends(get_current_lms_user),
) -> list[RPLPortfolioOut]:
    """List all RPL submissions for review. Filter by status if provided."""
    _require_instructor_or_admin(current_user)

    query = select(LMSRPLPortfolio).order_by(LMSRPLPortfolio.created_at.asc())
    if status:
        query = query.where(LMSRPLPortfolio.status == status)

    result = await db.execute(query)
    submissions = result.scalars().all()
    return [RPLPortfolioOut.model_validate(s) for s in submissions]


@admin_router.patch("/{submission_id}/review", response_model=RPLPortfolioOut)
async def review_rpl(
    submission_id: UUID,
    body: ReviewIn,
    db: AsyncSession = Depends(get_async_db),
    current_user: LMSUser = Depends(get_current_lms_user),
) -> RPLPortfolioOut:
    """Approve or reject an RPL submission."""
    _require_instructor_or_admin(current_user)

    result = await db.execute(
        select(LMSRPLPortfolio).where(LMSRPLPortfolio.id == submission_id)
    )
    sub = result.scalar_one_or_none()

    if sub is None:
        raise HTTPException(status_code=404, detail="Submission not found")

    sub.status = body.decision
    sub.reviewer_id = current_user.id
    sub.reviewer_notes = body.notes
    sub.reviewed_at = datetime.now(timezone.utc)
    sub.updated_at = datetime.now(timezone.utc)

    await db.commit()
    return RPLPortfolioOut.model_validate(sub)
