"""Tests for LMS Subscription Routes."""
from unittest.mock import AsyncMock, MagicMock, patch
from uuid import uuid4

from fastapi.testclient import TestClient

from src.api.main import app
from src.api.deps_lms import get_current_lms_user
from src.config.database import get_async_db
from src.db.lms_models import LMSSubscription, LMSUser

client = TestClient(app)
STUDENT_ID = uuid4()
HEADERS = {"X-User-Id": str(STUDENT_ID)}


def _make_mock_student():
    user = MagicMock(spec=LMSUser)
    user.id = STUDENT_ID
    user.email = "student@carsi.com.au"
    user.full_name = "James Wilson"
    user.roles = ["student"]
    return user


def _make_mock_db(scalar_result=None):
    """Create a mock async db session matching project pattern."""
    mock_db = AsyncMock()
    result = MagicMock()
    result.scalar_one_or_none.return_value = scalar_result
    mock_db.execute = AsyncMock(return_value=result)
    return mock_db


def test_checkout_returns_stripe_url():
    mock_db = _make_mock_db(scalar_result=None)

    app.dependency_overrides[get_current_lms_user] = lambda: _make_mock_student()
    app.dependency_overrides[get_async_db] = lambda: mock_db

    with patch("src.api.routes.lms_subscription.stripe") as mock_stripe:
        mock_stripe.checkout.Session.create.return_value = MagicMock(
            url="https://checkout.stripe.com/test"
        )
        resp = client.post(
            "/api/lms/subscription/checkout",
            json={
                "success_url": "http://localhost:3009/subscribe/success",
                "cancel_url": "http://localhost:3009/subscribe",
            },
            headers=HEADERS,
        )

    app.dependency_overrides.clear()
    assert resp.status_code == 200
    assert resp.json()["url"].startswith("https://checkout.stripe.com")


def test_checkout_returns_409_when_already_subscribed():
    mock_sub = MagicMock(spec=LMSSubscription)
    mock_sub.status = "active"
    mock_db = _make_mock_db(scalar_result=mock_sub)

    app.dependency_overrides[get_current_lms_user] = lambda: _make_mock_student()
    app.dependency_overrides[get_async_db] = lambda: mock_db

    with patch("src.api.routes.lms_subscription.stripe"):
        resp = client.post(
            "/api/lms/subscription/checkout",
            json={"success_url": "http://x", "cancel_url": "http://x"},
            headers=HEADERS,
        )

    app.dependency_overrides.clear()
    assert resp.status_code == 409


def test_status_returns_no_subscription():
    mock_db = _make_mock_db(scalar_result=None)

    app.dependency_overrides[get_current_lms_user] = lambda: _make_mock_student()
    app.dependency_overrides[get_async_db] = lambda: mock_db

    resp = client.get("/api/lms/subscription/status", headers=HEADERS)
    app.dependency_overrides.clear()

    assert resp.status_code == 200
    assert resp.json()["has_subscription"] is False


def test_status_returns_active_subscription():
    mock_sub = MagicMock(spec=LMSSubscription)
    mock_sub.status = "active"
    mock_sub.plan = "yearly"
    mock_sub.current_period_end = None
    mock_sub.trial_end = None
    mock_db = _make_mock_db(scalar_result=mock_sub)

    app.dependency_overrides[get_current_lms_user] = lambda: _make_mock_student()
    app.dependency_overrides[get_async_db] = lambda: mock_db

    resp = client.get("/api/lms/subscription/status", headers=HEADERS)
    app.dependency_overrides.clear()

    assert resp.status_code == 200
    assert resp.json()["has_subscription"] is True
    assert resp.json()["status"] == "active"
