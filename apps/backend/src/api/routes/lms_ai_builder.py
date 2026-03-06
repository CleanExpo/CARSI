"""
CARSI LMS — AI Course Builder (GP-129)

POST /api/lms/admin/ai-course-builder — generate structured course content from IICRC standards
"""

import json
import re

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from src.api.deps_lms import get_current_lms_user
from src.db.lms_models import LMSUser
from src.models.selector import ModelSelector

router = APIRouter(prefix="/api/lms/admin", tags=["lms-ai-builder"])

_model_selector = ModelSelector()


# ---------------------------------------------------------------------------
# Auth helper
# ---------------------------------------------------------------------------


def _require_instructor_or_admin(user: LMSUser) -> None:
    roles = {ur.role.name for ur in user.user_roles}
    if not roles.intersection({"instructor", "admin"}):
        raise HTTPException(status_code=403, detail="Instructor or admin access required")


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class AIBuilderRequest(BaseModel):
    title: str
    iicrc_discipline: str
    standard_outline: str
    module_count: int = Field(default=3, ge=2, le=5)


# ---------------------------------------------------------------------------
# AI generation (isolated for easy mocking)
# ---------------------------------------------------------------------------


async def _generate_course_content(
    title: str,
    iicrc_discipline: str,
    standard_outline: str,
    module_count: int,
) -> dict:
    """Call the configured AI provider and return structured course content."""
    system = (
        "You are a curriculum designer for CARSI, an Australian building restoration "
        "training company specialising in IICRC-accredited courses. "
        "Always respond with valid JSON only — no markdown, no prose."
    )
    prompt = (
        f"Given the following IICRC standard outline, generate a structured course.\n\n"
        f"Course Title: {title}\n"
        f"IICRC Discipline: {iicrc_discipline}\n"
        f"Standard Outline:\n{standard_outline}\n\n"
        f"Generate exactly {module_count} modules with 2 lessons each.\n"
        "Return a JSON object with this exact structure:\n"
        "{\n"
        '  "modules": [\n'
        "    {\n"
        '      "name": "Module title",\n'
        '      "description": "Module description",\n'
        '      "lessons": [\n'
        "        {\n"
        '          "title": "Lesson title",\n'
        '          "content": "Approximately 500 words of lesson content",\n'
        '          "key_takeaways": ["takeaway 1", "takeaway 2", "takeaway 3"],\n'
        '          "quiz_questions": [\n'
        "            {\n"
        '              "question": "Question text",\n'
        '              "options": ["Option A", "Option B", "Option C", "Option D"],\n'
        '              "correct_index": 0\n'
        "            }\n"
        "          ]\n"
        "        }\n"
        "      ]\n"
        "    }\n"
        "  ]\n"
        "}"
    )

    client = _model_selector.select_for_task("complex")
    raw = await client.complete(prompt, system=system, max_tokens=4000)

    # Strip markdown code fences if present
    cleaned = re.sub(r"```(?:json)?\s*|\s*```", "", raw).strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        # Return minimal fallback structure
        return _fallback_structure(title, iicrc_discipline, module_count)


def _fallback_structure(title: str, discipline: str, module_count: int) -> dict:
    """Return a minimal valid structure when AI fails to produce JSON."""
    modules = []
    for i in range(1, module_count + 1):
        modules.append(
            {
                "name": f"Module {i}",
                "description": f"Module {i} for {title}",
                "lessons": [
                    {
                        "title": f"Lesson {i}.1",
                        "content": f"Content for lesson {i}.1 — {discipline} standards.",
                        "key_takeaways": [],
                        "quiz_questions": [],
                    },
                    {
                        "title": f"Lesson {i}.2",
                        "content": f"Content for lesson {i}.2 — {discipline} standards.",
                        "key_takeaways": [],
                        "quiz_questions": [],
                    },
                ],
            }
        )
    return {"modules": modules}


# ---------------------------------------------------------------------------
# Route
# ---------------------------------------------------------------------------


@router.post("/ai-course-builder")
async def ai_course_builder(
    body: AIBuilderRequest,
    current_user: LMSUser = Depends(get_current_lms_user),
) -> dict:
    """Generate AI-powered course content from IICRC standard outlines.

    Instructor or admin only. Uses the configured AI provider to produce
    structured modules, lessons, quiz questions and key takeaways.
    """
    _require_instructor_or_admin(current_user)

    try:
        result = await _generate_course_content(
            title=body.title,
            iicrc_discipline=body.iicrc_discipline,
            standard_outline=body.standard_outline,
            module_count=body.module_count,
        )
    except Exception:
        # AI provider completely unavailable — return fallback
        result = _fallback_structure(body.title, body.iicrc_discipline, body.module_count)

    return result
