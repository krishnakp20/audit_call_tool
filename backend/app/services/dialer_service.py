
from datetime import datetime, timedelta
from typing import Any, List, Dict

import pymysql
from sqlalchemy.orm import Session

from app.models.call_log import CallLog
from app.models.client import Client


# -----------------------------
# Asterisk DB Connection
# -----------------------------
def get_asterisk_connection(client: Client):
    print("🔌 Connecting to Asterisk DB...")
    print(f"Host: {client.db_host}, User: {client.db_user}")

    return pymysql.connect(
        host=client.db_host,
        user=client.db_user,
        password=client.db_pass,
        database="asterisk",
        cursorclass=pymysql.cursors.DictCursor
    )


# -----------------------------
# FETCH DATA (DEBUG VERSION)
# -----------------------------
def _mock_dialer_payload(client: Client) -> List[Dict[str, Any]]:
    print(f"\n🚀 Fetching calls for client: {client.id}")

    if not client.campaigns:
        print("❌ No campaigns found")
        return []

    conn = get_asterisk_connection(client)
    cursor = conn.cursor()

    try:
        campaign_ids = ",".join(
            [f"'{c.strip()}'" for c in client.campaigns.split(",") if c.strip()]
        )

        print(f"📌 Campaigns: {campaign_ids}")

        connection_uri_underscore = client.dialer_ip.replace(".", "_")

        asterisk_sql = f"""
            SELECT
                vc.campaign_id,
                RIGHT(vc.phone_number, 10) AS MobileNo,
                vc.user,
                IFNULL(
                    REPLACE(
                        r.location,
                        'http://{client.dialer_ip}/RECORDINGS/MP3/',
                        CONCAT(
                            'http://192.168.10.3/{connection_uri_underscore}/',
                            DATE_FORMAT(DATE(vc.call_date), '%%Y%%m%%d'),
                            '/'
                        )
                    ),
                    ''
                ) AS file_url,
                vc.call_date,
                vc.lead_id,
                vc.length_in_sec
            FROM vicidial_closer_log vc
            LEFT JOIN recording_log r
                ON vc.lead_id = r.lead_id
               AND DATE(vc.call_date) = DATE(r.start_time)
            WHERE vc.campaign_id IN ({campaign_ids})
              AND vc.call_date > %s
              AND vc.call_date <= DATE_SUB(NOW(), INTERVAL 20 MINUTE)
              AND vc.user != 'VDCL'
            LIMIT 50
        """

        last_sync = datetime.utcnow() - timedelta(hours=1)

        print(f"⏱ Last Sync: {last_sync}")

        cursor.execute(asterisk_sql, (last_sync,))
        rows = cursor.fetchall()

        print(f"📊 Rows fetched: {len(rows)}")

        payload: List[Dict[str, Any]] = []

        for i, row in enumerate(rows):
            try:
                call_time = row["call_date"]

                call_id = f"{row['campaign_id']}-{row['lead_id']}-{int(call_time.timestamp())}"

                print(f"➡ Row {i+1}: {call_id}")

                duration = row["length_in_sec"] or 0
                end_time = call_time + timedelta(seconds=duration)

                payload.append(
                    {
                        "call_id": call_id,
                        "agent_id": row["user"],
                        "start_time": call_time,
                        "end_time": end_time,
                        "duration": duration,
                        "recording_path": row["file_url"] or "",
                    }
                )

            except Exception as e:
                print(f"❌ Error parsing row {i}: {e}")

        return payload

    except Exception as e:
        print(f"🔥 SQL ERROR: {e}")
        return []

    finally:
        cursor.close()
        conn.close()
        print("🔒 Connection closed")


# -----------------------------
# INSERT INTO DB (DEBUG)
# -----------------------------
def fetch_calls_for_client(db: Session, client: Client) -> int:
    print("\n==============================")
    print("📥 START FETCH CALLS")
    print("==============================")

    inserted = 0

    data = _mock_dialer_payload(client)

    print(f"📦 Payload size: {len(data)}")

    for row in data:
        try:
            exists = db.query(CallLog).filter(CallLog.call_id == row["call_id"]).first()

            if exists:
                print(f"⏩ Skipping (exists): {row['call_id']}")
                continue

            db.add(CallLog(client_id=client.id, **row))
            inserted += 1

            print(f"✅ Inserted: {row['call_id']}")

        except Exception as e:
            print(f"❌ Insert error: {e}")

    db.commit()

    print(f"🎯 Total Inserted: {inserted}")
    print("==============================\n")

    return inserted


if __name__ == "__main__":
    from sqlalchemy import select
    from app.db.session import SessionLocal
    from app.models.client import Client

    print("🚀 START MANUAL FETCH")

    db = SessionLocal()

    try:
        clients = db.scalars(select(Client)).all()

        print(f"👥 Total Clients: {len(clients)}")

        total_inserted = 0

        for client in clients:
            print(f"\n🔄 Processing Client ID: {client.id}")
            inserted = fetch_calls_for_client(db, client)
            total_inserted += inserted

        print("\n======================")
        print(f"🎯 TOTAL INSERTED: {total_inserted}")
        print("======================")

    except Exception as e:
        print(f"🔥 ERROR: {e}")

    finally:
        db.close()
        print("🔒 DB Closed")