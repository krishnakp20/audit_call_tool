from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class CallLog(Base, TimestampMixin):
    __tablename__ = "call_logs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id", ondelete="CASCADE"), index=True, nullable=False)
    call_id: Mapped[str] = mapped_column(String(128), unique=True, index=True, nullable=False)
    agent_id: Mapped[str] = mapped_column(String(128), index=True, nullable=False)
    start_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    duration: Mapped[int] = mapped_column(Integer, nullable=False)
    recording_path: Mapped[str] = mapped_column(String(1024), nullable=False)
    transcript: Mapped[str | None] = mapped_column(Text, nullable=True)
    voice_mail: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    client = relationship("Client", back_populates="call_logs")
    audit = relationship("CallAudit", back_populates="call", uselist=False, cascade="all, delete-orphan")
