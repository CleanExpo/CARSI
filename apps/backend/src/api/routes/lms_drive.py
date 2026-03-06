"""
CARSI LMS Google Drive Routes

File browsing:
  GET    /api/lms/drive/files                      — list files in root folder (instructor/admin)
  GET    /api/lms/drive/files/{file_id}            — get file metadata (instructor/admin)
  GET    /api/lms/drive/folders/{folder_id}/files  — list files in a specific subfolder

OAuth2 admin flow:
  GET    /api/lms/drive/auth/connect               — start OAuth2 flow (admin) → {auth_url}
  GET    /api/lms/drive/auth/callback              — Google redirect target, stores token
  GET    /api/lms/drive/auth/status                — check connection status (admin)
  DELETE /api/lms/drive/auth/disconnect            — revoke stored token (admin)

Returns empty results when Google Drive integration is disabled.
"""

from datetime import UTC, datetime, timedelta

import jwt as pyjwt
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from sqlalchemy import delete as sa_delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps_lms import require_role
from src.config.database import get_async_db
from src.config.settings import get_settings
from src.db.lms_models import LMSGoogleOAuthToken, LMSUser
from src.services.google_drive import DriveService
from src.utils import get_logger

logger = get_logger(__name__)

router = APIRouter(prefix="/api/lms/drive", tags=["lms-drive"])

_SCOPES = ["https://www.googleapis.com/auth/drive.readonly"]
_STATE_EXPIRE_MINUTES = 10


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _make_state_token() -> str:
    """Generate a short-lived signed state token for OAuth2 CSRF protection."""
    s = get_settings()
    payload = {
        "purpose": "google_drive_oauth",
        "exp": datetime.now(UTC) + timedelta(minutes=_STATE_EXPIRE_MINUTES),
    }
    return pyjwt.encode(payload, s.jwt_secret_key, algorithm="HS256")


def _verify_state_token(state: str) -> bool:
    """Return True if the state token is valid and unexpired."""
    s = get_settings()
    try:
        pyjwt.decode(state, s.jwt_secret_key, algorithms=["HS256"])
        return True
    except pyjwt.PyJWTError:
        return False


def _build_flow(s, state: str | None = None) -> Flow:
    """Construct a google_auth_oauthlib Flow from current settings."""
    kwargs: dict = {}
    if state is not None:
        kwargs["state"] = state
    return Flow.from_client_config(
        client_config={
            "web": {
                "client_id": s.google_client_id,
                "client_secret": s.google_client_secret,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        },
        scopes=_SCOPES,
        redirect_uri=s.google_drive_redirect_uri,
        **kwargs,
    )


async def _get_drive_service(db: AsyncSession = Depends(get_async_db)) -> DriveService:
    """FastAPI dependency — build DriveService from stored OAuth2 token."""
    s = get_settings()
    result = await db.execute(
        select(LMSGoogleOAuthToken).order_by(LMSGoogleOAuthToken.created_at.desc()).limit(1)
    )
    token_row = result.scalar_one_or_none()

    if token_row is None:
        return DriveService(credentials=None, folder_id=s.google_drive_folder_id)

    creds = Credentials(
        token=token_row.access_token,
        refresh_token=token_row.refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=s.google_client_id,
        client_secret=s.google_client_secret,
        scopes=token_row.scopes.split(","),
    )

    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
        token_row.access_token = creds.token
        token_row.token_expiry = creds.expiry
        await db.commit()

    return DriveService(credentials=creds, folder_id=s.google_drive_folder_id)


# ---------------------------------------------------------------------------
# OAuth2 Auth Endpoints
# ---------------------------------------------------------------------------


@router.get("/auth/connect")
async def drive_auth_connect(
    current_user: LMSUser = Depends(require_role(["admin"])),
) -> dict:
    """
    Start the Google OAuth2 flow.
    Returns ``{auth_url}`` — admin opens this URL in the browser to grant Drive access.
    """
    s = get_settings()
    flow = _build_flow(s)
    state = _make_state_token()
    auth_url, _ = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent",
        state=state,
    )
    return {"auth_url": auth_url}


@router.get("/auth/callback")
async def drive_auth_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: AsyncSession = Depends(get_async_db),
) -> RedirectResponse:
    """
    OAuth2 callback target — Google redirects here after the admin grants access.
    No authentication header required (this is a browser redirect from Google).
    Exchanges the authorisation code for tokens, stores them, then redirects to /admin.
    """
    if not _verify_state_token(state):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid OAuth2 state — please restart the Drive connection flow.",
        )

    s = get_settings()
    flow = _build_flow(s, state=state)
    flow.fetch_token(code=code)
    creds = flow.credentials

    # Replace any existing token with the new one (one platform-level token)
    await db.execute(sa_delete(LMSGoogleOAuthToken))
    token_row = LMSGoogleOAuthToken(
        refresh_token=creds.refresh_token or "",
        access_token=creds.token,
        token_expiry=creds.expiry,
        scopes=",".join(creds.scopes or _SCOPES),
    )
    db.add(token_row)
    await db.commit()

    logger.info("Google Drive OAuth2 token stored successfully")
    return RedirectResponse(url="/admin?drive_connected=1")


@router.get("/auth/status")
async def drive_auth_status(
    current_user: LMSUser = Depends(require_role(["admin"])),
    db: AsyncSession = Depends(get_async_db),
) -> dict:
    """Check whether a Google Drive OAuth2 token is stored."""
    result = await db.execute(
        select(LMSGoogleOAuthToken).order_by(LMSGoogleOAuthToken.created_at.desc()).limit(1)
    )
    token_row = result.scalar_one_or_none()

    if token_row is None:
        return {"connected": False, "scopes": []}

    return {
        "connected": True,
        "scopes": token_row.scopes.split(","),
    }


@router.delete("/auth/disconnect")
async def drive_auth_disconnect(
    current_user: LMSUser = Depends(require_role(["admin"])),
    db: AsyncSession = Depends(get_async_db),
) -> dict:
    """Delete the stored Google Drive OAuth2 token."""
    await db.execute(sa_delete(LMSGoogleOAuthToken))
    await db.commit()
    return {"disconnected": True}


# ---------------------------------------------------------------------------
# File Browsing Endpoints
# ---------------------------------------------------------------------------


@router.get("/files")
async def list_drive_files(
    folder_id: str | None = None,
    current_user: LMSUser = Depends(require_role(["instructor", "admin"])),
    drive: DriveService = Depends(_get_drive_service),
) -> list[dict]:
    """
    List files in the configured Drive root folder or a specific subfolder.
    Returns an empty list when Drive integration is disabled.
    """
    return drive.list_files_in_folder(folder_id=folder_id)


@router.get("/files/{file_id}")
async def get_drive_file(
    file_id: str,
    current_user: LMSUser = Depends(require_role(["instructor", "admin"])),
    drive: DriveService = Depends(_get_drive_service),
) -> dict:
    """
    Retrieve metadata for a single Drive file.
    Returns an empty dict when Drive integration is disabled.
    """
    metadata = drive.get_file_metadata(file_id)
    return metadata or {}


@router.get("/folders/{folder_id}/files")
async def list_folder_files(
    folder_id: str,
    current_user: LMSUser = Depends(require_role(["instructor", "admin"])),
    drive: DriveService = Depends(_get_drive_service),
) -> list[dict]:
    """List files inside a specific Drive folder (e.g. a course content folder)."""
    return drive.list_files_in_folder(folder_id=folder_id)
