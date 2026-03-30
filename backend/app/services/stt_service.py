from typing import Any

import httpx

from app.core.config import get_settings


async def transcribe_audio(recording_path: str) -> str:
    settings = get_settings()
    payload: dict[str, Any] = {"recording_path": recording_path}
    headers = {"Authorization": f"Bearer {settings.stt_api_key}"} if settings.stt_api_key else {}

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(settings.stt_api_url, json=payload, headers=headers)
        response.raise_for_status()
    data = response.json()
    return data.get("transcript", "")
