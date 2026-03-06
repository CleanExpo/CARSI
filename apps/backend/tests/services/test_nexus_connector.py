"""Tests for the Unite-Hub Nexus event connector."""

from unittest.mock import AsyncMock, MagicMock, patch

import httpx
import pytest

from src.services.nexus_connector import push_event


@pytest.fixture()
def mock_settings_no_key():
    """Settings with placeholder API key — connector should skip."""
    settings = MagicMock()
    settings.unite_hub_api_key = "placeholder_replace_with_real_key"
    settings.unite_hub_api_url = "https://api.unite-hub.com/v1/events"
    return settings


@pytest.fixture()
def mock_settings_with_key():
    """Settings with a real API key — connector should send."""
    settings = MagicMock()
    settings.unite_hub_api_key = "real-api-key-abc123"
    settings.unite_hub_api_url = "https://api.unite-hub.com/v1/events"
    return settings


@pytest.mark.asyncio
async def test_push_event_skips_when_no_key(mock_settings_no_key):
    """When the API key is the placeholder value, no HTTP call should be made."""
    with (
        patch("src.services.nexus_connector.get_settings", return_value=mock_settings_no_key),
        patch("src.services.nexus_connector.httpx.AsyncClient") as mock_client_cls,
    ):
        await push_event("student.enrolled", {"student_id": "123"})
        mock_client_cls.assert_not_called()


@pytest.mark.asyncio
async def test_push_event_skips_when_empty_key():
    """When the API key is empty, no HTTP call should be made."""
    settings = MagicMock()
    settings.unite_hub_api_key = ""
    settings.unite_hub_api_url = "https://api.unite-hub.com/v1/events"
    with (
        patch("src.services.nexus_connector.get_settings", return_value=settings),
        patch("src.services.nexus_connector.httpx.AsyncClient") as mock_client_cls,
    ):
        await push_event("student.enrolled", {"student_id": "123"})
        mock_client_cls.assert_not_called()


@pytest.mark.asyncio
async def test_push_event_sends_request(mock_settings_with_key):
    """With a valid API key, verify the correct payload is sent."""
    mock_response = MagicMock()
    mock_response.raise_for_status = MagicMock()

    mock_client = AsyncMock()
    mock_client.post = AsyncMock(return_value=mock_response)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    with (
        patch("src.services.nexus_connector.get_settings", return_value=mock_settings_with_key),
        patch("src.services.nexus_connector.httpx.AsyncClient", return_value=mock_client),
    ):
        await push_event("course.completed", {"student_id": "456", "course_id": "789"})

        mock_client.post.assert_called_once_with(
            "https://api.unite-hub.com/v1/events",
            json={"event": "course.completed", "data": {"student_id": "456", "course_id": "789"}},
            headers={
                "Authorization": "Bearer real-api-key-abc123",
                "Content-Type": "application/json",
            },
        )


@pytest.mark.asyncio
async def test_push_event_retries_on_failure(mock_settings_with_key):
    """First call fails, second call succeeds — event is pushed on retry."""
    mock_fail_response = MagicMock()
    mock_fail_response.raise_for_status = MagicMock(
        side_effect=httpx.HTTPStatusError("500", request=MagicMock(), response=MagicMock())
    )

    mock_success_response = MagicMock()
    mock_success_response.raise_for_status = MagicMock()

    # First client raises on raise_for_status, second succeeds
    call_count = 0

    class FakeClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            pass

        async def post(self, *args, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                return mock_fail_response
            return mock_success_response

    with (
        patch("src.services.nexus_connector.get_settings", return_value=mock_settings_with_key),
        patch("src.services.nexus_connector.httpx.AsyncClient", return_value=FakeClient()),
    ):
        await push_event("certification.awarded", {"credential_id": "abc"})

        assert call_count == 2


@pytest.mark.asyncio
async def test_push_event_never_raises(mock_settings_with_key):
    """Even if both attempts fail, no exception is propagated."""

    class FailingClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            pass

        async def post(self, *args, **kwargs):
            raise httpx.ConnectError("Connection refused")

    with (
        patch("src.services.nexus_connector.get_settings", return_value=mock_settings_with_key),
        patch("src.services.nexus_connector.httpx.AsyncClient", return_value=FailingClient()),
    ):
        # Should not raise
        await push_event("student.enrolled", {"student_id": "123"})
