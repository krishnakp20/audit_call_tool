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

    # ================= NO CLOSING =================
    no_closing = 0

    for a in audits:
        if not a.audit_json:
            continue

        data = a.audit_json

        closure_params = (
            data.get("sections", {})
            .get("closure", {})
            .get("parameters", {})
        )

        resolution_params = (
            data.get("sections", {})
            .get("understanding_resolution", {})
            .get("parameters", {})
        )

        conversion_status = data.get("conversion_status") or data.get("sentiment", {}).get("conversion_status")

        missing_closure = (
                closure_params.get("proper_closure", {}).get("score", 1) == 0
                or closure_params.get("polite_end", {}).get("score", 1) == 0
                or closure_params.get("asked_additional_help", {}).get("score", 1) == 0
                or closure_params.get("customer_satisfaction_check", {}).get("score", 1) == 0
        )

        incomplete_resolution = (
                resolution_params.get("completeness_of_resolution", {}).get("score", 1) == 0
        )

        not_converted = conversion_status != "Conversion"

        if missing_closure or incomplete_resolution or not_converted:
            no_closing += 1

    return {
        "cards": {
            "calls_audited": total_calls,
            "avg_score": avg_score,
            "fcr_rate": fcr_rate,
            "critical_fails": critical_fails,
            "unclear_rate": unclear_rate,
            "late_opening": 0,
            "wrong_info": 0,
            "no_closing": no_closing
        },
        "parameter_scores": parameter_scores,
        "agents": agents
    }


@router.get("/score-trends")
def score_trends(
    client_id: int = Query(...),
    date_from: date = Query(...),
    date_to: date = Query(...),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    # ================= FETCH =================
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
            "trend": [],
            "agents": []
        }

    # ================= DAILY TREND =================
    daily = defaultdict(list)

    for a in audits:
        day = a.created_at.date()

        try:
            audit_json = a.audit_json
            if isinstance(audit_json, str):
                audit_json = json.loads(audit_json)
        except:
            audit_json = {}

        total_score = audit_json.get("total_score", 0)
        fcr = audit_json.get("percentage", 0)  # you can adjust logic
        fatal = audit_json.get("fatal", 0)

        daily[day].append({
            "score": total_score,
            "fcr": fcr,
            "fatal": fatal
        })

    trend = []

    for d, items in sorted(daily.items()):
        count = len(items)

        avg_score = sum(i["score"] for i in items) / count if count else 0
        avg_fcr = sum(i["fcr"] for i in items) / count if count else 0
        critical = sum(1 for i in items if i["score"] < 50)

        trend.append({
            "date": str(d),
            "score": round(avg_score, 2),
            "fcr": round(avg_fcr, 2),
            "critical": critical
        })

    # ================= AGENT TREND =================
    agent_week = defaultdict(lambda: defaultdict(list))

    for a in audits:
        week = a.created_at.strftime("W%U")  # week format
        agent = f"Agent-{a.agent_id}"

        try:
            audit_json = a.audit_json
            if isinstance(audit_json, str):
                audit_json = json.loads(audit_json)
        except:
            audit_json = {}

        score = audit_json.get("total_score", 0)

        agent_week[week][agent].append(score)

    agents = []

    for week, agents_data in sorted(agent_week.items()):
        row = {"week": week}

        for agent, scores in agents_data.items():
            avg = sum(scores) / len(scores) if scores else 0
            row[agent] = round(avg, 2)

        agents.append(row)

    # ================= FINAL =================
    return {
        "trend": trend,
        "agents": agents
    }

