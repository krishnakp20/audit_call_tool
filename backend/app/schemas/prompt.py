from pydantic import BaseModel


class PromptCreate(BaseModel):
    client_id: int
    prompt: str


class PromptUpdate(BaseModel):
    prompt: str


class PromptTestOut(BaseModel):
    transcript: str
    audit_json: dict


class PromptOut(BaseModel):
    id: int
    client_id: int
    prompt: str
    version: int
    is_active: bool

    class Config:
        from_attributes = True
