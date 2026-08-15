"""Integration tests for the PulseGuard API."""

from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


@pytest.fixture()
def auth_headers() -> dict[str, str]:
    """Bearer token for the pinned demo account."""

    response = client.post(
        "/api/auth/login", json={"username": "demo", "password": "demo-password"}
    )
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def test_health_endpoint_declares_synthetic_data() -> None:
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {"status": "ok", "data_mode": "synthetic"}


def test_login_returns_bearer_token() -> None:
    response = client.post(
        "/api/auth/login", json={"username": "demo", "password": "demo-password"}
    )

    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert len(body["access_token"]) > 20
    assert body["expires_in"] > 0


def test_login_rejects_invalid_credentials() -> None:
    response = client.post(
        "/api/auth/login", json={"username": "demo", "password": "wrong-password"}
    )

    assert response.status_code == 401


def test_protected_endpoints_require_a_token() -> None:
    response = client.get("/api/patients")

    assert response.status_code == 401


def test_patient_list_prioritizes_higher_risk_patients(auth_headers: dict[str, str]) -> None:
    response = client.get("/api/patients", headers=auth_headers)

    assert response.status_code == 200
    patients = response.json()
    assert patients[0]["id"] == "2087"
    assert all(patient["data_source"] == "synthetic" for patient in patients)


def test_deteriorating_patient_has_high_risk_and_explainable_evidence(
    auth_headers: dict[str, str],
) -> None:
    response = client.get("/api/patients/2087/risk", headers=auth_headers)

    assert response.status_code == 200
    assessment = response.json()
    assert assessment["risk"] >= 0.7
    assert assessment["alert_level"] == "critical"
    assert assessment["confidence"] > 0.9
    assert {factor["parameter"] for factor in assessment["top_factors"]} >= {"SpO₂", "Heart rate"}
    assert "not a diagnosis" in assessment["prototype_notice"]


def test_missing_material_data_reduces_confidence_and_reports_gaps(
    auth_headers: dict[str, str],
) -> None:
    response = client.get("/api/patients/4210/risk", headers=auth_headers)

    assert response.status_code == 200
    assessment = response.json()
    assert assessment["confidence"] < 0.7
    assert "systolic_bp" in assessment["data_quality"]["important_missing_parameters"]


def test_transient_anomaly_is_visible_but_alert_is_suppressed(auth_headers: dict[str, str]) -> None:
    anomalies_response = client.get("/api/patients/3174/anomalies", headers=auth_headers)
    risk_response = client.get("/api/patients/3174/risk", headers=auth_headers)

    assert anomalies_response.status_code == 200
    assert any(anomaly["parameter"] == "spo2" for anomaly in anomalies_response.json())
    assert risk_response.status_code == 200
    assessment = risk_response.json()
    assert assessment["alert_level"] == "stable"
    assert assessment["alert_suppressed"] is True


def test_timeline_exposes_time_series_features(auth_headers: dict[str, str]) -> None:
    response = client.get("/api/patients/2087/timeline", headers=auth_headers)

    assert response.status_code == 200
    timeline = response.json()
    assert timeline["patient_id"] == "2087"
    spo2 = next(series for series in timeline["series"] if series["parameter"] == "spo2")
    last = spo2["points"][-1]
    assert last["value"] == 91
    assert last["baseline_deviation"] < 0
    assert last["rolling_mean"] is not None
    assert last["slope_short"] is not None
    assert last["percentage_change"] is not None
    assert last["trend_short"] == "decreasing"
    assert last["is_anomaly"] is True
    heart_rate = next(series for series in timeline["series"] if series["parameter"] == "heart_rate")
    assert heart_rate["points"][-1]["trend_short"] == "increasing"
    assert len(timeline["risk_points"]) == len(spo2["points"])
    assert timeline["risk_points"][0]["risk"] < timeline["risk_points"][-1]["risk"]
    assert timeline["risk_points"][-1]["alert_level"] == "critical"


