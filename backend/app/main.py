"""FastAPI application entry point for the PulseGuard prototype."""

from fastapi import FastAPI

from app.api.routes.auth import router as auth_router
from app.api.routes.health import router as health_router
from app.api.routes.models import router as models_router
from app.api.routes.patients import router as patients_router
from app.api.routes.risk import router as risk_router
from app.api.routes.simulation import router as simulation_router

app = FastAPI(
    title="PulseGuard API",
    version="0.1.0",
    description=(
        "Synthetic-data clinical decision-support prototype. It does not diagnose conditions or "
        "recommend treatment."
    ),
)
for router in (health_router, auth_router, patients_router, risk_router, simulation_router, models_router):
    app.include_router(router, prefix="/api")
