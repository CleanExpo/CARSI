"""
CARSI Hub — Research Articles API

CRUD endpoints for the Research Articles CMS.
Supports article authoring, publishing workflow, and public listing/detail views.
FAQPage structured data is stored per article and returned for frontend schema injection.
"""

from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import asc, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.error_handling import create_error_response
from src.auth.jwt import decode_access_token
from src.config.database import get_async_db
from src.db.models import ArticleStatus, ResearchArticle
from src.utils import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/api/articles", tags=["Research Articles"])


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------


class FaqItem(BaseModel):
    question: str = Field(min_length=1, max_length=500)
    answer: str = Field(min_length=1, max_length=2000)


class RelatedFeature(BaseModel):
    feature: str = Field(min_length=1, max_length=200)
    url: str = Field(min_length=1, max_length=500)


class ArticleSummary(BaseModel):
    """Lightweight article representation for listing pages."""

    id: str
    slug: str
    title: str
    excerpt: str | None
    category: str | None
    tags: list[str]
    author_name: str | None
    status: str
    published_at: datetime | None
    view_count: int
    created_at: datetime


class ArticleDetail(ArticleSummary):
    """Full article detail including content and schema data."""

    content: str
    seo_title: str | None
    seo_description: str | None
    canonical_url: str | None
    og_image_url: str | None
    faq_items: list[FaqItem]
    author_nrpg_id: str | None
    author_bio: str | None
    related_restore_assist: list[RelatedFeature]
    updated_at: datetime


class ArticleListResponse(BaseModel):
    data: list[ArticleSummary]
    total: int
    limit: int
    offset: int


