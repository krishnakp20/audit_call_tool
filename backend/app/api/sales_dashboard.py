
from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.audit import CallAudit
from app.models.call_log import CallLog
from app.models.user import User
from pydantic import BaseModel
from sqlalchemy import func

router = APIRouter(prefix="/sale-dashboard", tags=["Sales Dashboard"])


# ✅ Response Schema
class QualitySummaryOut(BaseModel):
    total_calls: int
    avg_quality_score: float
    conversion: float
    partial_conversion: float
    no_conversion: float


# ✅ Reuse same logic
def _effective_percentage(audit: CallAudit) -> float:
    raw = float(audit.percentage or 0)
    payload = audit.audit_json or {}
    json_raw = payload.get("percentage")
    try:
        json_val = float(json_raw) if json_raw is not None else None
    except (TypeError, ValueError):
        json_val = None
    return json_val if raw == 0 and json_val is not None else raw


@router.get("/quality-summary", response_model=QualitySummaryOut)
def quality_summary(
    client_id: int = Query(...),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    db: Session = Depends(get_db),
    # _: User = Depends(get_current_user),
) -> QualitySummaryOut:

    # ✅ Total Calls (from CallLog)
    calls_query = db.query(CallLog).filter(CallLog.client_id == client_id)

    if date_from:
        calls_query = calls_query.filter(func.date(CallLog.start_time) >= date_from)
    if date_to:
        calls_query = calls_query.filter(func.date(CallLog.start_time) <= date_to)

    total_calls = calls_query.count()

    # ✅ Audits (for avg score)
    audits_query = (
        db.query(CallAudit)
        .join(CallLog, CallLog.call_id == CallAudit.call_id)
        .filter(CallAudit.client_id == client_id)
    )

    if date_from:
        audits_query = audits_query.filter(func.date(CallLog.start_time) >= date_from)
    if date_to:
        audits_query = audits_query.filter(func.date(CallLog.start_time) <= date_to)

    audits = audits_query.all()

    # ✅ Avg Score Calculation (same as your reference)
    audited_calls = len(audits)
    percentages = [_effective_percentage(audit) for audit in audits]
    avg_score = (sum(percentages) / audited_calls) if audited_calls else 0

    # ✅ Conversion Counts
    conversion = 0
    partial_conversion = 0
    no_conversion = 0

    for audit in audits:
        payload = audit.audit_json or {}
        status = (payload.get("conversion_status") or "").strip().lower()

        if status == "conversion":
            conversion += 1
        elif status == "partial conversion":
            partial_conversion += 1
        else:
        # elif status == "no conversion":
            no_conversion += 1

    # ✅ Convert to %
    conversion_pct = (conversion / audited_calls * 100) if audited_calls else 0
    partial_pct = (partial_conversion / audited_calls * 100) if audited_calls else 0
    no_conversion_pct = (no_conversion / audited_calls * 100) if audited_calls else 0

    return QualitySummaryOut(
        total_calls=int(total_calls),
        avg_quality_score=round(float(avg_score), 2),
        conversion=round(conversion_pct, 1),
        partial_conversion=round(partial_pct, 1),
        no_conversion=round(no_conversion_pct, 1),
    )



@router.get("/recalculate-summary")
def recalculate_summary(
    client_id: int = Query(...),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    db: Session = Depends(get_db),
):

    # ✅ Fetch audits with join
    audits_query = (
        db.query(CallAudit)
        .join(CallLog, CallLog.call_id == CallAudit.call_id)
        .filter(CallAudit.client_id == client_id)
    )

    if date_from:
        audits_query = audits_query.filter(func.date(CallLog.start_time) >= date_from)
    if date_to:
        audits_query = audits_query.filter(func.date(CallLog.start_time) <= date_to)

    audits = audits_query.all()

    # ✅ Aggregation containers
    section_summary = {}
    total_score = 0
    total_possible = 0

    # ✅ Loop all audits
    for audit in audits:
        payload = audit.audit_json or {}
        sections = payload.get("sections", {})

        for section_name, section_data in sections.items():
            parameters = section_data.get("parameters", {})

            section_score = 0
            param_count = 0

            for param in parameters.values():
                if isinstance(param, dict):
                    section_score += int(param.get("score", 0))
                else:
                    section_score += int(param or 0)

                param_count += 1

            section_possible = param_count * 2

            # Initialize if not present
            if section_name not in section_summary:
                section_summary[section_name] = {
                    "score": 0,
                    "total_possible": 0,
                    "parameter_count": 0
                }

            # Aggregate
            section_summary[section_name]["score"] += section_score
            section_summary[section_name]["total_possible"] += section_possible
            section_summary[section_name]["parameter_count"] += param_count

            # Global totals
            total_score += section_score
            total_possible += section_possible

    # ✅ Add section-wise %
    for section in section_summary.values():
        score = section["score"]
        possible = section["total_possible"]

        section["percentage"] = round((score / possible * 100), 1) if possible else 0

    # ✅ Overall %
    overall_percentage = (total_score / total_possible * 100) if total_possible else 0

    return {
        "total_calls": len(audits),
        "sections": section_summary,
        "total_score": total_score,
        "total_possible": total_possible,
        "percentage": round(overall_percentage, 1),
    }