@router.get("/call-audit-log")
def call_audit_log(
    client_id: int,
    date_from: date,
    date_to: date,
    page: int = Query(1, ge=1),
    limit: int = Query(15, ge=1, le=100),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):

    # ✅ BASE QUERY
    query = db.query(CallAudit).filter(
        CallAudit.client_id == client_id,
        func.date(CallAudit.created_at) >= date_from,
        func.date(CallAudit.created_at) <= date_to
    )

    # ✅ TOTAL COUNT (IMPORTANT)
    total = query.count()

    # ✅ PAGINATION
    audits = (
        query
        .order_by(CallAudit.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
        .all()
    )

    response = []

    for a in audits:
        data = a.audit_json or {}
        sections = data.get("sections", {})

        def sec_score(name, total):
            val = sections.get(name, {}).get("score", 0)
            return f"{val}/{total}"

        response.append({
            "id": f"CS-{a.id}",
            "agent": a.agent_id or "Unknown",
            "client_id": a.client_id,
            "date": str(a.created_at.date()),
            "duration": "0m0s",  # update if available
            "score": a.total_score or 0,
            "fcr": data.get("conversion_status", "Partial"),

            "opening": sec_score("opening", 14),
            "understanding": sec_score("probing_resolution", 30),
            "resolution": sec_score("probing_resolution", 30),
            "comms": sec_score("communication", 26),
            "control": sec_score("process_compliance", 20),
            "closing": sec_score("closure", 12),

            "unclear": f"{data.get('percentage', 0)}%"
        })

    # ✅ FINAL RESPONSE
    return {
        "data": response,
        "total": total,
        "page": page,
        "limit": limit
    }

@router.get("/agent-scorecard")
def agent_scorecard(
    client_id: int,
    date_from: date,
    date_to: date,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    audits = db.query(CallAudit).filter(
        CallAudit.client_id == client_id,
        func.date(CallAudit.created_at) >= date_from,
        func.date(CallAudit.created_at) <= date_to
    ).all()

    agent_map = {}

    for a in audits:
        agent = a.agent_id or "Unknown"
        data = a.audit_json or {}
        sections = data.get("sections", {})

        if agent not in agent_map:
            agent_map[agent] = {
                "name": agent,
                "scores": [],
                "fcr": [],
                "metrics": {
                    "Opening": [],
                    "Understanding": [],
                    "Resolution": [],
                    "Communication": [],
                    "Control": [],
                    "Adherence": [],
                    "Closing": []
                }
            }

        # total score
        agent_map[agent]["scores"].append(a.total_score or 0)

        # fcr
        fcr_val = data.get("conversion_status", "Partial")
        agent_map[agent]["fcr"].append(1 if fcr_val == "Yes" else 0)

        # metrics mapping
        def get_score(section):
            return sections.get(section, {}).get("score", 0)

        agent_map[agent]["metrics"]["Opening"].append(get_score("opening"))
        agent_map[agent]["metrics"]["Understanding"].append(get_score("probing_resolution"))
        agent_map[agent]["metrics"]["Resolution"].append(get_score("probing_resolution"))
        agent_map[agent]["metrics"]["Communication"].append(get_score("communication"))
        agent_map[agent]["metrics"]["Control"].append(get_score("process_compliance"))
        agent_map[agent]["metrics"]["Adherence"].append(get_score("process_compliance"))
        agent_map[agent]["metrics"]["Closing"].append(get_score("closure"))

    response = []

    for agent, val in agent_map.items():
        avg_score = sum(val["scores"]) / len(val["scores"]) if val["scores"] else 0
        fcr_rate = (sum(val["fcr"]) / len(val["fcr"])) * 100 if val["fcr"] else 0

        metrics = []
        for k, v in val["metrics"].items():
            avg = sum(v) / len(v) if v else 0
            metrics.append({
                "label": k,
                "value": round((avg / 30) * 100, 0)   # normalize %
            })

        tag = "Good" if avg_score >= 75 else "Average" if avg_score >= 50 else "Critical"

        response.append({
            "name": agent,
            "tag": tag,
            "avg": round(avg_score, 1),
            "fcr": round(fcr_rate, 1),
            "metrics": metrics,
            "issue": "Auto-generated insight"
        })

    return {"agents": response}



@router.get("/sub-parameter-drill")
def sub_parameter_drill(
    client_id: int,
    date_from: date,
    date_to: date,
    agent: str | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):

    audits = db.query(CallAudit).filter(
        CallAudit.client_id == client_id,
        func.date(CallAudit.created_at) >= date_from,
        func.date(CallAudit.created_at) <= date_to
    ).all()

    if not audits:
        return {"sub_params": [], "agents": [], "agent_list": []}

    # ================= HELPER =================

    def get_param(section, key):
        param = section.get("parameters", {}).get(key, 0)

        # ✅ CASE 1: dict
        if isinstance(param, dict):
            return param.get("score", 0)

        # ✅ CASE 2: int
        if isinstance(param, (int, float)):
            return param

        return 0

    def avg(arr):
        return int(sum(arr) / len(arr)) if arr else 0

    # ================= AGGREGATE =================

    agent_scores = defaultdict(lambda: defaultdict(list))

    for a in audits:
        data = a.audit_json or {}

        agent_name = a.agent_id or "Unknown"

        if agent and agent != agent_name:
            continue

        opening = data.get("sections", {}).get("opening", {})

        agent_scores[agent_name]["greeting"].append(get_param(opening, "greeting_presence") * 50)
        agent_scores[agent_name]["company"].append(get_param(opening, "company_identification") * 50)
        agent_scores[agent_name]["agent"].append(get_param(opening, "agent_identification") * 50)
        agent_scores[agent_name]["help"].append(get_param(opening, "offer_of_help") * 50)
        agent_scores[agent_name]["clarity"].append(get_param(opening, "opening_clarity_flow") * 50)
        agent_scores[agent_name]["late"].append(get_param(opening, "late_opening") * 50)
        agent_scores[agent_name]["voice"].append(get_param(opening, "voice_energy") * 50)

    # ================= AGENT TABLE =================

    agent_rows = []

    for name, vals in agent_scores.items():
        agent_rows.append({
            "name": name,
            "greeting": avg(vals["greeting"]),
            "company": avg(vals["company"]),
            "agent": avg(vals["agent"]),
            "help": avg(vals["help"]),
            "clarity": avg(vals["clarity"]),
            "late": avg(vals["late"]),
            "voice": avg(vals["voice"])
        })

    # ================= SUB PARAM (SELECTED AGENT) =================

    selected_agent = agent or list(agent_scores.keys())[0]

    sub_params = []

    if selected_agent in agent_scores:
        vals = agent_scores[selected_agent]

        sub_params = [
            {"label": "Greeting presence", "value": avg(vals["greeting"])},
            {"label": "Company identification", "value": avg(vals["company"])},
            {"label": "Agent identification", "value": avg(vals["agent"])},
            {"label": "Offer of help", "value": avg(vals["help"])},
            {"label": "Opening clarity and flow", "value": avg(vals["clarity"])},
            {
                "label": "Late opening",
                "value": avg(vals["late"]),
                "late": 100 - avg(vals["late"])
            },
            {"label": "Voice energy", "value": avg(vals["voice"])}
        ]

    return {
        "sub_params": sub_params,
        "agents": agent_rows,
        "agent_list": list(agent_scores.keys())
    }


def get_score(params, key):
    val = params.get(key, 0)

    # case 1: dict
    if isinstance(val, dict):
        return val.get("score", 0)

    # case 2: already number
    if isinstance(val, (int, float)):
        return val

    return 0

@router.get("/process-insights")
def process_insights(
    client_id: int,
    date_from: date,
    date_to: date,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    audits = db.query(CallAudit).filter(
        CallAudit.client_id == client_id,
        func.date(CallAudit.created_at) >= date_from,
        func.date(CallAudit.created_at) <= date_to
    ).all()

    if not audits:
        return {
            "top_cards": [],
            "failures": [],
            "fcr": [],
            "drivers": []
        }

    total_calls = len(audits)

    closing_fail = 0
    premature_solution = 0
    repeat_issue = 0
    hold_fail = 0

    fcr_counter = Counter()
    drivers_counter = Counter()

    for a in audits:
        data = a.audit_json or {}
        sections = data.get("sections", {})

        # ---------- CLOSURE ----------
        closure = sections.get("closure", {})
        params = closure.get("parameters", {}) if isinstance(closure, dict) else {}

        if get_score(params, "summary_given") == 0:
            closing_fail += 1
            drivers_counter["No closing summary"] += 1

        if get_score(params, "customer_satisfaction_check") == 0:
            drivers_counter["No resolution confirmation"] += 1

        # ---------- PROBING ----------
        probing_section = sections.get("probing_resolution", {})
        probing = probing_section.get("parameters", {}) if isinstance(probing_section, dict) else {}

        if get_score(probing, "relevant_probing") == 0:
            premature_solution += 1
            drivers_counter["Premature solution"] += 1

        # ---------- PROCESS ----------
        process_section = sections.get("process_compliance", {})
        process = process_section.get("parameters", {}) if isinstance(process_section, dict) else {}

        if get_score(process, "hold_process") == 0:
            hold_fail += 1
            drivers_counter["Hold without reason"] += 1

        # ---------- REPEAT ISSUE ----------
        if get_score(probing, "issue_understanding") == 0:
            repeat_issue += 1
            drivers_counter["Customer re-explained issue"] += 1

        # ---------- FCR ----------
        status = data.get("conversion_status", "Partial")

        if "Full" in status:
            fcr_counter["FCR achieved"] += 1
        elif "Partial" in status:
            fcr_counter["Partial resolution"] += 1
        else:
            fcr_counter["Not resolved"] += 1

    def percent(x):
        return int((x / total_calls) * 100)

    # ---------- TOP CARDS ----------
    top_cards = [
        {
            "title": "Closing failure rate",
            "value": percent(closing_fail),
            "note": "No resolution summary",
            "color": "text-red-600"
        },
        {
            "title": "Premature solution rate",
            "value": percent(premature_solution),
            "note": "Solution before probing",
            "color": "text-orange-600"
        },
        {
            "title": "Customer repeat rate",
            "value": percent(repeat_issue),
            "note": "Customer re-explained issue",
            "color": "text-orange-600"
        },
        {
            "title": "Hold SOP failure",
            "value": percent(hold_fail),
            "note": "Hold without reason",
            "color": "text-orange-600"
        }
    ]

    # ---------- FAILURES ----------
    failures = [
        {
            "title": f"No closing summary — {percent(closing_fail)}%",
            "desc": "Customer left without knowing resolution.",
            "color": "bg-red-500"
        },
        {
            "title": f"Premature solution — {percent(premature_solution)}%",
            "desc": "Agent gave solution before probing.",
            "color": "bg-orange-500"
        },
        {
            "title": f"Repeat issue — {percent(repeat_issue)}%",
            "desc": "Customer had to repeat issue.",
            "color": "bg-orange-500"
        },
        {
            "title": f"Hold failure — {percent(hold_fail)}%",
            "desc": "Hold SOP not followed.",
            "color": "bg-orange-500"
        }
    ]

    # ---------- FCR ----------
    fcr = []
    for key in ["FCR achieved", "Partial resolution", "Not resolved"]:
        fcr.append({
            "label": key,
            "value": percent(fcr_counter.get(key, 0)),
            "color":
                "bg-green-600" if key == "FCR achieved"
                else "bg-orange-500" if key == "Partial resolution"
                else "bg-red-500"
        })

    # ---------- DRIVERS ----------
    drivers = [k for k, _ in drivers_counter.most_common(5)]

    return {
        "top_cards": top_cards,
        "failures": failures,
        "fcr": fcr,
        "drivers": drivers
    }


def get_agent_name(audit):
    return (
        getattr(audit, "agent_id", None)
        or getattr(audit, "agent", None)
        or "Unknown"
    )


@router.get("/red-flags")
def red_flags(
    client_id: int,
    date_from: date,
    date_to: date,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    audits = db.query(CallAudit).filter(
        CallAudit.client_id == client_id,
        func.date(CallAudit.created_at) >= date_from,
        func.date(CallAudit.created_at) <= date_to
    ).all()

    if not audits:
        return {
            "top_cards": [],
            "rows": []
        }

    rows = []

    # Counters for top cards
    critical_fail = 0
    wrong_info = 0
    rude = 0
    repeat_risk = 0

    for a in audits:
        data = a.audit_json or {}
        sections = data.get("sections", {})

        agent_name = get_agent_name(a)
        call_id = getattr(a, "call_id", None) or getattr(a, "id", "N/A")

        score = data.get("percentage", 0)

        flag = None
        impact = ""
        note = ""

        # ================= CLOSURE =================
        closure = sections.get("closure", {})
        closure_params = closure.get("parameters", {})

        if get_score(closure_params, "summary_given") == 0:
            flag = "No resolution"
            impact = "-10 pts"
            note = "Resolution incomplete"
            critical_fail += 1

        # ================= COMMUNICATION =================
        comm = sections.get("communication", {}).get("parameters", {})

        if get_score(comm, "professionalism") == 0:
            flag = "Rude / unprofessional"
            impact = "Full zero"
            note = "Agent used unprofessional tone"
            rude += 1

        # ================= PROBING =================
        probing = sections.get("probing_resolution", {}).get("parameters", {})

        if get_score(probing, "relevant_probing") == 0:
            flag = "Premature solution"
            impact = "-6 pts"
            note = "Solution given before probing"
            repeat_risk += 1

        if get_score(probing, "issue_understanding") == 0:
            flag = "Repeat issue"
            impact = "-8 pts"
            note = "Customer had to repeat issue"
            repeat_risk += 1

        # ================= PROCESS =================
        process = sections.get("process_compliance", {}).get("parameters", {})

        if get_score(process, "no_misinformation") == 0:
            flag = "Wrong info"
            impact = "Param zeroed"
            note = "Incorrect info given to customer"
            wrong_info += 1

        # ✅ If no flag skip row
        if not flag:
            continue

        rows.append({
            "id": call_id,
            "agent": agent_name,
            "flag": flag,
            "score": score,
            "impact": impact,
            "note": note
        })

    total = len(audits)

    def percent(x):
        return int((x / total) * 100) if total else 0

    # ================= TOP CARDS =================
    top_cards = [
        {
            "title": "Critical fails",
            "value": percent(critical_fail),
            "note": "Score below threshold",
            "color": "text-red-600"
        },
        {
            "title": "Wrong info flagged",
            "value": percent(wrong_info),
            "note": "Incorrect information given",
            "color": "text-red-600"
        },
        {
            "title": "Rude / unprofessional",
            "value": percent(rude),
            "note": "Agent behavior issue",
            "color": "text-red-600"
        },
        {
            "title": "Repeat complaint risk",
            "value": percent(repeat_risk),
            "note": "Customer likely to call again",
            "color": "text-orange-600"
        }
    ]

    return {
        "top_cards": top_cards,
        "rows": rows
    }



@router.get("/training-priorities")
def training_priorities(
    client_id: int,
    date_from: date,
    date_to: date,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    audits = db.query(CallAudit).filter(
        CallAudit.client_id == client_id,
        func.date(CallAudit.created_at) >= date_from,
        func.date(CallAudit.created_at) <= date_to
    ).all()

    if not audits:
        return {"priorities": []}

    counter = Counter()
    agent_map = {}

    for a in audits:
        data = a.audit_json or {}
        sections = data.get("sections", {})

        agent_name = get_agent_name(a)

        # ---------- CLOSURE ----------
        closure = sections.get("closure", {}).get("parameters", {})
        if get_score(closure, "summary_given") == 0:
            counter["closing"] += 1
            agent_map.setdefault("closing", set()).add(agent_name)

        # ---------- PROBING ----------
        probing = sections.get("probing_resolution", {}).get("parameters", {})
        if get_score(probing, "relevant_probing") == 0:
            counter["probing"] += 1
            agent_map.setdefault("probing", set()).add(agent_name)

        # ---------- HOLD ----------
        process = sections.get("process_compliance", {}).get("parameters", {})
        if get_score(process, "hold_process") == 0:
            counter["hold"] += 1
            agent_map.setdefault("hold", set()).add(agent_name)

        # ---------- CALL CONTROL ----------
        if get_score(process, "call_control") == 0:
            counter["control"] += 1
            agent_map.setdefault("control", set()).add(agent_name)

        # ---------- ISSUE RESTATEMENT ----------
        if get_score(probing, "issue_understanding") == 0:
            counter["restate"] += 1
            agent_map.setdefault("restate", set()).add(agent_name)

    total = len(audits)

    def percent(x):
        return int((x / total) * 100) if total else 0

    # ---------- PRIORITY MAPPING ----------
    mapping = [
        ("closing", "Closing framework — entire team",
         "Summarize → confirm → offer help → proper closure"),

        ("probing", "Probing before solving",
         "Ask at least 2 questions before solution"),

        ("hold", "Hold procedure SOP",
         "Ask permission → state reason → thank"),

        ("control", "Call control and ownership",
         "Always guide conversation with next step"),

        ("restate", "Issue restatement",
         "Repeat issue before solving"),
    ]

    # ---------- SORT ----------
    ranked = sorted(counter.items(), key=lambda x: x[1], reverse=True)

    priorities = []

    for i, (key, value) in enumerate(ranked, start=1):
        match = next((item for item in mapping if item[0] == key), None)

        if not match:
            continue

        _, title, desc = match

        priorities.append({
            "rank": i,
            "title": title,
            "desc": f"{percent(value)}% calls impacted. {desc}",
            "tags": list(agent_map.get(key, []))[:3]
        })

    return {"priorities": priorities}




@router.get("/weekly-report")
def weekly_report(
    client_id: int,
    date_from: date,
    date_to: date,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    audits = db.query(CallAudit).filter(
        CallAudit.client_id == client_id,
        func.date(CallAudit.created_at) >= date_from,
        func.date(CallAudit.created_at) <= date_to
    ).all()

    if not audits:
        return {"agents": []}

    agent_data = defaultdict(lambda: {
        "calls": 0,
        "scores": [],
        "opening": [],
        "understanding": [],
        "resolution": [],
        "closing": [],
        "issues": defaultdict(int)
    })

    for a in audits:
        data = a.audit_json or {}
        sections = data.get("sections", {})

        agent = get_agent_name(a)

        agent_data[agent]["calls"] += 1
        agent_data[agent]["scores"].append(data.get("percentage", 0))

        # ---------- OPENING ----------
        opening = sections.get("opening", {}).get("parameters", {})
        agent_data[agent]["opening"].append(
            get_score(opening, "greeting_presence") * 50
        )

        # ---------- UNDERSTANDING ----------
        probing = sections.get("probing_resolution", {}).get("parameters", {})
        agent_data[agent]["understanding"].append(
            get_score(probing, "issue_understanding") * 50
        )

        # ---------- RESOLUTION ----------
        agent_data[agent]["resolution"].append(
            get_score(probing, "completeness_of_resolution") * 50
        )

        # ---------- CLOSING ----------
        closing = sections.get("closure", {}).get("parameters", {})
        agent_data[agent]["closing"].append(
            get_score(closing, "summary_given") * 50
        )

        # ---------- ISSUES ----------
        if get_score(closing, "summary_given") == 0:
            agent_data[agent]["issues"]["No closing summary"] += 1

        if get_score(probing, "relevant_probing") == 0:
            agent_data[agent]["issues"]["No probing"] += 1

        if get_score(probing, "issue_understanding") == 0:
            agent_data[agent]["issues"]["Repeat issue"] += 1

    # ---------- BUILD RESPONSE ----------
    result = []

    for agent, d in agent_data.items():
        avg = lambda x: int(sum(x) / len(x)) if x else 0

        score = avg(d["scores"])

        tag = "Good" if score >= 75 else "Average" if score >= 50 else "Critical"

        top_issues = sorted(d["issues"].items(), key=lambda x: x[1], reverse=True)

        result.append({
            "name": str(agent),
            "initials": str(agent)[:2].upper(),
            "calls": d["calls"],
            "score": score,
            "tag": tag,
            "metrics": [
                {"label": "Opening", "value": avg(d["opening"])},
                {"label": "Understanding", "value": avg(d["understanding"])},
                {"label": "Resolution", "value": avg(d["resolution"])},
                {"label": "Closing", "value": avg(d["closing"])},
            ],
            "issues": [
                f"{k} — {int((v / d['calls']) * 100)}%"
                for k, v in top_issues[:3]
            ],
            "training": "Focus on weak parameters"
        })

    return {"agents": result}