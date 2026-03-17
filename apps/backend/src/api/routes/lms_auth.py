"""
CARSI LMS Authentication Routes

POST /api/lms/auth/register  — create account, assign role
POST /api/lms/auth/login     — returns JWT access token
GET  /api/lms/auth/me        — current user profile
"""

from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.auth.jwt import create_access_token, get_password_hash, verify_password
from src.config.database import get_async_db
from src.config.settings import get_settings
from src.db.lms_models import LMSRole, LMSUser, LMSUserRole
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

    return TokenResponse(
        access_token=token,
        user_id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        role=primary_role,
    )


class UserUpdateRequest(BaseModel):
    theme_preference: str | None = None


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
    )
