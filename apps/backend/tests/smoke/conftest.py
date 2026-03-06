"""Smoke test configuration — supports --base-url for targeting live servers."""

import httpx
import pytest


def pytest_addoption(parser: pytest.Parser) -> None:
    parser.addoption(
        "--base-url",
        action="store",
        default="http://localhost:8000",
        help="Base URL of the backend to smoke-test (e.g. https://carsi-backend.fly.dev)",
    )


@pytest.fixture(scope="session")
def base_url(request: pytest.FixtureRequest) -> str:
    url = request.config.getoption("--base-url").rstrip("/")
    # Skip all smoke tests when the target server is not reachable
    try:
        httpx.get(f"{url}/health", timeout=3)
    except (httpx.ConnectError, httpx.TimeoutException):
        pytest.skip(
            f"Smoke test target {url} is not reachable — "
            "start the backend or pass --base-url to a running instance",
            allow_module_level=True,
        )
    return url
