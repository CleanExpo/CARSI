"""
Tests for Celery achievement tasks — Phase 8 (GP-104)

Uses synchronous mocks — no real Redis or Celery required.
"""

from datetime import datetime
from decimal import Decimal
from unittest.mock import MagicMock, patch
from uuid import uuid4

import pytest


STUDENT_ID = uuid4()
COURSE_ID = uuid4()
LESSON_ID = uuid4()
ENROLLMENT_ID = uuid4()


def _mock_course(has_cec: bool = True) -> MagicMock:
    course = MagicMock()
    course.id = COURSE_ID
    course.title = "WRT Fundamentals"
    course.iicrc_discipline = "WRT"
    course.cec_hours = Decimal("14.0") if has_cec else None
    return course


def _mock_enrollment(status: str = "active") -> MagicMock:
    e = MagicMock()
    e.id = ENROLLMENT_ID
    e.student_id = STUDENT_ID
    e.course_id = COURSE_ID
    e.status = status
    return e


class TestHandleLessonCompleted:
    def test_returns_no_enrollment_when_not_enrolled(self):
        from src.worker.tasks import handle_lesson_completed

        mock_session = MagicMock()
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = None
        mock_session.execute.return_value = mock_result
        mock_session.__enter__ = MagicMock(return_value=mock_session)
        mock_session.__exit__ = MagicMock(return_value=False)

        with patch("src.worker.tasks.SyncSessionLocal", return_value=mock_session):
            result = handle_lesson_completed(
                {
                    "student_id": str(STUDENT_ID),
                    "lesson_id": str(LESSON_ID),
                    "course_id": str(COURSE_ID),
                    "time_spent_seconds": 300,
                }
            )

        assert result["status"] == "no_enrollment"

    def test_creates_progress_record_for_new_lesson(self):
        from src.worker.tasks import handle_lesson_completed

        mock_enrollment = _mock_enrollment()
        mock_session = MagicMock()

        # execute calls: 1=enrollment, 2=existing progress, 3+= completion check
        mock_session.execute.side_effect = [
            MagicMock(**{"scalar_one_or_none.return_value": mock_enrollment}),  # enrollment
            MagicMock(**{"scalar_one_or_none.return_value": None}),             # no existing progress
            MagicMock(**{"scalar.return_value": 1}),                            # total lessons
            MagicMock(**{"scalar.return_value": 0}),                            # completed (< total)
        ]
        mock_session.__enter__ = MagicMock(return_value=mock_session)
        mock_session.__exit__ = MagicMock(return_value=False)

        with (
            patch("src.worker.tasks.SyncSessionLocal", return_value=mock_session),
            patch("src.worker.tasks.award_xp"),  # prevent Redis connection attempt
        ):
            result = handle_lesson_completed(
                {
                    "student_id": str(STUDENT_ID),
                    "lesson_id": str(LESSON_ID),
                    "course_id": str(COURSE_ID),
                    "time_spent_seconds": 420,
                }
            )

        assert result["status"] == "ok"
        mock_session.add.assert_called_once()  # new LMSProgress was added


