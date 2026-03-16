"""
CARSI Hub — Industry Calendar API

CRUD endpoints for the Industry Calendar feature.
Public endpoints return published events sorted by start date.
Admin endpoints support event creation, editing, and publish/unpublish.
Supports schema.org/Event structured data via the event detail response.
"""

from datetime import UTC, datetime, timedelta
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import asc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.error_handling import create_error_response
from src.config.database import get_async_db
from src.db.models import IndustryEvent
from src.utils import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/api/events", tags=["Industry Calendar"])

VALID_EVENT_TYPES = {"conference", "training", "webinar", "workshop", "networking", "other"}


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------


class EventSummary(BaseModel):
    id: str
    title: str
    event_type: str
    industry_categories: list[str]
    start_date: datetime
    end_date: datetime | None
    location_name: str | None
    location_city: str | None
    location_state: str | None
    is_virtual: bool
    organiser_name: str | None
    event_url: str | None
    is_free: bool
    price_range: str | None
    image_url: str | None
    featured: bool


class EventDetail(EventSummary):
    description: str | None
    location_address: str | None
    location_lat: str | None
    location_lng: str | None
    organiser_url: str | None
    schema_event_status: str
    ticket_url: str | None
    source: str
    created_at: datetime
    updated_at: datetime


class EventListResponse(BaseModel):
    data: list[EventSummary]
    total: int
    limit: int
    offset: int


