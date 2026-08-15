# PulseGuard API

This FastAPI service exposes synthetic patient data for the PulseGuard hackathon prototype.

It is clinical decision support demonstration software only. It does not diagnose conditions,
recommend treatment, or use real patient data.

## Run locally

```bash
uv sync --group dev
uv run uvicorn app.main:app --reload
```

Interactive API documentation is available at `http://127.0.0.1:8000/docs`.

## Demo authentication

All endpoints except `/api/health` and `/api/auth/login` require a bearer token. Credentials come
from environment variables (hackathon defaults shown):

```bash
export PULSEGUARD_DEMO_USERNAME=demo
export PULSEGUARD_DEMO_PASSWORD=demo-password
```

```bash
TOKEN=$(curl -s -X POST http://127.0.0.1:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "demo", "password": "demo-password"}' | jq -r .access_token)

curl -H "Authorization: Bearer $TOKEN" http://127.0.0.1:8000/api/patients
```

Passwords are hashed with PBKDF2; tokens are short-lived, in-memory, and per-process only - a
real deployment would use a managed identity provider.

## Endpoints

```text
GET  /api/health                       Service status (public)
POST /api/auth/login                   Demo login -> bearer token
GET  /api/models                       ML model registry (XGBoost, Logistic Regression, Isolation Forest, SHAP)
GET  /api/patients                     Risk-sorted patient list
POST /api/patients                     Add a patient to the in-memory store
GET  /api/patients/{id}                Profile + longitudinal measurements
GET  /api/patients/{id}/risk           Risk, confidence, quality, evidence, alert state (?model=hybrid|xgboost|logistic)
GET  /api/patients/{id}/anomalies      Isolation-Forest baseline-deviation anomalies
GET  /api/patients/{id}/timeline       Per-parameter time-series features (FR-03)
GET  /api/patients/{id}/recommendations  Structured non-diagnostic review guidance (FR-11)
POST /api/risk/predict                 Score an arbitrary synthetic trajectory (?model=hybrid|xgboost|logistic)
POST /api/simulation                   What-if: override measurements, reassess risk (FR-13)
```

## Models

The prototype trains four components in memory on generated synthetic trajectories (the first
request takes a few seconds to train; afterwards results are cached):

- **XGBoost** - primary ML risk scorer, selectable via `?model=xgboost`.
- **Logistic Regression** - linear baseline scorer, selectable via `?model=logistic`.
- **Isolation Forest** - flags readings that deviate from the healthy population; drives the
  anomalies endpoint and the `is_anomaly` markers on the timeline.
- **SHAP** - explains the XGBoost prediction and produces the `top_factors` evidence.

The default `?model=hybrid` blends the ML probability with the deterministic rules that keep the
risk explainable. Every score remains prototype-only and is not clinically validated; when the ML
dependencies are unavailable the engine falls back to the deterministic rules.

## Notes

- Patients added via `POST /api/patients` are held in the in-memory store and disappear on
  restart, consistent with the prototype's "nothing is persisted" design.
- Data is synthetic and held in memory; nothing is persisted.
