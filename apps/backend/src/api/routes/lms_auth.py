"""
CARSI LMS Authentication Routes

POST /api/lms/auth/register  — create account, assign role
POST /api/lms/auth/login     — returns JWT access token
GET  /api/lms/auth/me        — current user profile
"""

import json
from datetime import timedelta

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.auth.jwt import create_access_token, get_password_hash, verify_password
from src.config.database import get_async_db
from src.config.settings import get_settings
from src.db.lms_models import LMSRole, LMSUser, LMSUserRole, LMSUserSession
from src.api.deps_lms import get_current_lms_user
from src.services.audit_service import audit_log

router = APIRouter(prefix="/api/lms/auth", tags=["lms-auth"])

VALID_ROLES = {"student", "instructor", "admin"}


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str = Field(min_length=2, max_length=255)
    role: str = Field(default="student")
    iicrc_member_number: str | None = Field(default=None, max_length=50)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    email: str
    full_name: str
    role: str


class UserProfileResponse(BaseModel):
    id: str
    email: str
    full_name: str
    roles: list[str]
    theme_preference: str
    is_active: bool
    is_verified: bool
    onboarding_completed: bool = False
    recommended_pathway: str | None = None


class OnboardingRequest(BaseModel):
    industry: str
    role: str
    iicrc_experience: str
    primary_goal: str


class OnboardingResponse(BaseModel):
    recommended_pathway: str
    pathway_description: str
    suggested_courses_url: str


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    data: RegisterRequest,
    db: AsyncSession = Depends(get_async_db),
) -> TokenResponse:
    """
    Register a new LMS user with the specified role.
    Default role is 'student'. Admins can be created by specifying role='admin'
    (restrict this in production to an invite flow).
    """
    role_name = data.role.lower()
    if role_name not in VALID_ROLES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Role must be one of: {', '.join(VALID_ROLES)}",
        )

    # Check email not already taken
    existing = await db.execute(select(LMSUser).where(LMSUser.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists",
        )

    # Create user
    user = LMSUser(
        email=data.email,
        hashed_password=get_password_hash(data.password),
        full_name=data.full_name,
        is_active=True,
        is_verified=False,
        iicrc_member_number=data.iicrc_member_number,
    )
    db.add(user)
    await db.flush()  # get user.id before creating role assignment

    # Assign role
    role_result = await db.execute(select(LMSRole).where(LMSRole.name == role_name))
    role = role_result.scalar_one_or_none()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Role '{role_name}' not found — ensure database is seeded",
        )

    db.add(LMSUserRole(user_id=user.id, role_id=role.id))
    await db.commit()

    # Issue token
    settings = get_settings()
    token = create_access_token(
        data={"sub": user.email},
        expires_delta=timedelta(minutes=settings.jwt_expire_minutes),
    )

    return TokenResponse(
        access_token=token,
        user_id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        role=role_name,
    )


@router.post("/login", response_model=TokenResponse)
async def login(
    data: LoginRequest,
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_async_db),
) -> TokenResponse:
    """Authenticate and return a JWT token."""
    result = await db.execute(
        select(LMSUser)
        .where(LMSUser.email == data.email)
        .options(selectinload(LMSUser.user_roles).selectinload(LMSUserRole.role))
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive",
        )

    settings = get_settings()
    token = create_access_token(
        data={"sub": user.email},
        expires_delta=timedelta(minutes=settings.jwt_expire_minutes),
    )

    primary_role = user.roles[0] if user.roles else "student"

    # Audit login event inline (same transaction as nothing else is being written)
    ip = request.client.host if request.client else None
    await audit_log(
        db,
        "user.login",
        actor_id=user.id,
        actor_email=user.email,
        ip_address=ip,
    )
    await db.commit()

    # Record session start (best-effort, non-blocking)
    user_id_for_session = user.id
    ua = request.headers.get("User-Agent")

    async def _record_session() -> None:
        from src.config.database import AsyncSessionLocal
        async with AsyncSessionLocal() as session:
            try:
                session.add(LMSUserSession(
                    student_id=user_id_for_session,
                    ip_address=ip,
                    user_agent=ua,
                ))
                await session.commit()
            except Exception:
                await session.rollback()

    background_tasks.add_task(_record_session)

    return TokenResponse(
        access_token=token,
        user_id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        role=primary_role,
    )


class UserUpdateRequest(BaseModel):
    theme_preference: str | None = None


