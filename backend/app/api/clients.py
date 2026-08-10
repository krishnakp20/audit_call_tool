from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.deps import get_current_superuser, get_current_user
from app.core.security import get_password_hash
from app.db.session import get_db
from app.models.client import Client
from app.models.user import User
from app.schemas.client import ClientCreate, ClientOut, ClientUpdate

router = APIRouter(prefix="/clients", tags=["Clients"])


def _to_out(client: Client, db: Session) -> ClientOut:
    out = ClientOut.model_validate(client)
    user = db.query(User).filter(User.client_id == client.id).first()
    out.email = user.email if user else None
    return out


@router.post("", response_model=ClientOut)
def create_client(
    payload: ClientCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_superuser),
) -> ClientOut:
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    data = payload.model_dump(exclude={"email", "password"})
    client = Client(**data)
    db.add(client)
    db.flush()

    db.add(
        User(
            email=payload.email,
            password_hash=get_password_hash(payload.password),
            is_active=True,
            is_superuser=False,
            client_id=client.id,
        )
    )

    db.commit()
    db.refresh(client)
    return _to_out(client, db)


@router.get("", response_model=list[ClientOut])
def list_clients(
    department: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ClientOut]:

    query = db.query(Client)

    # CLIENT USER → only their own client
    if not current_user.is_superuser:
        query = query.filter(Client.id == current_user.client_id)
    else:
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

    clients = query.order_by(Client.created_at.desc()).all()

    return [_to_out(client, db) for client in clients]


@router.put("/{client_id}", response_model=ClientOut)
def update_client(
    client_id: int,
    payload: ClientUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_superuser),
) -> ClientOut:
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    data = payload.model_dump(exclude={"email", "password"}, exclude_none=True)
    for key, value in data.items():
        setattr(client, key, value)

    user = db.query(User).filter(User.client_id == client.id).first()

    if payload.email:
        if user:
            user.email = payload.email
        else:
            if not payload.password:
                raise HTTPException(
                    status_code=400,
                    detail="Password is required when setting a new login email"
                )
            db.add(
                User(
                    email=payload.email,
                    password_hash=get_password_hash(payload.password),
                    is_active=True,
                    is_superuser=False,
                    client_id=client.id,
                )
            )

    if payload.password and user:
        user.password_hash = get_password_hash(payload.password)

    db.commit()
    db.refresh(client)
    return _to_out(client, db)


@router.patch("/{client_id}/status")
def toggle_client_status(
    client_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_superuser),
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


@router.delete("/{client_id}")
def delete_client(
    client_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_superuser),
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
