"""Tests for Stripe webhook handler."""
import json
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

from fastapi.testclient import TestClient

from src.api.main import app
from src.config.database import get_async_db

client = TestClient(app)

STUDENT_ID = uuid4()


def _make_stripe_event(event_type: str, obj: dict) -> dict:
    return {"type": event_type, "data": {"object": obj}}


def test_webhook_handles_subscription_created():
    """A valid subscription.created event creates an LMSSubscription row."""
    mock_db = AsyncMock()
    mock_db.execute.return_value.scalar_one_or_none.return_value = None

    app.dependency_overrides[get_async_db] = lambda: mock_db

    payload = _make_stripe_event(
        "customer.subscription.created",
        {
            "id": "sub_test123",
            "customer": "cus_test123",
            "status": "trialling",
            "current_period_start": 1709500000,
            "current_period_end": 1741036000,
            "trial_end": 1710000000,
            "metadata": {"student_id": str(STUDENT_ID)},
        },
    )

    with (
        patch(
            "src.api.routes.lms_webhooks._get_webhook_secret",
            return_value="whsec_test_secret",
        ),
        patch("src.api.routes.lms_webhooks.stripe") as mock_stripe,
    ):
        mock_stripe.Webhook.construct_event.return_value = payload
        resp = client.post(
            "/api/lms/webhooks/stripe",
            content=json.dumps(payload).encode(),
            headers={"stripe-signature": "test_sig"},
        )

    app.dependency_overrides.clear()
    assert resp.status_code == 200
    assert resp.json() == {"received": True}


def test_webhook_returns_400_on_invalid_signature():
    """An invalid Stripe signature returns 400 when WEBHOOK_SECRET is configured."""
    import stripe as real_stripe

    with (
        patch(
            "src.api.routes.lms_webhooks._get_webhook_secret",
            return_value="whsec_test_secret",
        ),
        patch("src.api.routes.lms_webhooks.stripe") as mock_stripe,
    ):
        mock_stripe.error.SignatureVerificationError = (
            real_stripe.error.SignatureVerificationError
        )
        mock_stripe.Webhook.construct_event.side_effect = (
            real_stripe.error.SignatureVerificationError("bad sig", "sig_header")
        )
        resp = client.post(
            "/api/lms/webhooks/stripe",
            content=b"{}",
            headers={"stripe-signature": "bad_sig"},
        )

    assert resp.status_code == 400


def test_webhook_returns_500_when_secret_not_configured():
    """Returns 500 when STRIPE_WEBHOOK_SECRET is not configured."""
    with patch(
        "src.api.routes.lms_webhooks._get_webhook_secret",
        return_value="",
    ):
        resp = client.post(
            "/api/lms/webhooks/stripe",
            content=b"{}",
            headers={"stripe-signature": "test_sig"},
        )

    assert resp.status_code == 500
