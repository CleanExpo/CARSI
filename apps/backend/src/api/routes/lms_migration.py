"""
CARSI LMS Migration Pipeline Routes (Admin only)

POST /api/lms/admin/migration/discover  — scan Google Drive, build manifest
GET  /api/lms/admin/migration/jobs      — list migration jobs
GET  /api/lms/admin/migration/jobs/{id} — get single job
POST /api/lms/admin/migration/load      — load approved items into PostgreSQL
"""

import re
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps_lms import require_role
from src.api.schemas.lms_migration import DiscoverRequest, LoadRequest, MigrationJobListOut, MigrationJobOut
from src.config.database import get_async_db
from src.db.lms_models import LMSCourse, LMSMigrationJob, LMSUser

router = APIRouter(prefix="/api/lms/admin/migration", tags=["lms-migration"])

# IICRC discipline slug mapping — folder names that indicate a discipline
_DISCIPLINE_KEYWORDS: dict[str, str] = {
    "wrt": "WRT",
    "water": "WRT",
    "crt": "CRT",
    "carpet": "CRT",
    "oct": "OCT",
    "odour": "OCT",
    "odor": "OCT",
    "asd": "ASD",
    "applied structural drying": "ASD",
    "applied-structural-drying": "ASD",
    "structural drying": "ASD",
    "cct": "CCT",
    "commercial": "CCT",
}


def _slugify(name: str) -> str:
    """Convert a Drive folder/file name to a URL-safe slug."""
    slug = name.lower()
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    slug = slug.strip("-")
    return slug[:255] or "course"


def _detect_discipline(name: str) -> str | None:
    """Best-effort IICRC discipline detection from a folder/file name."""
    lower = name.lower()
    for keyword, discipline in _DISCIPLINE_KEYWORDS.items():
        if keyword in lower:
            return discipline
    return None


def _parse_cec_hours(name: str) -> float | None:
    """Extract CEC hours from patterns like '2.0 CEC', '3 CEC hours', '1.5CECs'."""
    match = re.search(r"(\d+(?:\.\d+)?)\s*cec", name, re.IGNORECASE)
    if match:
        return float(match.group(1))
    return None


def _build_course_stub(item: dict, folder_name: str | None = None) -> dict:
    """
    Transform a raw Drive file/folder dict into a course candidate stub.
    This is the Extraction + Enrichment phase rolled into one function.
    """
    name = item.get("name", "Untitled")
    slug = _slugify(name)
    discipline = _detect_discipline(folder_name or name) or _detect_discipline(name)
    cec_hours = _parse_cec_hours(name)

    return {
        "drive_file_id": item.get("id"),
        "drive_name": name,
        "proposed_slug": slug,
        "proposed_title": name.replace("-", " ").replace("_", " ").title(),
        "iicrc_discipline": discipline,
        "cec_hours": cec_hours,
        "mime_type": item.get("mimeType"),
        "web_view_link": item.get("webViewLink"),
        "status": "discovered",
    }


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.post("/discover", response_model=MigrationJobOut, status_code=status.HTTP_202_ACCEPTED)
async def discover_drive_content(
    data: DiscoverRequest,
    db: AsyncSession = Depends(get_async_db),
    _: LMSUser = Depends(require_role(["admin"])),
) -> MigrationJobOut:
    """
    Scan Google Drive and build a discovery manifest.

    Creates a migration job of type 'discover'. The result_manifest field
    will contain all discovered items with proposed slugs, IICRC mappings,
    and CEC hours ready for admin review.
    """
    from src.api.routes.lms_drive import _get_drive_service  # type: ignore[attr-defined]

    drive = await _get_drive_service(db)

    job = LMSMigrationJob(
        job_type="discover",
        status="running",
    )
    db.add(job)
    await db.flush()

    if drive.is_disabled:
        # Return a demo manifest so the pipeline can be tested without Drive
        manifest = [
            _build_course_stub(
                {"id": f"demo-{i}", "name": f"WRT Foundation Module {i}", "mimeType": "application/vnd.google-apps.folder"},
                "WRT",
            )
            for i in range(1, 4)
        ]
        job.status = "completed"
        job.total_items = len(manifest)
        job.processed_items = len(manifest)
        job.result_manifest = manifest
    else:
        try:
            folder_id = data.folder_id or None
            raw_items = drive.list_folders_recursive(folder_id)
            manifest = [_build_course_stub(item, item.get("_parent_name")) for item in raw_items]

            job.status = "completed"
            job.total_items = len(manifest)
            job.processed_items = len(manifest)
            job.result_manifest = manifest
        except Exception as exc:
            job.status = "failed"
            job.error_log = [{"error": str(exc), "timestamp": datetime.utcnow().isoformat()}]

    job.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(job)
    return MigrationJobOut.model_validate(job)


