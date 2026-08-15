# PulseGuard

### AI Early Risk Detection & Personalized Care Platform

> **Detect deterioration before it becomes an emergency - without drowning clinicians in false alarms.**

PulseGuard is an AI-assisted healthcare decision-support platform designed to identify early warning patterns in heterogeneous, longitudinal patient data.

It combines time-series analysis, anomaly detection, patient-specific baselines, explainable risk scoring, confidence estimation, and intelligent alert escalation into a clinician-friendly dashboard.

> **Important:** PulseGuard is a hackathon prototype and is not a medical device, diagnostic system, or substitute for professional clinical judgment.

## Core Features

* Patient risk prediction (XGBoost, Logistic Regression, or a hybrid blend)
* Time-series health analysis
* Anomaly detection (Isolation Forest)
* Explainable predictions (SHAP feature attribution)
* Personalized patient baselines
* Confidence-aware risk scoring
* Missing-data handling
* Intelligent alert escalation
* Personalized non-diagnostic recommendations
* What-if risk simulation
* Add patients from the dashboard
* Two-page PDF report export (page 1 graphs, page 2 detailed writing)

## ML Models

Four ML components are trained in memory on generated synthetic trajectories the first time
they are used, and power the risk, anomaly, and explanation endpoints:

* **XGBoost** - primary risk scorer, selectable on the patient page
* **Logistic Regression** - linear baseline risk scorer, selectable on the patient page
* **Isolation Forest** - flags readings that deviate from the healthy population
* **SHAP** - explains which parameters drive the XGBoost risk prediction

The default `hybrid` risk score blends the ML probability with transparent deterministic rules
so every assessment stays explainable. All scores are prototype-only and not clinically
validated; if the ML dependencies are unavailable the engine falls back to the deterministic
rules.

## Tech Stack

**Frontend:** React, TypeScript, Vite, Tailwind CSS, Recharts

**Backend:** Python, FastAPI

**ML:** pandas, NumPy, scikit-learn, XGBoost, SHAP

**Database:** PostgreSQL

## Architecture

```text
Patient Data
     ↓
Data Processing
     ↓
┌──────────────┬──────────────┬──────────────┐
│ Risk Model   │ Anomaly      │ Time-Series  │
│              │ Detection    │ Analysis     │
└──────────────┴──────────────┴──────────────┘
                    ↓
               Risk Engine
                    ↓
        Risk + Confidence + Factors
                    ↓
          Explainable Alert System
                    ↓
            Clinician Dashboard
```

## Key Differentiator

PulseGuard does not treat every abnormal measurement as an emergency.

It considers:

* Patient-specific baseline
* Trend direction
* Persistence
* Multiple simultaneous indicators
* Anomaly severity
* Data completeness
* Prediction confidence

The goal is simple:

> **Tell healthcare professionals which patient's trajectory needs attention, and explain why.**

## Repository Structure

```text
pulseguard/
├── frontend/
├── backend/
├── ml/
├── docs/
│   └── PRD.md
├── README.md
└── .gitignore
```

## MVP

* Patient dashboard
* Risk prediction
* Time-series visualization
* Anomaly detection
* Explainability
* Personalized baseline
* Missing-data handling
* Confidence score
* Alert levels

## Run the hackathon prototype

Two terminals:

```bash
# Backend - FastAPI on http://127.0.0.1:8000
cd backend
uv sync --group dev
uv run uvicorn app.main:app --reload
```

```bash
# Frontend - Vite dev server on http://localhost:5173 (proxies /api to the backend)
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 and sign in with the demo account `demo` / `demo-password`.

## Safety

The prototype should use synthetic or appropriately anonymized data. It is intended for clinical decision support demonstration only and does not provide autonomous diagnosis or treatment.
