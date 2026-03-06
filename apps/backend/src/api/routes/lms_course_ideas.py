"""
CARSI LMS — Course Idea Catalog + AI Outline Generator (Phase 23)

GET  /api/lms/ideas                         -- list ideas, sorted by votes (public)
POST /api/lms/ideas                         -- submit an idea (authenticated)
GET  /api/lms/ideas/{id}                    -- idea detail + AI outline (public)
POST /api/lms/ideas/{id}/vote               -- toggle vote (authenticated)
POST /api/lms/ideas/{id}/generate-outline   -- generate AI course outline (instructor/admin)
"""

import json
import re
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps_lms import get_current_lms_user
from src.config.database import get_async_db
from src.db.lms_models import LMSCourseIdea, LMSCourseIdeaVote, LMSUser
from src.models.selector import ModelSelector

router = APIRouter(prefix="/api/lms/ideas", tags=["lms-course-ideas"])

_model_selector = ModelSelector()

IICRC_DISCIPLINES = {"WRT", "CRT", "OCT", "ASD", "CCT"}


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


class IdeaIn(BaseModel):
    title: str
    description: str | None = None
    iicrc_discipline: str | None = None


class IdeaOut(BaseModel):
    id: UUID
    title: str
    description: str | None
    iicrc_discipline: str | None
    vote_count: int
    status: str
    ai_outline: dict | None
    ai_outline_generated_at: datetime | None
    created_at: datetime | None

    model_config = {"from_attributes": True}


class VoteOut(BaseModel):
    voted: bool
    vote_count: int


# ---------------------------------------------------------------------------
# AI outline generation (isolated for easy mocking)
# ---------------------------------------------------------------------------


async def _generate_outline_via_ai(
    title: str,
    description: str | None,
    discipline: str | None,
) -> dict:
    """Call the configured AI provider and return a structured outline dict."""
    system = (
        "You are a curriculum designer for CARSI, an Australian building restoration "
        "training company. Always respond with valid JSON only — no markdown, no prose."
    )
    prompt = (
        f"Generate a structured course outline for the following idea:\n\n"
        f"Title: {title}\n"
        f"Description: {description or 'Not provided'}\n"
        f"IICRC Discipline: {discipline or 'General'}\n\n"
        "Return a JSON object with this exact structure:\n"
        "{\n"
        '  "course_title": "...",\n'
        '  "total_estimated_hours": 0.0,\n'
        '  "total_cec_hours": 0.0,\n'
        '  "iicrc_discipline": "...",\n'
        '  "learning_objectives": ["...", "..."],\n'
        '  "modules": [\n'
        "    {\n"
        '      "title": "...",\n'
        '      "description": "...",\n'
        '      "lessons": [\n'
        '        {"title": "...", "type": "video|pdf|quiz", "duration_minutes": 30}\n'
        "      ]\n"
        "    }\n"
        "  ],\n"
        '  "prerequisites": ["..."]\n'
        "}"
    )

    client = _model_selector.select_for_task("moderate")
    raw = await client.complete(prompt, system=system, max_tokens=2000)

    # Strip markdown code fences if present
    cleaned = re.sub(r"```(?:json)?\s*|\s*```", "", raw).strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        # Return a minimal structure if the model didn't produce valid JSON
        return {
            "course_title": title,
            "total_estimated_hours": 0,
            "total_cec_hours": 0,
            "iicrc_discipline": discipline,
            "learning_objectives": [],
            "modules": [],
            "prerequisites": [],
            "raw_response": raw,
        }


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.get("", response_model=list[IdeaOut])
async def list_ideas(
    db: AsyncSession = Depends(get_async_db),
) -> list[IdeaOut]:
    """All course ideas, highest votes first (public)."""
    result = await db.execute(
        select(LMSCourseIdea).order_by(LMSCourseIdea.vote_count.desc())
    )
    ideas = result.scalars().all()
    return [IdeaOut.model_validate(i) for i in ideas]


@router.post("", response_model=IdeaOut, status_code=201)
async def create_idea(
    body: IdeaIn,
    db: AsyncSession = Depends(get_async_db),
    current_user: LMSUser = Depends(get_current_lms_user),
) -> IdeaOut:
    """Submit a new course idea. Any authenticated user may submit."""
    idea = LMSCourseIdea(
        title=body.title,
        description=body.description,
        iicrc_discipline=body.iicrc_discipline,
        suggested_by_id=current_user.id,
    )
    db.add(idea)
    await db.commit()
    await db.refresh(idea)
    return IdeaOut.model_validate(idea)


@router.get("/{idea_id}", response_model=IdeaOut)
async def get_idea(
    idea_id: UUID,
    db: AsyncSession = Depends(get_async_db),
) -> IdeaOut:
    """Idea detail including cached AI outline (public)."""
    result = await db.execute(
        select(LMSCourseIdea).where(LMSCourseIdea.id == idea_id)
    )
    idea = result.scalar_one_or_none()
    if idea is None:
        raise HTTPException(status_code=404, detail="Idea not found")
    return IdeaOut.model_validate(idea)


@router.post("/{idea_id}/vote", response_model=VoteOut)
async def toggle_vote(
    idea_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    current_user: LMSUser = Depends(get_current_lms_user),
) -> VoteOut:
    """Toggle vote on an idea. Voting twice removes the vote."""
    # Fetch idea
    result = await db.execute(
        select(LMSCourseIdea).where(LMSCourseIdea.id == idea_id)
    )
    idea = result.scalar_one_or_none()
    if idea is None:
        raise HTTPException(status_code=404, detail="Idea not found")

    # Check existing vote
    vote_result = await db.execute(
        select(LMSCourseIdeaVote).where(
            LMSCourseIdeaVote.idea_id == idea_id,
            LMSCourseIdeaVote.user_id == current_user.id,
        )
    )
    existing = vote_result.scalar_one_or_none()

    if existing:
        await db.delete(existing)
        idea.vote_count = max(0, idea.vote_count - 1)
        voted = False
    else:
        db.add(LMSCourseIdeaVote(idea_id=idea_id, user_id=current_user.id))
        idea.vote_count += 1
        voted = True

    await db.commit()
    return VoteOut(voted=voted, vote_count=idea.vote_count)


@router.post("/{idea_id}/generate-outline")
async def generate_outline(
    idea_id: UUID,
    db: AsyncSession = Depends(get_async_db),
    current_user: LMSUser = Depends(get_current_lms_user),
) -> dict:
    """Generate an AI course outline for an idea. Instructor/admin only."""
    _require_instructor_or_admin(current_user)

    result = await db.execute(
        select(LMSCourseIdea).where(LMSCourseIdea.id == idea_id)
    )
    idea = result.scalar_one_or_none()
    if idea is None:
        raise HTTPException(status_code=404, detail="Idea not found")

    outline = await _generate_outline_via_ai(
        title=idea.title,
        description=idea.description,
        discipline=idea.iicrc_discipline,
    )

    idea.ai_outline = outline
    idea.ai_outline_generated_at = datetime.now(timezone.utc)
    await db.commit()

    return outline
