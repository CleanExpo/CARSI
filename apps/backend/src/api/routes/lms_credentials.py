"""
CARSI LMS Credential Routes

GET /api/lms/credentials/{credential_id}  — public credential verification
  credential_id is the enrollment UUID; no auth required (public verification page)
"""

import asyncio
from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.config.database import get_async_db
from src.db.lms_models import LMSCourse, LMSEnrollment, LMSUser
from src.services.pdf_certificate import generate_certificate_pdf

router = APIRouter(prefix="/api/lms/credentials", tags=["lms-credentials"])


class CredentialOut(BaseModel):
    credential_id: str
    valid: bool
    status: str
    student_name: str
    course_title: str
    iicrc_discipline: str
    cec_hours: float
    issued_date: str
    issuing_organisation: str
    verification_url: str
    cppp40421_unit_code: str | None = None


@router.get("/{credential_id}", response_model=CredentialOut)
async def get_credential(
    credential_id: str,
    db: AsyncSession = Depends(get_async_db),
) -> CredentialOut:
    """Return a verifiable credential derived from an enrollment record."""
    try:
        uid = UUID(credential_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Credential not found")

    result = await db.execute(
        select(LMSEnrollment)
        .where(LMSEnrollment.id == uid)
        .options(
            selectinload(LMSEnrollment.student),
            selectinload(LMSEnrollment.course),
        )
    )
    enrollment = result.scalar_one_or_none()
    if not enrollment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Credential not found")

    course: LMSCourse = enrollment.course
    student: LMSUser = enrollment.student

    is_valid = enrollment.status in ("active", "completed")
    issued_ts: datetime = enrollment.completed_at or enrollment.enrolled_at
    issued_date = issued_ts.strftime("%d %B %Y").lstrip("0") if issued_ts else "—"

    # Fire-and-forget: push certification event to Unite-Hub Nexus
    if is_valid:
        from src.services.nexus_connector import push_event

        asyncio.create_task(push_event("certification.awarded", {
            "student_id": str(student.id) if student else None,
            "credential_id": credential_id,
            "course_title": course.title if course else "Unknown",
            "issued_at": issued_ts.isoformat() if issued_ts else None,
        }))

        # Fire-and-forget: push to Synthex for marketing automation
        from src.services.synthex_connector import notify_certification_awarded
        from uuid import UUID

        if student:
            asyncio.create_task(notify_certification_awarded(
                student_id=student.id,
                credential_id=UUID(credential_id) if isinstance(credential_id, str) else credential_id,
                credential_type="course_completion",
                discipline=course.iicrc_discipline if course else None,
                cec_hours=float(course.cec_hours) if course and course.cec_hours else None,
                public_url=f"https://carsi.com.au/credentials/{credential_id}",
            ))

    return CredentialOut(
        credential_id=credential_id,
        valid=is_valid,
        status=enrollment.status,
        student_name=student.full_name if student else "Unknown",
        course_title=course.title if course else "Unknown",
        iicrc_discipline=course.iicrc_discipline or "—" if course else "—",
        cec_hours=float(course.cec_hours) if course and course.cec_hours else 0.0,
        issued_date=issued_date,
        issuing_organisation="CARSI — Certified Applied Restoration & Skilling Institute",
        verification_url=f"https://carsi.com.au/credentials/{credential_id}",
        cppp40421_unit_code=course.cppp40421_unit_code if course else None,
    )


@router.get("/{credential_id}/pdf")
async def get_credential_pdf(
    credential_id: str,
    db: AsyncSession = Depends(get_async_db),
) -> Response:
    """Return a downloadable PDF certificate for a verified credential."""
    try:
        uid = UUID(credential_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Credential not found")

    result = await db.execute(
        select(LMSEnrollment)
        .where(LMSEnrollment.id == uid)
        .options(
            selectinload(LMSEnrollment.student),
            selectinload(LMSEnrollment.course),
        )
    )
    enrollment = result.scalar_one_or_none()
    if not enrollment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Credential not found")

    course: LMSCourse = enrollment.course
    student: LMSUser = enrollment.student
    completion_ts: datetime = enrollment.completed_at or enrollment.enrolled_at

    pdf_bytes = generate_certificate_pdf(
        student_name=student.full_name if student else "Unknown",
        course_title=course.title if course else "Unknown",
        iicrc_discipline=course.iicrc_discipline if course else None,
        cec_credits=float(course.cec_hours) if course and course.cec_hours else None,
        completion_date=completion_ts,
        credential_id=credential_id,
    )

    short_id = credential_id[:8]
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="certificate-{short_id}.pdf"'},
    )
