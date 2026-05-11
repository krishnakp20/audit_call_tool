import json
import re
import asyncio
from typing import Any

import httpx
from openai import OpenAI

from app.core.config import get_settings
from app.services.scoring_service import derive_scoring, normalize_section_scores


def _extract_json(content: str) -> dict[str, Any]:
    text = (content or "").strip()
    if not text:
        return {}
    try:
        parsed = json.loads(text)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        pass

    match = re.search(r"\{[\s\S]*\}", text)
    if not match:
        return {}
    try:
        parsed = json.loads(match.group(0))
        return parsed if isinstance(parsed, dict) else {}
    except json.JSONDecodeError:
        return {}


def _run_openai_chat_sync(prompt: str, transcript: str, api_key: str, model: str) -> dict[str, Any]:
    client = OpenAI(api_key=api_key)
    response = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": "Return ONLY valid JSON"},
            {"role": "user", "content": f"{prompt}\n\nConversation:\n{transcript}"},
        ],
        temperature=0,
    )
    content = (response.choices[0].message.content or "").strip()
    return _extract_json(content)


def _mock_audit_response() -> dict[str, Any]:
    return {
        "total_score": 80,
        "percentage": 80,
        "ranking": "B",
        "fatal_flag": False,
        "areas_for_improvement": ["Mock LLM enabled in debug mode. Configure OPENAI_API_KEY or LLM_API_URL."],
    }


def _normalize_audit_json(audit_json: dict[str, Any]) -> dict[str, Any]:
    payload = normalize_section_scores(audit_json or {})
    total_score, percentage, derived_ranking, fatal_flag = derive_scoring(payload)

    payload["total_score"] = int(total_score) if float(total_score).is_integer() else total_score
    payload["percentage"] = int(percentage) if float(percentage).is_integer() else percentage

    # Keep response consistent with computed score bands.
    payload["ranking"] = derived_ranking

    payload["fatal_flag"] = fatal_flag
    # Keep legacy field for frontend/export compatibility.
    if "fatal" not in payload:
        payload["fatal"] = int(fatal_flag)
    return payload


async def run_ai_audit(prompt: str, transcript: str, voice_mail: bool = False) -> dict[str, Any]:
    
    # Skip voicemail calls completely
    if voice_mail:
        return {}

    settings = get_settings()
    llm_url = (settings.llm_api_url or "").strip()
    openai_key = (settings.openai_api_key or "").strip()

    # 1) Prefer explicit custom LLM endpoint when configured.
    if llm_url and "example.com" not in llm_url:
        headers = {"Authorization": f"Bearer {settings.llm_api_key}"} if settings.llm_api_key else {}
        payload = {"prompt": prompt, "transcript": transcript}
        try:
            async with httpx.AsyncClient(timeout=90.0) as client:
                response = await client.post(llm_url, json=payload, headers=headers)
                response.raise_for_status()
            return _normalize_audit_json(response.json())
        except httpx.HTTPError:
            # Fall through to OpenAI if available.
            pass

    # 2) Fallback to OpenAI direct API when key present in .env.
    if openai_key:
        raw = await asyncio.to_thread(_run_openai_chat_sync, prompt, transcript, openai_key, settings.openai_model)
        return _normalize_audit_json(raw)

    # 3) Optional mock fallback (explicitly enabled).
    if settings.llm_mock_enabled:
        return _normalize_audit_json(_mock_audit_response())

    raise RuntimeError(
        "LLM provider is not configured. Set OPENAI_API_KEY or LLM_API_URL in backend/.env, "
        "or set LLM_MOCK_ENABLED=true for mock mode."
    )
