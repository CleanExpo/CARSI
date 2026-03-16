"""
CARSI Hub — News Feed API

Read-only public endpoints for the AI-curated industry news feed.
The RSS ingestion and AI processing pipeline is in UNI-76.
This route serves the processed news_articles table to the frontend.
"""

from datetime import UTC, datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.config.database import get_async_db
from src.db.models import NewsArticle, NewsFeedSource
from src.utils import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/api/news", tags=["News Feed"])


class NewsArticleSummary(BaseModel):
    id: str
    source_name: str | None
    original_title: str
    ai_title: str | None
    ai_summary: str | None
    ai_tags: list[str]
    industry_categories: list[str]
    source_url: str
    image_url: str | None
    author: str | None
    published_at: datetime | None
    is_featured: bool
    created_at: datetime


class NewsListResponse(BaseModel):
    data: list[NewsArticleSummary]
    total: int
    limit: int
    offset: int
    last_updated: datetime | None


async def _get_source_name(db: AsyncSession, source_id: UUID) -> str | None:
    result = await db.execute(select(NewsFeedSource.name).where(NewsFeedSource.id == source_id))
    return result.scalar_one_or_none()


def _to_summary(a: NewsArticle, source_name: str | None) -> NewsArticleSummary:
    return NewsArticleSummary(
        id=str(a.id),
        source_name=source_name,
        original_title=a.original_title,
        ai_title=a.ai_title,
        ai_summary=a.ai_summary,
        ai_tags=a.ai_tags or [],
        industry_categories=a.industry_categories or [],
        source_url=a.source_url,
        image_url=a.image_url,
        author=a.author,
        published_at=a.published_at,
        is_featured=a.is_featured,
        created_at=a.created_at,
    )


@router.get("", response_model=NewsListResponse, summary="List published news articles")
async def list_news(
    category: str | None = Query(None, description="Filter by industry category"),
    days: int | None = Query(None, ge=1, le=90, description="Only articles from last N days"),
    limit: int = Query(30, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_async_db),
) -> NewsListResponse:
    """Return AI-curated news articles, newest first."""
    query = select(NewsArticle).where(NewsArticle.published.is_(True))

    if category:
        query = query.where(NewsArticle.industry_categories.contains([category]))

    if days:
        cutoff = datetime.now(UTC) - timedelta(days=days)
        query = query.where(NewsArticle.published_at >= cutoff)

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar_one()

    query = (
        query.order_by(desc(NewsArticle.is_featured), desc(NewsArticle.published_at))
        .limit(limit)
        .offset(offset)
    )
    rows = (await db.execute(query)).scalars().all()

    # Get the most recent update time for "last updated" display
    last_updated_q = select(func.max(NewsArticle.created_at)).where(NewsArticle.published.is_(True))
    last_updated = (await db.execute(last_updated_q)).scalar_one_or_none()

    # Bulk fetch source names
    source_ids = list({a.source_id for a in rows})
    source_map: dict[UUID, str] = {}
    if source_ids:
        sources = (
            await db.execute(
                select(NewsFeedSource.id, NewsFeedSource.name).where(
                    NewsFeedSource.id.in_(source_ids)
                )
            )
        ).all()
        source_map = {row.id: row.name for row in sources}

    return NewsListResponse(
        data=[_to_summary(a, source_map.get(a.source_id)) for a in rows],
        total=total,
        limit=limit,
        offset=offset,
        last_updated=last_updated,
    )
