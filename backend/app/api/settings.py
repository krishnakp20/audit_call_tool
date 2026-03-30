from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.settings import Setting
from app.models.user import User
from app.schemas.settings import SettingsOut, SettingsUpsert

router = APIRouter(prefix="/settings", tags=["Settings"])


@router.post("", response_model=SettingsOut)
def upsert_settings(
    payload: SettingsUpsert,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> SettingsOut:
    settings = db.query(Setting).filter(Setting.client_id == payload.client_id).first()
    if settings:
        for key, value in payload.model_dump().items():
            setattr(settings, key, value)
    else:
        settings = Setting(**payload.model_dump())
        db.add(settings)
    db.commit()
    db.refresh(settings)
    return settings


@router.get("/{client_id}", response_model=SettingsOut)
def get_settings(client_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> SettingsOut:
    settings = db.query(Setting).filter(Setting.client_id == client_id).first()
    if not settings:
        raise HTTPException(status_code=404, detail="Settings not found")
    return settings