def test_recommendations_are_structured_and_non_diagnostic(auth_headers: dict[str, str]) -> None:
    response = client.get("/api/patients/2087/recommendations", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert data["patient_id"] == "2087"
    assert any(rec["priority"] == "high" for rec in data["recommendations"])
    assert all(
        rec["category"]
        in {"clinical_review", "anomaly_review", "data_completeness", "alert_note", "monitoring"}
        for rec in data["recommendations"]
    )
    text = " ".join(rec["text"] + " " + rec["rationale"] for rec in data["recommendations"]).lower()
    for forbidden in ("diagnos", "treat", "prescrib", "medication", "emergency"):
        assert forbidden not in text


def test_recommendations_flag_missing_data(auth_headers: dict[str, str]) -> None:
    response = client.get("/api/patients/4210/recommendations", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert any(rec["category"] == "data_completeness" for rec in data["recommendations"])


def test_simulation_escalates_risk_for_stable_patient(auth_headers: dict[str, str]) -> None:
    response = client.post(
        "/api/simulation",
        headers=auth_headers,
        json={
            "patient_id": "1042",
            "changes": [
                {"index": -1, "parameter": "spo2", "value": 91},
                {"index": -1, "parameter": "heart_rate", "value": 108},
            ],
        },
    )

    assert response.status_code == 200
    assessment = response.json()
    assert assessment["risk"] >= 0.5
    assert assessment["alert_level"] in {"warning", "critical"}


def test_simulation_missing_data_reduces_confidence(auth_headers: dict[str, str]) -> None:
    response = client.post(
        "/api/simulation",
        headers=auth_headers,
        json={
            "patient_id": "2087",
            "changes": [{"index": -1, "parameter": "spo2", "value": None}],
        },
    )

    assert response.status_code == 200
    assessment = response.json()
    assert assessment["confidence"] < 0.9
    assert "spo2" in assessment["data_quality"]["important_missing_parameters"]


def test_simulation_rejects_out_of_range_index(auth_headers: dict[str, str]) -> None:
    response = client.post(
        "/api/simulation",
        headers=auth_headers,
        json={
            "patient_id": "1042",
            "changes": [{"index": 99, "parameter": "spo2", "value": 90}],
        },
    )

    assert response.status_code == 422


def test_models_endpoint_lists_ml_components(auth_headers: dict[str, str]) -> None:
    response = client.get("/api/models", headers=auth_headers)

    assert response.status_code == 200
    names = {model["name"] for model in response.json()}
    assert {"XGBoost", "Logistic Regression", "Isolation Forest", "SHAP"} <= names
    xgboost = next(model for model in response.json() if model["name"] == "XGBoost")
    assert xgboost["kind"] == "risk"
    assert xgboost["active"] is True


def test_risk_endpoint_accepts_model_selector(auth_headers: dict[str, str]) -> None:
    response = client.get("/api/patients/2087/risk?model=logistic", headers=auth_headers)

    assert response.status_code == 200
    assert response.json()["risk"] >= 0.7
    assert response.json()["alert_level"] == "critical"


def test_add_patient_creates_profile_and_appears_in_list(auth_headers: dict[str, str]) -> None:
    response = client.post(
        "/api/patients",
        headers=auth_headers,
        json={
            "display_name": "Test New Patient",
            "age": 45,
            "sex": "Female",
            "medical_history": ["Asthma"],
        },
    )

    assert response.status_code == 201
    created = response.json()
    assert created["display_name"] == "Test New Patient"
    assert created["age"] == 45
    assert created["data_source"] == "synthetic"
    assert len(created["measurements"]) == 6

    listing = client.get("/api/patients", headers=auth_headers)
    assert any(patient["id"] == created["id"] for patient in listing.json())


def test_predict_endpoint_scores_arbitrary_trajectory(auth_headers: dict[str, str]) -> None:
    base = datetime(2026, 8, 15, 8, tzinfo=UTC)
    measurements = [
        {
            "timestamp": (base + timedelta(hours=index * 4)).isoformat(),
            "heart_rate": heart_rate,
            "spo2": spo2,
            "temperature": temperature,
        }
        for index, (heart_rate, spo2, temperature) in enumerate(
            [
                (77, 97, 36.8),
                (78, 97, 36.9),
                (84, 96, 37.2),
                (91, 95, 37.6),
                (101, 93, 38.0),
                (108, 91, 38.3),
            ]
        )
    ]
    response = client.post(
        "/api/risk/predict",
        headers=auth_headers,
        json={"patient_id": "demo-trajectory", "measurements": measurements},
    )

    assert response.status_code == 200
    assessment = response.json()
    assert assessment["risk"] >= 0.7
    assert assessment["alert_level"] == "critical"
