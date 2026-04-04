import csv
import io
import json
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.audit import CallAudit
from app.models.call_log import CallLog
from app.models.user import User

router = APIRouter(prefix="/export", tags=["Export"])


def _csv_safe(value: object) -> str:
    if value is None:
        return ""
    text = str(value)
    # Keep CSV one-record-per-line for spreadsheet import compatibility.
    return text.replace("\r\n", " ").replace("\n", " ").replace("\r", " ")


def _flatten_json(payload: object, prefix: str = "") -> dict[str, str]:
    flat: dict[str, str] = {}
    if isinstance(payload, dict):
        for key, value in payload.items():
            new_prefix = f"{prefix}.{key}" if prefix else str(key)
            flat.update(_flatten_json(value, new_prefix))
        return flat

    if isinstance(payload, list):
        if all(not isinstance(item, (dict, list)) for item in payload):
            flat[prefix] = _csv_safe(" | ".join(str(item) for item in payload))
            return flat
        for index, value in enumerate(payload):
            new_prefix = f"{prefix}[{index}]"
            flat.update(_flatten_json(value, new_prefix))
        return flat

    flat[prefix] = _csv_safe(payload)
    return flat


def _pretty_audit_key(key: str) -> str:
    """
    Convert deep JSON path into shorter Excel-friendly column names.
    Example:
    sections.process_compliance.parameters.correct_transfer_process.score
    -> process_compliance.correct_transfer_process.score
    """
    normalized = key
    if normalized.startswith("sections."):
        normalized = normalized[len("sections.") :]
    normalized = normalized.replace(".parameters.", ".")
    return f"audit.{normalized}"


def _audit_export_values(audit: CallAudit | None) -> tuple[object, object, object, object]:
    if not audit:
        return "", "", "", ""

    payload = audit.audit_json or {}
    json_total = payload.get("total_score")
    json_percentage = payload.get("percentage")
    json_ranking = payload.get("ranking")
    json_fatal = payload.get("fatal_flag", payload.get("fatal"))

    total_score = audit.total_score
    if (total_score is None or float(total_score) == 0.0) and json_total is not None:
        total_score = json_total

    percentage = audit.percentage
    if (percentage is None or float(percentage) == 0.0) and json_percentage is not None:
        percentage = json_percentage

    ranking = audit.ranking
    if (not ranking or str(ranking).upper() == "N/A") and json_ranking is not None:
        ranking = json_ranking

    fatal_flag = audit.fatal_flag
    if json_fatal is not None:
        fatal_flag = bool(json_fatal)

    return total_score, percentage, ranking, fatal_flag


@router.get("")
def export_audits(
    client_id: int = Query(...),
    from_date: datetime = Query(..., alias="from"),
    to_date: datetime = Query(..., alias="to"),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    rows = (
        db.query(CallLog, CallAudit)
        .outerjoin(CallAudit, CallAudit.call_id == CallLog.call_id)
        .filter(
            CallLog.client_id == client_id,
            CallLog.start_time >= from_date,
            CallLog.start_time <= to_date,
        )
        .order_by(CallLog.start_time.desc())
        .all()
    )

    stream = io.StringIO()
    writer = csv.writer(stream, quoting=csv.QUOTE_ALL, lineterminator="\n")
    base_headers = [
        "call_id",
        "agent_id",
        "call_start_time",
        "call_end_time",
        "duration",
        "recording_path",
        "transcript",
        "audit_total_score",
        "audit_percentage",
        "audit_ranking",
        "audit_fatal_flag",
        "audit_json",
        "audit_created_at",
    ]

    flattened_rows: list[dict[str, str]] = []
    flattened_keys: set[str] = set()
    for _, audit in rows:
        flattened = _flatten_json(audit.audit_json or {}) if audit else {}
        flattened = {_pretty_audit_key(key): value for key, value in flattened.items() if key}
        flattened_rows.append(flattened)
        flattened_keys.update(flattened.keys())

    extra_headers = sorted(flattened_keys)
    writer.writerow(base_headers + extra_headers)

    for call, audit in rows:
        total_score, percentage, ranking, fatal_flag = _audit_export_values(audit)
        flattened = _flatten_json(audit.audit_json or {}) if audit else {}
        flattened = {_pretty_audit_key(key): value for key, value in flattened.items() if key}
        writer.writerow(
            [
                call.call_id,
                call.agent_id,
                call.start_time.isoformat() if call.start_time else "",
                call.end_time.isoformat() if call.end_time else "",
                call.duration,
                call.recording_path,
                _csv_safe(call.transcript),
                total_score,
                percentage,
                ranking,
                fatal_flag,
                _csv_safe(json.dumps(audit.audit_json, ensure_ascii=False, separators=(",", ":")))
                if audit and audit.audit_json
                else "",
                audit.created_at.isoformat() if audit and audit.created_at else "",
            ]
            + [flattened.get(header, "") for header in extra_headers]
        )
    stream.seek(0)

    return StreamingResponse(
        iter([stream.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=audit_export.csv"},
    )
