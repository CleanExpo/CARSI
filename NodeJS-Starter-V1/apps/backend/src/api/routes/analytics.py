"""Analytics API routes for observability dashboard."""

from datetime import datetime, timedelta
from typing import Any, Optional
from fastapi import APIRouter, Query, HTTPException

from src.state.supabase import SupabaseStateStore
from src.utils import get_logger

logger = get_logger(__name__)
router = APIRouter(prefix="/analytics", tags=["Analytics"])

# Initialize Supabase
supabase_store = SupabaseStateStore()


def get_time_range_start(time_range: str) -> str:
    """Get start time for time range."""
    now = datetime.now()
    ranges = {
        "1h": now - timedelta(hours=1),
        "24h": now - timedelta(hours=24),
        "7d": now - timedelta(days=7),
        "30d": now - timedelta(days=30),
        "90d": now - timedelta(days=90),
    }
    start_time = ranges.get(time_range, now - timedelta(days=7))
    return start_time.isoformat()


@router.get("/metrics/overview")
async def get_metrics_overview(
    time_range: str = Query("7d", regex="^(1h|24h|7d|30d|90d)$"),
    agent_name: Optional[str] = None,
) -> dict[str, Any]:
    """
    Get high-level metrics overview.

    Returns:
    - Total runs
    - Success rate
    - Average duration
    - Cost summary
    - Active runs
    """
    start_time = get_time_range_start(time_range)

    # Query agent_runs
    query = supabase_store.client.table("agent_runs").select("*").gte("started_at", start_time)

    if agent_name:
        query = query.eq("agent_name", agent_name)

    result = query.execute()
    runs = result.data or []

    # Calculate metrics
    total_runs = len(runs)
    completed_runs = len([r for r in runs if r.get("status") == "completed"])
    failed_runs = len([r for r in runs if r.get("status") == "failed"])
    active_runs = len([r for r in runs if r.get("status") in ["in_progress", "awaiting_verification"]])

    success_rate = (completed_runs / total_runs * 100) if total_runs > 0 else 0

    # Calculate average duration
    durations = []
    for run in runs:
        if run.get("completed_at") and run.get("started_at"):
            start = datetime.fromisoformat(run["started_at"].replace("Z", "+00:00"))
            end = datetime.fromisoformat(run["completed_at"].replace("Z", "+00:00"))
            duration = (end - start).total_seconds()
            durations.append(duration)

    avg_duration = sum(durations) / len(durations) if durations else 0

    # Query cost data
    cost_result = (
        supabase_store.client.table("api_usage")
        .select("cost_usd, input_tokens, output_tokens")
        .gte("created_at", start_time)
        .execute()
    )
    cost_data = cost_result.data or []

    total_cost = sum(row.get("cost_usd", 0) for row in cost_data)
    total_input_tokens = sum(row.get("input_tokens", 0) for row in cost_data)
    total_output_tokens = sum(row.get("output_tokens", 0) for row in cost_data)

    return {
        "total_runs": total_runs,
        "completed_runs": completed_runs,
        "failed_runs": failed_runs,
        "active_runs": active_runs,
        "success_rate": round(success_rate, 2),
        "avg_duration_seconds": round(avg_duration, 2),
        "total_cost_usd": float(total_cost),
        "total_input_tokens": total_input_tokens,
        "total_output_tokens": total_output_tokens,
        "time_range": time_range,
    }


@router.get("/metrics/agents")
async def get_agent_metrics(
    time_range: str = Query("7d"),
    group_by: str = Query("day", regex="^(hour|day|week)$"),
) -> list[dict[str, Any]]:
    """Get agent-specific performance metrics."""
    start_time = get_time_range_start(time_range)

    result = supabase_store.client.table("agent_runs").select("*").gte("started_at", start_time).execute()

    runs = result.data or []

    # Group by agent name
    agent_metrics: dict[str, Any] = {}
    for run in runs:
        agent_name = run.get("agent_name", "unknown")
        if agent_name not in agent_metrics:
            agent_metrics[agent_name] = {
                "agent_name": agent_name,
                "total": 0,
                "completed": 0,
                "failed": 0,
                "durations": [],
            }

        agent_metrics[agent_name]["total"] += 1

        if run.get("status") == "completed":
            agent_metrics[agent_name]["completed"] += 1
        elif run.get("status") == "failed":
            agent_metrics[agent_name]["failed"] += 1

        if run.get("completed_at") and run.get("started_at"):
            start = datetime.fromisoformat(run["started_at"].replace("Z", "+00:00"))
            end = datetime.fromisoformat(run["completed_at"].replace("Z", "+00:00"))
            duration = (end - start).total_seconds()
            agent_metrics[agent_name]["durations"].append(duration)

    # Calculate final metrics
    metrics_list = []
    for agent_name, data in agent_metrics.items():
        avg_duration = sum(data["durations"]) / len(data["durations"]) if data["durations"] else 0
        success_rate = (data["completed"] / data["total"] * 100) if data["total"] > 0 else 0

        metrics_list.append(
            {
                "agent_name": agent_name,
                "total_runs": data["total"],
                "completed": data["completed"],
                "failed": data["failed"],
                "success_rate": round(success_rate, 2),
                "avg_duration_seconds": round(avg_duration, 2),
            }
        )

    return metrics_list


@router.get("/metrics/costs")
async def get_cost_metrics(
    time_range: str = Query("30d"),
) -> dict[str, Any]:
    """Get cost and token usage metrics."""
    start_time = get_time_range_start(time_range)

    result = (
        supabase_store.client.table("api_usage")
        .select("*")
        .gte("created_at", start_time)
        .execute()
    )

    usage_data = result.data or []

    # Aggregate by model
    model_costs: dict[str, Any] = {}
    for usage in usage_data:
        model = usage.get("model", "unknown")
        if model not in model_costs:
            model_costs[model] = {
                "model": model,
                "cost": 0,
                "input_tokens": 0,
                "output_tokens": 0,
                "calls": 0,
            }

        model_costs[model]["cost"] += usage.get("cost_usd", 0)
        model_costs[model]["input_tokens"] += usage.get("input_tokens", 0)
        model_costs[model]["output_tokens"] += usage.get("output_tokens", 0)
        model_costs[model]["calls"] += 1

    total_cost = sum(m["cost"] for m in model_costs.values())
    total_input_tokens = sum(m["input_tokens"] for m in model_costs.values())
    total_output_tokens = sum(m["output_tokens"] for m in model_costs.values())

    return {
        "total_cost_usd": float(total_cost),
        "total_input_tokens": total_input_tokens,
        "total_output_tokens": total_output_tokens,
        "total_calls": len(usage_data),
        "by_model": list(model_costs.values()),
        "time_range": time_range,
    }


@router.get("/runs/{run_id}/details")
async def get_run_details(run_id: str) -> dict[str, Any]:
    """Get detailed information about a specific agent run."""
    # Get run
    run_result = supabase_store.client.table("agent_runs").select("*").eq("id", run_id).single().execute()

    if not run_result.data:
        raise HTTPException(status_code=404, detail="Run not found")

    run = run_result.data

    # Get API usage for this run
    usage_result = (
        supabase_store.client.table("api_usage")
        .select("*")
        .eq("agent_run_id", run_id)
        .execute()
    )

    # Get tool usage
    tool_result = (
        supabase_store.client.table("tool_usage_events")
        .select("*")
        .eq("agent_run_id", run_id)
        .execute()
    )

    return {
        "run": run,
        "api_usage": usage_result.data or [],
        "tool_usage": tool_result.data or [],
    }
