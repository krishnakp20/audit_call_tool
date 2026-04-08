from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.client import Client
from app.models.prompt import ClientPrompt
from app.services.ai_audit_service import run_ai_audit
from app.services.prompt_test_service import transcribe_uploaded_recording
from app.models.user import User
from app.schemas.prompt import PromptCreate, PromptOut, PromptTestOut, PromptUpdate

router = APIRouter(prefix="/prompts", tags=["Prompts"])


def _ensure_single_active_prompt(db: Session, client_id: int) -> None:
    active_prompts = (
        db.query(ClientPrompt)
        .filter(ClientPrompt.client_id == client_id, ClientPrompt.is_active.is_(True))
        .order_by(ClientPrompt.version.desc(), ClientPrompt.id.desc())
        .all()
    )
    if len(active_prompts) <= 1:
        return

    keep_id = active_prompts[0].id
    (
        db.query(ClientPrompt)
        .filter(
            ClientPrompt.client_id == client_id,
            ClientPrompt.is_active.is_(True),
            ClientPrompt.id != keep_id,
        )
        .update({"is_active": False}, synchronize_session=False)
    )
    db.commit()


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
    _ensure_single_active_prompt(db, client_id)
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

    db.query(ClientPrompt).filter(ClientPrompt.client_id == prompt.client_id).update(
        {"is_active": False},
        synchronize_session=False,
    )
    prompt.is_active = True
    db.commit()
    _ensure_single_active_prompt(db, prompt.client_id)
    db.refresh(prompt)
    return prompt


@router.put("/deactivate/{prompt_id}", response_model=PromptOut)
def deactivate_prompt(
    prompt_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> PromptOut:
    prompt = db.query(ClientPrompt).filter(ClientPrompt.id == prompt_id).first()
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")
    prompt.is_active = False
    db.commit()
    db.refresh(prompt)
    return prompt


@router.put("/{prompt_id}", response_model=PromptOut)
def update_prompt(
    prompt_id: int,
    payload: PromptUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> PromptOut:
    prompt = db.query(ClientPrompt).filter(ClientPrompt.id == prompt_id).first()
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")
    prompt.prompt = payload.prompt
    db.commit()
    db.refresh(prompt)
    return prompt

@router.post("/test", response_model=PromptTestOut)
async def test_prompt_with_recording(
    client_id: int = Form(...),
    prompt: str = Form(...),
    transcript_text: str | None = Form(default=None),
    recording_file: UploadFile | None = File(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> PromptTestOut:
    if not db.query(Client).filter(Client.id == client_id).first():
        raise HTTPException(status_code=404, detail="Client not found")

    transcript = (transcript_text or "").strip()
    if recording_file is not None:
        try:
            # ✅ 🔥 FIX: Read file first (handles large files properly)
            file_bytes = await recording_file.read()
            transcript = await transcribe_uploaded_recording(file_bytes)

        except HTTPException:
            if transcript:
                pass
            else:
                raise
    if not transcript:
        raise HTTPException(
            status_code=400,
            detail="Provide transcript_text or upload recording_file for testing",
        )

    try:
        audit_json = await run_ai_audit(prompt=prompt, transcript=transcript)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"LLM request failed: {str(exc)}") from exc
    return PromptTestOut(transcript=transcript, audit_json=audit_json)


@router.post("/test-active", response_model=PromptTestOut)
async def test_active_prompt_with_recording(
    client_id: int = Form(...),
    transcript_text: str | None = Form(default=None),
    recording_file: UploadFile | None = File(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> PromptTestOut:
    if not db.query(Client).filter(Client.id == client_id).first():
        raise HTTPException(status_code=404, detail="Client not found")

    active_prompt = (
        db.query(ClientPrompt)
        .filter(ClientPrompt.client_id == client_id, ClientPrompt.is_active.is_(True))
        .order_by(ClientPrompt.version.desc())
        .first()
    )
    if not active_prompt:
        raise HTTPException(status_code=400, detail="No active prompt found for selected client")

    transcript = (transcript_text or "").strip()
    if recording_file is not None:
        try:
            # ✅ 🔥 SAME FIX (IMPORTANT)
            file_bytes = await recording_file.read()
            transcript = await transcribe_uploaded_recording(file_bytes)

        except HTTPException:
            if not transcript:
                raise

    if not transcript:
        raise HTTPException(
            status_code=400,
            detail="Provide transcript_text or upload recording_file for testing",
        )

    try:
        audit_json = await run_ai_audit(
            prompt=active_prompt.prompt,
            transcript=transcript
        )
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"LLM request failed: {str(exc)}"
        ) from exc

    return PromptTestOut(transcript=transcript, audit_json=audit_json)
