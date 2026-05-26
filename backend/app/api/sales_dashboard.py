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

router = APIRouter(prefix="/sale-dashboard", tags=["Sales Dashboard"])

def _effective_percentage(audit: CallAudit) -> float:
    payload = audit.audit_json or {}
    overall = payload.get("overall", {})

    try:
        return float(overall.get("percentage_score", 0))
    except:
        return 0


# ✅ -----------------------------
# QUALITY SUMMARY API
# ✅ -----------------------------
@router.get("/quality-summary")
def quality_summary(
    client_id: int = Query(...),
    date_from: date | None = None,
    date_to: date | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):

    # 🔹 Total Calls
    calls_query = db.query(CallLog).filter(CallLog.client_id == client_id)

    if date_from:
        calls_query = calls_query.filter(func.date(CallLog.start_time) >= date_from)
    if date_to:
        calls_query = calls_query.filter(func.date(CallLog.start_time) <= date_to)

    total_calls = calls_query.count()

    # 🔹 Audits
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

    # 🔹 Avg Score
    percentages = [_effective_percentage(audit) for audit in audits]
    avg_score = sum(percentages) / len(percentages) if percentages else 0

    # 🔹 Conversion
    conversion = 0
    partial = 0
    no_conv = 0

    for audit in audits:
        payload = audit.audit_json or {}
        overall = payload.get("overall", {})

        status = (overall.get("conversion_outcome") or "").strip().lower()

        if status == "converted":
            conversion += 1
        elif status == "partially converted":
            partial += 1
        else:
            no_conv += 1

    total = len(audits)

    return {
        "total_calls": total_calls,
        "avg_quality_score": round(avg_score, 2),
        "conversion": round((conversion / total * 100), 1) if total else 0,
        "partial_conversion": round((partial / total * 100), 1) if total else 0,
        "no_conversion": round((no_conv / total * 100), 1) if total else 0,
    }


# ✅ -----------------------------
# SECTION SUMMARY (CHART)
# ✅ -----------------------------
@router.get("/recalculate-summary")
def recalculate_summary(
    client_id: int = Query(...),
    date_from: date | None = None,
    date_to: date | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):

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

    section_summary = {}
    total_score = 0
    total_possible = 0

    for audit in audits:
        payload = audit.audit_json or {}
        parameters = payload.get("parameter_scores", [])

        for param in parameters:
            name = param.get("name", "")
            score = int(param.get("score", 0))
            max_score = int(param.get("max_score", 0))

            if name not in section_summary:
                section_summary[name] = {
                    "score": 0,
                    "total_possible": 0
                }

            section_summary[name]["score"] += score
            section_summary[name]["total_possible"] += max_score

            total_score += score
            total_possible += max_score

    # 🔹 % calc
    for section in section_summary.values():
        if section["total_possible"] > 0:
            section["percentage"] = round(
                section["score"] / section["total_possible"] * 100, 1
            )
        else:
            section["percentage"] = 0

    return {
        "total_calls": len(audits),
        "sections": section_summary,
        "total_score": total_score,
        "total_possible": total_possible,
        "percentage": round(
            total_score / total_possible * 100, 1
        ) if total_possible else 0,
    }


