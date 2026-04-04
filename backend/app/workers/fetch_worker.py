import argparse
import time

from sqlalchemy import select

from app.db.session import SessionLocal
from app.models.client import Client
from app.services.dialer_service import fetch_calls_for_client


def run_once() -> int:
    db = SessionLocal()
    try:
        clients = db.scalars(select(Client)).all()
        total = 0
        for client in clients:
            total += fetch_calls_for_client(db, client)
        print(f"[fetch_worker] inserted={total}")
        return total
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Manual fetch worker (no Celery).")
    parser.add_argument("--once", action="store_true", help="Run once and exit.")
    parser.add_argument("--interval", type=int, default=120, help="Loop interval in seconds.")
    args = parser.parse_args()

    if args.once:
        run_once()
        return

    while True:
        try:
            run_once()
        except Exception as exc:
            print(f"[fetch_worker] error: {exc}")
        time.sleep(max(1, args.interval))


if __name__ == "__main__":
    main()
