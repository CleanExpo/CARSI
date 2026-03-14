"""Celery application for CARSI achievement engine workers."""

from celery import Celery

from src.config import get_settings

settings = get_settings()

celery_app = Celery(
    "carsi",
    broker=settings.effective_celery_broker,
    backend=settings.effective_celery_backend,
    include=["src.worker.tasks", "src.worker.job_tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="Australia/Sydney",
    enable_utc=True,
    beat_schedule={
        "expire-stale-job-listings-daily": {
            "task": "expire_stale_job_listings",
            "schedule": 86_400.0,  # every 24 hours
        },
    },
)
