from sqlalchemy import ForeignKey, Integer, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base


class Setting(Base):
    __tablename__ = "settings"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    client_id: Mapped[int] = mapped_column(ForeignKey("clients.id", ondelete="CASCADE"), unique=True, nullable=False)
    audit_limit_per_day: Mapped[int] = mapped_column(Integer, nullable=False, default=100)
    min_call_duration: Mapped[int] = mapped_column(Integer, nullable=False, default=20)
    max_call_duration: Mapped[int] = mapped_column(Integer, nullable=False, default=3600)
    agents: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    campaign_filter: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    ingroup_filter: Mapped[list] = mapped_column(JSON, nullable=False, default=list)

    client = relationship("Client", back_populates="settings")