# ✅ -----------------------------
# AGENT SUMMARY
# ✅ -----------------------------
@router.get("/agent-recalculate-summary")
def agent_recalculate_summary(
    client_id: int = Query(...),
    date_from: date | None = None,
    date_to: date | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):

    records = (
        db.query(CallAudit, CallLog.agent_id)
        .join(CallLog, CallLog.call_id == CallAudit.call_id)
        .filter(CallAudit.client_id == client_id)
    )

    if date_from:
        records = records.filter(func.date(CallLog.start_time) >= date_from)
    if date_to:
        records = records.filter(func.date(CallLog.start_time) <= date_to)

    records = records.all()


    agent_data = {}

    for audit, agent_id in records:

        agent_id = agent_id or "Unknown"  # ✅ FIX

        if agent_id not in agent_data:
            agent_data[agent_id] = {
                "totalCalls": 0,
                "sections": {},
                "total_score": 0,
                "total_possible": 0,
                "conversion": 0,
                "partial": 0,
                "noConv": 0,
                "percentages": []
            }

        agent = agent_data[agent_id]
        agent["totalCalls"] += 1

        payload = audit.audit_json or {}
        overall = payload.get("overall", {})

        # ✅ SCORE
        try:
            pct = float(overall.get("percentage_score", 0))
        except:
            pct = 0

        agent["percentages"].append(pct)

        # ✅ CONVERSION
        status = (overall.get("conversion_outcome") or "").lower()

        if status == "converted":
            agent["conversion"] += 1
        elif status == "partially converted":
            agent["partial"] += 1
        else:
            agent["noConv"] += 1

        # ✅ PARAMETERS (MAIN FIX)
        parameters = payload.get("parameter_scores", [])

        for param in parameters:
            name = param.get("name", "Unknown")

            score = int(param.get("score", 0))
            max_score = int(param.get("max_score", 0))

            if name not in agent["sections"]:
                agent["sections"][name] = {
                    "score": 0,
                    "total_possible": 0
                }

            agent["sections"][name]["score"] += score
            agent["sections"][name]["total_possible"] += max_score

            agent["total_score"] += score
            agent["total_possible"] += max_score

    # ✅ FINAL RESPONSE (LIST — VERY IMPORTANT)
    result = []

    for agent_id, data in agent_data.items():

        total = data["totalCalls"]

        avg_score = (
            sum(data["percentages"]) / len(data["percentages"])
            if data["percentages"] else 0
        )

        # Section %
        for section in data["sections"].values():
            if section["total_possible"] > 0:
                section["percentage"] = round(
                    section["score"] / section["total_possible"] * 100, 1
                )
            else:
                section["percentage"] = 0

        # Strength & Gap
        if data["sections"]:
            strength = max(
                data["sections"],
                key=lambda x: data["sections"][x]["percentage"]
            )
            gap = min(
                data["sections"],
                key=lambda x: data["sections"][x]["percentage"]
            )
        else:
            strength = None
            gap = None

        result.append({
            "agentId": agent_id,
            "totalCalls": total,
            "score": round(avg_score, 1),
            "conversion": round(data["conversion"] / total * 100, 1) if total else 0,
            "partial": round(data["partial"] / total * 100, 1) if total else 0,
            "noConv": round(data["noConv"] / total * 100, 1) if total else 0,
            "sections": data["sections"],
            "strength": strength,
            "gap": gap
        })


    return result

