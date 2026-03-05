"""Smoke test configuration — supports --base-url for targeting live servers."""

import pytest


def pytest_addoption(parser: pytest.Parser) -> None:
    parser.addoption(
        "--base-url",
        action="store",
        default="http://localhost:8000",
        help="Base URL of the backend to smoke-test (e.g. https://carsi-backend.fly.dev)",
    )


@pytest.fixture
def base_url(request: pytest.FixtureRequest) -> str:
    return request.config.getoption("--base-url").rstrip("/")
