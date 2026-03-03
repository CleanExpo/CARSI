"""
IICRC CEC Report Email Builder

Sends a per-completion email to IICRC Las Vegas when a student has an IICRC
member number and the course carries CEC hours.

IICRC email: cec@iicrc.org (confirm with IICRC America before go-live)
"""

from datetime import date

from src.services.email_service import email_service

IICRC_EMAIL = "cec@iicrc.org"


def build_cec_email_html(
    *,
    student_name: str,
    iicrc_member_number: str,
    student_email: str,
    course_title: str,
    iicrc_discipline: str,
    cec_hours: float,
    completion_date: date,
    certificate_id: str,
) -> str:
    """Build the HTML body for an IICRC CEC completion report."""
    formatted_date = completion_date.strftime("%d/%m/%Y")
    return f"""<html><body>
<p>Dear IICRC CEC Department,</p>
<p>Please record the following Continuing Education Credit completion:</p>
<table cellpadding="8" border="1" style="border-collapse:collapse;font-family:Arial,sans-serif;">
  <tr><td><strong>Member Name</strong></td><td>{student_name}</td></tr>
  <tr><td><strong>IICRC Member #</strong></td><td>{iicrc_member_number}</td></tr>
  <tr><td><strong>Email</strong></td><td>{student_email}</td></tr>
  <tr><td><strong>Course</strong></td><td>{course_title}</td></tr>
  <tr><td><strong>IICRC Discipline</strong></td><td>{iicrc_discipline}</td></tr>
  <tr><td><strong>CEC Hours</strong></td><td>{cec_hours}</td></tr>
  <tr><td><strong>Completion Date</strong></td><td>{formatted_date} AEST</td></tr>
</table>
<p>
  Course Provider: CARSI — Restoration Courses &amp; Training Online<br>
  Provider Contact: admin@carsi.com.au<br>
  Provider Website: carsi.com.au
</p>
<p>
  This completion has been recorded in the CARSI system.<br>
  Certificate ID: {certificate_id}
</p>
<p>Kind regards,<br>CARSI Administration</p>
</body></html>"""


def send_cec_report(
    *,
    student_name: str,
    iicrc_member_number: str,
    student_email: str,
    course_title: str,
    iicrc_discipline: str,
    cec_hours: float,
    completion_date: date,
    certificate_id: str,
) -> None:
    """Send the CEC report email to IICRC. Raises on failure — Celery retries."""
    subject = (
        f"CEC Completion Report — {student_name} — {course_title} ({iicrc_discipline})"
    )
    html = build_cec_email_html(
        student_name=student_name,
        iicrc_member_number=iicrc_member_number,
        student_email=student_email,
        course_title=course_title,
        iicrc_discipline=iicrc_discipline,
        cec_hours=cec_hours,
        completion_date=completion_date,
        certificate_id=certificate_id,
    )
    email_service.send_email(to=IICRC_EMAIL, subject=subject, html_body=html)
