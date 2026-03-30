from celery import Celery

from app.core.config import get_settings

settings = get_settings()

celery_app = Celery(
    "call_audit_workers",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    beat_schedule={
        "fetch-calls-every-2-minutes": {
            "task": "app.workers.tasks.fetch_calls_task",
            "schedule": 120.0,
        },
        "stt-every-minute": {
            "task": "app.workers.tasks.stt_task",
            "schedule": 60.0,
        },
        "audit-every-minute": {
            "task": "app.workers.tasks.audit_task",
            "schedule": 60.0,
        },
    },
)
