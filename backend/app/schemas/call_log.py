from datetime import datetime

from pydantic import BaseModel


class CallLogOut(BaseModel):
    id: int
    client_id: int
    call_id: str
    agent_id: str
    start_time: datetime
    end_time: datetime
    duration: int
    recording_path: str
    transcript: str | None
    created_at: datetime

    class Config:
        from_attributes = True
