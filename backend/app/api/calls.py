from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.call_log import CallLog
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
