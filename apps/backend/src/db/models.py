"""
SQLAlchemy ORM Models

Database models matching the PostgreSQL schema from init-db.sql.
These are separate from Pydantic models (used for API validation).
"""

import enum
from datetime import UTC, datetime
from uuid import UUID, uuid4

from pgvector.sqlalchemy import Vector
from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    Time,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""

    pass


class AustralianState(str, enum.Enum):
    """Australian states and territories (matching database ENUM)."""

    QLD = "QLD"  # Queensland
    NSW = "NSW"  # New South Wales
    VIC = "VIC"  # Victoria
    SA = "SA"  # South Australia
    WA = "WA"  # Western Australia
    TAS = "TAS"  # Tasmania
    NT = "NT"  # Northern Territory
    ACT = "ACT"  # Australian Capital Territory


class AvailabilityStatus(str, enum.Enum):
    """Availability status for contractor slots (matching database ENUM)."""

    AVAILABLE = "available"
    BOOKED = "booked"
    TENTATIVE = "tentative"
    UNAVAILABLE = "unavailable"


class User(Base):
    """
    User model for JWT authentication.

    Table: users
    """

    __tablename__ = "users"

    id: UUID = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    email: str = Column(String(255), unique=True, nullable=False, index=True)
    password_hash: str = Column(String(255), nullable=False)
    full_name: str | None = Column(String(255), nullable=True)
    is_active: bool = Column(Boolean, default=True, nullable=False, index=True)
    is_admin: bool = Column(Boolean, default=False, nullable=False)
    created_at: datetime = Column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    updated_at: datetime = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )
    last_login_at: datetime | None = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    contractors = relationship("Contractor", back_populates="user")
    documents = relationship("Document", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<User(id={self.id}, email={self.email})>"


class Contractor(Base):
    """
    Contractor model for tracking contractor information.

    Table: contractors
    """

    __tablename__ = "contractors"

    id: UUID = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id: UUID | None = Column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    name: str = Column(String(100), nullable=False)
    mobile: str = Column(String(20), nullable=False, index=True)
    abn: str | None = Column(String(20), nullable=True, index=True)
    email: str | None = Column(String(255), nullable=True)
    specialisation: str | None = Column(String(100), nullable=True)
    created_at: datetime = Column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    updated_at: datetime = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    # Relationships
    user = relationship("User", back_populates="contractors")
    availability_slots = relationship(
        "AvailabilitySlot", back_populates="contractor", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Contractor(id={self.id}, name={self.name})>"


class AvailabilitySlot(Base):
    """
    Availability slot model for contractor scheduling.

    Table: availability_slots
    """

    __tablename__ = "availability_slots"

    id: UUID = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    contractor_id: UUID = Column(
        PGUUID(as_uuid=True),
        ForeignKey("contractors.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    date: datetime = Column(DateTime(timezone=True), nullable=False, index=True)
    start_time: datetime = Column(Time, nullable=False)
    end_time: datetime = Column(Time, nullable=False)
    suburb: str = Column(String(100), nullable=False, index=True)
    state: AustralianState = Column(
        Enum(AustralianState, name="australian_state"),
        nullable=False,
        default=AustralianState.QLD,
        index=True,
    )
    postcode: str | None = Column(String(10), nullable=True)
    status: AvailabilityStatus = Column(
        Enum(AvailabilityStatus, name="availability_status"),
        default=AvailabilityStatus.AVAILABLE,
        index=True,
    )
    notes: str | None = Column(Text, nullable=True)
    created_at: datetime = Column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    updated_at: datetime = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    # Relationships
    contractor = relationship("Contractor", back_populates="availability_slots")

    def __repr__(self) -> str:
        return f"<AvailabilitySlot(id={self.id}, contractor_id={self.contractor_id}, date={self.date})>"


class Document(Base):
    """
    Document model for RAG/semantic search with pgvector.

    Table: documents
    """

    __tablename__ = "documents"

    id: UUID = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id: UUID | None = Column(
        PGUUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=True
    )
    title: str = Column(String(255), nullable=False)
    content: str = Column(Text, nullable=False)
    embedding: list[float] | None = Column(Vector(1536), nullable=True)  # OpenAI/Anthropic dimension
    # Renamed from 'metadata' to avoid SQLAlchemy reserved name
    doc_metadata: dict = Column("metadata", JSONB, default=dict, nullable=False)
    created_at: datetime = Column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    updated_at: datetime = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    # Relationships
    user = relationship("User", back_populates="documents")

    def __repr__(self) -> str:
        return f"<Document(id={self.id}, title={self.title})>"


class ArticleStatus(str, enum.Enum):
    """Publication status for research articles."""

    DRAFT = "draft"
    PUBLISHED = "published"
    ARCHIVED = "archived"


class ResearchArticle(Base):
    """
    Research Article model for CARSI Hub CMS.

    Supports rich-text content, SEO metadata, FAQ schema markup (FAQPage structured data),
    categorisation, and linkage to NRPG member profiles.

    Table: research_articles
    """

    __tablename__ = "research_articles"

    id: UUID = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    slug: str = Column(String(300), unique=True, nullable=False, index=True)
    title: str = Column(String(500), nullable=False)
    excerpt: str | None = Column(Text, nullable=True)
    content: str = Column(Text, nullable=False)  # Rich-text (HTML/Markdown)

    # Categorisation
    category: str | None = Column(String(100), nullable=True, index=True)
    tags: list[str] = Column(JSONB, default=list, nullable=False)

    # SEO metadata
    seo_title: str | None = Column(String(70), nullable=True)
    seo_description: str | None = Column(String(160), nullable=True)
    canonical_url: str | None = Column(String(500), nullable=True)
    og_image_url: str | None = Column(String(500), nullable=True)

    # FAQ schema data — list of {question, answer} dicts for FAQPage structured data
    faq_items: list[dict] = Column(JSONB, default=list, nullable=False)

    # NRPG member linkage — nullable until UNI-59 NRPG API integration is complete
    author_nrpg_id: str | None = Column(String(100), nullable=True, index=True)
    author_name: str | None = Column(String(255), nullable=True)
    author_bio: str | None = Column(Text, nullable=True)

    # RestoreAssist feature links — list of {feature, url} dicts
    related_restore_assist: list[dict] = Column(JSONB, default=list, nullable=False)

    # Publication
    status: ArticleStatus = Column(
        Enum(ArticleStatus, name="article_status"), default=ArticleStatus.DRAFT, nullable=False, index=True
    )
    published_at: datetime | None = Column(DateTime(timezone=True), nullable=True)
    view_count: int = Column(Integer, default=0, nullable=False)

    created_at: datetime = Column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    updated_at: datetime = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<ResearchArticle(id={self.id}, slug={self.slug}, status={self.status})>"


class IndustryEvent(Base):
    """
    Industry Calendar event model for CARSI Hub.

    Stores national industry events (conferences, training, webinars, workshops)
    with full schema.org/Event structured data support for SEO/GEO.

    Table: industry_events
    """

    __tablename__ = "industry_events"

    id: UUID = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    title: str = Column(String(500), nullable=False)
    description: str | None = Column(Text, nullable=True)
    event_type: str = Column(String(50), nullable=False, index=True)  # conference/training/webinar/workshop
    industry_categories: list[str] = Column(JSONB, default=list, nullable=False)

    # Dates
    start_date: datetime = Column(DateTime(timezone=True), nullable=False, index=True)
    end_date: datetime | None = Column(DateTime(timezone=True), nullable=True)

    # Location
    location_name: str | None = Column(String(255), nullable=True)
    location_address: str | None = Column(Text, nullable=True)
    location_city: str | None = Column(String(100), nullable=True)
    location_state: str | None = Column(String(10), nullable=True)
    location_lat: float | None = Column(String(20), nullable=True)  # stored as string for precision
    location_lng: float | None = Column(String(20), nullable=True)
    is_virtual: bool = Column(Boolean, default=False, nullable=False)

    # Organiser
    organiser_name: str | None = Column(String(255), nullable=True)
    organiser_url: str | None = Column(String(1000), nullable=True)
    event_url: str | None = Column(String(1000), nullable=True)

    # Schema.org EventStatus
    schema_event_status: str = Column(
        String(50), default="EventScheduled", nullable=False
    )

    # Ticketing
    ticket_url: str | None = Column(String(1000), nullable=True)
    is_free: bool = Column(Boolean, default=False, nullable=False)
    price_range: str | None = Column(String(100), nullable=True)

    # Media
    image_url: str | None = Column(String(1000), nullable=True)

    # Source tracking (for future API aggregation)
    source: str = Column(String(50), default="manual", nullable=False)
    source_id: str | None = Column(String(255), nullable=True)

    # Publication
    published: bool = Column(Boolean, default=False, nullable=False, index=True)
    featured: bool = Column(Boolean, default=False, nullable=False)

    created_at: datetime = Column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    updated_at: datetime = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<IndustryEvent(id={self.id}, title={self.title!r}, start={self.start_date})>"


class JobListing(Base):
    """
    Job Board listing model for CARSI Hub.

    Supports manual submissions with 30-day auto-expiry and
    schema.org/JobPosting structured data.

    Table: job_listings
    """

    __tablename__ = "job_listings"

    id: UUID = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    title: str = Column(String(500), nullable=False)
    company_name: str = Column(String(255), nullable=False)
    company_website: str | None = Column(String(1000), nullable=True)
    company_logo_url: str | None = Column(String(1000), nullable=True)
    description: str = Column(Text, nullable=False)
    employment_type: str = Column(String(50), default="FULL_TIME", nullable=False)
    industry_categories: list[str] = Column(JSONB, default=list, nullable=False)

    # Location
    location_city: str | None = Column(String(100), nullable=True)
    location_state: str | None = Column(String(10), nullable=True)
    location_postcode: str | None = Column(String(10), nullable=True)
    is_remote: bool = Column(Boolean, default=False, nullable=False)

    # Compensation
    salary_min: int | None = Column(Integer, nullable=True)
    salary_max: int | None = Column(Integer, nullable=True)

    # Application
    apply_url: str | None = Column(String(1000), nullable=True)
    apply_email: str | None = Column(String(255), nullable=True)

    # Submitter contact
    submitter_name: str | None = Column(String(255), nullable=True)
    submitter_email: str | None = Column(String(255), nullable=True)
    submitter_phone: str | None = Column(String(50), nullable=True)

    # Source (manual Phase 1, Seek/Indeed Phase 2)
    source: str = Column(String(50), default="manual", nullable=False)
    source_id: str | None = Column(String(255), nullable=True)

    # Expiry — 30-day auto-expiry
    valid_through: datetime = Column(DateTime(timezone=True), nullable=False, index=True)

    # Publication
    published: bool = Column(Boolean, default=False, nullable=False, index=True)
    featured: bool = Column(Boolean, default=False, nullable=False)

    created_at: datetime = Column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    updated_at: datetime = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<JobListing(id={self.id}, title={self.title!r}, company={self.company_name!r})>"


class NewsFeedSource(Base):
    """
    RSS feed source registry for the CARSI News Feed pipeline.
    The RSS ingestion worker (UNI-76) reads this table to fetch and process feeds.
    """

    __tablename__ = "news_feed_sources"

    id: UUID = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    name: str = Column(String(255), nullable=False)
    rss_url: str = Column(String(1000), nullable=False, unique=True)
    industry_categories: list[str] = Column(JSONB, default=list, nullable=False)
    fetch_interval_minutes: int = Column(Integer, default=60, nullable=False)
    last_fetched_at: datetime | None = Column(DateTime(timezone=True), nullable=True)
    is_active: bool = Column(Boolean, default=True, nullable=False)

    created_at: datetime = Column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    updated_at: datetime = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    # Relationship
    articles = relationship("NewsArticle", back_populates="source", lazy="select")

    def __repr__(self) -> str:
        return f"<NewsFeedSource(id={self.id}, name={self.name!r})>"


class NewsArticle(Base):
    """
    AI-processed news article from the RSS ingestion pipeline (UNI-76).
    The pipeline fetches, deduplicates, and summarises articles with Claude Haiku.
    This model is the read layer for the frontend news feed (UNI-66).
    """

    __tablename__ = "news_articles"

    id: UUID = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    source_id: UUID = Column(PGUUID(as_uuid=True), ForeignKey("news_feed_sources.id", ondelete="CASCADE"), nullable=False)
    guid: str = Column(String(1000), nullable=False, unique=True)

    # Original
    original_title: str = Column(String(1000), nullable=False)
    source_url: str = Column(String(2000), nullable=False)
    author: str | None = Column(String(255), nullable=True)
    published_at: datetime | None = Column(DateTime(timezone=True), nullable=True, index=True)
    image_url: str | None = Column(String(2000), nullable=True)

    # AI-processed fields (from Claude Haiku)
    ai_title: str | None = Column(String(1000), nullable=True)
    ai_summary: str | None = Column(Text, nullable=True)
    ai_tags: list[str] = Column(JSONB, default=list, nullable=False)
    industry_categories: list[str] = Column(JSONB, default=list, nullable=False)
    relevance_score: float | None = Column(String(10), nullable=True)  # 0.0–1.0

    # Publication
    is_featured: bool = Column(Boolean, default=False, nullable=False)
    published: bool = Column(Boolean, default=False, nullable=False, index=True)

    created_at: datetime = Column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    updated_at: datetime = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    # Relationship
    source = relationship("NewsFeedSource", back_populates="articles", lazy="select")

    def __repr__(self) -> str:
        return f"<NewsArticle(id={self.id}, title={self.original_title!r})>"


class Professional(Base):
    """
    Industry professional profile for the CARSI directory (UNI-59 Phase 1).
    Supports LocalBusiness + Person schema injection and NRPG member sync.
    """

    __tablename__ = "professionals"

    id: UUID = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    full_name: str = Column(String(255), nullable=False)
    slug: str = Column(String(255), nullable=False, unique=True, index=True)
    headline: str | None = Column(String(500), nullable=True)
    bio: str | None = Column(Text, nullable=True)

    # Contact
    email: str | None = Column(String(255), nullable=True)
    phone: str | None = Column(String(50), nullable=True)
    website: str | None = Column(String(1000), nullable=True)
    linkedin_url: str | None = Column(String(1000), nullable=True)
    avatar_url: str | None = Column(String(1000), nullable=True)

    # Location
    location_city: str | None = Column(String(100), nullable=True)
    location_state: str | None = Column(String(10), nullable=True)

    # Industry
    specialisations: list[str] = Column(JSONB, default=list, nullable=False)
    certifications: list[str] = Column(JSONB, default=list, nullable=False)
    industry_categories: list[str] = Column(JSONB, default=list, nullable=False)
    years_experience: int | None = Column(Integer, nullable=True)

    # NRPG membership
    nrpg_member: bool = Column(Boolean, default=False, nullable=False)
    nrpg_member_id: str | None = Column(String(100), nullable=True, unique=True)

    # Publication
    published: bool = Column(Boolean, default=False, nullable=False, index=True)
    featured: bool = Column(Boolean, default=False, nullable=False)

    created_at: datetime = Column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    updated_at: datetime = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<Professional(id={self.id}, name={self.full_name!r})>"


class YouTubeChannel(Base):
    """
    Industry YouTube channel for the CARSI YouTube Channel Directory (UNI-71).
    Supports VideoObject schema and weekly stats sync via YouTube Data API v3.
    """

    __tablename__ = "youtube_channels"

    id: UUID = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)

    # YouTube identifiers
    youtube_channel_id: str = Column(String(64), nullable=False, unique=True, index=True)
    channel_url: str = Column(String(500), nullable=False)
    custom_url: str | None = Column(String(255), nullable=True)  # @handle

    # Channel metadata
    name: str = Column(String(255), nullable=False)
    description: str | None = Column(Text, nullable=True)
    thumbnail_url: str | None = Column(String(1000), nullable=True)

    # Stats (populated by weekly YouTube API sync)
    subscriber_count: int | None = Column(Integer, nullable=True)
    video_count: int | None = Column(Integer, nullable=True)
    view_count: int | None = Column(Integer, nullable=True)

    # Latest upload (populated by weekly sync)
    latest_upload_title: str | None = Column(String(500), nullable=True)
    latest_upload_url: str | None = Column(String(500), nullable=True)
    latest_upload_date: datetime | None = Column(DateTime(timezone=True), nullable=True)
    latest_upload_thumbnail: str | None = Column(String(1000), nullable=True)

    # Classification
    industry_categories: list[str] = Column(JSONB, default=list, nullable=False)
    tags: list[str] = Column(JSONB, default=list, nullable=False)

    # Flags
    is_carsi_channel: bool = Column(Boolean, default=False, nullable=False)
    published: bool = Column(Boolean, default=False, nullable=False, index=True)
    featured: bool = Column(Boolean, default=False, nullable=False)

    # Sync tracking
    synced_at: datetime | None = Column(DateTime(timezone=True), nullable=True)

    created_at: datetime = Column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    updated_at: datetime = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    def __repr__(self) -> str:
        return f"<YouTubeChannel(id={self.id}, name={self.name!r})>"


class PodcastShow(Base):
    """
    Podcast show for the CARSI Podcast Directory (UNI-72).
    Includes CARSI own productions (is_carsi_show=True) and
    curated industry podcasts. Episodes are auto-synced via RSS.
    """

    __tablename__ = "podcast_shows"

    id: UUID = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)

    # Identification
    slug: str = Column(String(255), nullable=False, unique=True, index=True)
    name: str = Column(String(500), nullable=False)
    host: str | None = Column(String(500), nullable=True)
    description: str | None = Column(Text, nullable=True)

    # External links
    rss_url: str | None = Column(String(2000), nullable=True)
    spotify_url: str | None = Column(String(2000), nullable=True)
    apple_podcasts_url: str | None = Column(String(2000), nullable=True)
    youtube_url: str | None = Column(String(2000), nullable=True)
    amazon_music_url: str | None = Column(String(2000), nullable=True)
    website_url: str | None = Column(String(2000), nullable=True)

    # Media
    cover_image_url: str | None = Column(String(2000), nullable=True)

    # Stats (populated by RSS sync)
    episode_count: int | None = Column(Integer, nullable=True)
    latest_episode_title: str | None = Column(String(1000), nullable=True)
    latest_episode_date: datetime | None = Column(DateTime(timezone=True), nullable=True)
    latest_episode_url: str | None = Column(String(2000), nullable=True)

    # Classification
    industry_categories: list[str] = Column(JSONB, default=list, nullable=False)
    tags: list[str] = Column(JSONB, default=list, nullable=False)
    country: str = Column(String(10), default="AU", nullable=False)

    # Flags
    is_carsi_show: bool = Column(Boolean, default=False, nullable=False)
    featured: bool = Column(Boolean, default=False, nullable=False)
    published: bool = Column(Boolean, default=False, nullable=False, index=True)

    # RSS sync tracking
    rss_synced_at: datetime | None = Column(DateTime(timezone=True), nullable=True)
    rss_error: str | None = Column(Text, nullable=True)

    created_at: datetime = Column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
    updated_at: datetime = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )

    # Relationship
    episodes = relationship("PodcastEpisode", back_populates="show", lazy="select")

    def __repr__(self) -> str:
        return f"<PodcastShow(id={self.id}, name={self.name!r})>"


class PodcastEpisode(Base):
    """
    Individual podcast episode fetched via RSS for a PodcastShow (UNI-72).
    Stored for schema markup (PodcastEpisode) and episode listing on show pages.
    """

    __tablename__ = "podcast_episodes"

    id: UUID = Column(PGUUID(as_uuid=True), primary_key=True, default=uuid4)
    show_id: UUID = Column(
        PGUUID(as_uuid=True),
        ForeignKey("podcast_shows.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # RSS-sourced fields
    guid: str = Column(String(2000), nullable=False)
    title: str = Column(String(1000), nullable=False)
    description: str | None = Column(Text, nullable=True)
    episode_url: str | None = Column(String(2000), nullable=True)
    audio_url: str | None = Column(String(2000), nullable=True)
    image_url: str | None = Column(String(2000), nullable=True)
    duration_seconds: int | None = Column(Integer, nullable=True)
    episode_number: int | None = Column(Integer, nullable=True)
    season_number: int | None = Column(Integer, nullable=True)
    published_at: datetime | None = Column(DateTime(timezone=True), nullable=True)

    # Classification
    tags: list[str] = Column(JSONB, default=list, nullable=False)

    created_at: datetime = Column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )

    # Relationship
    show = relationship("PodcastShow", back_populates="episodes", lazy="select")

    def __repr__(self) -> str:
        return f"<PodcastEpisode(id={self.id}, title={self.title!r})>"
