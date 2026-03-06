"""
CARSI LMS — PDF Certificate Generator

Generates a professional A4 landscape certificate using ReportLab.
Returns raw PDF bytes suitable for streaming via FastAPI Response.
"""

import io
from datetime import datetime

from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas


def generate_certificate_pdf(
    student_name: str,
    course_title: str,
    iicrc_discipline: str | None,
    cec_credits: float | None,
    completion_date: datetime,
    credential_id: str,
) -> bytes:
    """Return PDF bytes for a CARSI completion certificate."""
    buf = io.BytesIO()
    width, height = landscape(A4)  # 842 x 595 points
    c = canvas.Canvas(buf, pagesize=landscape(A4))

    # --- Background ---
    c.setFillColor("#0A0A0A")
    c.rect(0, 0, width, height, fill=True, stroke=False)

    # --- Decorative border ---
    c.setStrokeColor("#00F5FF")
    c.setLineWidth(1.5)
    margin = 20 * mm
    c.rect(margin, margin, width - 2 * margin, height - 2 * margin, fill=False, stroke=True)

    # Inner border
    c.setStrokeColor("#FFFFFF")
    c.setLineWidth(0.5)
    inner = 23 * mm
    c.rect(inner, inner, width - 2 * inner, height - 2 * inner, fill=False, stroke=True)

    # --- Header ---
    c.setFillColor("#00F5FF")
    c.setFont("Helvetica", 11)
    c.drawCentredString(width / 2, height - 55 * mm, "CARSI")

    c.setFillColor("#FFFFFF")
    c.setFont("Helvetica-Bold", 28)
    c.drawCentredString(width / 2, height - 70 * mm, "CERTIFICATE OF COMPLETION")

    # --- Thin rule ---
    c.setStrokeColor("#00F5FF")
    c.setLineWidth(0.5)
    rule_y = height - 76 * mm
    c.line(width / 2 - 80 * mm, rule_y, width / 2 + 80 * mm, rule_y)

    # --- Presented to ---
    c.setFillColor("#AAAAAA")
    c.setFont("Helvetica", 11)
    c.drawCentredString(width / 2, height - 90 * mm, "This certificate is presented to")

    # --- Student name ---
    c.setFillColor("#FFFFFF")
    c.setFont("Helvetica-Bold", 24)
    c.drawCentredString(width / 2, height - 105 * mm, student_name)

    # --- Completion text ---
    c.setFillColor("#AAAAAA")
    c.setFont("Helvetica", 12)
    c.drawCentredString(width / 2, height - 120 * mm, "has successfully completed")

    # --- Course title ---
    c.setFillColor("#FFFFFF")
    c.setFont("Helvetica-Bold", 18)
    c.drawCentredString(width / 2, height - 137 * mm, course_title)

    # --- IICRC discipline + CEC credits ---
    if iicrc_discipline or cec_credits:
        parts = []
        if iicrc_discipline:
            parts.append(iicrc_discipline)
        if cec_credits:
            cec_val = int(cec_credits) if cec_credits == int(cec_credits) else cec_credits
            parts.append(f"{cec_val} CEC Credits")
        line = " \u00b7 ".join(parts)
        c.setFillColor("#00F5FF")
        c.setFont("Helvetica", 12)
        c.drawCentredString(width / 2, height - 152 * mm, line)

    # --- Completion date (DD/MM/YYYY) ---
    date_str = completion_date.strftime("%d/%m/%Y")
    c.setFillColor("#AAAAAA")
    c.setFont("Helvetica", 11)
    c.drawCentredString(width / 2, height - 168 * mm, f"Completed: {date_str}")

    # --- Credential ID ---
    c.setFillColor("#666666")
    c.setFont("Courier", 8)
    c.drawCentredString(width / 2, height - 178 * mm, f"Credential ID: {credential_id}")

    # --- Verification URL ---
    c.setFillColor("#666666")
    c.setFont("Courier", 8)
    c.drawCentredString(
        width / 2,
        height - 185 * mm,
        f"Verify: carsi.com.au/credentials/{credential_id}",
    )

    # --- Footer ---
    c.setFillColor("#444444")
    c.setFont("Helvetica", 9)
    c.drawCentredString(width / 2, 28 * mm, "Powered by CARSI \u00b7 Part of the Unite-Group Nexus")

    c.showPage()
    c.save()
    return buf.getvalue()
