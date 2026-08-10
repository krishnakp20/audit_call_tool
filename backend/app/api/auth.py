from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import create_access_token, verify_password
from app.db.session import get_db
from app.models.client import Client
from app.models.user import User
from app.schemas.auth import LoginRequest, LoginResponse

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> LoginResponse:
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token = create_access_token(
        subject=str(user.id),
        extra={"email": user.email, "is_superuser": user.is_superuser},
    )

    client_id = None
    client_name = None
    department = None

    if user.client_id:
        client = db.query(Client).filter(Client.id == user.client_id).first()
        client_id = client.id if client else None
        client_name = client.name if client else None
        if client:
            department = "service" if client.ingroups else "sales"

    return LoginResponse(
        access_token=token,
        email=user.email,
        is_superuser=user.is_superuser,
        client_id=client_id,
        client_name=client_name,
        department=department,
    )
