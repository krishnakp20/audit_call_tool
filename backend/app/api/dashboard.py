from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.audit import CallAudit
from app.models.call_log import CallLog
from app.models.user import User
from app.schemas.dashboard import AgentPerformanceOut, DashboardSummaryOut

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


def _effective_percentage(audit: CallAudit) -> float:
    raw = float(audit.percentage or 0)
    payload = audit.audit_json or {}
    json_raw = payload.get("percentage")
    try:
        json_val = float(json_raw) if json_raw is not None else None
    except (TypeError, ValueError):
        json_val = None
    return json_val if raw == 0 and json_val is not None else raw


def _effective_fatal(audit: CallAudit) -> bool:
    payload = audit.audit_json or {}
    if "fatal_flag" in payload:
        return bool(payload.get("fatal_flag"))
    if "fatal" in payload:
        return bool(payload.get("fatal"))
    return bool(audit.fatal_flag)


@router.get("/summary", response_model=DashboardSummaryOut)
def dashboard_summary(
    client_id: int = Query(...),
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> DashboardSummaryOut:
    calls_query = db.query(CallLog).filter(CallLog.client_id == client_id)
    if date_from:
        calls_query = calls_query.filter(CallLog.start_time >= date_from)
    if date_to:
        calls_query = calls_query.filter(CallLog.start_time <= date_to)
    total_calls = calls_query.count()

    audits_query = (
        db.query(CallAudit)
        .join(CallLog, CallLog.call_id == CallAudit.call_id)
        .filter(CallAudit.client_id == client_id)
    )
    if date_from:
        audits_query = audits_query.filter(CallLog.start_time >= date_from)
    if date_to:
        audits_query = audits_query.filter(CallLog.start_time <= date_to)

    audits = audits_query.all()
    audited_calls = len(audits)
    percentages = [_effective_percentage(audit) for audit in audits]
    avg_score = (sum(percentages) / audited_calls) if audited_calls else 0
    fatal_calls = sum(1 for audit in audits if _effective_fatal(audit))

    return DashboardSummaryOut(
        total_calls=int(total_calls),
        audited_calls=int(audited_calls),
        avg_score=round(float(avg_score), 2),
        fatal_calls=int(fatal_calls),
    )


@router.get("/agent-performance", response_model=list[AgentPerformanceOut])
def agent_performance(
    client_id: int = Query(...),
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[AgentPerformanceOut]:
    query = (
        db.query(CallAudit)
        .join(CallLog, CallLog.call_id == CallAudit.call_id)
        .filter(CallAudit.client_id == client_id)
    )
    if date_from:
        query = query.filter(CallLog.start_time >= date_from)
    if date_to:
        query = query.filter(CallLog.start_time <= date_to)

    audits = query.all()
    grouped: dict[str, list[float]] = {}
    for audit in audits:
        grouped.setdefault(audit.agent_id, []).append(_effective_percentage(audit))

    rows = []
    for agent_id, scores in grouped.items():
        avg_score = (sum(scores) / len(scores)) if scores else 0
        rows.append(AgentPerformanceOut(agent_id=agent_id, avg_score=round(float(avg_score), 2), audited_calls=len(scores)))

    rows.sort(key=lambda item: item.avg_score, reverse=True)
    return rows
