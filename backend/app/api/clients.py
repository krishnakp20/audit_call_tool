from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.client import Client
from app.models.user import User
from app.schemas.client import ClientCreate, ClientOut, ClientUpdate

router = APIRouter(prefix="/clients", tags=["Clients"])


@router.post("", response_model=ClientOut)
def create_client(
    payload: ClientCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ClientOut:
    client = Client(**payload.model_dump())
    db.add(client)
    db.commit()
    db.refresh(client)
    return client


@router.get("", response_model=list[ClientOut])
def list_clients(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[ClientOut]:
    return db.query(Client).order_by(Client.created_at.desc()).all()


@router.put("/{client_id}", response_model=ClientOut)
def update_client(
    client_id: int,
    payload: ClientUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ClientOut:
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    for key, value in payload.model_dump(exclude_none=True).items():
        setattr(client, key, value)
    db.commit()
    db.refresh(client)
    return client
