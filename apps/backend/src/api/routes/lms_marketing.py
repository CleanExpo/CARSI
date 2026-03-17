"""Marketing automation routes — Phase D3."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps_lms import get_current_lms_user
from src.config.database import get_async_db
from src.db.lms_models import LMSUser, LMSUtmCapture

router = APIRouter(prefix="/api/lms/marketing", tags=["lms-marketing"])


class UtmCaptureRequest(BaseModel):
    utm_source: str | None = None
    utm_medium: str | None = None
    utm_campaign: str | None = None
    utm_content: str | None = None
    utm_term: str | None = None
    page_path: str | None = None


@router.post("/utm-capture", status_code=201)
async def capture_utm(
    body: UtmCaptureRequest,
    db: AsyncSession = Depends(get_async_db),
    current_user: LMSUser = Depends(get_current_lms_user),
) -> dict:
    """Record UTM parameters from registration/first login."""
    # Only capture if at least one top-level UTM field is present
    if not any([body.utm_source, body.utm_medium, body.utm_campaign]):
        return {"captured": False}

    db.add(
        LMSUtmCapture(
            user_id=current_user.id,
            utm_source=body.utm_source,
            utm_medium=body.utm_medium,
            utm_campaign=body.utm_campaign,
            utm_content=body.utm_content,
            utm_term=body.utm_term,
            page_path=body.page_path,
        )
    )
    await db.commit()
    return {"captured": True}
