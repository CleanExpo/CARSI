"""
Event publisher for the CARSI achievement engine.

Publishes JSON events to a Redis pub/sub channel so Celery workers
can consume them asynchronously.
"""

import enum
import json
from datetime import datetime, timezone


class EventType(str, enum.Enum):
    LESSON_COMPLETED = "lesson_completed"
    QUIZ_PASSED = "quiz_passed"
    COURSE_COMPLETED = "course_completed"


def fire_event(event_type: EventType, data: dict) -> None:
    """Publish an achievement event to the Redis channel ``carsi:events``."""
    import redis as redis_lib

    from src.config import get_settings

    settings = get_settings()
    r = redis_lib.from_url(settings.redis_url, decode_responses=True)

    payload = json.dumps(
        {
            "type": event_type.value,
            "data": data,
            "fired_at": datetime.now(timezone.utc).isoformat(),
        }
    )
    r.publish("carsi:events", payload)
