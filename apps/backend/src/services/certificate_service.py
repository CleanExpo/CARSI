"""
Certificate service — generates CARSI credential IDs and creates
certificate records in the database.

PDF generation (WeasyPrint) is a future enhancement; for now we create
the DB record and return the credential ID. The pdf_url field can be
populated by a separate PDF generation task once WeasyPrint is configured.
"""

import re
import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy.orm import Session

from src.db.lms_models import LMSCECTransaction, LMSCertificate, LMSCourse, LMSUser


def _next_credential_seq(db: Session, discipline: str, year: int) -> int:
    """Return the next sequence number for a given discipline+year."""
    prefix = f"CARSI-{discipline}-{year}-"
    from sqlalchemy import func, select

    result = db.execute(
        select(func.count(LMSCertificate.id)).where(
            LMSCertificate.credential_id.like(f"{prefix}%")
        )
    )
    count = result.scalar() or 0
    return count + 1


def generate_credential_id(db: Session, discipline: str | None) -> str:
    """
    Generate a human-readable credential ID like ``CARSI-WRT-2026-001``.

    Falls back to ``CARSI-GEN-<year>-<seq>`` for courses without a discipline.
    """
    year = datetime.now(timezone.utc).year
    disc = (discipline or "GEN").upper()
    # Sanitise — only allow alpha chars
    disc = re.sub(r"[^A-Z]", "", disc) or "GEN"
    seq = _next_credential_seq(db, disc, year)
    return f"CARSI-{disc}-{year}-{seq:03d}"


def create_certificate(
    db: Session,
    student_id: uuid.UUID,
    course: LMSCourse,
    cec_transaction_id: uuid.UUID | None,
) -> LMSCertificate:
    """
    Create a certificate record for a completed course.

    Returns the persisted LMSCertificate. PDF generation is deferred.
    cec_transaction_id is optional — courses without CECs still get a certificate.
    """
    credential_id = generate_credential_id(db, course.iicrc_discipline)

    cert = LMSCertificate(
        student_id=student_id,
        course_id=course.id,
        credential_id=credential_id,
        is_revoked=False,
    )
    db.add(cert)
    db.flush()  # get the cert.id

    # Link the CEC transaction to this certificate (if present)
    if cec_transaction_id:
        tx = db.get(LMSCECTransaction, cec_transaction_id)
        if tx:
            tx.certificate_id = cert.id

    return cert
