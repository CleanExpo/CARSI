"""Rate limiting middleware with tiered per-route limits."""

import time
from collections import defaultdict
from collections.abc import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from src.config import get_settings
from src.utils import get_logger

settings = get_settings()
logger = get_logger(__name__)

# Auth endpoints are brute-force targets — tighter limits
_AUTH_PATHS = {
    "/api/lms/auth/login",
    "/api/lms/auth/register",
    "/api/lms/auth/reset-password",
    "/api/lms/auth/forgot-password",
}

_DEFAULT_RPM = 60
_AUTH_RPM = 5  # 5 attempts per minute per IP for auth endpoints


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Tiered in-memory rate limiting middleware.

    Auth endpoints: 5 req/min per client (brute-force protection).
    All other endpoints: 60 req/min per client.
    """

    def __init__(self, app: Callable, requests_per_minute: int = _DEFAULT_RPM) -> None:
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        # Separate buckets: auth vs general
        self._auth_requests: dict[str, list[float]] = defaultdict(list)
        self._requests: dict[str, list[float]] = defaultdict(list)

    def _get_client_id(self, request: Request) -> str:
        """Get a unique identifier for the client."""
        user_id = request.headers.get("X-User-Id")
        if user_id:
            return f"user:{user_id}"

        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return f"ip:{forwarded_for.split(',')[0].strip()}"

        client_host = request.client.host if request.client else "unknown"
        return f"ip:{client_host}"

    def _is_rate_limited(
        self,
        bucket: dict[str, list[float]],
        client_id: str,
        limit: int,
    ) -> bool:
        """Check if the client has exceeded the given limit in the last 60 s."""
        now = time.time()
        minute_ago = now - 60

        bucket[client_id] = [t for t in bucket[client_id] if t > minute_ago]

        if len(bucket[client_id]) >= limit:
            return True

        bucket[client_id].append(now)
        return False

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Response],
    ) -> Response:
        """Process the request and apply tiered rate limiting."""
        if request.url.path in {"/health", "/ready"}:
            return await call_next(request)

        client_id = self._get_client_id(request)
        is_auth = request.url.path in _AUTH_PATHS

        if is_auth:
            limited = self._is_rate_limited(self._auth_requests, client_id, _AUTH_RPM)
        else:
            limited = self._is_rate_limited(self._requests, client_id, self.requests_per_minute)

        if limited:
            logger.warning(
                "Rate limit exceeded",
                client_id=client_id,
                path=request.url.path,
                auth_route=is_auth,
            )
            return Response(
                content='{"error": "Rate limit exceeded. Please try again later.", "error_code": "RATE_LIMITED"}',
                status_code=429,
                media_type="application/json",
                headers={"Retry-After": "60"},
            )

        return await call_next(request)
