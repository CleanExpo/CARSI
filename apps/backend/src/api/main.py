"""FastAPI application entry point."""

import uuid
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from src.config import get_settings
from src.utils import get_logger, setup_logging

from .middleware.auth import AuthMiddleware
from .middleware.csrf import CSRFMiddleware
from .middleware.rate_limit import RateLimitMiddleware
from .middleware.request_id import RequestIdMiddleware
from .middleware.security_headers import SecurityHeadersMiddleware
from .routes import (
    agent_dashboard,
    agents,
    analytics,
    articles,
    events,
    jobs,
    chat,
    contractors,
    discovery,
    documents,
    health,
    hub_submissions,
    lms_auth,
    lms_contact,
    lms_courses,
    lms_credentials,
    lms_drive,
    lms_enrollments,
    lms_admin,
    lms_notifications,
    lms_lessons,
    lms_gamification,
    lms_migration,
    lms_subscription,
    lms_webhooks,
    lms_course_ideas,
    lms_rpl,
    lms_ai_builder,
    lms_bundles,
    lms_payments,
    lms_notes,
    lms_public_chat,
    lms_recommendations,
    lms_search,
    lms_marketing,
    lms_hub_integration,
    lms_modules,
    lms_pathways,
    lms_progress,
    lms_quiz,
    prd,
    rag,
    search,
    task_queue,
    webhooks,
    workflow_builder,
    workflows,
    synthex_data,
    news,
    podcasts,
    youtube,
)

settings = get_settings()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan context manager."""
    setup_logging(debug=settings.debug)
    logger.info("Starting application", environment=settings.environment)
    yield
    logger.info("Shutting down application")


app = FastAPI(
    title=settings.project_name,
    description="LangGraph Agent Orchestration Backend",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS middleware — explicit methods and headers
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-User-Id", "X-Request-ID"],
)

# Custom middleware (executed bottom-to-top: RequestId runs first)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(CSRFMiddleware)
app.add_middleware(RateLimitMiddleware)
app.add_middleware(AuthMiddleware)
app.add_middleware(RequestIdMiddleware)


# Global exception handler — safety net for unhandled errors
@app.exception_handler(Exception)
async def _global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    request_id = getattr(request.state, "request_id", str(uuid.uuid4()))
    logger.error(
        "Unhandled exception",
        request_id=request_id,
        error=str(exc),
        error_type=type(exc).__name__,
        path=str(request.url.path),
    )
    return JSONResponse(
        status_code=500,
        content={
            "error": "An internal error occurred",
            "error_code": "INTERNAL_ERROR",
            "request_id": request_id,
        },
    )


# Include routers
app.include_router(health.router, tags=["Health"])
# CARSI LMS routes
app.include_router(lms_auth.router)
app.include_router(lms_contact.router)
app.include_router(lms_courses.router)
app.include_router(lms_drive.router)
app.include_router(lms_enrollments.router)
app.include_router(lms_credentials.router)
app.include_router(lms_admin.router)
app.include_router(lms_notifications.router)
app.include_router(lms_lessons.router)
app.include_router(lms_lessons.modules_router)
app.include_router(lms_modules.router)
app.include_router(lms_progress.router)
app.include_router(lms_quiz.router)
app.include_router(lms_quiz.explanation_router)
app.include_router(lms_pathways.router)
app.include_router(lms_gamification.router)
app.include_router(lms_migration.router)
app.include_router(lms_subscription.router)
app.include_router(lms_webhooks.router)
app.include_router(lms_course_ideas.router)
app.include_router(lms_rpl.router)
app.include_router(lms_rpl.admin_router)
app.include_router(lms_ai_builder.router)
app.include_router(lms_payments.router)
app.include_router(lms_notes.router)
app.include_router(lms_public_chat.router)
app.include_router(lms_recommendations.router, tags=["LMS Recommendations"])
app.include_router(lms_search.router)
app.include_router(lms_bundles.router)
app.include_router(lms_marketing.router)
app.include_router(lms_hub_integration.router)
app.include_router(agents.router, prefix="/api", tags=["Agents"])
app.include_router(chat.router, prefix="/api", tags=["Chat"])
app.include_router(webhooks.router, prefix="/api", tags=["Webhooks"])
app.include_router(prd.router, tags=["PRD Generation"])
app.include_router(workflows.router, prefix="/api", tags=["Workflows"])
app.include_router(rag.router, prefix="/api", tags=["RAG Pipeline"])
app.include_router(analytics.router, prefix="/api", tags=["Analytics"])
app.include_router(agent_dashboard.router, tags=["Agent Dashboard"])
app.include_router(task_queue.router, tags=["Task Queue"])
app.include_router(contractors.router, prefix="/api", tags=["Contractors"])
app.include_router(search.router, tags=["Search"])
app.include_router(documents.router, tags=["Documents"])
app.include_router(workflow_builder.router, prefix="/api", tags=["Workflow Builder"])
app.include_router(discovery.router, prefix="/api", tags=["Discovery"])
app.include_router(synthex_data.router, tags=["Synthex Integration"])
# CARSI Hub — Research Articles CMS
app.include_router(articles.router, tags=["Research Articles"])
# CARSI Hub — Industry Calendar
app.include_router(events.router, tags=["Industry Calendar"])
# CARSI Hub — Job Board
app.include_router(jobs.router, tags=["Job Board"])
# CARSI Hub — News Feed
app.include_router(news.router, tags=["News Feed"])
# CARSI Hub — Podcast Directory
app.include_router(podcasts.router, tags=["Podcast Directory"])
# CARSI Hub — YouTube Channel Directory
app.include_router(youtube.router, tags=["YouTube Channel Directory"])
# CARSI Hub — Submission Processing (admin review + Supabase webhook)
app.include_router(hub_submissions.router, prefix="/api/hub", tags=["hub-submissions"])


@app.get("/")
async def root() -> dict[str, str]:
    """Root endpoint."""
    return {"message": "AI Agent Orchestration API", "version": "0.1.0"}
