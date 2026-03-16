"""
YouTube Channel Stats Sync Service (UNI-71)

Fetches channel metadata and latest upload from YouTube Data API v3.
Designed to run weekly via cron or on-demand from the API.

If YOUTUBE_API_KEY is not set the sync is a no-op — channels still
display with their seeded static metadata.
"""

from __future__ import annotations

import httpx
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import get_settings
from src.db.models import YouTubeChannel
from src.utils import get_logger

logger = get_logger(__name__)

_YOUTUBE_CHANNELS_API = "https://www.googleapis.com/youtube/v3/channels"
_YOUTUBE_SEARCH_API = "https://www.googleapis.com/youtube/v3/search"


async def fetch_channel_stats(
    channel_id: str,
    api_key: str,
    client: httpx.AsyncClient,
) -> dict | None:
    """
    Call YouTube Data API v3 to get channel snippet + statistics.
    Returns a dict with keys: name, description, thumbnail_url,
    custom_url, subscriber_count, video_count, view_count, or None on error.
    """
    try:
        resp = await client.get(
            _YOUTUBE_CHANNELS_API,
            params={
                "key": api_key,
                "id": channel_id,
                "part": "snippet,statistics",
            },
            timeout=10.0,
        )
        resp.raise_for_status()
        data = resp.json()
        items = data.get("items", [])
        if not items:
            logger.warning("youtube_sync: no data for channel", channel_id=channel_id)
            return None

        item = items[0]
        snippet = item.get("snippet", {})
        stats = item.get("statistics", {})
        thumbnails = snippet.get("thumbnails", {})
        thumbnail_url = (
            thumbnails.get("high", {}).get("url")
            or thumbnails.get("medium", {}).get("url")
            or thumbnails.get("default", {}).get("url")
        )

        return {
            "name": snippet.get("title"),
            "description": snippet.get("description"),
            "thumbnail_url": thumbnail_url,
            "custom_url": snippet.get("customUrl"),
            "subscriber_count": int(stats["subscriberCount"])
            if stats.get("subscriberCount") and not stats.get("hiddenSubscriberCount")
            else None,
            "video_count": int(stats["videoCount"]) if stats.get("videoCount") else None,
            "view_count": int(stats["viewCount"]) if stats.get("viewCount") else None,
        }
    except Exception as exc:
        logger.error(
            "youtube_sync: failed to fetch channel stats",
            channel_id=channel_id,
            error=str(exc),
        )
        return None


async def fetch_latest_upload(
    channel_id: str,
    api_key: str,
    client: httpx.AsyncClient,
) -> dict | None:
    """
    Fetch the most recently uploaded video for a channel.
    Returns dict with keys: title, url, published_at, thumbnail_url, or None.
    """
    try:
        resp = await client.get(
            _YOUTUBE_SEARCH_API,
            params={
                "key": api_key,
                "channelId": channel_id,
                "part": "snippet",
                "order": "date",
                "type": "video",
                "maxResults": 1,
            },
            timeout=10.0,
        )
        resp.raise_for_status()
        data = resp.json()
        items = data.get("items", [])
        if not items:
            return None

        item = items[0]
        snippet = item.get("snippet", {})
        video_id = item.get("id", {}).get("videoId")
        thumbnails = snippet.get("thumbnails", {})
        thumbnail_url = (
            thumbnails.get("high", {}).get("url")
            or thumbnails.get("medium", {}).get("url")
            or thumbnails.get("default", {}).get("url")
        )
        published_at_str = snippet.get("publishedAt")
        published_at = None
        if published_at_str:
            try:
                published_at = datetime.fromisoformat(
                    published_at_str.replace("Z", "+00:00")
                )
            except ValueError:
                pass

        return {
            "title": snippet.get("title"),
            "url": f"https://www.youtube.com/watch?v={video_id}" if video_id else None,
            "published_at": published_at,
            "thumbnail_url": thumbnail_url,
        }
    except Exception as exc:
        logger.error(
            "youtube_sync: failed to fetch latest upload",
            channel_id=channel_id,
            error=str(exc),
        )
        return None


async def sync_all_channels(db: AsyncSession) -> dict[str, int]:
    """
    Sync stats for all published YouTube channels.
    Skips gracefully if YOUTUBE_API_KEY is not configured.

    Returns a summary dict: {"synced": N, "failed": M, "skipped": K}
    """
    settings = get_settings()
    api_key = settings.youtube_api_key

    if not api_key:
        logger.info(
            "youtube_sync: YOUTUBE_API_KEY not set — skipping stats sync. "
            "Channels display with seeded static metadata."
        )
        return {"synced": 0, "failed": 0, "skipped": -1}

    result = await db.execute(
        select(YouTubeChannel).where(YouTubeChannel.published.is_(True))
    )
    channels = result.scalars().all()

    synced = 0
    failed = 0

    async with httpx.AsyncClient() as client:
        for channel in channels:
            stats = await fetch_channel_stats(channel.youtube_channel_id, api_key, client)
            latest = await fetch_latest_upload(channel.youtube_channel_id, api_key, client)

            if stats is None:
                failed += 1
                continue

            # Update channel with fresh data from API
            if stats.get("name"):
                channel.name = stats["name"]
            if stats.get("description") is not None:
                channel.description = stats["description"]
            if stats.get("thumbnail_url"):
                channel.thumbnail_url = stats["thumbnail_url"]
            if stats.get("custom_url"):
                channel.custom_url = stats["custom_url"]
            channel.subscriber_count = stats.get("subscriber_count")
            channel.video_count = stats.get("video_count")
            channel.view_count = stats.get("view_count")

            if latest:
                channel.latest_upload_title = latest.get("title")
                channel.latest_upload_url = latest.get("url")
                channel.latest_upload_date = latest.get("published_at")
                channel.latest_upload_thumbnail = latest.get("thumbnail_url")

            channel.synced_at = datetime.now(UTC)
            synced += 1

    await db.commit()
    logger.info(
        "youtube_sync: sync complete",
        synced=synced,
        failed=failed,
    )
    return {"synced": synced, "failed": failed, "skipped": 0}
