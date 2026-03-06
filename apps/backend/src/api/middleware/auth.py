"""Authentication middleware for JWT validation."""

import hmac
import re
from collections.abc import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from src.auth.jwt import decode_access_token
from src.config import get_settings
from src.utils import get_logger

settings = get_settings()
logger = get_logger(__name__)

_UUID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
    re.IGNORECASE,
)


class AuthMiddleware(BaseHTTPMiddleware):
    """Middleware for JWT authentication."""

    # Paths that don't require authentication (exact match, any method)
    PUBLIC_PATHS = {"/", "/health", "/ready", "/docs", "/openapi.json"}

    # Path prefixes that don't require auth regardless of method (e.g. auth flows)
    PUBLIC_PREFIXES = ("/api/lms/auth/", "/api/lms/credentials/", "/api/lms/webhooks/")

    # Path prefixes that are public for GET requests only (e.g. course catalog, pathways)
    PUBLIC_GET_PREFIXES = ("/api/lms/courses", "/api/lms/pathways", "/api/lms/gamification/leaderboard", "/api/lms/ideas", "/api/lms/rpl/units")

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Response],
    ) -> Response:
        """Process the request and validate authentication."""
        path = request.url.path

        # Always pass CORS preflight through to CORSMiddleware
        if request.method == "OPTIONS":
            return await call_next(request)

        # Skip auth for exact public paths
        if path in self.PUBLIC_PATHS:
            return await call_next(request)

        # Skip auth for public path prefixes (any method — e.g. register/login)
        if any(path.startswith(p) for p in self.PUBLIC_PREFIXES):
            return await call_next(request)

        # Skip auth for GET-only public path prefixes (e.g. course catalog)
        if request.method == "GET" and any(path.startswith(p) for p in self.PUBLIC_GET_PREFIXES):
            return await call_next(request)

        # --- authenticated paths below ---

        # Check for API key authentication (timing-safe comparison)
        api_key = request.headers.get("Authorization", "").replace("Bearer ", "")

        if (
            settings.backend_api_key
            and api_key
            and hmac.compare_digest(api_key, settings.backend_api_key)
        ):
            request.state.auth_type = "api_key"
            return await call_next(request)

        # Check for JWT in Authorization header
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
            payload = decode_access_token(token)
            if payload and payload.get("sub"):
                request.state.user_email = payload["sub"]
                request.state.auth_type = "jwt"
                return await call_next(request)

        # Check for JWT in httpOnly auth_token cookie
        cookie_token = request.cookies.get("auth_token")
        if cookie_token:
            payload = decode_access_token(cookie_token)
            if payload and payload.get("sub"):
                request.state.user_email = payload["sub"]
                request.state.auth_type = "jwt_cookie"
                return await call_next(request)

        # Check for user ID header (set by frontend after auth)
        user_id = request.headers.get("X-User-Id")
        if user_id:
            # Validate UUID format to prevent header spoofing with arbitrary values
            if not _UUID_RE.match(user_id):
                return Response(
                    content='{"error": "Invalid X-User-Id format"}',
                    status_code=400,
                    media_type="application/json",
                )
            request.state.user_id = user_id
            request.state.auth_type = "user"
            return await call_next(request)

        # Reject unauthenticated requests in all environments
        return Response(
            content='{"error": "Unauthorized"}',
            status_code=401,
            media_type="application/json",
        )
