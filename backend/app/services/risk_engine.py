"""Explainable prototype risk logic combining deterministic rules with the ML models.

The deterministic rules provide a transparent baseline score; the trained XGBoost and
logistic-regression models (see ml_engine) refine it, SHAP explains the top contributing
parameters, and Isolation Forest drives anomaly detection. Every score is prototype-only and
not clinically validated.
"""

from collections.abc import Iterable
from statistics import fmean

from app.domain.schemas import (
    AlertLevel,
    Anomaly,
    DataQuality,
    PatientDetail,
    RiskAssessment,
    RiskFactor,
    VitalMeasurement,
)
from app.services import ml_engine

_TRACKED_PARAMETERS = (
    "heart_rate",
    "spo2",
    "temperature",
    "systolic_bp",
    "diastolic_bp",
    "glucose",
)
_MATERIAL_PARAMETERS = ("spo2", "heart_rate", "temperature", "systolic_bp", "diastolic_bp")


def _mean(values: Iterable[float | None]) -> float:
    observed = [value for value in values if value is not None]
    return fmean(observed) if observed else 0.0


def _clamp(value: float, lower: float = 0.0, upper: float = 1.0) -> float:
    return max(lower, min(value, upper))


def _baseline_measurements(patient: PatientDetail) -> list[VitalMeasurement]:
    split_index = max(3, len(patient.measurements) // 2)
    return patient.measurements[:split_index]


def baseline_for(patient: PatientDetail, parameter: str) -> float:
    """Return the patient's own baseline mean for one parameter."""

    return _mean(getattr(measurement, parameter) for measurement in _baseline_measurements(patient))


def _score_level(risk: float) -> AlertLevel:
    if risk >= 0.7:
        return AlertLevel.CRITICAL
    if risk >= 0.45:
        return AlertLevel.WARNING
    if risk >= 0.25:
        return AlertLevel.WATCH
    return AlertLevel.STABLE


def _data_quality(patient: PatientDetail) -> DataQuality:
    latest = patient.measurements[-1]
    missing = [
        parameter for parameter in _MATERIAL_PARAMETERS if getattr(latest, parameter) is None
    ]
    score = 1 - (len(missing) / len(_MATERIAL_PARAMETERS))
    return DataQuality(score=round(score, 2), important_missing_parameters=missing)


def _slope(values: list[float | None]) -> float:
    observed = [value for value in values if value is not None]
    if len(observed) < 2:
        return 0.0
    return (observed[-1] - observed[0]) / (len(observed) - 1)


def identify_anomalies(patient: PatientDetail) -> list[Anomaly]:
    """Identify notable deviations from a patient-specific baseline.

    Isolation Forest flags unusual readings; a transparent threshold detector is
    used as a fallback when the ML stack is unavailable.
    """

    ml_anomalies = ml_engine.iforest_anomalies(patient)
    if ml_anomalies is not None:
        return ml_anomalies
    return _threshold_anomalies(patient)


def _threshold_anomalies(patient: PatientDetail) -> list[Anomaly]:
    """Fallback threshold detector: notable deviations from the personal baseline."""

    sensitivity = {"heart_rate": 18, "spo2": 4, "temperature": 0.8}
    anomalies: list[Anomaly] = []
    for index, measurement in enumerate(patient.measurements):
        for parameter, threshold in sensitivity.items():
            value = getattr(measurement, parameter)
            baseline = baseline_for(patient, parameter)
            if value is None or baseline == 0 or abs(value - baseline) < threshold:
                continue

            next_value = (
                getattr(patient.measurements[index + 1], parameter)
                if index < len(patient.measurements) - 1
                else None
            )
            transient = next_value is not None and abs(next_value - baseline) < threshold / 2
            magnitude = abs(value - baseline) / threshold
            anomalies.append(
                Anomaly(
                    patient_id=patient.id,
                    timestamp=measurement.timestamp,
                    parameter=parameter,
                    value=value,
                    baseline=round(baseline, 1),
                    severity="high" if magnitude >= 1.8 else "moderate",
                    is_transient=transient,
                )
            )
    return anomalies


def assess_patient(patient: PatientDetail, model: str = "hybrid") -> RiskAssessment:
    """Calculate an explainable prototype assessment from the latest trajectory.

    ``model`` selects the risk scorer: ``"hybrid"`` blends the trained ML probability
    with the deterministic rules, while ``"xgboost"`` and ``"logistic"`` use the
    corresponding trained model directly.
    """

    latest = patient.measurements[-1]
    baselines = {parameter: baseline_for(patient, parameter) for parameter in _TRACKED_PARAMETERS}
    factors: list[RiskFactor] = []

    spo2_drop = _clamp((baselines["spo2"] - (latest.spo2 or baselines["spo2"])) / 7)
    if spo2_drop >= 0.1:
        factors.append(
            RiskFactor(
                parameter="SpO₂",
                summary="SpO₂ is below this patient's established baseline.",
                contribution=round(spo2_drop, 2),
            )
        )

    heart_rate_increase = _clamp(
        ((latest.heart_rate or baselines["heart_rate"]) - baselines["heart_rate"]) / 36
    )
    if heart_rate_increase >= 0.12:
        factors.append(
            RiskFactor(
                parameter="Heart rate",
                summary="Heart rate is above this patient's established baseline.",
                contribution=round(heart_rate_increase, 2),
            )
        )

    temperature_increase = _clamp(
        ((latest.temperature or baselines["temperature"]) - baselines["temperature"]) / 1.8
    )
    if temperature_increase >= 0.12:
        factors.append(
            RiskFactor(
                parameter="Temperature",
                summary="Temperature is increasing relative to this patient's baseline.",
                contribution=round(temperature_increase, 2),
            )
        )

    spo2_trend = _clamp(
        -_slope([measurement.spo2 for measurement in patient.measurements[-4:]]) / 2
    )
    heart_rate_trend = _clamp(
        _slope([measurement.heart_rate for measurement in patient.measurements[-4:]]) / 12
    )
    trend_score = (spo2_trend + heart_rate_trend) / 2
    if trend_score >= 0.12:
        factors.append(
            RiskFactor(
                parameter="Trajectory",
                summary="Multiple recent measurements are moving in a concerning direction.",
                contribution=round(trend_score, 2),
            )
        )

    anomalies = identify_anomalies(patient)
    latest_anomaly = any(
        anomaly.timestamp == latest.timestamp and not anomaly.is_transient for anomaly in anomalies
    )
    anomaly_score = 0.25 if latest_anomaly else 0.0
    deterioration_score = (spo2_drop + heart_rate_increase + temperature_increase + trend_score) / 4
    deterministic_risk = _clamp(0.14 + (0.68 * deterioration_score) + (0.2 * anomaly_score))

    ml_risk = ml_engine.predict_risk(patient, model)
    if ml_risk is not None:
        if model == "hybrid":
            risk = _clamp((0.5 * ml_risk) + (0.5 * deterministic_risk))
        else:
            risk = _clamp(ml_risk)
    else:
        risk = deterministic_risk

    quality = _data_quality(patient)
    confidence = _clamp(0.96 * quality.score - (0.08 if len(patient.measurements) < 6 else 0.0))

    historical_transient = any(anomaly.is_transient for anomaly in anomalies)
    suppressed = historical_transient and risk < 0.25
    # SHAP explains the XGBoost model; rule-based evidence is shown for the
    # logistic scorer so the explanation always matches the selected model.
    shap_explained = ml_engine.shap_factors(patient) if model in ("hybrid", "xgboost") else None
    if shap_explained:
        factors = shap_explained
    if not factors:
        factors.append(
            RiskFactor(
                parameter="Trajectory",
                summary="Recent measurements remain close to this patient's established baseline.",
                contribution=0.0,
            )
        )

    return RiskAssessment(
        patient_id=patient.id,
        assessed_at=latest.timestamp,
        risk=round(risk, 2),
        confidence=round(confidence, 2),
        alert_level=_score_level(risk),
        data_quality=quality,
        top_factors=sorted(factors, key=lambda factor: factor.contribution, reverse=True)[:3],
        alert_suppressed=suppressed,
        suppression_reason=(
            "An isolated historical anomaly returned to baseline and did not persist."
            if suppressed
            else None
        ),
    )
