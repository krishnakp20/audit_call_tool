from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class Client(Base, TimestampMixin):
    __tablename__ = "clients"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    dialer_ip: Mapped[str] = mapped_column(String(128), nullable=False)
    dialer_user: Mapped[str] = mapped_column(String(128), nullable=False)
    dialer_pass: Mapped[str] = mapped_column(String(255), nullable=False)
    db_host: Mapped[str] = mapped_column(String(128), nullable=False)
    db_user: Mapped[str] = mapped_column(String(128), nullable=False)
    db_pass: Mapped[str] = mapped_column(String(255), nullable=False)
    campaigns: Mapped[str] = mapped_column(Text, default="", nullable=False)
    ingroups: Mapped[str] = mapped_column(Text, default="", nullable=False)

    call_logs = relationship("CallLog", back_populates="client", cascade="all, delete-orphan")
    audits = relationship("CallAudit", back_populates="client", cascade="all, delete-orphan")
    prompts = relationship("ClientPrompt", back_populates="client", cascade="all, delete-orphan")
    settings = relationship("Setting", back_populates="client", cascade="all, delete-orphan")