@router.get("/jobs", response_model=MigrationJobListOut)
async def list_migration_jobs(
    db: AsyncSession = Depends(get_async_db),
    _: LMSUser = Depends(require_role(["admin"])),
) -> MigrationJobListOut:
    """List all migration jobs, most recent first (admin only)."""
    result = await db.execute(
        select(LMSMigrationJob).order_by(LMSMigrationJob.created_at.desc())
    )
    jobs = result.scalars().all()
    return MigrationJobListOut(items=[MigrationJobOut.model_validate(j) for j in jobs], total=len(jobs))


@router.get("/jobs/{job_id}", response_model=MigrationJobOut)
async def get_migration_job(
    job_id: uuid.UUID,
    db: AsyncSession = Depends(get_async_db),
    _: LMSUser = Depends(require_role(["admin"])),
) -> MigrationJobOut:
    """Get a single migration job by ID (admin only)."""
    result = await db.execute(select(LMSMigrationJob).where(LMSMigrationJob.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Migration job not found")
    return MigrationJobOut.model_validate(job)


@router.post("/load", response_model=MigrationJobOut, status_code=status.HTTP_202_ACCEPTED)
async def load_discovered_courses(
    data: LoadRequest,
    db: AsyncSession = Depends(get_async_db),
    current_user: LMSUser = Depends(require_role(["admin"])),
) -> MigrationJobOut:
    """
    Load approved course stubs from a discovery job into the database.

    Pass ``approved_indices`` to load a subset; omit to load all discovered items.
    Skips items whose proposed_slug already exists in lms_courses.
    """
    # Fetch the source discovery job
    disc_result = await db.execute(select(LMSMigrationJob).where(LMSMigrationJob.id == data.job_id))
    disc_job = disc_result.scalar_one_or_none()
    if not disc_job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Discovery job not found")
    if disc_job.status != "completed":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Discovery job status is '{disc_job.status}', must be 'completed'")

    manifest: list[dict] = disc_job.result_manifest or []
    items_to_load = (
        [manifest[i] for i in data.approved_indices if 0 <= i < len(manifest)]
        if data.approved_indices is not None
        else manifest
    )

    load_job = LMSMigrationJob(
        job_type="load",
        status="running",
        total_items=len(items_to_load),
    )
    db.add(load_job)
    await db.flush()

    errors: list[dict] = []
    loaded = 0

    for item in items_to_load:
        slug = item.get("proposed_slug", "")
        if not slug:
            errors.append({"item": item, "error": "No proposed_slug"})
            continue

        # Skip if slug already exists
        existing = await db.execute(select(LMSCourse).where(LMSCourse.slug == slug))
        if existing.scalar_one_or_none():
            errors.append({"item": item, "error": f"Slug '{slug}' already exists — skipped"})
            load_job.failed_items = (load_job.failed_items or 0) + 1
            continue

        try:
            course = LMSCourse(
                slug=slug,
                title=item.get("proposed_title", slug.replace("-", " ").title()),
                description=None,
                instructor_id=current_user.id,
                status="draft",
                iicrc_discipline=item.get("iicrc_discipline"),
                cec_hours=item.get("cec_hours"),
                migration_source="google_drive",
                meta={"drive_file_id": item.get("drive_file_id"), "drive_name": item.get("drive_name")},
            )
            db.add(course)
            loaded += 1
        except Exception as exc:
            errors.append({"item": item, "error": str(exc)})
            load_job.failed_items = (load_job.failed_items or 0) + 1

    load_job.processed_items = loaded
    load_job.error_log = errors
    load_job.status = "completed" if not errors or loaded > 0 else "failed"
    load_job.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(load_job)
    return MigrationJobOut.model_validate(load_job)
