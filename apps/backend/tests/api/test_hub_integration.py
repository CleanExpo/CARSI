"""
Tests for LMS ↔ Hub Integration API — Phase D5

Covers:
- Known discipline (WRT) → job keywords and pathway name returned
- Unknown discipline slug → empty keyword list, null pathway
- Public access: no auth header required (GET endpoint is public)
"""

from fastapi.testclient import TestClient

from src.api.main import app

client = TestClient(app)


def test_course_context_returns_keywords_for_wrt() -> None:
    """WRT slug returns non-empty job keywords and a pathway name."""
    response = client.get("/api/lms/hub/course-context/wrt-fundamentals")
    assert response.status_code == 200
    data = response.json()
    assert data["discipline"] == "WRT"
    assert len(data["job_keywords"]) > 0
    assert data["pathway_name"] is not None
    assert "WRT" in data["related_disciplines"]


def test_course_context_returns_empty_for_unknown_discipline() -> None:
    """An unrecognised slug returns empty keywords and null pathway."""
    response = client.get("/api/lms/hub/course-context/unknown-course-xyz")
    assert response.status_code == 200
    data = response.json()
    assert data["discipline"] == ""
    assert data["job_keywords"] == []
    assert data["pathway_name"] is None


def test_course_context_is_public() -> None:
    """GET course context succeeds without any auth header."""
    # No X-User-Id, no Authorization — should still return 200
    response = client.get(
        "/api/lms/hub/course-context/asd-applied-structural-drying",
        # Explicitly omit all auth headers
    )
    assert response.status_code == 200
    data = response.json()
    # ASD is a known discipline
    assert data["discipline"] == "ASD"
    assert len(data["job_keywords"]) > 0
