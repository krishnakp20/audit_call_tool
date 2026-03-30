from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.prompt import ClientPrompt
from app.models.user import User
from app.schemas.prompt import PromptCreate, PromptOut

router = APIRouter(prefix="/prompts", tags=["Prompts"])


@router.post("", response_model=PromptOut)
def create_prompt(
    payload: PromptCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> PromptOut:
    latest_version = (
        db.query(func.max(ClientPrompt.version)).filter(ClientPrompt.client_id == payload.client_id).scalar() or 0
    )
    prompt = ClientPrompt(client_id=payload.client_id, prompt=payload.prompt, version=latest_version + 1, is_active=False)
    db.add(prompt)
    db.commit()
    db.refresh(prompt)
    return prompt


@router.get("/{client_id}", response_model=list[PromptOut])
def list_prompts(client_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)) -> list[PromptOut]:
    return (
        db.query(ClientPrompt)
        .filter(ClientPrompt.client_id == client_id)
        .order_by(ClientPrompt.version.desc())
        .all()
    )


@router.put("/activate/{prompt_id}", response_model=PromptOut)
def activate_prompt(
    prompt_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> PromptOut:
    prompt = db.query(ClientPrompt).filter(ClientPrompt.id == prompt_id).first()
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")

    db.query(ClientPrompt).filter(ClientPrompt.client_id == prompt.client_id).update({"is_active": False})
    prompt.is_active = True
    db.commit()
    db.refresh(prompt)
    return prompt
