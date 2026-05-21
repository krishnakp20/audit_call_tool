from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.client import Client
from app.models.user import User
from app.schemas.client import ClientCreate, ClientOut, ClientUpdate
from sqlalchemy import or_

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
    department: Optional[str] = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[ClientOut]:

    query = db.query(Client)

    # SALES
    if department == "sales":
        query = query.filter(
            or_(
                Client.ingroups == None,
                Client.ingroups == ""
            )
        )

    # SERVICE
    elif department == "service":
        query = query.filter(
            Client.ingroups != None,
            Client.ingroups != ""
        )

    return query.order_by(
        Client.created_at.desc()
    ).all()


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

@router.patch("/{client_id}/status")
def toggle_client_status(
    client_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    client = db.query(Client).filter(Client.id == client_id).first()

    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    # toggle
    client.is_active = 0 if client.is_active == 1 else 1

    db.commit()
    db.refresh(client)

    return {
        "message": "Client status updated",
        "is_active": client.is_active
    }

@router.put("/{client_id}", response_model=ClientOut)
def update_client(
    client_id: int,
    payload: ClientUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):

    client = (
        db.query(Client)
        .filter(Client.id == client_id)
        .first()
    )

    if not client:
        raise HTTPException(
            status_code=404,
            detail="Client not found"
        )

    for key, value in payload.model_dump(
        exclude_none=True
    ).items():
        setattr(client, key, value)

    db.commit()
    db.refresh(client)

    return client

@router.delete("/{client_id}")
def delete_client(
    client_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):

    client = (
        db.query(Client)
        .filter(Client.id == client_id)
        .first()
    )

    if not client:
        raise HTTPException(
            status_code=404,
            detail="Client not found"
        )

    db.delete(client)
    db.commit()

    return {
        "message": "Client deleted successfully"
    }