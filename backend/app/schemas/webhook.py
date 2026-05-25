from datetime import datetime

from pydantic import BaseModel


class WebhookCallRequest(BaseModel):
    client_id: int
    call_id: str
    agent_id: str
    start_time: datetime
    end_time: datetime
    duration: int
    recording_path: str