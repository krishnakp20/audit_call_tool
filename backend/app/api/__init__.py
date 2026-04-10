from fastapi import APIRouter

from app.api import audit, auth, calls, clients, dashboard, export, prompts, settings, sales_dashboard

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(clients.router)
api_router.include_router(prompts.router)
api_router.include_router(calls.router)
api_router.include_router(audit.router)
api_router.include_router(dashboard.router)
api_router.include_router(export.router)
api_router.include_router(settings.router)
api_router.include_router(sales_dashboard.router)
