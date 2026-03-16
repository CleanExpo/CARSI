"""
CARSI Hub — Podcast Directory API (UNI-72)

Public read endpoints for the Podcast Directory.
Shows are seeded via migration. Episode stats are refreshed periodically
via the podcast_rss_sync service (no API key required — uses RSS feeds).
"""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import desc, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.config.database import get_async_db
from src.db.models import PodcastEpisode, PodcastShow
from src.services.podcast_rss_sync import sync_all_shows
from src.utils import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/api/podcasts", tags=["Podcast Directory"])


class PodcastShowOut(BaseModel):
    id: str
    slug: str
    name: str
    host: str | None
    description: str | None
    rss_url: str | None
    spotify_url: str | None
    apple_podcasts_url: str | None
    youtube_url: str | None
    amazon_music_url: str | None
    website_url: str | None
    cover_image_url: str | None
    episode_count: int | None
    latest_episode_title: str | None
    latest_episode_date: datetime | None
    latest_episode_url: str | None
    industry_categories: list[str]
    tags: list[str]
    country: str
    is_carsi_show: bool
    featured: bool
    rss_synced_at: datetime | None
    created_at: datetime


class PodcastEpisodeOut(BaseModel):
    id: str
    show_id: str
    guid: str
    title: str
    description: str | None
    episode_url: str | None
    audio_url: str | None
    image_url: str | None
    duration_seconds: int | None
    episode_number: int | None
    season_number: int | None
    published_at: datetime | None
    tags: list[str]
    created_at: datetime


class PodcastListResponse(BaseModel):
    data: list[PodcastShowOut]
    total: int
    limit: int
    offset: int
    synced_at: datetime | None


class EpisodeListResponse(BaseModel):
    data: list[PodcastEpisodeOut]
    total: int
    limit: int
    offset: int


def _show_to_out(s: PodcastShow) -> PodcastShowOut:
    return PodcastShowOut(
        id=str(s.id),
        slug=s.slug,
        name=s.name,
        host=s.host,
        description=s.description,
        rss_url=s.rss_url,
        spotify_url=s.spotify_url,
        apple_podcasts_url=s.apple_podcasts_url,
        youtube_url=s.youtube_url,
        amazon_music_url=s.amazon_music_url,
        website_url=s.website_url,
        cover_image_url=s.cover_image_url,
        episode_count=s.episode_count,
        latest_episode_title=s.latest_episode_title,
        latest_episode_date=s.latest_episode_date,
        latest_episode_url=s.latest_episode_url,
        industry_categories=s.industry_categories or [],
        tags=s.tags or [],
        country=s.country,
        is_carsi_show=s.is_carsi_show,
        featured=s.featured,
        rss_synced_at=s.rss_synced_at,
        created_at=s.created_at,
    )


def _episode_to_out(e: PodcastEpisode) -> PodcastEpisodeOut:
    return PodcastEpisodeOut(
        id=str(e.id),
        show_id=str(e.show_id),
        guid=e.guid,
        title=e.title,
        description=e.description,
        episode_url=e.episode_url,
        audio_url=e.audio_url,
        image_url=e.image_url,
        duration_seconds=e.duration_seconds,
        episode_number=e.episode_number,
        season_number=e.season_number,
        published_at=e.published_at,
        tags=e.tags or [],
        created_at=e.created_at,
    )


@router.get("", response_model=PodcastListResponse, summary="List podcast shows")
async def list_podcasts(
    category: str | None = Query(None, description="Filter by industry category"),
    q: str | None = Query(None, description="Search show name, host, or description"),
    country: str | None = Query(None, description="Filter by country code (AU, US, etc.)"),
    carsi_only: bool = Query(False, description="Return only CARSI own productions"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_async_db),
) -> PodcastListResponse:
    """
    Return published podcast shows.
    CARSI own shows appear first, then featured, then by latest episode date.
    """
    query = select(PodcastShow).where(PodcastShow.published.is_(True))

    if carsi_only:
        query = query.where(PodcastShow.is_carsi_show.is_(True))

    if category:
        query = query.where(PodcastShow.industry_categories.contains([category]))

    if country:
        query = query.where(func.upper(PodcastShow.country) == country.upper())

    if q:
        term = f"%{q.lower()}%"
        query = query.where(
            or_(
                func.lower(PodcastShow.name).like(term),
                func.lower(PodcastShow.host).like(term),
                func.lower(PodcastShow.description).like(term),
            )
        )

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar_one()

    # CARSI shows first, then featured, then by latest episode date desc
    query = (
        query.order_by(
            desc(PodcastShow.is_carsi_show),
            desc(PodcastShow.featured),
            desc(PodcastShow.latest_episode_date),
            PodcastShow.name,
        )
        .limit(limit)
        .offset(offset)
    )
    rows = (await db.execute(query)).scalars().all()

    # Last RSS sync time across all shows
    synced_at_q = select(func.max(PodcastShow.rss_synced_at)).where(
        PodcastShow.published.is_(True)
    )
    synced_at = (await db.execute(synced_at_q)).scalar_one_or_none()

    return PodcastListResponse(
        data=[_show_to_out(s) for s in rows],
        total=total,
        limit=limit,
        offset=offset,
        synced_at=synced_at,
    )


@router.get("/{slug}", response_model=PodcastShowOut, summary="Get a podcast show by slug")
async def get_podcast(
    slug: str,
    db: AsyncSession = Depends(get_async_db),
) -> PodcastShowOut:
    """Return a single published podcast show by its slug."""
    result = await db.execute(
        select(PodcastShow).where(
            PodcastShow.slug == slug,
            PodcastShow.published.is_(True),
        )
    )
    show = result.scalar_one_or_none()
    if show is None:
        raise HTTPException(status_code=404, detail="Podcast not found")
    return _show_to_out(show)


@router.get(
    "/{slug}/episodes",
    response_model=EpisodeListResponse,
    summary="List episodes for a podcast show",
)
async def list_episodes(
    slug: str,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_async_db),
) -> EpisodeListResponse:
    """Return episodes for a show, newest first."""
    # Resolve show
    show_result = await db.execute(
        select(PodcastShow.id).where(
            PodcastShow.slug == slug,
            PodcastShow.published.is_(True),
        )
    )
    show_id = show_result.scalar_one_or_none()
    if show_id is None:
        raise HTTPException(status_code=404, detail="Podcast not found")

    ep_query = select(PodcastEpisode).where(PodcastEpisode.show_id == show_id)

    count_q = select(func.count()).select_from(ep_query.subquery())
    total = (await db.execute(count_q)).scalar_one()

    ep_query = (
        ep_query.order_by(desc(PodcastEpisode.published_at))
        .limit(limit)
        .offset(offset)
    )
    episodes = (await db.execute(ep_query)).scalars().all()

    return EpisodeListResponse(
        data=[_episode_to_out(e) for e in episodes],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.post("/sync", summary="Trigger RSS sync for all podcast shows with rss_url set")
async def trigger_rss_sync(
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_async_db),
) -> dict:
    """
    Kick off a background RSS sync across all published shows that have an rss_url.
    Safe to call repeatedly — deduplicates by GUID.
    """
    background_tasks.add_task(sync_all_shows, db)
    return {"status": "sync_started"}
