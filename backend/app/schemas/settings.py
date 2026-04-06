from pydantic import BaseModel, Field


class SettingsUpsert(BaseModel):
    client_id: int
    audit_calls_per_agent: int = 0
    total: int = 0
    min_call_duration: int = 20
    max_call_duration: int = 3600
    agents: list[str] = Field(default_factory=list)
    campaign_filter: list[str] = Field(default_factory=list)
    ingroup_filter: list[str] = Field(default_factory=list)


class SettingsOut(SettingsUpsert):
    id: int

    class Config:
        from_attributes = True