class TestHandleCourseCompleted:
    def test_returns_course_not_found_when_missing(self):
        from src.worker.tasks import handle_course_completed

        mock_session = MagicMock()
        mock_session.execute.return_value = MagicMock(
            **{"scalar_one_or_none.return_value": None}
        )
        mock_session.__enter__ = MagicMock(return_value=mock_session)
        mock_session.__exit__ = MagicMock(return_value=False)

        with patch("src.worker.tasks.SyncSessionLocal", return_value=mock_session):
            result = handle_course_completed(
                {"student_id": str(STUDENT_ID), "course_id": str(COURSE_ID)}
            )

        assert result["status"] == "course_not_found"

    def test_creates_cert_even_when_course_has_no_cec(self):
        """Courses without CEC hours still generate a certificate (no early exit)."""
        from src.worker.tasks import handle_course_completed

        mock_session = MagicMock()
        course_no_cec = _mock_course(has_cec=False)
        mock_enrollment = _mock_enrollment()
        mock_cert = MagicMock()
        mock_cert.credential_id = "CARSI-GEN-2026-001"

        mock_session.execute.side_effect = [
            MagicMock(**{"scalar_one_or_none.return_value": None}),             # no existing cert
            MagicMock(**{"scalar_one_or_none.return_value": course_no_cec}),   # course lookup
            MagicMock(**{"scalar_one_or_none.return_value": mock_enrollment}), # enrollment lookup
        ]
        mock_session.__enter__ = MagicMock(return_value=mock_session)
        mock_session.__exit__ = MagicMock(return_value=False)

        with (
            patch("src.worker.tasks.SyncSessionLocal", return_value=mock_session),
            patch("src.worker.tasks.create_certificate", return_value=mock_cert),
            patch("src.worker.tasks.award_xp"),
            patch("src.worker.tasks.send_certificate_email"),
            patch("src.worker.tasks.send_iicrc_cec_report"),
        ):
            result = handle_course_completed(
                {"student_id": str(STUDENT_ID), "course_id": str(COURSE_ID)}
            )

        assert result["status"] == "ok"
        assert result["credential_id"] == "CARSI-GEN-2026-001"

    def test_awards_cec_and_creates_certificate(self):
        from src.worker.tasks import handle_course_completed

        mock_course = _mock_course()
        mock_enrollment = _mock_enrollment()
        mock_cert = MagicMock()
        mock_cert.credential_id = "CARSI-WRT-2026-001"
        mock_user = MagicMock()
        mock_user.iicrc_member_number = None  # no IICRC number → skip CEC report

        mock_session = MagicMock()
        mock_session.execute.side_effect = [
            MagicMock(**{"scalar_one_or_none.return_value": None}),             # no existing cert (idempotency)
            MagicMock(**{"scalar_one_or_none.return_value": mock_course}),     # course lookup
            MagicMock(**{"scalar_one_or_none.return_value": mock_enrollment}), # enrollment lookup
            MagicMock(**{"scalar_one_or_none.return_value": mock_user}),       # user lookup for CEC report
        ]
        mock_session.__enter__ = MagicMock(return_value=mock_session)
        mock_session.__exit__ = MagicMock(return_value=False)

        with (
            patch("src.worker.tasks.SyncSessionLocal", return_value=mock_session),
            patch("src.worker.tasks.create_certificate", return_value=mock_cert),
            patch("src.worker.tasks.award_xp"),
            patch("src.worker.tasks.send_certificate_email"),
            patch("src.worker.tasks.send_iicrc_cec_report"),
        ):
            result = handle_course_completed(
                {"student_id": str(STUDENT_ID), "course_id": str(COURSE_ID)}
            )

        assert result["status"] == "ok"
        assert result["credential_id"] == "CARSI-WRT-2026-001"
        assert mock_enrollment.status == "completed"


class TestCertificateService:
    def test_generate_credential_id_format(self):
        from src.services.certificate_service import generate_credential_id

        mock_db = MagicMock()
        mock_db.execute.return_value = MagicMock(**{"scalar.return_value": 0})

        cred_id = generate_credential_id(mock_db, "WRT")
        assert cred_id.startswith("CARSI-WRT-")
        parts = cred_id.split("-")
        # CARSI-WRT-2026-001 → 4 parts
        assert len(parts) == 4
        assert parts[3] == "001"  # seq starts at 1

    def test_generate_credential_id_fallback_discipline(self):
        from src.services.certificate_service import generate_credential_id

        mock_db = MagicMock()
        mock_db.execute.return_value = MagicMock(**{"scalar.return_value": 0})

        cred_id = generate_credential_id(mock_db, None)
        assert cred_id.startswith("CARSI-GEN-")
