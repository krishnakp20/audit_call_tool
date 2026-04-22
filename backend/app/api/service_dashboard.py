import json
from collections import defaultdict, Counter
from datetime import date
from statistics import mean

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.audit import CallAudit
from app.models.call_log import CallLog
from app.models.user import User
from pydantic import BaseModel
from sqlalchemy import func

router = APIRouter(prefix="/service-dashboard", tags=["Service Dashboard"])

@router.get("/overview")
def service_overview(
    client_id: int = Query(...),
    date_from: date = Query(...),
    date_to: date = Query(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    audits = (
        db.query(CallAudit)
        .filter(
            CallAudit.client_id == client_id,
            func.date(CallAudit.created_at) >= date_from,
            func.date(CallAudit.created_at) <= date_to
        )
        .all()
    )

    if not audits:
        return {
            "cards": {},
            "parameter_scores": {},
            "agents": []
        }

    total_calls = len(audits)

    # ✅ USE CORRECT COLUMN
    avg_score = round(mean([a.percentage or 0 for a in audits]), 2)

    # ================= FCR =================
    fcr_rate = round(
        mean([
            100 if (a.audit_json.get("conversion_status") == "Converted") else 0
            for a in audits if a.audit_json
        ]),
        2
    )

    # ================= CRITICAL =================
    critical_fails = sum(1 for a in audits if (a.percentage or 0) < 50)

    # ================= UNCLEAR =================
    unclear_rate = round(
        mean([
            len(a.audit_json.get("areas_for_improvement", [])) * 5
            for a in audits if a.audit_json
        ]),
        2
    )

    # ================= PARAMETER SCORES =================

    def section_avg(section):
        values = []
        for a in audits:
            if not a.audit_json:
                continue
            score = a.audit_json.get("sections", {}).get(section, {}).get("score", 0)
            values.append(score)
        return round(mean(values), 2) if values else 0

    parameter_scores = {
        "opening": section_avg("opening"),
        "understanding": section_avg("probing_resolution"),
        "resolution": section_avg("probing_resolution"),
        "communication": section_avg("communication"),
        "control": section_avg("process_compliance"),
        "process": section_avg("process_compliance"),
        "closing": section_avg("closure"),
    }

    # ================= AGENT =================

    agent_map = defaultdict(list)

    for a in audits:
        agent_name = getattr(a, "agent_id", "Unknown")  # change if you have name
        agent_map[agent_name].append(a)

    agents = []

    for agent, rows in agent_map.items():
        calls = len(rows)

        avg_s = round(mean([r.percentage or 0 for r in rows]), 2)

        fcr = round(
            mean([
                100 if (r.audit_json.get("conversion_status") == "Converted") else 0
                for r in rows if r.audit_json
            ]),
            2
        )

        if avg_s >= 75:
            status = "Good"
        elif avg_s >= 50:
            status = "Average"
        else:
            status = "Critical"

        agents.append({
            "name": str(agent),
            "calls": calls,
            "avg_score": avg_s,
            "fcr": fcr,
            "status": status
        })

    return {
        "cards": {
            "calls_audited": total_calls,
            "avg_score": avg_score,
            "fcr_rate": fcr_rate,
            "critical_fails": critical_fails,
            "unclear_rate": unclear_rate,
            "late_opening": 0,
            "wrong_info": 0,
            "no_closing": 0
        },
        "parameter_scores": parameter_scores,
        "agents": agents
    }