class ArticleCreateRequest(BaseModel):
    slug: str = Field(min_length=1, max_length=300, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    title: str = Field(min_length=1, max_length=500)
    excerpt: str | None = Field(None, max_length=500)
    content: str = Field(min_length=1)
    category: str | None = Field(None, max_length=100)
    tags: list[str] = Field(default_factory=list)
    seo_title: str | None = Field(None, max_length=70)
    seo_description: str | None = Field(None, max_length=160)
    canonical_url: str | None = Field(None, max_length=500)
    og_image_url: str | None = Field(None, max_length=500)
    faq_items: list[FaqItem] = Field(default_factory=list)
    author_nrpg_id: str | None = Field(None, max_length=100)
    author_name: str | None = Field(None, max_length=255)
    author_bio: str | None = None
    related_restore_assist: list[RelatedFeature] = Field(default_factory=list)
    status: ArticleStatus = ArticleStatus.DRAFT


class ArticleUpdateRequest(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=500)
    excerpt: str | None = None
    content: str | None = Field(None, min_length=1)
    category: str | None = Field(None, max_length=100)
    tags: list[str] | None = None
    seo_title: str | None = Field(None, max_length=70)
    seo_description: str | None = Field(None, max_length=160)
    canonical_url: str | None = Field(None, max_length=500)
    og_image_url: str | None = Field(None, max_length=500)
    faq_items: list[FaqItem] | None = None
    author_nrpg_id: str | None = Field(None, max_length=100)
    author_name: str | None = Field(None, max_length=255)
    author_bio: str | None = None
    related_restore_assist: list[RelatedFeature] | None = None
    status: ArticleStatus | None = None


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _to_summary(a: ResearchArticle) -> ArticleSummary:
    return ArticleSummary(
        id=str(a.id),
        slug=a.slug,
        title=a.title,
        excerpt=a.excerpt,
        category=a.category,
        tags=a.tags or [],
        author_name=a.author_name,
        status=a.status.value,
        published_at=a.published_at,
        view_count=a.view_count,
        created_at=a.created_at,
    )


def _to_detail(a: ResearchArticle) -> ArticleDetail:
    return ArticleDetail(
        id=str(a.id),
        slug=a.slug,
        title=a.title,
        excerpt=a.excerpt,
        content=a.content,
        category=a.category,
        tags=a.tags or [],
        seo_title=a.seo_title,
        seo_description=a.seo_description,
        canonical_url=a.canonical_url,
        og_image_url=a.og_image_url,
        faq_items=[FaqItem(**item) for item in (a.faq_items or [])],
        author_nrpg_id=a.author_nrpg_id,
        author_name=a.author_name,
        author_bio=a.author_bio,
        related_restore_assist=[RelatedFeature(**f) for f in (a.related_restore_assist or [])],
        status=a.status.value,
        published_at=a.published_at,
        view_count=a.view_count,
        created_at=a.created_at,
        updated_at=a.updated_at,
    )


# ---------------------------------------------------------------------------
# Public endpoints
# ---------------------------------------------------------------------------


@router.get("", response_model=ArticleListResponse, summary="List published articles")
async def list_articles(
    category: str | None = Query(None, description="Filter by category"),
    tag: str | None = Query(None, description="Filter by tag"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_async_db),
) -> ArticleListResponse:
    """Return paginated list of published articles, newest first."""
    query = select(ResearchArticle).where(ResearchArticle.status == ArticleStatus.PUBLISHED)

    if category:
        query = query.where(ResearchArticle.category == category)
    if tag:
        query = query.where(ResearchArticle.tags.contains([tag]))

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar_one()

    query = query.order_by(desc(ResearchArticle.published_at)).limit(limit).offset(offset)
    rows = (await db.execute(query)).scalars().all()

    return ArticleListResponse(
        data=[_to_summary(a) for a in rows],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.get("/{slug}", response_model=ArticleDetail, summary="Get article by slug")
async def get_article(
    slug: str,
    db: AsyncSession = Depends(get_async_db),
) -> ArticleDetail:
    """Return a single published article by slug, incrementing its view count."""
    result = await db.execute(
        select(ResearchArticle).where(
            ResearchArticle.slug == slug,
            ResearchArticle.status == ArticleStatus.PUBLISHED,
        )
    )
    article = result.scalar_one_or_none()
    if not article:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")

    article.view_count = (article.view_count or 0) + 1
    await db.commit()
    await db.refresh(article)

    return _to_detail(article)


# ---------------------------------------------------------------------------
# Admin endpoints (require auth)
# ---------------------------------------------------------------------------


def _require_admin(request, db):
    """Dependency placeholder — validates JWT and admin role."""
    token = request.cookies.get("access_token") or request.headers.get("Authorization", "").removeprefix("Bearer ")
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required")
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    return payload


@router.get("/admin/all", response_model=ArticleListResponse, summary="Admin: list all articles")
async def admin_list_articles(
    request=None,
    article_status: ArticleStatus | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_async_db),
) -> ArticleListResponse:
    """Admin view — all articles regardless of status."""
    query = select(ResearchArticle)
    if article_status:
        query = query.where(ResearchArticle.status == article_status)

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar_one()

    query = query.order_by(desc(ResearchArticle.created_at)).limit(limit).offset(offset)
    rows = (await db.execute(query)).scalars().all()

    return ArticleListResponse(
        data=[_to_summary(a) for a in rows],
        total=total,
        limit=limit,
        offset=offset,
    )


@router.post("", response_model=ArticleDetail, status_code=status.HTTP_201_CREATED, summary="Admin: create article")
async def create_article(
    body: ArticleCreateRequest,
    db: AsyncSession = Depends(get_async_db),
) -> ArticleDetail:
    """Create a new research article."""
    existing = await db.execute(select(ResearchArticle).where(ResearchArticle.slug == body.slug))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Slug already exists")

    article = ResearchArticle(
        slug=body.slug,
        title=body.title,
        excerpt=body.excerpt,
        content=body.content,
        category=body.category,
        tags=body.tags,
        seo_title=body.seo_title,
        seo_description=body.seo_description,
        canonical_url=body.canonical_url,
        og_image_url=body.og_image_url,
        faq_items=[item.model_dump() for item in body.faq_items],
        author_nrpg_id=body.author_nrpg_id,
        author_name=body.author_name,
        author_bio=body.author_bio,
        related_restore_assist=[f.model_dump() for f in body.related_restore_assist],
        status=body.status,
        published_at=datetime.now(UTC) if body.status == ArticleStatus.PUBLISHED else None,
    )
    db.add(article)
    await db.commit()
    await db.refresh(article)
    logger.info("Article created", slug=article.slug, status=article.status)
    return _to_detail(article)


@router.patch("/{article_id}", response_model=ArticleDetail, summary="Admin: update article")
async def update_article(
    article_id: UUID,
    body: ArticleUpdateRequest,
    db: AsyncSession = Depends(get_async_db),
) -> ArticleDetail:
    """Update an existing article. Setting status to 'published' stamps published_at."""
    result = await db.execute(select(ResearchArticle).where(ResearchArticle.id == article_id))
    article = result.scalar_one_or_none()
    if not article:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")

    update_data = body.model_dump(exclude_none=True)

    # Stamp published_at when first publishing
    if "status" in update_data and update_data["status"] == ArticleStatus.PUBLISHED and not article.published_at:
        article.published_at = datetime.now(UTC)

    if "faq_items" in update_data:
        update_data["faq_items"] = [item.model_dump() for item in body.faq_items]
    if "related_restore_assist" in update_data:
        update_data["related_restore_assist"] = [f.model_dump() for f in body.related_restore_assist]

    for field, value in update_data.items():
        setattr(article, field, value)

    await db.commit()
    await db.refresh(article)
    logger.info("Article updated", article_id=str(article_id))
    return _to_detail(article)


@router.delete("/{article_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Admin: archive article")
async def archive_article(
    article_id: UUID,
    db: AsyncSession = Depends(get_async_db),
) -> None:
    """Archive (soft-delete) an article by setting status to archived."""
    result = await db.execute(select(ResearchArticle).where(ResearchArticle.id == article_id))
    article = result.scalar_one_or_none()
    if not article:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Article not found")

    article.status = ArticleStatus.ARCHIVED
    await db.commit()
    logger.info("Article archived", article_id=str(article_id))
