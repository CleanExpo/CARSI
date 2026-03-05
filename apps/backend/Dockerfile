# syntax=docker/dockerfile:1
# =============================================================================
# CARSI LMS — FastAPI Production Dockerfile
# Python 3.12-slim + uv package manager
# Multi-stage build: deps installed then gcc removed to minimise image size
# BuildKit required: DOCKER_BUILDKIT=1
# =============================================================================

# ---------------------------------------------------------------------------
# Stage 1: Builder (install deps with build tools, then discard them)
# ---------------------------------------------------------------------------
FROM python:3.12-slim AS builder

# Prevent Python from writing .pyc files and enable unbuffered output
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install uv from official image
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Install build dependencies, sync production deps, then remove build tools
# gcc + libpq-dev needed for psycopg2 compilation; curl kept for healthcheck
COPY pyproject.toml uv.lock* ./

RUN apt-get update && apt-get install -y --no-install-recommends \
        gcc \
        libpq-dev \
    && uv sync --frozen --no-dev --no-install-project \
    && apt-get remove -y gcc \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

# ---------------------------------------------------------------------------
# Stage 2: Runtime (copy venv + source into clean slim image)
# ---------------------------------------------------------------------------
FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Runtime-only system deps: libpq for psycopg2, curl for healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends \
        libpq5 \
        curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv (needed for `uv run` in CMD)
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Copy dependency files + installed virtualenv from builder
COPY --from=builder /app/.venv /app/.venv
COPY --from=builder /app/pyproject.toml /app/uv.lock* ./

# Copy application source + Alembic migrations (after deps for layer caching)
COPY src/ ./src/
COPY alembic.ini ./
COPY alembic/ ./alembic/

# Allow DATABASE_URL to be provided at build time for migration pre-checks
ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL}

# Create non-root user
RUN groupadd --system --gid 1001 appuser \
    && useradd --system --uid 1001 --gid appuser appuser \
    && chown -R appuser:appuser /app

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# 1 worker for 512MB machines; scale to 2+ when using 1GB+
# Use venv directly (avoids uv cache permission issues on system users)
CMD ["/app/.venv/bin/uvicorn", "src.api.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
