"""Analytics API routes for observability dashboard.

Returns 503 until a persistent state store (PostgreSQL) is configured.
Analytics persistence uses a null backend until PostgreSQL metrics tables are wired.
"""

from typing import Any

from fastapi import APIRouter, HTTPException, Query, status

from src.utils import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/analytics", tags=["Analytics"])

_NOT_CONFIGURED_DETAIL = "Analytics endpoint requires state store configuration"


@router.get("/metrics/overview")
async def get_metrics_overview(
    time_range: str = Query("7d", regex="^(1h|24h|7d|30d|90d)$"),
    agent_name: str | None = None,
) -> dict[str, Any]:
    """Get high-level metrics overview."""
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail=_NOT_CONFIGURED_DETAIL,
    )


@router.get("/metrics/agents")
async def get_agent_metrics(
    time_range: str = Query("7d"),
    group_by: str = Query("day", regex="^(hour|day|week)$"),
) -> list[dict[str, Any]]:
    """Get agent-specific performance metrics."""
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail=_NOT_CONFIGURED_DETAIL,
    )


@router.get("/metrics/costs")
async def get_cost_metrics(
    time_range: str = Query("30d"),
) -> dict[str, Any]:
    """Get cost and token usage metrics."""
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail=_NOT_CONFIGURED_DETAIL,
    )


@router.get("/runs/{run_id}/details")
async def get_run_details(run_id: str) -> dict[str, Any]:
    """Get detailed information about a specific agent run."""
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail=_NOT_CONFIGURED_DETAIL,
    )
