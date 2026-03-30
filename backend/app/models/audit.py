from sqlalchemy import JSON, Boolean, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class CallAudit(Base, TimestampMixin):
    __tablename__ = "call_audits"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    call_id: Mapped[str] = mapped_column(
        String(128), ForeignKey("call_logs.call_id", ondelete="CASCADE"), index=True, nullable=False
    )
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id", ondelete="CASCADE"), index=True, nullable=False)
    agent_id: Mapped[str] = mapped_column(String(128), index=True, nullable=False)
    audit_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    total_score: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    percentage: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    ranking: Mapped[str] = mapped_column(String(50), nullable=False, default="N/A")
    fatal_flag: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    client = relationship("Client", back_populates="audits")
    call = relationship("CallLog", back_populates="audit")
