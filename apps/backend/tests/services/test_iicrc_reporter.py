"""Tests for IICRC CEC report email builder."""
from datetime import date
from unittest.mock import patch

from src.services.iicrc_reporter import build_cec_email_html, send_cec_report


def test_build_cec_email_html_contains_member_number():
    html = build_cec_email_html(
        student_name="James Wilson",
        iicrc_member_number="IICRC-12345",
        student_email="james@example.com",
        course_title="Water Damage Restoration Fundamentals",
        iicrc_discipline="WRT",
        cec_hours=3.0,
        completion_date=date(2026, 3, 4),
        certificate_id="cert-abc-123",
    )
    assert "IICRC-12345" in html
    assert "James Wilson" in html
    assert "Water Damage Restoration Fundamentals" in html
    assert "WRT" in html
    assert "3.0" in html
    assert "04/03/2026" in html


def test_build_cec_email_html_contains_carsi_details():
    html = build_cec_email_html(
        student_name="Jane Smith",
        iicrc_member_number="IICRC-99",
        student_email="jane@example.com",
        course_title="Test Course",
        iicrc_discipline="OCT",
        cec_hours=2.0,
        completion_date=date(2026, 3, 4),
        certificate_id="cert-xyz",
    )
    assert "carsi.com.au" in html
    assert "cert-xyz" in html


def test_send_cec_report_calls_email_service():
    with patch("src.services.iicrc_reporter.email_service") as mock_svc:
        send_cec_report(
            student_name="Jane Smith",
            iicrc_member_number="IICRC-99999",
            student_email="jane@example.com",
            course_title="Odour Control",
            iicrc_discipline="OCT",
            cec_hours=2.0,
            completion_date=date(2026, 3, 4),
            certificate_id="cert-xyz-456",
        )
        mock_svc.send_email.assert_called_once()
        call_kwargs = mock_svc.send_email.call_args[1]
        assert call_kwargs["to"] == "cec@iicrc.org"
        assert "Jane Smith" in call_kwargs["subject"]
