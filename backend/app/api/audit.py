from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.audit import CallAudit
from app.models.user import User
from app.schemas.audit import CallAuditOut

router = APIRouter(prefix="/audit", tags=["Audit"])


@router.get("", response_model=list[CallAuditOut])
def list_audits(
    client_id: int = Query(...),
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[CallAuditOut]:
    query = db.query(CallAudit).filter(CallAudit.client_id == client_id)
    if date_from:
        query = query.filter(CallAudit.created_at >= date_from)
    if date_to:
        query = query.filter(CallAudit.created_at <= date_to)
    return query.order_by(CallAudit.created_at.desc()).all()


@router.get("/{call_id}", response_model=CallAuditOut)
def get_audit(call_id: str, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> CallAuditOut:
    audit = db.query(CallAudit).filter(CallAudit.call_id == call_id).first()
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")
    return audit
