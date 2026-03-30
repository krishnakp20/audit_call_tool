from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.api import api_router
from app.core.config import get_settings
from app.core.security import get_password_hash
from app.db.session import SessionLocal
from app.models.user import User

settings = get_settings()

app = FastAPI(title=settings.app_name, debug=settings.debug)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


def _bootstrap_admin(db: Session) -> None:
    if db.query(User).filter(User.email == "admin@callaudit.local").first():
        return
    db.add(
        User(
            email="admin@callaudit.local",
            password_hash=get_password_hash("admin123"),
            is_active=True,
            is_superuser=True,
        )
    )
    db.commit()


@app.on_event("startup")
def startup() -> None:
    db = SessionLocal()
    try:
        _bootstrap_admin(db)
    finally:
        db.close()
