from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.models.call_log import CallLog
from app.models.client import Client


def _mock_dialer_payload(client: Client) -> list[dict[str, Any]]:
    now = datetime.now(timezone.utc)
    payload: list[dict[str, Any]] = []
    for idx in range(1, 6):
        start = now - timedelta(minutes=idx * 5)
        end = start + timedelta(minutes=3)
        payload.append(
            {
                "call_id": f"{client.id}-{int(start.timestamp())}-{idx}",
                "agent_id": f"AGENT-{idx:03}",
                "start_time": start,
                "end_time": end,
                "duration": int((end - start).total_seconds()),
                "recording_path": f"/recordings/{client.id}/{idx}.wav",
            }
        )
    return payload


def fetch_calls_for_client(db: Session, client: Client) -> int:
    inserted = 0
    for row in _mock_dialer_payload(client):
        exists = db.query(CallLog).filter(CallLog.call_id == row["call_id"]).first()
        if exists:
            continue
        db.add(CallLog(client_id=client.id, **row))
        inserted += 1
    db.commit()
    return inserted
