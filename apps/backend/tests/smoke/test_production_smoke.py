"""
Production smoke tests — GP-227

Run against a live or local backend to verify all critical endpoints respond.

Usage:
    pytest tests/smoke/ -v --base-url=https://carsi-backend.fly.dev
    pytest tests/smoke/ -v --base-url=http://localhost:8000
"""

import httpx
import pytest


# ---------------------------------------------------------------------------
# 1. GET /health -> 200, {"status": "healthy"}
# ---------------------------------------------------------------------------


class TestHealth:
    def test_health_returns_200(self, base_url: str) -> None:
        r = httpx.get(f"{base_url}/health", timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data

    def test_health_has_version(self, base_url: str) -> None:
        r = httpx.get(f"{base_url}/health", timeout=10)
        data = r.json()
        assert "version" in data


# ---------------------------------------------------------------------------
# 2. GET /ready -> 200, {"database": true}
# ---------------------------------------------------------------------------


class TestReadiness:
    def test_ready_returns_200(self, base_url: str) -> None:
        r = httpx.get(f"{base_url}/ready", timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert "database" in data

    def test_ready_database_connected(self, base_url: str) -> None:
        r = httpx.get(f"{base_url}/ready", timeout=10)
        data = r.json()
        assert data["database"] is True, "Database should be connected"


# ---------------------------------------------------------------------------
# 3. GET /docs -> 200 (Swagger UI)
# ---------------------------------------------------------------------------


class TestDocs:
    def test_docs_returns_200(self, base_url: str) -> None:
        r = httpx.get(f"{base_url}/docs", timeout=10, follow_redirects=True)
        assert r.status_code == 200
        assert "text/html" in r.headers.get("content-type", "")


# ---------------------------------------------------------------------------
# 4. POST /api/lms/auth/login with invalid creds -> 401
# ---------------------------------------------------------------------------


class TestAuthLogin:
    def test_invalid_login_returns_401(self, base_url: str) -> None:
        r = httpx.post(
            f"{base_url}/api/lms/auth/login",
            json={"email": "nobody@fake.com", "password": "wrongpassword"},
            timeout=10,
        )
        assert r.status_code == 401

    def test_login_missing_fields_returns_422(self, base_url: str) -> None:
        r = httpx.post(
            f"{base_url}/api/lms/auth/login",
            json={"email": "only-email@test.com"},
            timeout=10,
        )
        assert r.status_code == 422


# ---------------------------------------------------------------------------
# 5. GET /api/lms/courses without auth -> 200 (public catalogue)
# ---------------------------------------------------------------------------


class TestPublicCourses:
    def test_courses_public_returns_200(self, base_url: str) -> None:
        r = httpx.get(f"{base_url}/api/lms/courses", timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert "items" in data or isinstance(data, list)

    def test_courses_public_has_items(self, base_url: str) -> None:
        r = httpx.get(f"{base_url}/api/lms/courses", timeout=10)
        data = r.json()
        if "items" in data:
            assert isinstance(data["items"], list)


# ---------------------------------------------------------------------------
# 6. GET /api/lms/courses with valid JWT -> 200, list returned
# ---------------------------------------------------------------------------


class TestAuthenticatedCourses:
    """Requires seed data: admin@carsi.com.au / admin123 in the database."""

    def _login(self, base_url: str) -> str | None:
        """Attempt login and return JWT token, or None if seed data missing."""
        r = httpx.post(
            f"{base_url}/api/lms/auth/login",
            json={"email": "admin@carsi.com.au", "password": "admin123"},
            timeout=10,
        )
        if r.status_code != 200:
            return None
        return r.json().get("access_token")

    def test_courses_with_jwt_returns_200(self, base_url: str) -> None:
        token = self._login(base_url)
        if token is None:
            pytest.skip("Seed user admin@carsi.com.au not available — skipping authenticated test")

        r = httpx.get(
            f"{base_url}/api/lms/courses",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10,
        )
        assert r.status_code == 200
        data = r.json()
        assert "items" in data or isinstance(data, list)


# ---------------------------------------------------------------------------
# 7. GET /api/lms/pathways -> 200 (public)
# ---------------------------------------------------------------------------


class TestPathways:
    def test_pathways_returns_200(self, base_url: str) -> None:
        r = httpx.get(f"{base_url}/api/lms/pathways", timeout=10)
        assert r.status_code == 200


# ---------------------------------------------------------------------------
# 8. GET /api/lms/gamification/leaderboard -> 200 (public)
# ---------------------------------------------------------------------------


class TestLeaderboard:
    def test_leaderboard_returns_200(self, base_url: str) -> None:
        r = httpx.get(f"{base_url}/api/lms/gamification/leaderboard", timeout=10)
        assert r.status_code == 200


# ---------------------------------------------------------------------------
# 9. Unauthenticated access to protected endpoints -> 401
# ---------------------------------------------------------------------------


class TestProtectedEndpoints:
    @pytest.mark.parametrize(
        "endpoint",
        [
            "/api/lms/enrollments/me",
            "/api/lms/gamification/me/level",
            "/api/lms/subscription/status",
            "/api/lms/admin/metrics",
        ],
    )
    def test_protected_returns_401_without_auth(self, base_url: str, endpoint: str) -> None:
        r = httpx.get(f"{base_url}{endpoint}", timeout=10)
        assert r.status_code == 401, f"{endpoint} should require authentication"
