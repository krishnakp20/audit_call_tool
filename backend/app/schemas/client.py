from datetime import datetime

from pydantic import BaseModel


class ClientBase(BaseModel):
    name: str
    dialer_ip: str
    dialer_user: str
    dialer_pass: str
    db_host: str
    db_user: str
    db_pass: str
    campaigns: str = ""
    ingroups: str = ""


class ClientCreate(ClientBase):
    pass


class ClientUpdate(BaseModel):
    name: str | None = None
    dialer_ip: str | None = None
    dialer_user: str | None = None
    dialer_pass: str | None = None
    db_host: str | None = None
    db_user: str | None = None
    db_pass: str | None = None
    campaigns: str | None = None
    ingroups: str | None = None


class ClientOut(BaseModel):
    id: int
    name: str
    is_active: int

    dialer_ip: str
    dialer_user: str

    db_host: str
    db_user: str

    campaigns: str
    ingroups: str

    created_at: datetime

    class Config:
        from_attributes = True
