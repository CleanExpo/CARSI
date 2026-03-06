"""Unite-Group Nexus event connector — fire-and-forget event push."""

import httpx

from src.config import get_settings
from src.utils import get_logger

logger = get_logger(__name__)


async def push_event(event_type: str, payload: dict) -> None:
    """Push an event to Unite-Hub Nexus. Fire-and-forget — never raises."""
    settings = get_settings()
    if not settings.unite_hub_api_key or settings.unite_hub_api_key == "placeholder_replace_with_real_key":
        logger.debug("Nexus connector: no API key configured, skipping event", event_type=event_type)
        return
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(
                settings.unite_hub_api_url,
                json={"event": event_type, "data": payload},
                headers={
                    "Authorization": f"Bearer {settings.unite_hub_api_key}",
                    "Content-Type": "application/json",
                },
            )
            resp.raise_for_status()
            logger.info("Nexus event pushed", event_type=event_type)
    except Exception as exc:
        # Retry once
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                await client.post(
                    settings.unite_hub_api_url,
                    json={"event": event_type, "data": payload},
                    headers={
                        "Authorization": f"Bearer {settings.unite_hub_api_key}",
                        "Content-Type": "application/json",
                    },
                )
                logger.info("Nexus event pushed on retry", event_type=event_type)
        except Exception:
            logger.warning("Nexus event push failed after retry", event_type=event_type, error=str(exc))