class EventCreateRequest(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    description: str | None = None
    event_type: str = Field(default="conference", max_length=50)
    industry_categories: list[str] = Field(default_factory=list)
    start_date: datetime
    end_date: datetime | None = None
    location_name: str | None = Field(None, max_length=255)
    location_address: str | None = None
    location_city: str | None = Field(None, max_length=100)
    location_state: str | None = Field(None, max_length=10)
    location_lat: str | None = Field(None, max_length=20)
    location_lng: str | None = Field(None, max_length=20)
    is_virtual: bool = False
    organiser_name: str | None = Field(None, max_length=255)
    organiser_url: str | None = Field(None, max_length=1000)
    event_url: str | None = Field(None, max_length=1000)
    schema_event_status: str = Field(default="EventScheduled", max_length=50)
    ticket_url: str | None = Field(None, max_length=1000)
    is_free: bool = False
    price_range: str | None = Field(None, max_length=100)
    image_url: str | None = Field(None, max_length=1000)
    published: bool = False
    featured: bool = False

    @field_validator("event_type")
    @classmethod
    def validate_event_type(cls, v: str) -> str:
        if v not in VALID_EVENT_TYPES:
            raise ValueError(f"event_type must be one of: {', '.join(VALID_EVENT_TYPES)}")
        return v


class EventUpdateRequest(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=500)
    description: str | None = None
    event_type: str | None = Field(None, max_length=50)
    industry_categories: list[str] | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    location_name: str | None = Field(None, max_length=255)
    location_address: str | None = None
    location_city: str | None = Field(None, max_length=100)
    location_state: str | None = Field(None, max_length=10)
    is_virtual: bool | None = None
    organiser_name: str | None = Field(None, max_length=255)
    organiser_url: str | None = Field(None, max_length=1000)
    event_url: str | None = Field(None, max_length=1000)
    schema_event_status: str | None = Field(None, max_length=50)
    ticket_url: str | None = Field(None, max_length=1000)
    is_free: bool | None = None
    price_range: str | None = Field(None, max_length=100)
    image_url: str | None = Field(None, max_length=1000)
    published: bool | None = None
    featured: bool | None = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _to_summary(e: IndustryEvent) -> EventSummary:
    return EventSummary(
        id=str(e.id),
        title=e.title,
        event_type=e.event_type,
        industry_categories=e.industry_categories or [],
        start_date=e.start_date,
        end_date=e.end_date,
        location_name=e.location_name,
        location_city=e.location_city,
        location_state=e.location_state,
        is_virtual=e.is_virtual,
        organiser_name=e.organiser_name,
        event_url=e.event_url,
        is_free=e.is_free,
        price_range=e.price_range,
        image_url=e.image_url,
        featured=e.featured,
    )


def _to_detail(e: IndustryEvent) -> EventDetail:
    return EventDetail(
        id=str(e.id),
        title=e.title,
        description=e.description,
        event_type=e.event_type,
        industry_categories=e.industry_categories or [],
        start_date=e.start_date,
        end_date=e.end_date,
        location_name=e.location_name,
        location_address=e.location_address,
        location_city=e.location_city,
        location_state=e.location_state,
        location_lat=str(e.location_lat) if e.location_lat else None,
        location_lng=str(e.location_lng) if e.location_lng else None,
        is_virtual=e.is_virtual,
        organiser_name=e.organiser_name,
        organiser_url=e.organiser_url,
        event_url=e.event_url,
        schema_event_status=e.schema_event_status,
        ticket_url=e.ticket_url,
        is_free=e.is_free,
        price_range=e.price_range,
        image_url=e.image_url,
        featured=e.featured,
        source=e.source,
        created_at=e.created_at,
        updated_at=e.updated_at,
    )


# ---------------------------------------------------------------------------
# Public endpoints
# ---------------------------------------------------------------------------


@router.get("", response_model=EventListResponse, summary="List upcoming published events")
async def list_events(
    event_type: str | None = Query(None, description="Filter by event type"),
    category: str | None = Query(None, description="Filter by industry category"),
    month: str | None = Query(None, description="Filter by month (YYYY-MM)"),
    upcoming_only: bool = Query(True, description="Only return future events"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_async_db),
) -> EventListResponse:
    """Return paginated list of published events, sorted by start date ascending."""
    query = select(IndustryEvent).where(IndustryEvent.published.is_(True))

    if upcoming_only:
        query = query.where(IndustryEvent.start_date >= datetime.now(UTC))

    if event_type:
        query = query.where(IndustryEvent.event_type == event_type)

    if category:
        query = query.where(IndustryEvent.industry_categories.contains([category]))

    if month:
        try:
            year, mon = int(month[:4]), int(month[5:7])
            month_start = datetime(year, mon, 1, tzinfo=UTC)
            if mon == 12:
                month_end = datetime(year + 1, 1, 1, tzinfo=UTC)
            else:
                month_end = datetime(year, mon + 1, 1, tzinfo=UTC)
            query = query.where(IndustryEvent.start_date >= month_start).where(
                IndustryEvent.start_date < month_end
            )
        except (ValueError, IndexError):
            pass

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar_one()

    query = query.order_by(asc(IndustryEvent.start_date)).limit(limit).offset(offset)
    rows = (await db.execute(query)).scalars().all()

    return EventListResponse(
        data=[_to_summary(e) for e in rows],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/{event_id}", response_model=EventDetail, summary="Get event by ID")
async def get_event(
    event_id: UUID,
    db: AsyncSession = Depends(get_async_db),
) -> EventDetail:
    """Return a single published event by ID."""
    result = await db.execute(
        select(IndustryEvent).where(
            IndustryEvent.id == event_id,
            IndustryEvent.published.is_(True),
        )
    )
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    return _to_detail(event)


# ---------------------------------------------------------------------------
# Admin endpoints
# ---------------------------------------------------------------------------


@router.post(
    "",
    response_model=EventDetail,
    status_code=status.HTTP_201_CREATED,
    summary="Admin: create event",
)
async def create_event(
    body: EventCreateRequest,
    db: AsyncSession = Depends(get_async_db),
) -> EventDetail:
    """Create a new industry calendar event."""
    event = IndustryEvent(
        title=body.title,
        description=body.description,
        event_type=body.event_type,
        industry_categories=body.industry_categories,
        start_date=body.start_date,
        end_date=body.end_date,
        location_name=body.location_name,
        location_address=body.location_address,
        location_city=body.location_city,
        location_state=body.location_state,
        location_lat=body.location_lat,
        location_lng=body.location_lng,
        is_virtual=body.is_virtual,
        organiser_name=body.organiser_name,
        organiser_url=body.organiser_url,
        event_url=body.event_url,
        schema_event_status=body.schema_event_status,
        ticket_url=body.ticket_url,
        is_free=body.is_free,
        price_range=body.price_range,
        image_url=body.image_url,
        published=body.published,
        featured=body.featured,
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)
    logger.info("Event created", event_id=str(event.id), title=event.title)
    return _to_detail(event)


@router.patch("/{event_id}", response_model=EventDetail, summary="Admin: update event")
async def update_event(
    event_id: UUID,
    body: EventUpdateRequest,
    db: AsyncSession = Depends(get_async_db),
) -> EventDetail:
    """Update an existing event."""
    result = await db.execute(select(IndustryEvent).where(IndustryEvent.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(event, field, value)

    await db.commit()
    await db.refresh(event)
    logger.info("Event updated", event_id=str(event_id))
    return _to_detail(event)


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Admin: delete event")
async def delete_event(
    event_id: UUID,
    db: AsyncSession = Depends(get_async_db),
) -> None:
    """Hard-delete an event (admin only)."""
    result = await db.execute(select(IndustryEvent).where(IndustryEvent.id == event_id))
    event = result.scalar_one_or_none()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    await db.delete(event)
    await db.commit()
    logger.info("Event deleted", event_id=str(event_id))
