"""
CARSI LMS Credential Routes

GET /api/lms/credentials/me              — student credential wallet (auth required)
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

from src.api.deps_lms import get_current_lms_user
from src.config.database import get_async_db
from src.config.settings import get_settings
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


class StudentCredentialOut(BaseModel):
    credential_id: str
    course_title: str
    iicrc_discipline: str | None = None
    cec_hours: float
    cppp40421_unit_code: str | None = None
    issued_date: str
    verification_url: str
    status: str


class LinkedInDraftRequest(BaseModel):
    years_experience: int | None = None


class LinkedInDraftResponse(BaseModel):
    draft: str
    credential_id: str


@router.get("/me", response_model=list[StudentCredentialOut])
async def get_my_credentials(
    db: AsyncSession = Depends(get_async_db),
    current_user: LMSUser = Depends(get_current_lms_user),
) -> list[StudentCredentialOut]:
    """Return all completed course credentials for the current student."""
    result = await db.execute(
        select(LMSEnrollment)
        .where(
            LMSEnrollment.student_id == current_user.id,
            LMSEnrollment.status == "completed",
        )
        .options(selectinload(LMSEnrollment.course))
        .order_by(LMSEnrollment.completed_at.desc())
    )
    enrollments = result.scalars().all()

    credentials = []
    for e in enrollments:
        course: LMSCourse = e.course
        issued_ts = e.completed_at or e.enrolled_at
        issued_date = (
            issued_ts.strftime("%d %B %Y").lstrip("0") if issued_ts else "—"
        )
        credentials.append(
            StudentCredentialOut(
                credential_id=str(e.id),
                course_title=course.title if course else "Unknown",
                iicrc_discipline=course.iicrc_discipline if course else None,
                cec_hours=float(course.cec_hours) if course and course.cec_hours else 0.0,
                cppp40421_unit_code=course.cppp40421_unit_code if course else None,
                issued_date=issued_date,
                verification_url=f"https://carsi.com.au/credentials/{e.id}",
                status=e.status,
            )
        )
    return credentials


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


@router.post("/{credential_id}/linkedin-draft", response_model=LinkedInDraftResponse)
async def generate_linkedin_draft(
    credential_id: str,
    data: LinkedInDraftRequest,
    db: AsyncSession = Depends(get_async_db),
    current_user: LMSUser = Depends(get_current_lms_user),
) -> LinkedInDraftResponse:
    """Generate an AI-drafted LinkedIn post for a completed credential.

    Falls back to a template string when no Anthropic API key is configured.
    """
    try:
        uid = UUID(credential_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Credential not found")

    result = await db.execute(
        select(LMSEnrollment)
        .where(
            LMSEnrollment.id == uid,
            LMSEnrollment.student_id == current_user.id,
        )
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
    discipline = course.iicrc_discipline or "restoration" if course else "restoration"
    course_title = course.title if course else "IICRC Certification"
    cec_hours = float(course.cec_hours) if course and course.cec_hours else 0.0
    experience_text = f"{data.years_experience} years" if data.years_experience else "several years"
    student_name = student.full_name if student else current_user.full_name
    verification_url = f"https://carsi.com.au/credentials/{credential_id}"

    settings = get_settings()

    if not settings.anthropic_api_key:
        template = (
            f"Excited to share that I've just earned my {discipline} certification through CARSI! "
            f"After {experience_text} in the industry, formalising this knowledge feels great. "
            f"You can verify my credential at {verification_url} "
            f"#IICRC #{discipline} #PropertyRestoration"
        )
        return LinkedInDraftResponse(draft=template, credential_id=credential_id)

    try:
        import anthropic

        client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)
        prompt = (
            f"Generate a professional LinkedIn post for an Australian trade professional "
            f"who just earned an IICRC certification.\n\n"
            f"Name: {student_name}\n"
            f"Certification: {course_title} ({discipline} discipline)\n"
            f"CEC Hours: {cec_hours}\n"
            f"Years Experience: {experience_text}\n"
            f"Credential ID: {credential_id}\n"
            f"Verification URL: {verification_url}\n\n"
            f"Requirements:\n"
            f"- Under 200 words\n"
            f"- Genuine and professional tone (not overly corporate)\n"
            f"- Mention the specific discipline and what it covers\n"
            f"- Include the credential verification URL\n"
            f"- Use Australian English\n"
            f"- End with 2-3 relevant hashtags\n\n"
            f"Post only, no other text."
        )
        message = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=400,
            messages=[{"role": "user", "content": prompt}],
        )
        draft_text = message.content[0].text if message.content else ""
    except Exception:
        draft_text = (
            f"Excited to share that I've just earned my {discipline} certification through CARSI! "
            f"After {experience_text} in the industry, formalising this knowledge feels great. "
            f"You can verify my credential at {verification_url} "
            f"#IICRC #{discipline} #PropertyRestoration"
        )

    return LinkedInDraftResponse(draft=draft_text, credential_id=credential_id)


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
