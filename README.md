# Call Audit SaaS Platform

Production-ready scaffold for a multi-tenant Call Audit System with:

- **Backend:** FastAPI + SQLAlchemy + MySQL + Alembic
- **Workers:** Celery + Redis
- **Frontend:** React (Vite) + Tailwind + Recharts + Monaco editor
- **Auth:** JWT with bcrypt-hashed passwords

## Architecture

### Backend

`backend/app/`

- `api/` REST endpoints
- `core/` config, security, dependencies
- `models/` SQLAlchemy entities
- `schemas/` Pydantic DTOs
- `services/` STT, AI audit, dialer integration, scoring
- `workers/` Celery app + worker tasks
- `db/` SQLAlchemy engine/session

### Frontend

`frontend/src/`

- `pages/` login, dashboard, clients, prompts, calls, audit detail, settings
- `components/` sidebar, topbar, KPI cards, data table, charts, JSON viewer
- `services/` Axios client + JWT interceptors
- `hooks/` React Query hooks
- `store/` Zustand UI state

## Quick Start

## 1) Run infra

```bash
docker compose up -d
```

## 2) Backend setup

```bash
cd backend
python -m venv .venv
. .venv/Scripts/activate
pip install -r requirements.txt
copy .env.example .env
alembic upgrade head
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Run Celery workers in separate terminals:

```bash
cd backend
. .venv/Scripts/activate
celery -A app.workers.tasks.celery_app worker -l info
```

Trigger jobs manually from Python shell or by adding scheduler/beat:
- `fetch_calls_task.delay()`
- `stt_task.delay()`
- `audit_task.delay()`

Default bootstrap admin user:
- email: `admin@callaudit.local`
- password: `admin123`

## 3) Frontend setup

```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

Frontend URL: `http://localhost:5173`

## API Endpoints

- `POST /auth/login`
- `POST /clients`, `GET /clients`, `PUT /clients/{id}`
- `POST /prompts`, `GET /prompts/{client_id}`, `PUT /prompts/activate/{id}`
- `GET /calls?client_id=&date_from=&date_to=`
- `GET /audit?client_id=`, `GET /audit/{call_id}`
- `GET /dashboard/summary?client_id=`
- `GET /dashboard/agent-performance?client_id=`
- `POST /settings`, `GET /settings/{client_id}`
- `GET /export?client_id=&from=&to=`

## Alembic

Initial migration included at:

- `backend/alembic/versions/20260329_0001_initial_schema.py`

To create a new migration:

```bash
cd backend
alembic revision --autogenerate -m "your change"
alembic upgrade head
```

## Notes for Production Hardening

- Replace default bootstrap credentials and `SECRET_KEY`.
- Move dialer/db passwords to encrypted secrets storage.
- Add RBAC roles beyond superuser.
- Add proper task scheduler (Celery Beat) and dead-letter strategy.
- Add structured logging, tracing, and Sentry/APM.
- Add unit/integration/e2e test suites and CI pipeline.
