"""
CARSI Email Service

Synchronous SMTP sender — called from Celery tasks (outside async context).

Dev:  Mailpit at localhost:1025 (no auth, no TLS)
Prod: Resend SMTP at smtp.resend.com:465 (TLS + API key as password)

Configure via environment variables:
  SMTP_HOST  — default: localhost
  SMTP_PORT  — default: 1025
  SMTP_FROM  — default: admin@carsi.com.au
  SMTP_USER  — default: (empty, no auth)
  SMTP_PASS  — default: (empty, no auth)
"""

import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText


class EmailService:
    def __init__(
        self,
        host: str | None = None,
        port: int | None = None,
        from_addr: str | None = None,
        username: str | None = None,
        password: str | None = None,
    ) -> None:
        self.host = host or os.getenv("SMTP_HOST", "localhost")
        self.port = port or int(os.getenv("SMTP_PORT", "1025"))
        self.from_addr = from_addr or os.getenv("SMTP_FROM", "admin@carsi.com.au")
        self.username = username or os.getenv("SMTP_USER", "")
        self.password = password or os.getenv("SMTP_PASS", "")

    def send_email(self, *, to: str, subject: str, html_body: str) -> None:
        """
        Send an HTML email. Raises smtplib.SMTPException on failure —
        let Celery handle retries via its retry mechanism.
        """
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = self.from_addr
        msg["To"] = to
        msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(self.host, self.port) as server:
            if self.username and self.password:
                server.login(self.username, self.password)
            server.sendmail(self.from_addr, to, msg.as_string())


# Module-level singleton — configured from env vars at import time
email_service = EmailService()
