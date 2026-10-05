from datetime import date, datetime
import io
import json

from fastapi import APIRouter, Depends, Query, Response
from openpyxl import Workbook
from sqlalchemy import Date, func
from sqlalchemy.orm import Session

from app.core.deps import get_current_superuser, get_current_user
from app.db.session import get_db
from app.models.audit import CallAudit
from app.models.call_log import CallLog
from app.models.client import Client
from app.models.user import User
from app.schemas.call_log import CallLogOut

router = APIRouter(prefix="/calls", tags=["Calls"])


@router.get("", response_model=list[CallLogOut])
def list_calls(
    client_id: int = Query(...),
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[CallLogOut]:
    query = db.query(CallLog).filter(CallLog.client_id == client_id)
    if date_from:
        query = query.filter(CallLog.start_time >= date_from)
    if date_to:
        query = query.filter(CallLog.start_time <= date_to)
    return query.order_by(CallLog.start_time.desc()).all()


@router.get("/call-details-export")
def export_call_details(
    start_date: date = Query(..., description="Start date (YYYY-MM-DD)"),
    end_date: date = Query(..., description="End date (YYYY-MM-DD)"),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_superuser),
) -> Response:
    rows = (
        db.query(CallLog, Client, CallAudit)
        .join(Client, Client.id == CallLog.client_id)
        .outerjoin(CallAudit, CallAudit.call_id == CallLog.call_id)
        .filter(func.date(CallAudit.created_at) >= start_date)
        .filter(func.date(CallAudit.created_at) <= end_date)
        .order_by(CallLog.start_time.desc())
        .all()
    )

    wb = Workbook()
    ws = wb.active
    ws.title = "Call Details"

    headers = [
        "Client_name",
        "Mobile Number",
        "Call Duration",
        "Transcript Text",
        "Json",
        "recording Link",
        "Total Tokens",
        "Cost",
    ]
    ws.append(headers)

    for call_log, client, call_audit in rows:
        audit_json = call_audit.audit_json if call_audit and call_audit.audit_json else {}

        mobile_number = call_log.phone_number or ""

        if not mobile_number and isinstance(audit_json, dict):
            mobile_number = (
                str(audit_json.get("customer_phone") or "")
                or str(audit_json.get("mobile") or "")
                or str(audit_json.get("phone") or "")
                or str(audit_json.get("customer_mobile") or "")
                or str(audit_json.get("caller_number") or "")
                or str(audit_json.get("dialed_number") or "")
            )

        json_str = ""
        if audit_json:
            try:
                json_str = json.dumps(audit_json, ensure_ascii=False)
            except Exception:
                json_str = str(audit_json)

        transcript_text = call_log.transcript or ""

        recording_link = call_log.recording_path or ""

        duration_val = call_log.duration if call_log.duration is not None else 0

        total_tokens_val = int(call_audit.total_tokens or 0) if call_audit else 0
        cost_val = float(call_audit.cost or 0) if call_audit else 0.0

        ws.append(
            [
                client.name if client else "",
                mobile_number,
                duration_val,
                transcript_text,
                json_str,
                recording_link,
                total_tokens_val,
                cost_val,
            ]
        )

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    filename = f"call_details_{start_date}_{end_date}.xlsx"
    return Response(
        content=output.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
