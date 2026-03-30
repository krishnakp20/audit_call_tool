from datetime import datetime
from typing import Any

from pydantic import BaseModel


class CallAuditOut(BaseModel):
    id: int
    call_id: str
    client_id: int
    agent_id: str
    audit_json: dict[str, Any]
    total_score: float
    percentage: float
    ranking: str
    fatal_flag: bool
    created_at: datetime

    class Config:
        from_attributes = True
