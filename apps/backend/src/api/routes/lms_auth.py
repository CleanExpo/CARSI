"""
CARSI LMS Authentication Routes

POST /api/lms/auth/register  — create account, assign role
POST /api/lms/auth/login     — returns JWT access token
GET  /api/lms/auth/me        — current user profile
"""

from datetime import timedelta

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.auth.jwt import create_access_token, get_password_hash, verify_password
from src.config.database import get_async_db
from src.config.settings import get_settings
from src.db.lms_models import LMSRole, LMSUser, LMSUserRole, LMSUserSession
from src.api.deps_lms import get_current_lms_user

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

    # Record session start (best-effort, non-blocking)
    user_id_for_session = user.id
    ip = request.client.host if request.client else None
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
