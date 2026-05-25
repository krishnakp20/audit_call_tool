from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db, get_db2, get_db3
from app.models.settings import Setting
from app.models.user import User
from app.schemas.settings import SettingsOut, SettingsUpsert
from app.models.client import Client

router = APIRouter(prefix="/settings", tags=["Settings"])


@router.post("", response_model=SettingsOut)
def upsert_settings(
    payload: SettingsUpsert,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> SettingsOut:
    settings = db.query(Setting).filter(Setting.client_id == payload.client_id).first()
    if settings:
        for key, value in payload.model_dump().items():
            setattr(settings, key, value)
    else:
        settings = Setting(**payload.model_dump())
        db.add(settings)
    db.commit()
    db.refresh(settings)
    return settings



@router.get("/{client_id}")
def get_settings(
    client_id: int,
    db: Session = Depends(get_db),
    db2: Session = Depends(get_db2),
    db3: Session = Depends(get_db3),
    _: User = Depends(get_current_user),
):
    # ----------------------------------
    # 1️⃣ CLIENT (MAIN DB)
    # ----------------------------------
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    settings = db.query(Setting).filter(
        Setting.client_id == client_id
    ).first()

    # ----------------------------------
    # 2️⃣ Campaign & Ingroup
    # ----------------------------------
    campaigns = [c.strip() for c in (client.campaigns or "").split(",") if c.strip()]
    ingroups = [i.strip() for i in (client.ingroups or "").split(",") if i.strip()]

    # ----------------------------------
    # 3️⃣ VICIDIAL → GET USERS (DB2)
    # ----------------------------------
    all_users = set()

    filters = ingroups if ingroups else campaigns

    for f in filters:
        rows = db3.execute(
            text("""
                SELECT user
                FROM vicidial_users
                WHERE closer_campaigns LIKE :val
            """),
            {"val": f"%{f}%"}
        ).mappings().all()

        for r in rows:
            if r["user"]:
                all_users.add(r["user"].strip())

    all_users = list(all_users)

    # ----------------------------------
    # 4️⃣ MAIN DB → AGENT DETAILS
    # ----------------------------------
    agents_list = []

    if not ingroups:
        vicidial_rows = db3.execute(
            text("""
                    SELECT user
                    FROM vicidial_users
                    WHERE user_group = 'Dialdesk'
                """)
        ).mappings().all()

        dialdesk_users = [
            r["user"].strip()
            for r in vicidial_rows
            if r["user"]
        ]

        if dialdesk_users:
            query = text(f"""
                    SELECT username, displayname
                    FROM agent_master
                    WHERE username IN ({",".join([f":u{i}" for i in range(len(dialdesk_users))])})
                    AND status = 'A'
                """)

            params = {
                f"u{i}": user
                for i, user in enumerate(dialdesk_users)
            }

            rows = db2.execute(query, params).mappings().all()

            agents_list = [
                {
                    "username": r["username"],
                    "displayname": r["displayname"]
                }
                for r in rows
            ]

    elif all_users:
        # 🔥 FIX: dynamic IN clause
        query = text(f"""
            SELECT username, displayname
            FROM agent_master
            WHERE username IN ({",".join([f":u{i}" for i in range(len(all_users))])})
            AND status = 'A'
        """)

        params = {f"u{i}": user for i, user in enumerate(all_users)}

        rows = db2.execute(query, params).mappings().all()

        agents_list = [
            {
                "username": r["username"],
                "displayname": r["displayname"]
            }
            for r in rows
        ]

    # ----------------------------------
    # 5️⃣ FINAL RESPONSE
    # ----------------------------------
    return {
        "client_id": client_id,

        "total": settings.total if settings else 0,
        "audit_calls_per_agent": settings.audit_calls_per_agent if settings else 0,
        "min_call_duration": settings.min_call_duration if settings else 20,
        "max_call_duration": settings.max_call_duration if settings else 3600,

        # ✅ agents (username list)
        "agents": settings.agents if (settings and settings.agents) else [a["username"] for a in agents_list],

        # ✅ filters
        "campaign_filter": settings.campaign_filter if (settings and settings.campaign_filter) else campaigns,
        "ingroup_filter": settings.ingroup_filter if (settings and settings.ingroup_filter) else ingroups,

        # ✅ full agent info (IMPORTANT)
        "agent_details": agents_list,

        "is_default": settings is None,
    }