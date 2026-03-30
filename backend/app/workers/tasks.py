import asyncio

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.audit import CallAudit
from app.models.call_log import CallLog
from app.models.client import Client
from app.models.prompt import ClientPrompt
from app.services.ai_audit_service import run_ai_audit
from app.services.dialer_service import fetch_calls_for_client
from app.services.scoring_service import derive_scoring
from app.services.stt_service import transcribe_audio
from app.workers.celery_app import celery_app


@celery_app.task(bind=True, autoretry_for=(Exception,), retry_backoff=True, max_retries=3)
def fetch_calls_task(self) -> dict:
    db = SessionLocal()
    try:
        clients = db.scalars(select(Client)).all()
        total = 0
        for client in clients:
            total += fetch_calls_for_client(db, client)
        return {"inserted": total}
    finally:
        db.close()


@celery_app.task(bind=True, autoretry_for=(Exception,), retry_backoff=True, max_retries=3)
def stt_task(self) -> dict:
    db = SessionLocal()
    try:
        calls = db.scalars(select(CallLog).where(CallLog.transcript.is_(None)).limit(20)).all()
        processed = 0
        for call in calls:
            transcript = asyncio.run(transcribe_audio(call.recording_path))
            call.transcript = transcript
            processed += 1
        db.commit()
        return {"processed": processed}
    finally:
        db.close()


@celery_app.task(bind=True, autoretry_for=(Exception,), retry_backoff=True, max_retries=3)
def audit_task(self) -> dict:
    db = SessionLocal()
    try:
        calls = db.scalars(
            select(CallLog)
            .outerjoin(CallAudit, CallAudit.call_id == CallLog.call_id)
            .where(CallLog.transcript.is_not(None), CallAudit.id.is_(None))
            .limit(20)
        ).all()
        processed = 0

        for call in calls:
            prompt = (
                db.scalars(
                    select(ClientPrompt)
                    .where(ClientPrompt.client_id == call.client_id, ClientPrompt.is_active.is_(True))
                    .order_by(ClientPrompt.version.desc())
                )
                .first()
            )
            if not prompt:
                continue
            audit_json = asyncio.run(run_ai_audit(prompt.prompt, call.transcript or ""))
            total_score, percentage, ranking, fatal_flag = derive_scoring(audit_json)
            db.add(
                CallAudit(
                    call_id=call.call_id,
                    client_id=call.client_id,
                    agent_id=call.agent_id,
                    audit_json=audit_json,
                    total_score=total_score,
                    percentage=percentage,
                    ranking=ranking,
                    fatal_flag=fatal_flag,
                )
            )
            processed += 1
        db.commit()
        return {"processed": processed}
    finally:
        db.close()
