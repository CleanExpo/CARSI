"""Tests for the public AI chatbot endpoint — Phase C2."""

import uuid
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from src.api.main import app
from src.api.routes import lms_public_chat


@pytest.fixture(autouse=True)
def reset_rate_store():
    """Reset in-memory rate store before each test to prevent bleed-through."""
    lms_public_chat._rate_store.clear()
    yield
    lms_public_chat._rate_store.clear()


client = TestClient(app, raise_server_exceptions=True)


def _chat(message: str = "What courses do you offer?", conversation_id: str | None = None) -> dict:
    payload: dict = {"message": message}
    if conversation_id is not None:
        payload["conversation_id"] = conversation_id
    response = client.post("/api/lms/public/chat", json=payload)
    return response  # type: ignore[return-value]


class TestPublicChatFallback:
    """Test graceful degradation when ANTHROPIC_API_KEY is absent."""

    def test_chat_returns_fallback_when_no_api_key(self):
        with patch.dict("os.environ", {"ANTHROPIC_API_KEY": ""}, clear=False):
            # Reset singleton so it doesn't use a previously cached client
            lms_public_chat._anthropic = None
            resp = _chat("Tell me about WRT certification")
        assert resp.status_code == 200
        data = resp.json()
        assert "reply" in data
        assert "conversation_id" in data
        assert len(data["conversation_id"]) > 0
        # Fallback message should mention contact
        assert "admin@carsi.com.au" in data["reply"] or "contact" in data["reply"].lower()

    def test_chat_returns_provided_conversation_id_when_no_api_key(self):
        cid = str(uuid.uuid4())
        with patch.dict("os.environ", {"ANTHROPIC_API_KEY": ""}, clear=False):
            lms_public_chat._anthropic = None
            resp = _chat("What is the price?", conversation_id=cid)
        assert resp.status_code == 200
        assert resp.json()["conversation_id"] == cid


class TestPublicChatValidation:
    """Test input validation rules."""

    def test_chat_validates_empty_message(self):
        resp = client.post("/api/lms/public/chat", json={"message": ""})
        assert resp.status_code == 422

    def test_chat_validates_message_too_long(self):
        long_msg = "x" * 501
        resp = client.post("/api/lms/public/chat", json={"message": long_msg})
        assert resp.status_code == 422

    def test_chat_accepts_max_length_message(self):
        """500 characters should be accepted (with no API key → fallback)."""
        max_msg = "a" * 500
        with patch.dict("os.environ", {"ANTHROPIC_API_KEY": ""}, clear=False):
            lms_public_chat._anthropic = None
            resp = client.post("/api/lms/public/chat", json={"message": max_msg})
        assert resp.status_code == 200

    def test_chat_rejects_missing_message_field(self):
        resp = client.post("/api/lms/public/chat", json={})
        assert resp.status_code == 422


class TestPublicChatRateLimit:
    """Test in-memory rate limiting."""

    def test_rate_limit_blocks_after_threshold(self):
        """11th request from the same IP within the window should return 429."""
        limit = lms_public_chat._RATE_LIMIT  # 10

        with patch.dict("os.environ", {"ANTHROPIC_API_KEY": ""}, clear=False):
            lms_public_chat._anthropic = None
            # Send exactly _RATE_LIMIT messages — all should succeed
            for i in range(limit):
                resp = client.post(
                    "/api/lms/public/chat",
                    json={"message": f"Question {i}"},
                )
                assert resp.status_code == 200, f"Request {i} should succeed, got {resp.status_code}"

            # 11th request — should be rate-limited
            resp = client.post(
                "/api/lms/public/chat",
                json={"message": "One more question"},
            )
        assert resp.status_code == 429
        assert "rate limit" in resp.json()["detail"].lower()

    def test_rate_limit_allows_exactly_limit_requests(self):
        """Exactly _RATE_LIMIT requests should all succeed."""
        limit = lms_public_chat._RATE_LIMIT

        with patch.dict("os.environ", {"ANTHROPIC_API_KEY": ""}, clear=False):
            lms_public_chat._anthropic = None
            responses = [
                client.post("/api/lms/public/chat", json={"message": f"Q{i}"})
                for i in range(limit)
            ]
        statuses = [r.status_code for r in responses]
        assert all(s == 200 for s in statuses), f"All {limit} should be 200, got: {statuses}"


class TestPublicChatAnthropicIntegration:
    """Test Anthropic client interaction (mocked)."""

    def test_chat_calls_anthropic_when_key_present(self):
        fake_text = "CARSI offers water damage restoration courses."
        mock_content = MagicMock()
        mock_content.text = fake_text
        mock_response = MagicMock()
        mock_response.content = [mock_content]

        with patch.dict("os.environ", {"ANTHROPIC_API_KEY": "sk-ant-fake"}, clear=False):
            lms_public_chat._anthropic = None
            with patch("src.api.routes.lms_public_chat.Anthropic") as MockAnthropic:
                instance = MockAnthropic.return_value
                instance.messages.create.return_value = mock_response

                resp = client.post(
                    "/api/lms/public/chat",
                    json={"message": "What courses do you offer?"},
                )

        assert resp.status_code == 200
        assert resp.json()["reply"] == fake_text

    def test_chat_returns_fallback_on_anthropic_exception(self):
        with patch.dict("os.environ", {"ANTHROPIC_API_KEY": "sk-ant-fake"}, clear=False):
            lms_public_chat._anthropic = None
            with patch("src.api.routes.lms_public_chat.Anthropic") as MockAnthropic:
                instance = MockAnthropic.return_value
                instance.messages.create.side_effect = Exception("API error")

                resp = client.post(
                    "/api/lms/public/chat",
                    json={"message": "Hello"},
                )

        assert resp.status_code == 200
        data = resp.json()
        assert "admin@carsi.com.au" in data["reply"] or "trouble" in data["reply"].lower()
