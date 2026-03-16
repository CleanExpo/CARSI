"""
CARSI Hub — YouTube Channel Directory API (UNI-71)

Public read endpoints for the YouTube Channel Directory.
Channel seeding is in migration 008. Stats are refreshed weekly
via the youtube_sync service (requires YOUTUBE_API_KEY).
"""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.config.database import get_async_db
from src.db.models import YouTubeChannel
from src.services.youtube_sync import sync_all_channels
from src.utils import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/api/youtube-channels", tags=["YouTube Channel Directory"])


class YouTubeChannelOut(BaseModel):
    id: str
    youtube_channel_id: str
    channel_url: str
    custom_url: str | None
    name: str
    description: str | None
    thumbnail_url: str | None
    subscriber_count: int | None
    video_count: int | None
    view_count: int | None
    latest_upload_title: str | None
    latest_upload_url: str | None
    latest_upload_date: datetime | None
    latest_upload_thumbnail: str | None
    industry_categories: list[str]
    tags: list[str]
    is_carsi_channel: bool
    featured: bool
    synced_at: datetime | None
    created_at: datetime


class YouTubeChannelListResponse(BaseModel):
    data: list[YouTubeChannelOut]
    total: int
    limit: int
    offset: int
    synced_at: datetime | None


def _to_out(c: YouTubeChannel) -> YouTubeChannelOut:
    return YouTubeChannelOut(
        id=str(c.id),
        youtube_channel_id=c.youtube_channel_id,
        channel_url=c.channel_url,
        custom_url=c.custom_url,
        name=c.name,
        description=c.description,
        thumbnail_url=c.thumbnail_url,
        subscriber_count=c.subscriber_count,
        video_count=c.video_count,
        view_count=c.view_count,
        latest_upload_title=c.latest_upload_title,
        latest_upload_url=c.latest_upload_url,
        latest_upload_date=c.latest_upload_date,
        latest_upload_thumbnail=c.latest_upload_thumbnail,
        industry_categories=c.industry_categories or [],
        tags=c.tags or [],
        is_carsi_channel=c.is_carsi_channel,
        featured=c.featured,
        synced_at=c.synced_at,
        created_at=c.created_at,
    )


@router.get("", response_model=YouTubeChannelListResponse, summary="List YouTube channels")
async def list_youtube_channels(
    category: str | None = Query(None, description="Filter by industry category"),
    q: str | None = Query(None, description="Search channel name or description"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_async_db),
) -> YouTubeChannelListResponse:
    """
    Return published YouTube channels.
    CARSI own channel always appears first, then channels ordered by subscriber count desc.
    """
    query = select(YouTubeChannel).where(YouTubeChannel.published.is_(True))

    if category:
        query = query.where(YouTubeChannel.industry_categories.contains([category]))

    if q:
        term = f"%{q.lower()}%"
        query = query.where(
            or_(
                func.lower(YouTubeChannel.name).like(term),
                func.lower(YouTubeChannel.description).like(term),
            )
        )

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar_one()

    # CARSI channel first, then by subscriber count desc
    query = (
        query.order_by(
            desc(YouTubeChannel.is_carsi_channel),
            desc(YouTubeChannel.featured),
            desc(YouTubeChannel.subscriber_count),
            YouTubeChannel.name,
        )
        .limit(limit)
        .offset(offset)
    )
    rows = (await db.execute(query)).scalars().all()

    # Last sync time across all channels
    synced_at_q = select(func.max(YouTubeChannel.synced_at)).where(
        YouTubeChannel.published.is_(True)
    )
    synced_at = (await db.execute(synced_at_q)).scalar_one_or_none()

    return YouTubeChannelListResponse(
        data=[_to_out(c) for c in rows],
        total=total,
        limit=limit,
        offset=offset,
        synced_at=synced_at,
    )


@router.get("/{channel_id}", response_model=YouTubeChannelOut, summary="Get a YouTube channel")
async def get_youtube_channel(
    channel_id: str,
    db: AsyncSession = Depends(get_async_db),
) -> YouTubeChannelOut:
    """Return a single published channel by its database UUID."""
    result = await db.execute(
        select(YouTubeChannel).where(
            YouTubeChannel.id == channel_id,
            YouTubeChannel.published.is_(True),
        )
    )
    channel = result.scalar_one_or_none()
    if channel is None:
        raise HTTPException(status_code=404, detail="Channel not found")
    return _to_out(channel)


@router.post("/sync", summary="Trigger weekly YouTube stats sync")
async def trigger_sync(
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_async_db),
) -> dict[str, str]:
    """
    Trigger a background sync of YouTube channel stats.
    Requires YOUTUBE_API_KEY to be configured — no-op otherwise.
    Only accessible from internal services (not exposed publicly via CORS).
    """

    async def _run_sync() -> None:
        try:
            summary = await sync_all_channels(db)
            logger.info("youtube_sync: background sync complete", **summary)
        except Exception as exc:
            logger.error("youtube_sync: background sync failed", error=str(exc))

    background_tasks.add_task(_run_sync)
    return {"status": "sync queued"}