@router.get("/agent-recalculate-summary")
def agent_recalculate_summary(
    client_id: int = Query(...),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    db: Session = Depends(get_db),
):

    audits_query = (
        db.query(CallAudit, CallLog.agent_id)
        .join(CallLog, CallLog.call_id == CallAudit.call_id)
        .filter(CallAudit.client_id == client_id)
    )

    if date_from:
        audits_query = audits_query.filter(func.date(CallLog.start_time) >= date_from)
    if date_to:
        audits_query = audits_query.filter(func.date(CallLog.start_time) <= date_to)

    records = audits_query.all()

    agent_data = {}

    for audit, agent_id in records:

        if agent_id not in agent_data:
            agent_data[agent_id] = {
                "total_calls": 0,
                "sections": {},
                "total_score": 0,
                "total_possible": 0,
                "conversion": 0,
                "partial": 0,
                "no_conversion": 0,
                "percentages": []  # ✅ store per-audit %
            }

        agent = agent_data[agent_id]

        agent["total_calls"] += 1

        # ✅ Collect percentage (correct logic)
        agent["percentages"].append(_effective_percentage(audit))

        payload = audit.audit_json or {}

        # ✅ Conversion tracking
        status = (payload.get("conversion_status") or "").strip().lower()

        if status == "conversion":
            agent["conversion"] += 1
        elif status == "partial conversion":
            agent["partial"] += 1
        else:
        # elif status == "no conversion":
            agent["no_conversion"] += 1

        sections = payload.get("sections", {})

        for section_name, section_data in sections.items():
            parameters = section_data.get("parameters", {})

            section_score = 0
            param_count = 0

            for param in parameters.values():
                if isinstance(param, dict):
                    section_score += int(param.get("score", 0))
                else:
                    section_score += int(param or 0)

                param_count += 1

            section_possible = param_count * 2

            if section_name not in agent["sections"]:
                agent["sections"][section_name] = {
                    "score": 0,
                    "total_possible": 0,
                    "parameter_count": 0
                }

            agent["sections"][section_name]["score"] += section_score
            agent["sections"][section_name]["total_possible"] += section_possible
            agent["sections"][section_name]["parameter_count"] += param_count

            agent["total_score"] += section_score
            agent["total_possible"] += section_possible

    # ✅ Final calculations
    for agent_id, data in agent_data.items():

        total_calls = data["total_calls"]

        # ✅ Avg Score (CORRECT)
        percentages = data.pop("percentages", [])
        avg_score = (sum(percentages) / len(percentages)) if percentages else 0
        data["avg_score"] = round(avg_score, 2)

        # Section %
        for section in data["sections"].values():
            score = section["score"]
            possible = section["total_possible"]
            section["percentage"] = round((score / possible * 100), 1) if possible else 0

        # Overall %
        total_score = data["total_score"]
        total_possible = data["total_possible"]

        overall_pct = (total_score / total_possible * 100) if total_possible else 0
        data["percentage"] = round(overall_pct, 1)

        # ✅ Conversion %
        conv = data["conversion"]
        partial = data["partial"]
        no_conv = data["no_conversion"]

        data["conversion_pct"] = round((conv / total_calls * 100), 1) if total_calls else 0
        data["partial_pct"] = round((partial / total_calls * 100), 1) if total_calls else 0
        data["no_conversion_pct"] = round((no_conv / total_calls * 100), 1) if total_calls else 0

        # ✅ Strength & Gap
        section_percents = {
            name: sec["percentage"]
            for name, sec in data["sections"].items()
        }

        if section_percents:
            data["strength"] = max(section_percents, key=section_percents.get)
            data["gap"] = min(section_percents, key=section_percents.get)
        else:
            data["strength"] = None
            data["gap"] = None

    return agent_data