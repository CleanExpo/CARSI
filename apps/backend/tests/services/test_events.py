"""
Tests for the CARSI event publisher — Phase 8 (GP-104)
"""

import json
from unittest.mock import MagicMock, patch

from src.services.events import EventType, fire_event


class TestFireEvent:
    def test_publishes_to_correct_channel(self):
        mock_r = MagicMock()

        with patch("redis.from_url", return_value=mock_r):
            fire_event(EventType.LESSON_COMPLETED, {"student_id": "abc", "lesson_id": "def"})

        mock_r.publish.assert_called_once()
        channel, raw = mock_r.publish.call_args[0]
        assert channel == "carsi:events"

    def test_payload_contains_event_type(self):
        mock_r = MagicMock()

        with patch("redis.from_url", return_value=mock_r):
            fire_event(EventType.QUIZ_PASSED, {"student_id": "abc"})

        _, raw = mock_r.publish.call_args[0]
        payload = json.loads(raw)
        assert payload["type"] == "quiz_passed"

    def test_payload_contains_data(self):
        mock_r = MagicMock()

        with patch("redis.from_url", return_value=mock_r):
            fire_event(EventType.COURSE_COMPLETED, {"student_id": "stu-1", "course_id": "crs-1"})

        _, raw = mock_r.publish.call_args[0]
        payload = json.loads(raw)
        assert payload["data"]["student_id"] == "stu-1"
        assert payload["data"]["course_id"] == "crs-1"

    def test_payload_contains_fired_at_timestamp(self):
        mock_r = MagicMock()

        with patch("redis.from_url", return_value=mock_r):
            fire_event(EventType.LESSON_COMPLETED, {})

        _, raw = mock_r.publish.call_args[0]
        payload = json.loads(raw)
        assert "fired_at" in payload
        assert "T" in payload["fired_at"]  # ISO format check

    def test_event_type_enum_values(self):
        assert EventType.LESSON_COMPLETED == "lesson_completed"
        assert EventType.QUIZ_PASSED == "quiz_passed"
        assert EventType.COURSE_COMPLETED == "course_completed"
