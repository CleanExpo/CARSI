"""Natural language course search — Phase C1 (GP-Phase-C).

Uses PostgreSQL full-text search (tsvector / tsquery) backed by a GIN index
from migration 016.  No external API or ML model required.

Endpoint: GET /api/lms/search?q=<query>&limit=<1-50>
Auth:      Public (GET) — added to PUBLIC_GET_PREFIXES in auth middleware.
"""

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from src.config.database import get_async_db

router = APIRouter(prefix="/api/lms", tags=["LMS Search"])


# ---------------------------------------------------------------------------
# Response schema
# ---------------------------------------------------------------------------


class CourseSearchResult(BaseModel):
    """Single course result with relevance score."""

    id: str
    title: str
    description: str | None
    slug: str
    iicrc_discipline: str | None
    cec_hours: float | None
    thumbnail_url: str | None
    relevance_score: float

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Route
# ---------------------------------------------------------------------------


@router.get("/search", response_model=list[CourseSearchResult])
async def search_courses(
    q: str = Query(..., min_length=1, max_length=200, description="Natural language search query"),
    limit: int = Query(10, ge=1, le=50, description="Maximum results to return"),
    db: AsyncSession = Depends(get_async_db),
) -> list[CourseSearchResult]:
    """Search published courses using full-text ranking.

    Searches across title, description, IICRC discipline and tags.
    Results are ranked by PostgreSQL ts_rank_cd (cover density).

    - **q**: Natural language query, e.g. "water damage restoration training"
    - **limit**: 1–50 results (default 10)
    """
    # Normalise: collapse whitespace, strip leading/trailing spaces
    clean_q = " ".join(q.strip().split())

    # websearch_to_tsquery converts natural language to a tsquery expression.
    # "fire damage training" → 'fire' & 'damage' & 'training'
    # Quoted phrases and OR are also supported by callers.
    search_sql = text(
        """
        SELECT
            id::text                        AS id,
            title,
            description,
            slug,
            iicrc_discipline,
            cec_hours,
            thumbnail_url,
            ts_rank_cd(
                to_tsvector(
                    'english',
                    coalesce(title, '')            || ' ' ||
                    coalesce(description, '')      || ' ' ||
                    coalesce(iicrc_discipline, '') || ' ' ||
                    coalesce(cast(tags AS text), '')
                ),
                websearch_to_tsquery('english', :query)
            ) AS relevance_score
        FROM lms_courses
        WHERE
            is_published = true
            AND to_tsvector(
                    'english',
                    coalesce(title, '')            || ' ' ||
                    coalesce(description, '')      || ' ' ||
                    coalesce(iicrc_discipline, '') || ' ' ||
                    coalesce(cast(tags AS text), '')
                ) @@ websearch_to_tsquery('english', :query)
        ORDER BY relevance_score DESC
        LIMIT :limit
        """
    )

    result = await db.execute(search_sql, {"query": clean_q, "limit": limit})
    rows = result.fetchall()

    return [
        CourseSearchResult(
            id=row.id,
            title=row.title,
            description=row.description,
            slug=row.slug,
            iicrc_discipline=row.iicrc_discipline,
            cec_hours=float(row.cec_hours) if row.cec_hours is not None else None,
            thumbnail_url=row.thumbnail_url,
            relevance_score=float(row.relevance_score),
        )
        for row in rows
    ]