@router.get("/conversation-dashboard")
def conversation_dashboard(
    client_id: int = Query(...),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    # -------------------------
    # Base Query
    # -------------------------
    query = (
        db.query(CallAudit)
        .join(CallLog, CallLog.call_id == CallAudit.call_id)
        .filter(CallAudit.client_id == client_id)
    )

    if date_from:
        query = query.filter(func.date(CallLog.start_time) >= date_from)

    if date_to:
        query = query.filter(func.date(CallLog.start_time) <= date_to)

    audits = query.all()

    # -------------------------
    # Counters
    # -------------------------
    total_calls = 0

    # Conversion
    converted = 0
    partial = 0
    not_converted = 0

    # Lead distribution
    hot_total = 0
    warm_total = 0
    cold_total = 0

    # Conversion by lead
    hot_converted = 0
    warm_converted = 0
    cold_converted = 0

    # Drop-off counters (COUNT BASED)
    closing_drop = 0
    objection_drop = 0
    discovery_drop = 0
    whatsapp_drop = 0

    # -------------------------
    # Loop
    # -------------------------
    for audit in audits:
        payload = audit.audit_json or {}

        # ✅ FIX: payload may be string
        if isinstance(payload, str):
            try:
                payload = json.loads(payload)
            except Exception:
                payload = {}

        total_calls += 1

        # -------------------------
        # Normalize values
        # -------------------------
        status = (payload.get("conversion_status") or "").lower().strip()
        lead = (payload.get("lead_quality_classification") or "").lower().strip()

        # -------------------------
        # Conversion
        # -------------------------
        if status == "converted":
            converted += 1
        elif "partial" in status:
            partial += 1
        elif "not" in status:
            not_converted += 1

        # -------------------------
        # Lead classification
        # -------------------------
        if "hot" in lead:
            hot_total += 1
            if status == "converted":
                hot_converted += 1

        elif "warm" in lead:
            warm_total += 1
            if status == "converted":
                warm_converted += 1

        elif "cold" in lead:
            cold_total += 1
            if status == "converted":
                cold_converted += 1

        # -------------------------
        # Drop-off Logic (FIXED)
        # -------------------------
        params = payload.get("parameter_scores") or []

        # ✅ FIX: handle string JSON
        if isinstance(params, str):
            try:
                params = json.loads(params)
            except Exception:
                params = []

        # Ensure list
        if not isinstance(params, list):
            params = []

        for p in params:
            if not isinstance(p, dict):
                continue

            name = (p.get("name") or "").lower()
            score = p.get("score", 0)
            max_score = p.get("max_score", 1)

            percent = (score / max_score) * 100 if max_score else 0

            # ✅ COUNT LOW PERFORMANCE (not sum)
            if "closing" in name and percent < 60:
                closing_drop += 1

            elif "objection" in name and percent < 60:
                objection_drop += 1

            elif "discovery" in name and percent < 60:
                discovery_drop += 1

            elif "whatsapp" in name and percent < 60:
                whatsapp_drop += 1

    # -------------------------
    # Safe Percentage Helper
    # -------------------------
    def pct(part, total):
        return round((part / total * 100), 1) if total else 0

    # -------------------------
    # Final Calculations
    # -------------------------

    # Conversion %
    conversion_pct = pct(converted, total_calls)
    partial_pct = pct(partial, total_calls)
    no_conv_pct = pct(not_converted, total_calls)

    # Lead Distribution %
    total_leads = hot_total + warm_total + cold_total

    hot_dist = pct(hot_total, total_leads)
    warm_dist = pct(warm_total, total_leads)
    cold_dist = pct(cold_total, total_leads)

    # Conversion by Lead %
    hot_conv_pct = pct(hot_converted, hot_total)
    warm_conv_pct = pct(warm_converted, warm_total)
    cold_conv_pct = pct(cold_converted, cold_total)

    # Drop-off %
    closing_pct = pct(closing_drop, total_calls)
    objection_pct = pct(objection_drop, total_calls)
    discovery_pct = pct(discovery_drop, total_calls)
    whatsapp_pct = pct(whatsapp_drop, total_calls)

    # -------------------------
    # Response
    # -------------------------
    return {
        "summary": {
            "total_calls": total_calls,
            "conversion": conversion_pct,
            "partial_conversion": partial_pct,
            "no_conversion": no_conv_pct,
        },

        "lead_distribution": {
            "hot": hot_dist,
            "warm": warm_dist,
            "cold": cold_dist,
        },

        "conversion_by_lead": {
            "hot": hot_conv_pct,
            "warm": warm_conv_pct,
            "cold": cold_conv_pct,
        },

        "drop_off": {
            "closing": closing_pct,
            "objection": objection_pct,
            "discovery": discovery_pct,
            "whatsapp": whatsapp_pct,
        },

        # Optional debug
        "counts": {
            "total_calls": total_calls,
            "converted": converted,
            "partial": partial,
            "not_converted": not_converted,
            "hot_total": hot_total,
            "warm_total": warm_total,
            "cold_total": cold_total,
        }
    }


@router.get("/call-audit-log")
def call_audit_log(
    client_id: int = Query(...),
    agent_id: int | None = Query(default=None),
    date_from: date | None = Query(default=None),
    date_to: date | None = Query(default=None),

    # ✅ pagination
    page: int = Query(1),
    page_size: int = Query(10),

    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = (
        db.query(CallAudit, CallLog)
        .join(CallLog, CallLog.call_id == CallAudit.call_id)
        .filter(CallAudit.client_id == client_id)
    )

    # ✅ filters
    if agent_id:
        query = query.filter(CallLog.agent_id == agent_id)

    if date_from:
        query = query.filter(func.date(CallLog.start_time) >= date_from)

    if date_to:
        query = query.filter(func.date(CallLog.start_time) <= date_to)

    total = query.count()

    # ✅ pagination
    rows = (
        query
        .order_by(CallLog.start_time.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    result = []

    for audit, log in rows:
        payload = audit.audit_json or {}

        # ✅ FIXED params
        params = {
            p.get("name"): p
            for p in payload.get("parameter_scores", [])
            if isinstance(p, dict)
        }

        def get_score(name):
            p = params.get(name)
            if not p:
                return "-"
            return f"{p.get('score',0)}/{p.get('max_score',0)}"

        result.append({
            "id": audit.call_id,

            # ✅ ADD agent_id for frontend filter
            "agent_id": log.agent_id,
            "agent": getattr(log, "agent_name", None) or f"Agent {log.agent_id}",

            "date": log.start_time.strftime("%Y-%m-%d") if log.start_time else "",

            "lead": payload.get("lead_quality_classification", ""),
            "score": payload.get("percentage", 0),
            "outcome": payload.get("conversion_status", ""),

            "opening": get_score("Opening & Call Initiation"),
            "purpose": get_score("Purpose & Value Communication"),
            "discovery": get_score("Discovery & Probing"),
            "objection": get_score("Objection Handling & Persuasion"),
            "control": get_score("Call Control & Communication"),
            "closing": get_score("Closing & Outcome"),
            "cx": get_score("CX & Compliance"),

            "flags": (
            payload.get("key_gaps")
            or payload.get("key_gaps_missed_opportunities")
            or []
        ),
        })

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "data": result
    }

@router.get("/parameter-drill")
def parameter_drill(
    client_id: int = Query(...),
    parameter_index: int = Query(0),  # 0–6
    date_from: date | None = None,
    date_to: date | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = (
        db.query(CallAudit, CallLog)
        .join(CallLog, CallLog.call_id == CallAudit.call_id)
        .filter(CallAudit.client_id == client_id)
    )

    if date_from:
        query = query.filter(func.date(CallLog.start_time) >= date_from)

    if date_to:
        query = query.filter(func.date(CallLog.start_time) <= date_to)

    rows = query.all()

    # -------------------------
    # STORAGE
    # -------------------------
    subparam_scores = defaultdict(list)
    agent_data = defaultdict(lambda: defaultdict(list))
    agent_total = defaultdict(list)

    max_scores = {}

    # -------------------------
    # LOOP
    # -------------------------
    for audit, log in rows:
        payload = audit.audit_json or {}
        params = payload.get("parameter_scores", [])

        if parameter_index >= len(params):
            continue

        param = params[parameter_index]
        sub_params = param.get("sub_parameter_scores", [])

        agent_id = getattr(log, "agent_id", "Unknown")
        subparam_names = {}
        for idx, sp in enumerate(sub_params):
            score = sp.get("score")

            if score is None:
                continue

            subparam_scores[idx].append(score)
            agent_data[agent_id][idx].append(score)

            max_scores[idx] = sp.get("max_score", 1)

            # ✅ ADD THIS LINE
            subparam_names[idx] = sp.get("name", f"Sub Param {idx + 1}")

        # total score
        total_score = param.get("score")
        if total_score is not None:
            agent_total[agent_id].append(total_score)

    # -------------------------
    # TEAM AVG
    # -------------------------
    subParams = []

    for idx, scores in subparam_scores.items():
        avg_score = round(mean(scores), 2) if scores else 0
        max_score = max_scores.get(idx, 1)

        subParams.append({
            "name": subparam_names.get(idx, f"Sub Param {idx + 1}"),
            "score": avg_score,
            "max": max_score,
            "percent": round((avg_score / max_score) * 100, 1)
        })

    # -------------------------
    # AGENT BREAKDOWN
    # -------------------------
    agents = []

    for agent_id, sp_data in agent_data.items():
        agent_row = {
            "name": f"Agent {agent_id}",
            "agent_id": agent_id
        }

        total = 0
        total_max = 0

        for idx, scores in sp_data.items():
            avg = round(mean(scores), 2)
            max_score = max_scores.get(idx, 1)

            agent_row[f"sp_{idx}"] = f"{avg}/{max_score}"

            total += avg
            total_max += max_score

        agent_row["total"] = f"{round(total,2)}/{total_max}"

        agents.append(agent_row)

    return {
        "max": sum(max_scores.values()),
        "subParams": subParams,
        "agents": agents
    }


@router.get("/agent-scorecards")
def agent_scorecards(
    client_id: int = Query(...),
    date_from: date | None = None,
    date_to: date | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = (
        db.query(CallAudit, CallLog)
        .join(CallLog, CallLog.call_id == CallAudit.call_id)
        .filter(CallAudit.client_id == client_id)
    )

    if date_from:
        query = query.filter(func.date(CallLog.start_time) >= date_from)

    if date_to:
        query = query.filter(func.date(CallLog.start_time) <= date_to)

    rows = query.all()

    agents = defaultdict(lambda: {
        "calls": 0,
        "scores": [],
        "converted": 0,
        "ranking": [],
        "params": defaultdict(list),
        "params_max": {},
        "strengths": [],
        "flags": defaultdict(int),
        "coaching": []
    })

    # -------------------------
    # LOOP
    # -------------------------
    for audit, log in rows:
        payload = audit.audit_json or {}
        agent_id = getattr(log, "agent_id", "Unknown")

        a = agents[agent_id]

        a["calls"] += 1

        # score
        score = payload.get("percentage")
        if score is not None:
            a["scores"].append(score)

        # conversion
        if (payload.get("conversion_status") or "").lower() == "converted":
            a["converted"] += 1

        # ranking
        if payload.get("ranking"):
            a["ranking"].append(payload.get("ranking"))

        # parameters
        for i, p in enumerate(payload.get("parameter_scores", [])):
            if p.get("score") is not None:
                a["params"][i].append(p["score"])
                a["params_max"][i] = p.get("max_score", 1)

        # strengths
        for s in payload.get("key_strengths", []):
            a["strengths"].append(s)

        # flags
        for g in payload.get("key_gaps", []):
            a["flags"][g] += 1

        # coaching
        coaching = payload.get("agent_coaching_recommendation", "")
        if isinstance(coaching, list):
            a["coaching"].extend(coaching)
        elif isinstance(coaching, str):
            a["coaching"].extend(coaching.split(" | "))

    # -------------------------
    # FINAL BUILD
    # -------------------------
    result = []

    for agent_id, a in agents.items():

        calls = a["calls"]

        avg_score = round(mean(a["scores"]), 1) if a["scores"] else 0
        conversion = round((a["converted"] / calls) * 100, 1) if calls else 0

        # ranking mode
        ranking = Counter(a["ranking"]).most_common(1)
        ranking = ranking[0][0] if ranking else "NA"

        # parameters
        metrics = []
        names = ["Opening", "Purpose", "Discovery", "Objection", "Control", "Closing", "CX"]

        for i in range(7):
            avg = round(mean(a["params"][i]), 1) if a["params"][i] else 0
            max_score = a["params_max"].get(i, 1)

            metrics.append({
                "name": names[i],
                "score": avg,
                "max": max_score
            })

        # strengths TOP 3
        strengths = [s for s, _ in Counter(a["strengths"]).most_common(3)]

        # gaps %
        gaps = []
        for g, count in a["flags"].items():
            pct = round((count / calls) * 100, 1)
            if pct > 0:
                gaps.append(f"{g} — {pct}% calls")

        # coaching TOP 3
        coaching = [c for c, _ in Counter(a["coaching"]).most_common(3)]

        result.append({
            "agent_id": agent_id,
            "name": f"Agent {agent_id}",
            "calls": calls,
            "avgScore": avg_score,
            "conversion": conversion,
            "ranking": ranking,
            "metrics": metrics,
            "strengths": strengths,
            "gaps": gaps,
            "coaching": " + ".join(coaching)
        })

    return result

@router.get("/lead-quality")
def lead_quality(
    client_id: int = Query(...),
    date_from: date | None = None,
    date_to: date | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    import json

    query = (
        db.query(CallAudit, CallLog)
        .join(CallLog, CallLog.call_id == CallAudit.call_id)
        .filter(CallAudit.client_id == client_id)
    )

    if date_from:
        query = query.filter(func.date(CallLog.start_time) >= date_from)
    if date_to:
        query = query.filter(func.date(CallLog.start_time) <= date_to)

    rows = query.all()
    total = len(rows) or 1

    lead_counts = {"Hot Leads": 0, "Warm Leads": 0, "Cold Leads": 0}
    conversion_by_lead = {
        "Hot Leads": {"total": 0, "converted": 0},
        "Warm Leads": {"total": 0, "converted": 0},
        "Cold Leads": {"total": 0, "converted": 0},
    }

    probability_counts = {}
    disqualification_counts = {}
    agent_map = {}

    def normalize_lead(lead):
        if not lead:
            return None
        lead = lead.lower()
        if "hot" in lead:
            return "Hot Leads"
        if "warm" in lead:
            return "Warm Leads"
        if "cold" in lead:
            return "Cold Leads"
        return None

    for audit, log in rows:
        payload = audit.audit_json or {}

        # ✅ FIX: handle string JSON
        if isinstance(payload, str):
            try:
                payload = json.loads(payload)
            except:
                payload = {}

        lead_raw = payload.get("lead_quality_classification")
        lead = normalize_lead(lead_raw)

        conversion = payload.get("conversion_status")
        prob = payload.get("conversion_probability")
        reason = payload.get("lead_disqualification_reason")

        agent_id = getattr(log, "agent_id", "Unknown")

        # ✅ Lead distribution
        if lead:
            lead_counts[lead] += 1
            conversion_by_lead[lead]["total"] += 1

            if conversion == "Converted":
                conversion_by_lead[lead]["converted"] += 1

        # ✅ Probability
        if prob:
            probability_counts[prob] = probability_counts.get(prob, 0) + 1

        # ✅ Disqualification
        if reason and reason != "N/A":
            disqualification_counts[reason] = disqualification_counts.get(reason, 0) + 1
            agent_map.setdefault(reason, set()).add(agent_id)

    # ✅ Summary (ALWAYS RETURN 3 CARDS)
    summary = []
    for key in ["Hot Leads", "Warm Leads", "Cold Leads"]:
        count = lead_counts[key]
        percent = round((count / total) * 100)

        conv = conversion_by_lead[key]
        conv_percent = (
            round((conv["converted"] / conv["total"]) * 100)
            if conv["total"]
            else 0
        )

        summary.append({
            "label": key,
            "percent": percent,
            "desc": f"{conv_percent}% convert"
        })

    probability = [
        {"label": k, "percent": round((v / total) * 100)}
        for k, v in probability_counts.items()
    ]

    # ✅ ONLY TOP 5 MOST FREQUENT DISQUALIFICATION REASONS
    top_disqualification = sorted(
        disqualification_counts.items(),
        key=lambda x: x[1],
        reverse=True
    )[:5]

    disqualification = [
        {
            "reason": reason,
            "percent": round((count / total) * 100),
            "agent": ", ".join(agent_map.get(reason, []))
        }
        for reason, count in top_disqualification
    ]

    return {
        "summary": summary,
        "probability": probability,
        "disqualification": disqualification
    }


@router.get("/critical-flags")
def critical_flags(
    client_id: int = Query(...),
    date_from: date | None = None,
    date_to: date | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = (
        db.query(CallAudit, CallLog)
        .join(CallLog, CallLog.call_id == CallAudit.call_id)
        .filter(CallAudit.client_id == client_id)
    )

    if date_from:
        query = query.filter(func.date(CallLog.start_time) >= date_from)
    if date_to:
        query = query.filter(func.date(CallLog.start_time) <= date_to)

    rows = query.all()

    # 🔹 Counters
    flag_counts = {
        "No closing attempt": 0,
        "WA deflect — no recovery": 0,
        "No qualification": 0,
        "Incorrect info given": 0
    }

    logs = []

    # Score cap tracking
    closing_caps = []
    objection_caps = 0
    discovery_caps = 0
    cx_caps = 0

    for audit, log in rows:
        payload = audit.audit_json or {}

        # ✅ Fix JSON string
        if isinstance(payload, str):
            try:
                payload = json.loads(payload)
            except:
                payload = {}

        flags = payload.get("critical_flags", {})
        parameters = payload.get("parameter_scores", [])

        call_flags = []

        # 🔹 FLAG CHECKS
        # 🔹 FLAG CHECKS FROM PARAMETER SCORES

        for p in parameters:
            name = p.get("name", "")
            score = p.get("score", 0)
            max_score = p.get("max_score", 0)

            # No closing attempt
            if name == "Closing & Outcome":
                if score < max_score or p.get("score_cap_applied"):
                    flag_counts["No closing attempt"] += 1
                    call_flags.append("No closing attempt")

            # WA deflection / objection issue
            if name == "Objection Handling & Persuasion":
                if score < max_score:
                    flag_counts["WA deflect — no recovery"] += 1
                    call_flags.append("WA deflect — no recovery")

            # No qualification
            if name == "Discovery & Probing":
                if score < max_score:
                    flag_counts["No qualification"] += 1
                    call_flags.append("No qualification")

            # Incorrect info / compliance issue
            if name == "CX & Compliance":
                if score < max_score:
                    flag_counts["Incorrect info given"] += 1
                    call_flags.append("Incorrect info given")

        # 🔹 CALL LOG (ONLY FLAGGED CALLS)
        score = payload.get("overall", {}).get("percentage_score", 0)
        if call_flags:
            logs.append({
                "call": log.call_id,
                "agent": log.agent_id,
                "flag": ", ".join(call_flags),
                "impact": "Score impacted",
                "score": f"{score}%",
                "outcome": payload.get("conversion_status", "N/A")
            })

        # 🔹 SCORE CAPS
        for p in parameters:
            name = p.get("name", "")
            if name == "Closing & Outcome":
                if p.get("score_cap_applied"):
                    closing_caps.append(p.get("score", 0))

            if name == "Objection Handling & Persuasion":
                if p.get("score_cap_applied"):
                    objection_caps += 1

            if name == "Discovery & Probing":
                if p.get("score_cap_applied"):
                    discovery_caps += 1

            if name == "CX & Compliance":
                if p.get("score_cap_applied"):
                    cx_caps += 1

    # 🔹 SUMMARY CARDS
    summary = [
        {
            "title": k,
            "value": v,
            "desc": "Score capped" if "closing" in k.lower() else ""
        }
        for k, v in flag_counts.items()
    ]

    # 🔹 SCORE CAPS TEXT
    caps = [
        {
            "title": "Closing cap (no attempt → max 8/27)",
            "desc": f"{len(closing_caps)} calls hit this cap. Avg score = {round(sum(closing_caps)/len(closing_caps),1) if closing_caps else 0}"
        },
        {
            "title": "Objection cap",
            "desc": f"{objection_caps} calls hit this cap"
        },
        {
            "title": "Discovery cap",
            "desc": f"{discovery_caps} calls hit this cap"
        },
        {
            "title": "Incorrect info cap",
            "desc": f"{cx_caps} calls hit this cap"
        }
    ]

    return {
        "summary": summary,
        "logs": logs,
        "caps": caps
    }

@router.get("/coaching-needs")
def coaching_needs(
    client_id: int = Query(...),
    date_from: date | None = None,
    date_to: date | None = None,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    query = (
        db.query(CallAudit, CallLog)
        .join(CallLog, CallLog.call_id == CallAudit.call_id)
        .filter(CallAudit.client_id == client_id)
    )

    if date_from:
        query = query.filter(func.date(CallLog.start_time) >= date_from)
    if date_to:
        query = query.filter(func.date(CallLog.start_time) <= date_to)

    rows = query.all()

    coaching_freq = {}
    coaching_agents = {}

    for audit, log in rows:
        payload = audit.audit_json or {}

        # ✅ FIX JSON STRING
        if isinstance(payload, str):
            try:
                payload = json.loads(payload)
            except:
                payload = {}

        coaching = payload.get("agent_coaching_recommendation", [])
        agent_id = str(getattr(log, "agent_id", "Unknown"))

        # ✅ HANDLE BOTH LIST + STRING
        if isinstance(coaching, str):
            coaching_items = coaching.split(" | ")
        elif isinstance(coaching, list):
            coaching_items = coaching
        else:
            coaching_items = []

        for item in coaching_items:
            item = item.strip()

            if not item:
                continue

            lower = item.lower()

            # ❌ skip useless generic items
            skip_words = [
                "none identified",
                "continue to maintain",
                "keep effectively",
                "good job",
                "well done",
                "maintain professionalism",
                "continue professionalism",
                "no improvement needed"
            ]

            if any(w in lower for w in skip_words):
                continue

            # ❌ skip too short text
            if len(item) < 12:
                continue

            # ✅ frequency count
            coaching_freq[item] = coaching_freq.get(item, 0) + 1

            # ✅ agent mapping
            if item not in coaching_agents:
                coaching_agents[item] = set()

            coaching_agents[item].add(agent_id)

    # ✅ TOP 5
    sorted_items = sorted(
        coaching_freq.items(),
        key=lambda x: (-x[1], len(x[0]))
    )[:5]

    result = []

    for i, (item, count) in enumerate(sorted_items, start=1):
        agents = list(coaching_agents.get(item, []))

        # 🔥 COLOR LOGIC
        if i <= 2:
            color = "red"
            tags = agents + ["Immediate"]
        elif i <= 4:
            color = "orange"
            tags = agents
        else:
            color = "green"
            tags = agents

        result.append({
            "rank": i,
            "title": item,
            "desc": f"{count} calls impacted. Needs improvement.",
            "tags": tags,
            "color": color
        })

    return {
        "coaching": result
    }