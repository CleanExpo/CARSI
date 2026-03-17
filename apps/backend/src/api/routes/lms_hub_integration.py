"""CARSI Hub ↔ LMS cross-links — Phase D5."""

from fastapi import APIRouter, Path

router = APIRouter(prefix="/api/lms/hub", tags=["lms-hub"])

# ---------------------------------------------------------------------------
# Discipline → career context mapping
# ---------------------------------------------------------------------------

DISCIPLINE_CONTEXT: dict[str, dict] = {
    "WRT": {
        "job_keywords": ["water damage restoration", "WRT technician", "property restoration"],
        "related_disciplines": ["WRT", "ASD"],
        "pathway_name": "Water Damage Restoration Pathway",
    },
    "CRT": {
        "job_keywords": ["carpet restoration", "CRT technician", "textile cleaning"],
        "related_disciplines": ["CRT", "WRT"],
        "pathway_name": "Carpet Restoration Pathway",
    },
    "OCT": {
        "job_keywords": ["odour control", "OCT specialist", "deodorisation technician"],
        "related_disciplines": ["OCT", "WRT"],
        "pathway_name": "Odour Control Pathway",
    },
    "ASD": {
        "job_keywords": ["applied structural drying", "ASD technician", "structural drying"],
        "related_disciplines": ["ASD", "WRT"],
        "pathway_name": "Applied Structural Drying Pathway",
    },
    "CCT": {
        "job_keywords": ["commercial cleaning technician", "CCT specialist", "commercial restoration"],
        "related_disciplines": ["CCT"],
        "pathway_name": "Commercial Cleaning Pathway",
    },
    "FSRT": {
        "job_keywords": ["fire and smoke restoration", "FSRT technician", "fire damage restoration"],
        "related_disciplines": ["FSRT", "OCT"],
        "pathway_name": "Fire & Smoke Restoration Pathway",
    },
    "AMRT": {
        "job_keywords": ["applied microbial remediation", "AMRT technician", "mould remediation"],
        "related_disciplines": ["AMRT", "WRT"],
        "pathway_name": "Applied Microbial Remediation Pathway",
    },
    "HST": {
        "job_keywords": ["health and safety technician", "HST specialist", "workplace safety"],
        "related_disciplines": ["HST"],
        "pathway_name": "Health & Safety Pathway",
    },
}

_EMPTY_CONTEXT: dict = {
    "job_keywords": [],
    "related_disciplines": [],
    "pathway_name": None,
}


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.get("/course-context/{course_slug}")
async def get_course_context(
    course_slug: str = Path(..., description="URL slug of the course"),
) -> dict:
    """
    Return career/hub context for a given course slug.

    Derives discipline from the slug suffix (e.g. 'wrt-fundamentals' → WRT).
    Falls back to empty context for unknown disciplines — no DB join required.
    """
    # Attempt to extract discipline from slug: take the first segment and uppercase it.
    # e.g. "wrt-fundamentals" → "WRT", "applied-structural-drying-asd" → try each segment
    discipline = _infer_discipline_from_slug(course_slug)
    context = DISCIPLINE_CONTEXT.get(discipline, _EMPTY_CONTEXT)
    return {
        "discipline": discipline,
        "job_keywords": context["job_keywords"],
        "related_disciplines": context.get("related_disciplines", []),
        "pathway_name": context.get("pathway_name"),
    }


def _infer_discipline_from_slug(slug: str) -> str:
    """
    Best-effort discipline extraction from a course slug.

    Checks each hyphen-separated segment (uppercased) against the known
    disciplines. Returns the first match, or empty string if none found.
    """
    known = set(DISCIPLINE_CONTEXT.keys())
    for segment in slug.split("-"):
        candidate = segment.upper()
        if candidate in known:
            return candidate
    return ""