_PATHWAY_DESCRIPTIONS: dict[str, str] = {
    "WRT": "Water Damage Restoration Technician — the industry entry point covering moisture assessment, drying science, and structural restoration.",
    "ASD": "Applied Structural Drying — advanced drying techniques for complex commercial and residential losses.",
    "CRT": "Commercial Drying Technician — large-scale commercial water damage restoration and project management.",
    "OCT": "Odour Control Technician — identification and remediation of odour sources across all restoration disciplines.",
    "CCT": "Commercial Carpet Technician — professional carpet cleaning, maintenance, and restoration.",
    "HST": "Health and Safety Technician — infection control and safe work practices for healthcare environments.",
    "general": "General Restoration — explore our full course catalogue to find the best fit for your goals.",
}


def _score_pathway(industry: str, role: str, iicrc_experience: str, primary_goal: str) -> str:
    """Deterministic scoring function — returns the recommended IICRC discipline code."""
    scores: dict[str, int] = {
        "WRT": 0, "ASD": 0, "CRT": 0, "OCT": 0, "CCT": 0, "HST": 0,
    }

    # Industry signals
    if industry == "restoration":
        scores["WRT"] += 3
        scores["ASD"] += 2
        scores["CRT"] += 2
    elif industry == "construction":
        scores["WRT"] += 3
        scores["ASD"] += 1
    elif industry == "healthcare":
        scores["HST"] += 10  # strong domain signal — overrides generic role/experience boosts
        scores["WRT"] += 1
    elif industry == "government":
        scores["WRT"] += 3
        scores["CRT"] += 2
    else:
        scores["WRT"] += 2

    # Role signals
    if role == "technician":
        scores["WRT"] += 2
        scores["ASD"] += 1
    elif role == "supervisor":
        scores["ASD"] += 2
        scores["CRT"] += 2
        scores["WRT"] += 1
    elif role == "owner":
        scores["CRT"] += 3
        scores["ASD"] += 2
    elif role == "new_to_industry":
        scores["WRT"] += 4

    # IICRC experience signals
    if iicrc_experience == "none":
        scores["WRT"] += 3
    elif iicrc_experience == "some":
        scores["ASD"] += 2
        scores["WRT"] += 1
    elif iicrc_experience == "certified":
        scores["ASD"] += 1
        scores["CRT"] += 2
        scores["OCT"] += 2

    # Goal signals
    if primary_goal == "new_cert":
        scores["WRT"] += 1
    elif primary_goal == "cec_renewal":
        scores["OCT"] += 2
        scores["CCT"] += 1
    elif primary_goal == "career_change":
        scores["WRT"] += 3

    winner = max(scores, key=lambda k: scores[k])
    if scores[winner] == 0:
        return "WRT"
    return winner


@router.post("/onboarding", response_model=OnboardingResponse)
async def complete_onboarding(
    data: OnboardingRequest,
    db: AsyncSession = Depends(get_async_db),
    current_user: LMSUser = Depends(get_current_lms_user),
) -> OnboardingResponse:
    """Run the AI onboarding wizard — maps user answers to a recommended IICRC pathway.

    Returns 409 Conflict if the user has already completed onboarding.
    """
    if current_user.onboarding_completed:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Onboarding already completed",
        )

    pathway = _score_pathway(
        industry=data.industry,
        role=data.role,
        iicrc_experience=data.iicrc_experience,
        primary_goal=data.primary_goal,
    )

    current_user.onboarding_completed = True
    current_user.recommended_pathway = pathway
    await db.commit()
    await db.refresh(current_user)

    description = _PATHWAY_DESCRIPTIONS.get(pathway, _PATHWAY_DESCRIPTIONS["general"])
    return OnboardingResponse(
        recommended_pathway=pathway,
        pathway_description=description,
        suggested_courses_url=f"/pathways/{pathway.lower()}",
    )


@router.patch("/me", response_model=UserProfileResponse)
async def update_me(
    data: UserUpdateRequest,
    db: AsyncSession = Depends(get_async_db),
    current_user: LMSUser = Depends(get_current_lms_user),
) -> UserProfileResponse:
    """Update current user profile fields (e.g. theme preference)."""
    if data.theme_preference is not None:
        if data.theme_preference not in ("light", "dark"):
            raise HTTPException(
                status_code=422,
                detail="theme_preference must be 'light' or 'dark'",
            )
        current_user.theme_preference = data.theme_preference

    await db.commit()
    await db.refresh(current_user)

    return UserProfileResponse(
        id=str(current_user.id),
        email=current_user.email,
        full_name=current_user.full_name,
        roles=current_user.roles,
        theme_preference=current_user.theme_preference,
        is_active=current_user.is_active,
        is_verified=current_user.is_verified,
        onboarding_completed=bool(current_user.onboarding_completed),
        recommended_pathway=current_user.recommended_pathway,
    )


