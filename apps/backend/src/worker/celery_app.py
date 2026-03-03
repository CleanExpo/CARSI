"""Celery application for CARSI achievement engine workers."""

from celery import Celery

from src.config import get_settings

settings = get_settings()

celery_app = Celery(
    "carsi",
    broker=settings.effective_celery_broker,
    backend=settings.effective_celery_backend,
    include=["src.worker.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="Australia/Sydney",
    enable_utc=True,
)
