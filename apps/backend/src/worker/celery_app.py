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

from celery.schedules import crontab  # noqa: E402

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
        "daily-reengagement-scan": {
            "task": "scan_for_reengagement",
            "schedule": crontab(hour=9, minute=0),  # 9am AEST daily
        },
        "nightly-churn-scores": {
            "task": "compute_churn_scores",
            "schedule": crontab(hour=2, minute=0),  # 2am AEST nightly
        },
    },
)