@router.get("/me", response_model=UserProfileResponse)
async def get_me(
    current_user: LMSUser = Depends(get_current_lms_user),
) -> UserProfileResponse:
    """Return current authenticated LMS user's profile."""
    return UserProfileResponse(
        id=str(current_user.id),
        email=current_user.email,
        full_name=current_user.full_name,
        roles=current_user.roles,
        theme_preference=current_user.theme_preference,
        is_active=current_user.is_active,
        is_verified=current_user.is_verified,
        onboarding_completed=bool(current_user.onboarding_completed),
        recommended_pathway=current_user.recommended_pathway,
    )


@router.get("/me/export")
async def export_my_data(
    db: AsyncSession = Depends(get_async_db),
    current_user: LMSUser = Depends(get_current_lms_user),
) -> Response:
    """GDPR data export — returns all personal data for the authenticated user as JSON.

    Response header includes Content-Disposition for browser download.
    """
    from sqlalchemy import select

    from src.db.lms_models import (
        LMSCertificate,
        LMSEnrollment,
        LMSLessonNote,
        LMSProgress,
        LMSQuizAttempt,
    )

    user_id = current_user.id

    enrollments_result = await db.execute(
        select(LMSEnrollment).where(LMSEnrollment.student_id == user_id)
    )
    enrollments = [
        {
            "id": str(e.id),
            "course_id": str(e.course_id),
            "enrolled_at": e.enrolled_at.isoformat() if e.enrolled_at else None,
            "completed_at": e.completed_at.isoformat() if e.completed_at else None,
            "status": e.status,
        }
        for e in enrollments_result.scalars().all()
    ]

    certs_result = await db.execute(
        select(LMSCertificate).where(LMSCertificate.student_id == user_id)
    )
    certificates = [
        {
            "id": str(c.id),
            "credential_id": c.credential_id,
            "course_id": str(c.course_id),
            "issued_at": c.issued_at.isoformat() if c.issued_at else None,
            "is_revoked": c.is_revoked,
        }
        for c in certs_result.scalars().all()
    ]

    attempts_result = await db.execute(
        select(LMSQuizAttempt).where(LMSQuizAttempt.student_id == user_id)
    )
    quiz_attempts = [
        {
            "id": str(a.id),
            "quiz_id": str(a.quiz_id),
            "score_percentage": float(a.score_percentage) if a.score_percentage is not None else None,
            "passed": a.passed,
            "started_at": a.started_at.isoformat() if a.started_at else None,
            "completed_at": a.completed_at.isoformat() if a.completed_at else None,
        }
        for a in attempts_result.scalars().all()
    ]

    notes_result = await db.execute(
        select(LMSLessonNote).where(LMSLessonNote.student_id == user_id)
    )
    notes = [
        {
            "id": str(n.id),
            "lesson_id": str(n.lesson_id),
            "content": n.content,
            "updated_at": n.updated_at.isoformat() if n.updated_at else None,
        }
        for n in notes_result.scalars().all()
    ]

    progress_result = await db.execute(
        select(LMSProgress).where(LMSProgress.enrollment_id.in_(
            [e["id"] for e in enrollments]
        ))
    )
    progress = [
        {
            "id": str(p.id),
            "enrollment_id": str(p.enrollment_id),
            "lesson_id": str(p.lesson_id),
            "completed_at": p.completed_at.isoformat() if p.completed_at else None,
            "time_spent_seconds": p.time_spent_seconds,
        }
        for p in progress_result.scalars().all()
    ]

    payload = {
        "user": {
            "id": str(current_user.id),
            "email": current_user.email,
            "full_name": current_user.full_name,
            "created_at": current_user.created_at.isoformat() if current_user.created_at else None,
        },
        "enrollments": enrollments,
        "certificates": certificates,
        "quiz_attempts": quiz_attempts,
        "notes": notes,
        "progress": progress,
    }

    content = json.dumps(payload, indent=2)
    filename = f"carsi-data-export-{user_id}.json"
    return Response(
        content=content,
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
