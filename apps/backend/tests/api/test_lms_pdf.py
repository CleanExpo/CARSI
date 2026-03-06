"""
Tests for LMS PDF Certificate Generation — GP-127

Covers:
- PDF endpoint returns application/pdf
- 404 for unknown credential
- Unit test for generate_certificate_pdf service
"""

from datetime import datetime, timezone
from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from src.api.main import app
from src.config.database import get_async_db
from src.db.lms_models import LMSCourse, LMSEnrollment, LMSUser
from src.services.pdf_certificate import generate_certificate_pdf

client = TestClient(app)

ENROLLMENT_ID = uuid4()
STUDENT_ID = uuid4()
COURSE_ID = uuid4()


def _make_mock_course() -> MagicMock:
    course = MagicMock(spec=LMSCourse)
    course.id = COURSE_ID
    course.title = "Water Restoration Technician (WRT)"
    course.iicrc_discipline = "WRT"
    course.cec_hours = Decimal("8.0")
    course.cppp40421_unit_code = None
    return course


def _make_mock_student() -> MagicMock:
    student = MagicMock(spec=LMSUser)
    student.id = STUDENT_ID
    student.full_name = "James Wilson"
    return student


def _make_mock_enrollment() -> MagicMock:
    enrollment = MagicMock(spec=LMSEnrollment)
    enrollment.id = ENROLLMENT_ID
    enrollment.student_id = STUDENT_ID
    enrollment.course_id = COURSE_ID
    enrollment.status = "completed"
    enrollment.completed_at = datetime(2026, 3, 4, 12, 0, 0, tzinfo=timezone.utc)
    enrollment.enrolled_at = datetime(2026, 2, 1, 8, 0, 0, tzinfo=timezone.utc)
    enrollment.course = _make_mock_course()
    enrollment.student = _make_mock_student()
    return enrollment


def _override_db(mock_db: AsyncMock):
    async def _dep():
        yield mock_db

    return _dep


@pytest.fixture(autouse=True)
def clear_overrides():
    yield
    app.dependency_overrides.clear()


class TestPDFEndpoint:
    def test_pdf_endpoint_returns_pdf(self):
        mock_db = AsyncMock()
        mock_enrollment = _make_mock_enrollment()
        result = MagicMock()
        result.scalar_one_or_none.return_value = mock_enrollment
        mock_db.execute = AsyncMock(return_value=result)

        app.dependency_overrides[get_async_db] = _override_db(mock_db)

        response = client.get(f"/api/lms/credentials/{ENROLLMENT_ID}/pdf")
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/pdf"
        assert response.content[:5] == b"%PDF-"

    def test_pdf_not_found(self):
        mock_db = AsyncMock()
        result = MagicMock()
        result.scalar_one_or_none.return_value = None
        mock_db.execute = AsyncMock(return_value=result)

        app.dependency_overrides[get_async_db] = _override_db(mock_db)

        unknown_id = uuid4()
        response = client.get(f"/api/lms/credentials/{unknown_id}/pdf")
        assert response.status_code == 404

    def test_pdf_invalid_uuid_returns_404(self):
        response = client.get("/api/lms/credentials/not-a-uuid/pdf")
        assert response.status_code == 404


class TestGenerateCertificatePDF:
    def test_returns_pdf_bytes(self):
        result = generate_certificate_pdf(
            student_name="James Wilson",
            course_title="Water Restoration Technician (WRT)",
            iicrc_discipline="WRT",
            cec_credits=8.0,
            completion_date=datetime(2026, 3, 4, 12, 0, 0, tzinfo=timezone.utc),
            credential_id="CARSI-WRT-2026-001",
        )
        assert isinstance(result, bytes)
        assert result[:5] == b"%PDF-"
        assert len(result) > 500  # sanity — a real PDF is non-trivial

    def test_handles_no_discipline_or_cec(self):
        result = generate_certificate_pdf(
            student_name="Test Student",
            course_title="General Course",
            iicrc_discipline=None,
            cec_credits=None,
            completion_date=datetime(2026, 1, 15, 9, 0, 0, tzinfo=timezone.utc),
            credential_id="CARSI-GEN-2026-001",
        )
        assert isinstance(result, bytes)
        assert result[:5] == b"%PDF-"
