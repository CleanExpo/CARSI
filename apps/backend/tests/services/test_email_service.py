"""Tests for EmailService — mocks smtplib.SMTP (no live connection needed)."""
from unittest.mock import MagicMock, patch

from src.services.email_service import EmailService


def test_send_email_calls_smtp():
    """send_email builds a MIME message and calls SMTP.sendmail."""
    svc = EmailService(host="localhost", port=1025, from_addr="test@carsi.com.au")

    with patch("src.services.email_service.smtplib.SMTP") as MockSMTP:
        mock_server = MagicMock()
        MockSMTP.return_value.__enter__ = MagicMock(return_value=mock_server)
        MockSMTP.return_value.__exit__ = MagicMock(return_value=False)

        svc.send_email(
            to="recipient@example.com",
            subject="Test Subject",
            html_body="<p>Test body</p>",
        )

        MockSMTP.assert_called_once_with("localhost", 1025)
        mock_server.sendmail.assert_called_once()
        args = mock_server.sendmail.call_args[0]
        assert args[0] == "test@carsi.com.au"
        assert args[1] == "recipient@example.com"


def test_send_email_subject_in_message():
    """The MIME message contains the subject line."""
    svc = EmailService(host="localhost", port=1025, from_addr="test@carsi.com.au")

    with patch("src.services.email_service.smtplib.SMTP") as MockSMTP:
        mock_server = MagicMock()
        MockSMTP.return_value.__enter__ = MagicMock(return_value=mock_server)
        MockSMTP.return_value.__exit__ = MagicMock(return_value=False)

        svc.send_email(to="r@example.com", subject="My Subject", html_body="<p>x</p>")

        raw = mock_server.sendmail.call_args[0][2]
        assert "My Subject" in raw


def test_send_email_skips_login_when_no_credentials():
    """No login() call when username/password are empty."""
    svc = EmailService(host="localhost", port=1025, from_addr="test@carsi.com.au")

    with patch("src.services.email_service.smtplib.SMTP") as MockSMTP:
        mock_server = MagicMock()
        MockSMTP.return_value.__enter__ = MagicMock(return_value=mock_server)
        MockSMTP.return_value.__exit__ = MagicMock(return_value=False)

        svc.send_email(to="r@example.com", subject="Test", html_body="<p>x</p>")

        mock_server.login.assert_not_called()
