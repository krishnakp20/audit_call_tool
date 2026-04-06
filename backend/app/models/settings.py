from sqlalchemy import ForeignKey, Integer, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class Setting(Base):
    __tablename__ = "settings"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    client_id: Mapped[int] = mapped_column(
        ForeignKey("clients.id", ondelete="CASCADE"),
        unique=True,
        nullable=False
    )

    audit_calls_per_agent: Mapped[int] = mapped_column(Integer, default=0)
    total: Mapped[int] = mapped_column(Integer, default=0)
    min_call_duration: Mapped[int] = mapped_column(Integer, default=20)
    max_call_duration: Mapped[int] = mapped_column(Integer, default=3600)

    # ✅ FIXED
    agents: Mapped[list] = mapped_column(JSON, default=lambda: [])
    campaign_filter: Mapped[list] = mapped_column(JSON, default=lambda: [])
    ingroup_filter: Mapped[list] = mapped_column(JSON, default=lambda: [])

    client = relationship("Client", back_populates="settings")
