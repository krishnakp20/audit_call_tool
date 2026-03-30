from pydantic import BaseModel


class DashboardSummaryOut(BaseModel):
    total_calls: int
    audited_calls: int
    avg_score: float
    fatal_calls: int


class AgentPerformanceOut(BaseModel):
    agent_id: str
    avg_score: float
    audited_calls: int
