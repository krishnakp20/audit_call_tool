from fastapi import HTTPException, UploadFile, status
from app.services.stt_service import transcribe_audio_bytes


async def transcribe_uploaded_recording(recording_file: UploadFile) -> str:
    file_bytes = await recording_file.read()
    if not file_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded recording is empty")

    filename = recording_file.filename or "recording.wav"
    try:
        return await transcribe_audio_bytes(
            audio_bytes=file_bytes,
            filename=filename,
            content_type=recording_file.content_type or "audio/wav",
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"STT request failed: {str(exc)}. Check STT_API_KEY and STT_API_URL in backend/.env",
        ) from exc
