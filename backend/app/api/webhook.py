from fastapi import APIRouter, Depends, HTTPException, Header, status
from sqlalchemy.orm import Session

from app.core.security import generate_webhook_sha
from app.db.session import get_db
from app.models.call_log import CallLog
from app.schemas.webhook import WebhookCallRequest

import csv
import io

from datetime import datetime, timedelta
from fastapi import UploadFile, File
from fastapi.responses import StreamingResponse

router = APIRouter(prefix="/webhook", tags=["Webhook"])


# =========================================
# GENERATE SHA API
# =========================================
@router.get("/generate-sha/{client_id}")
def generate_sha(client_id: int):

    sha_key = generate_webhook_sha(client_id)

    return {
        "status": True,
        "client_id": client_id,
        "sha_key": sha_key
    }


# =========================================
# SAVE CALL LOG API
# =========================================
@router.post("/call-log")
def save_call_log(
    payload: WebhookCallRequest,
    db: Session = Depends(get_db),
    x_sha_key: str = Header(...),
):
    try:
        # ✅ VALIDATE SHA
        expected_sha = generate_webhook_sha(payload.client_id)

        if x_sha_key != expected_sha:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid SHA Key"
            )

        # ✅ DUPLICATE CHECK
        existing = (
            db.query(CallLog)
            .filter(CallLog.call_id == payload.call_id)
            .first()
        )

        if existing:
            return {
                "status": False,
                "message": "Call already exists"
            }

        # ✅ SAVE DATA
        call_log = CallLog(
            client_id=payload.client_id,
            call_id=payload.call_id,
            agent_id=payload.agent_id,
            start_time=payload.start_time,
            end_time=payload.end_time,
            duration=payload.duration,
            recording_path=payload.recording_path,
        )

        db.add(call_log)
        db.commit()
        db.refresh(call_log)

        return {
            "status": True,
            "message": "Call log saved successfully",
            "id": call_log.id
        }

    except HTTPException:
        raise

    except Exception as e:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/upload-csv")
def upload_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    try:
        content = file.file.read().decode("utf-8")

        csv_reader = csv.DictReader(io.StringIO(content))

        inserted = 0

        for row in csv_reader:

            start_time = datetime.fromisoformat(row["start_time"])

            duration = int(row["duration"])

            end_time = start_time + timedelta(seconds=duration)

            existing = (
                db.query(CallLog)
                .filter(CallLog.call_id == row["call_id"])
                .first()
            )

            if existing:
                continue

            call_log = CallLog(
                client_id=int(row["client_id"]),
                call_id=row["call_id"],
                agent_id=row["agent_id"],
                start_time=start_time,
                end_time=end_time,
                duration=duration,
                recording_path=row["recording_path"],
            )

            db.add(call_log)

            inserted += 1

        db.commit()

        return {
            "status": True,
            "inserted": inserted
        }

    except Exception as e:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

@router.get("/download-csv")
def download_csv():
    output = io.StringIO()

    writer = csv.writer(output)

    # HEADER
    writer.writerow([
        "client_id",
        "call_id",
        "agent_id",
        "start_time",
        "end_time",
        "duration",
        "recording_path"
    ])

    # DUMMY SAMPLE DATA
    writer.writerow([
        5,
        "Room-212509-1779429402",
        "IDC61161",
        "2026-05-22T07:19:49.660Z",
        "2026-05-22T07:19:49.660Z",
        100,
        "http://192.168.10.12/RECORDINGS/MP3/AJMAL0000_20260522-113903_912269176056_IDC61721-all.mp3"
    ])

    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition":
            "attachment; filename=sample_call_logs.csv"
        },
    )