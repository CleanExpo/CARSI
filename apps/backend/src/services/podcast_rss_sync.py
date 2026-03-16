"""
CARSI Hub — Podcast RSS Sync Service (UNI-72)

Fetches RSS feeds for podcast shows and upserts episodes.
Also updates show-level stats: episode_count, latest_episode_title/date/url.

No API key required — uses standard RSS/Atom feeds over HTTP.
Designed to run periodically (e.g. daily via cron) or on-demand.
"""

from __future__ import annotations

import re
from datetime import UTC, datetime
from email.utils import parsedate_to_datetime
from xml.etree import ElementTree as ET

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.db.models import PodcastEpisode, PodcastShow
from src.utils import get_logger

logger = get_logger(__name__)

# RSS namespaces commonly used in podcast feeds
_NS = {
    "itunes": "http://www.itunes.com/dtds/podcast-1.0.dtd",
    "content": "http://purl.org/rss/1.0/modules/content/",
    "atom": "http://www.w3.org/2005/Atom",
    "podcast": "https://podcastindex.org/namespace/1.0",
}

_TIMEOUT = 15.0
_MAX_EPISODES_PER_SYNC = 50  # Don't store more than 50 episodes per show


def _parse_duration(duration_str: str | None) -> int | None:
    """Parse itunes:duration string (HH:MM:SS or seconds) to total seconds."""
    if not duration_str:
        return None
    try:
        parts = duration_str.strip().split(":")
        if len(parts) == 1:
            return int(parts[0])
        if len(parts) == 2:
            return int(parts[0]) * 60 + int(parts[1])
        if len(parts) == 3:
            return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
    except (ValueError, AttributeError):
        pass
    return None


def _parse_pub_date(date_str: str | None) -> datetime | None:
    """Parse RFC 2822 date string to UTC datetime."""
    if not date_str:
        return None
    try:
        dt = parsedate_to_datetime(date_str.strip())
        return dt.astimezone(UTC).replace(tzinfo=UTC)
    except Exception:
        return None


def _parse_int(val: str | None) -> int | None:
    if not val:
        return None
    try:
        return int(re.sub(r"\D", "", val))
    except ValueError:
        return None


def _text(el: ET.Element | None) -> str | None:
    if el is None:
        return None
    return (el.text or "").strip() or None


async def fetch_and_parse_rss(
    rss_url: str,
    client: httpx.AsyncClient,
) -> list[dict] | None:
    """
    Fetch an RSS feed and return a list of episode dicts.
    Returns None on fetch/parse failure.
    """
    try:
        resp = await client.get(rss_url, timeout=_TIMEOUT, follow_redirects=True)
        resp.raise_for_status()
        content = resp.text
    except Exception as exc:
        logger.warning("podcast_rss_sync: fetch failed", url=rss_url, error=str(exc))
        return None

    try:
        root = ET.fromstring(content)
    except ET.ParseError as exc:
        logger.warning("podcast_rss_sync: XML parse failed", url=rss_url, error=str(exc))
        return None

    channel = root.find("channel")
    if channel is None:
        logger.warning("podcast_rss_sync: no <channel> in feed", url=rss_url)
        return None

    episodes: list[dict] = []
    for item in channel.findall("item"):
        guid_el = item.find("guid")
        guid = _text(guid_el) or _text(item.find("link")) or ""
        if not guid:
            continue

        title = _text(item.find("title")) or "Untitled Episode"
        link = _text(item.find("link"))
        description = _text(item.find("description")) or _text(
            item.find(f"{{{_NS['itunes']}}}summary")
        )
        pub_date = _parse_pub_date(_text(item.find("pubDate")))

        # Audio URL from <enclosure> or <media:content>
        audio_url: str | None = None
        enclosure = item.find("enclosure")
        if enclosure is not None:
            audio_url = enclosure.get("url")

        # Image from itunes:image or media:thumbnail
        image_url: str | None = None
        itunes_image = item.find(f"{{{_NS['itunes']}}}image")
        if itunes_image is not None:
            image_url = itunes_image.get("href")

        duration = _parse_duration(_text(item.find(f"{{{_NS['itunes']}}}duration")))
        ep_number = _parse_int(_text(item.find(f"{{{_NS['itunes']}}}episode")))
        season_number = _parse_int(_text(item.find(f"{{{_NS['itunes']}}}season")))

        episodes.append(
            {
                "guid": guid[:2000],
                "title": title[:1000],
                "description": description,
                "episode_url": (link or "")[:2000] or None,
                "audio_url": (audio_url or "")[:2000] or None,
                "image_url": (image_url or "")[:2000] or None,
                "duration_seconds": duration,
                "episode_number": ep_number,
                "season_number": season_number,
                "published_at": pub_date,
                "tags": [],
            }
        )

    return episodes[:_MAX_EPISODES_PER_SYNC]


async def sync_show(show: PodcastShow, db: AsyncSession) -> None:
    """Sync a single show's RSS feed — upsert episodes, update show stats."""
    if not show.rss_url:
        return

    async with httpx.AsyncClient(
        headers={"User-Agent": "CARSI-Hub-RSS-Sync/1.0 (+https://carsi.com.au)"},
    ) as client:
        episodes = await fetch_and_parse_rss(show.rss_url, client)

    if episodes is None:
        # Record error but don't crash
        show.rss_error = "Fetch/parse failed — see logs"
        show.rss_synced_at = datetime.now(UTC)
        await db.commit()
        return

    # Upsert episodes
    existing_guids_result = await db.execute(
        select(PodcastEpisode.guid).where(PodcastEpisode.show_id == show.id)
    )
    existing_guids = set(existing_guids_result.scalars().all())

    new_episodes = 0
    for ep_data in episodes:
        if ep_data["guid"] in existing_guids:
            continue
        ep = PodcastEpisode(show_id=show.id, **ep_data)
        db.add(ep)
        new_episodes += 1

    # Update show stats
    show.episode_count = len(episodes)
    if episodes:
        latest = episodes[0]  # RSS feeds are newest-first
        show.latest_episode_title = latest["title"]
        show.latest_episode_date = latest["published_at"]
        show.latest_episode_url = latest["episode_url"]

    show.rss_synced_at = datetime.now(UTC)
    show.rss_error = None

    await db.commit()
    logger.info(
        "podcast_rss_sync: synced show",
        show=show.name,
        new_episodes=new_episodes,
        total_episodes=len(episodes),
    )


async def sync_all_shows(db: AsyncSession) -> None:
    """
    Sync all published podcast shows that have an rss_url.
    Safe to call concurrently — each show is committed independently.
    """
    result = await db.execute(
        select(PodcastShow).where(
            PodcastShow.published.is_(True),
            PodcastShow.rss_url.isnot(None),
        )
    )
    shows = result.scalars().all()
    logger.info("podcast_rss_sync: starting sync", shows_count=len(shows))

    for show in shows:
        try:
            await sync_show(show, db)
        except Exception as exc:
            logger.error(
                "podcast_rss_sync: unexpected error syncing show",
                show=show.name,
                error=str(exc),
            )
