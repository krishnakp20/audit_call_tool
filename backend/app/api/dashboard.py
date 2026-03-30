from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.audit import CallAudit
from app.models.call_log import CallLog
from app.models.user import User
from app.schemas.dashboard import AgentPerformanceOut, DashboardSummaryOut

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/summary", response_model=DashboardSummaryOut)
def dashboard_summary(
    client_id: int = Query(...),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> DashboardSummaryOut:
    total_calls = db.query(func.count(CallLog.id)).filter(CallLog.client_id == client_id).scalar() or 0
    audited_calls = db.query(func.count(CallAudit.id)).filter(CallAudit.client_id == client_id).scalar() or 0
    avg_score = db.query(func.avg(CallAudit.percentage)).filter(CallAudit.client_id == client_id).scalar() or 0
    fatal_calls = (
        db.query(func.sum(case((CallAudit.fatal_flag.is_(True), 1), else_=0)))
        .filter(CallAudit.client_id == client_id)
        .scalar()
        or 0
    )
    return DashboardSummaryOut(
        total_calls=int(total_calls),
        audited_calls=int(audited_calls),
        avg_score=round(float(avg_score), 2),
        fatal_calls=int(fatal_calls),
    )


@router.get("/agent-performance", response_model=list[AgentPerformanceOut])
def agent_performance(
    client_id: int = Query(...),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[AgentPerformanceOut]:
    rows = (
        db.query(
            CallAudit.agent_id.label("agent_id"),
            func.avg(CallAudit.percentage).label("avg_score"),
            func.count(CallAudit.id).label("audited_calls"),
        )
        .filter(CallAudit.client_id == client_id)
        .group_by(CallAudit.agent_id)
        .order_by(func.avg(CallAudit.percentage).desc())
        .all()
    )
    return [
        AgentPerformanceOut(agent_id=row.agent_id, avg_score=float(row.avg_score or 0), audited_calls=int(row.audited_calls))
        for row in rows
    ]
