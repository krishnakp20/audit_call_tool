from typing import Any

import httpx

from app.core.config import get_settings


async def run_ai_audit(prompt: str, transcript: str) -> dict[str, Any]:
    settings = get_settings()
    headers = {"Authorization": f"Bearer {settings.llm_api_key}"} if settings.llm_api_key else {}
    payload = {"prompt": prompt, "transcript": transcript}

    async with httpx.AsyncClient(timeout=90.0) as client:
        response = await client.post(settings.llm_api_url, json=payload, headers=headers)
        response.raise_for_status()
    return response.json()
