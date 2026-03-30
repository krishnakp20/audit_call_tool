import csv
import io
from datetime import datetime

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.audit import CallAudit
from app.models.user import User

router = APIRouter(prefix="/export", tags=["Export"])


@router.get("")
def export_audits(
    client_id: int = Query(...),
    from_date: datetime = Query(..., alias="from"),
    to_date: datetime = Query(..., alias="to"),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    rows = (
        db.query(CallAudit)
        .filter(
            CallAudit.client_id == client_id,
            CallAudit.created_at >= from_date,
            CallAudit.created_at <= to_date,
        )
        .order_by(CallAudit.created_at.desc())
        .all()
    )

    stream = io.StringIO()
    writer = csv.writer(stream)
    writer.writerow(["call_id", "agent_id", "total_score", "percentage", "ranking", "fatal_flag", "created_at"])
    for row in rows:
        writer.writerow(
            [
                row.call_id,
                row.agent_id,
                row.total_score,
                row.percentage,
                row.ranking,
                row.fatal_flag,
                row.created_at.isoformat(),
            ]
        )
    stream.seek(0)

    return StreamingResponse(
        iter([stream.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=audit_export.csv"},
    )
