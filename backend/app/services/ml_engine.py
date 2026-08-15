"""Prototype ML models: XGBoost, Logistic Regression, Isolation Forest, and SHAP.

The models are trained lazily on generated synthetic trajectories the first time
they are needed and held in a process-wide cache. When the ML stack is not
installed (or training fails) every function returns ``None`` so the calling
code can fall back to the deterministic risk engine.

All outputs are prototype-only and not clinically validated.
"""

from __future__ import annotations

import threading
from datetime import UTC, datetime, timedelta

import numpy as np

from app.domain.schemas import Anomaly, PatientDetail, RiskFactor, VitalMeasurement

_TRACKED_PARAMETERS = (
    "heart_rate",
    "spo2",
    "temperature",
    "systolic_bp",
    "diastolic_bp",
    "glucose",
)
_PARAMETER_LABELS = {
    "heart_rate": "Heart rate",
    "spo2": "SpO₂",
    "temperature": "Temperature",
    "systolic_bp": "Systolic BP",
    "diastolic_bp": "Diastolic BP",
    "glucose": "Glucose",
}
_ANOMALY_SENSITIVITY = {
    "heart_rate": 18.0,
    "spo2": 4.0,
    "temperature": 0.8,
    "systolic_bp": 20.0,
    "diastolic_bp": 12.0,
    "glucose": 25.0,
}
_BASELINES = {
    "heart_rate": 78.0,
    "spo2": 97.5,
    "temperature": 36.9,
    "systolic_bp": 120.0,
    "diastolic_bp": 76.0,
    "glucose": 95.0,
}
_NOISE = {
    "heart_rate": 4.0,
    "spo2": 0.7,
    "temperature": 0.2,
    "systolic_bp": 5.0,
    "diastolic_bp": 3.0,
    "glucose": 7.0,
}
_DRIFT = {
    "heart_rate": 26.0,
    "spo2": -7.0,
    "temperature": 1.3,
    "systolic_bp": -14.0,
    "diastolic_bp": -8.0,
    "glucose": 22.0,
}
_SEED = 7
_N_STABLE = 600
_N_DETERIORATING = 600
_N_TRANSIENT = 150
_N_SUDDEN = 250


def _imports_available() -> bool:
    """Return whether the ML stack can be imported on this interpreter."""

    try:
        import sklearn  # noqa: F401
        import xgboost  # noqa: F401
    except ImportError:
        return False
    return True


# ---------------------------------------------------------------------------
# Feature engineering
# ---------------------------------------------------------------------------

_FEATURE_SUFFIXES = (
    "mean",
    "mean_last3",
    "slope_all",
    "slope_last3",
    "latest_deviation",
    "latest_pct_change",
    "std",
    "missing_frac",
)
_FEATURE_PARAMETERS: tuple[str | None, ...] = tuple(
    param for param in _TRACKED_PARAMETERS for _ in _FEATURE_SUFFIXES
) + ("count", "missing_ratio", "age", "sex_male")


def _observed(values: list[float | None]) -> list[float]:
    return [value for value in values if value is not None]


def _slope(values: list[float | None]) -> float:
    observed = _observed(values)
    if len(observed) < 2:
        return 0.0
    return (observed[-1] - observed[0]) / (len(observed) - 1)


def _std(values: list[float | None]) -> float:
    observed = _observed(values)
    if len(observed) < 2:
        return 0.0
    return float(np.std(observed))


def extract_feature_vector(patient: PatientDetail) -> np.ndarray:
    """Return the fixed-order numeric feature vector for one patient trajectory."""

    measurements = patient.measurements
    count = len(measurements)
    features: list[float] = []
    for parameter in _TRACKED_PARAMETERS:
        values = [getattr(measurement, parameter) for measurement in measurements]
        observed = _observed(values)
        mean = float(np.mean(observed)) if observed else _BASELINES[parameter]
        last3 = _observed(values[-3:])
        latest = values[-1] if values else None
        previous = values[-2] if len(values) > 1 else None
        missing_fraction = 1 - (len(observed) / count) if count else 1.0
        features.extend(
            [
                mean,
                float(np.mean(last3)) if last3 else mean,
                _slope(values),
                _slope(values[-3:]) if len(values) >= 2 else 0.0,
                (latest - mean) if latest is not None else 0.0,
                ((latest - previous) / previous)
                if latest is not None and previous not in (None, 0)
                else 0.0,
                _std(values),
                missing_fraction,
            ]
        )
    total_slots = count * len(_TRACKED_PARAMETERS)
    missing_slots = sum(
        1
        for measurement in measurements
        for parameter in _TRACKED_PARAMETERS
        if getattr(measurement, parameter) is None
    )
    features.extend(
        [
            float(count),
            (missing_slots / total_slots) if total_slots else 1.0,
            float(patient.age),
            1.0 if patient.sex.strip().lower() in ("male", "m") else 0.0,
        ]
    )
    return np.asarray(features, dtype=float)


# ---------------------------------------------------------------------------
# Synthetic training data
# ---------------------------------------------------------------------------


def _make_trajectory(rng: np.random.Generator, deterioration: float, with_transient: bool) -> PatientDetail:
    """Generate one synthetic trajectory; deterioration is 0.0 or 1.0."""

    count = int(rng.integers(6, 12))
    start = datetime(2026, 1, 1, tzinfo=UTC)
    measurements: list[VitalMeasurement] = []
    for index in range(count):
        progress = index / max(1, count - 1)
        values: dict[str, float | None] = {}
        for parameter in _TRACKED_PARAMETERS:
            base = _BASELINES[parameter] + rng.normal(0.0, _NOISE[parameter] * 0.5)
            value = base + (_DRIFT[parameter] * progress * deterioration) + rng.normal(0.0, _NOISE[parameter])
            if parameter == "spo2":
                value = min(100.0, max(80.0, value))
            values[parameter] = round(float(value), 1)
        if with_transient and index == count // 2:
            values["spo2"] = round(min(100.0, max(80.0, float(values["spo2"]) - 5.5)), 1)
            values["heart_rate"] = round(float(values["heart_rate"]) + 14.0, 1)
        for parameter in _TRACKED_PARAMETERS:
            if rng.random() < 0.08:
                values[parameter] = None
        measurements.append(
            VitalMeasurement(timestamp=start + timedelta(hours=index * 4), **values)
        )
    return PatientDetail(
        id="training",
        display_name="Training",
        age=int(rng.integers(30, 85)),
        sex="Male" if rng.random() < 0.5 else "Female",
        medical_history=[],
        created_at=start,
        measurements=measurements,
    )


def _make_sudden_trajectory(rng: np.random.Generator) -> PatientDetail:
    """Stable trajectory that deteriorates sharply in its final readings.

    This captures what-if scenarios where a clinician overrides the latest
    reading with a severe value after an otherwise stable history.
    """

    count = int(rng.integers(6, 10))
    start = datetime(2026, 1, 1, tzinfo=UTC)
    sudden_at = count - int(rng.integers(1, 3))
    measurements: list[VitalMeasurement] = []
    for index in range(count):
        values: dict[str, float | None] = {}
        for parameter in _TRACKED_PARAMETERS:
            value = _BASELINES[parameter] + rng.normal(0.0, _NOISE[parameter] * 0.5)
            if index >= sudden_at:
                value += _DRIFT[parameter] * rng.uniform(0.8, 1.1)
            if parameter == "spo2":
                value = min(100.0, max(80.0, value))
            values[parameter] = round(float(value), 1)
        for parameter in _TRACKED_PARAMETERS:
            if rng.random() < 0.08:
                values[parameter] = None
        measurements.append(
            VitalMeasurement(timestamp=start + timedelta(hours=index * 4), **values)
        )
    return PatientDetail(
        id="training",
        display_name="Training",
        age=int(rng.integers(30, 85)),
        sex="Male" if rng.random() < 0.5 else "Female",
        medical_history=[],
        created_at=start,
        measurements=measurements,
    )


def _generate_training_data(rng: np.random.Generator) -> tuple[np.ndarray, np.ndarray]:
    """Build the labeled synthetic corpus used to train the risk models."""

    rows: list[np.ndarray] = []
    labels: list[int] = []
    for _ in range(_N_STABLE):
        rows.append(extract_feature_vector(_make_trajectory(rng, 0.0, with_transient=False)))
        labels.append(0)
    for _ in range(_N_TRANSIENT):
        rows.append(extract_feature_vector(_make_trajectory(rng, 0.0, with_transient=True)))
        labels.append(0)
    for _ in range(_N_DETERIORATING):
        rows.append(extract_feature_vector(_make_trajectory(rng, 1.0, with_transient=False)))
        labels.append(1)
    for _ in range(_N_SUDDEN):
        rows.append(extract_feature_vector(_make_sudden_trajectory(rng)))
        labels.append(1)

    return np.vstack(rows), np.asarray(labels, dtype=int)


def _measurement_vectors(patient: PatientDetail, impute: np.ndarray) -> np.ndarray:
    """Return per-measurement numeric vectors for Isolation Forest scoring."""

    rows: list[np.ndarray] = []
    for measurement in patient.measurements:
        row = np.asarray(
            [getattr(measurement, parameter) for parameter in _TRACKED_PARAMETERS],
            dtype=float,
        )
        rows.append(np.nan_to_num(row, nan=impute))
    if not rows:
        return np.empty((0, len(_TRACKED_PARAMETERS)))
    return np.vstack(rows)


def _roc_auc(y_true: np.ndarray, probabilities: np.ndarray) -> float | None:
    """Return a sanity-check AUC for the registry, or None for a degenerate split."""

    try:
        from sklearn.metrics import roc_auc_score

        if len(np.unique(y_true)) < 2:
            return None
        return float(roc_auc_score(y_true, probabilities))
    except Exception:  # noqa: BLE001 - metrics are best-effort for the registry
        return None


# ---------------------------------------------------------------------------
# Model training and cache
# ---------------------------------------------------------------------------

_models: dict | None = None
_lock = threading.Lock()


def _train() -> dict | None:
    """Train all models on generated synthetic data; returns None on failure."""

    if not _imports_available():
        return None
    try:
        import shap
        import xgboost as xgb
        from sklearn.ensemble import IsolationForest
        from sklearn.linear_model import LogisticRegression
        from sklearn.model_selection import train_test_split

        rng = np.random.default_rng(_SEED)
        features, labels = _generate_training_data(rng)
        split = train_test_split(
            features, labels, test_size=0.2, random_state=_SEED, stratify=labels
        )
        x_train, x_test, y_train, y_test = split

        xgb_model = xgb.XGBClassifier(
            n_estimators=120,
            max_depth=3,
            learning_rate=0.1,
            subsample=0.9,
            colsample_bytree=0.8,
            eval_metric="logloss",
            random_state=_SEED,
        )
        xgb_model.fit(x_train, y_train)

        logistic = LogisticRegression(max_iter=2000, C=1.0, random_state=_SEED)
        logistic.fit(x_train, y_train)

        xgb_auc = _roc_auc(y_test, xgb_model.predict_proba(x_test)[:, 1])
        logistic_auc = _roc_auc(y_test, logistic.predict_proba(x_test)[:, 1])

        # Isolation Forest is trained on normal trajectories only, so anything
        # that deviates from the healthy population (dips, drift) is flagged.
        normal_vectors: list[np.ndarray] = []
        for _ in range(_N_STABLE):
            trajectory = _make_trajectory(rng, 0.0, with_transient=False)
            normal_vectors.append(_measurement_vectors(trajectory, impute=_BASELINES_VECTOR))
        normal_matrix = np.vstack(normal_vectors)
        impute = np.nanmedian(normal_matrix, axis=0)
        iforest = IsolationForest(contamination=0.05, random_state=_SEED, n_jobs=1)
        iforest.fit(np.nan_to_num(normal_matrix, nan=impute))

        explainer = None
        try:
            explainer = shap.TreeExplainer(xgb_model)
        except Exception:  # noqa: BLE001 - SHAP is optional; fall back to rule factors
            explainer = None

        return {
            "xgb": xgb_model,
            "logistic": logistic,
            "iforest": iforest,
            "impute": impute,
            "shap_explainer": explainer,
            "xgb_auc": xgb_auc,
            "logistic_auc": logistic_auc,
        }
    except Exception:  # noqa: BLE001 - training failure falls back to deterministic engine
        return None


_BASELINES_VECTOR = np.asarray([_BASELINES[parameter] for parameter in _TRACKED_PARAMETERS], dtype=float)


def _ensure_models() -> dict | None:
    """Return the cached trained models, training them once on first use."""

    global _models
    if _models is not None:
        return _models
    with _lock:
        if _models is None:
            _models = _train()
    return _models


# ---------------------------------------------------------------------------
# Public API used by the risk engine
# ---------------------------------------------------------------------------


def predict_risk(patient: PatientDetail, model: str = "hybrid") -> float | None:
    """Return an ML probability of deterioration for the patient, or None."""

    models = _ensure_models()
    if models is None:
        return None
    vector = extract_feature_vector(patient).reshape(1, -1)
    try:
        if model == "logistic":
            return float(models["logistic"].predict_proba(vector)[0, 1])
        return float(models["xgb"].predict_proba(vector)[0, 1])
    except Exception:  # noqa: BLE001 - a prediction failure falls back to deterministic risk
        return None


def shap_factors(patient: PatientDetail) -> list[RiskFactor] | None:
    """Explain the XGBoost prediction with SHAP, grouped by vital parameter."""

    models = _ensure_models()
    if models is None or models["shap_explainer"] is None:
        return None
    vector = extract_feature_vector(patient).reshape(1, -1)
    try:
        values = models["shap_explainer"].shap_values(vector)
    except Exception:  # noqa: BLE001 - SHAP failure falls back to rule factors
        return None
    if isinstance(values, list):
        values = values[-1]  # binary classification: positive-class contributions
    values = np.asarray(values).reshape(-1)

    group_sums: dict[str, float] = {}
    for index, value in enumerate(values):
        parameter = _FEATURE_PARAMETERS[index]
        if parameter is None or value <= 0:
            continue
        group_sums[parameter] = group_sums.get(parameter, 0.0) + float(value)
    if not group_sums:
        return None

    peak = max(group_sums.values())
    factors: list[RiskFactor] = []
    for parameter, total in sorted(group_sums.items(), key=lambda item: -item[1])[:3]:
        factors.append(
            RiskFactor(
                parameter=_PARAMETER_LABELS[parameter],
                summary=_factor_summary(patient, parameter),
                contribution=round(total / peak, 2),
            )
        )
    return factors


def _factor_summary(patient: PatientDetail, parameter: str) -> str:
    """Describe how the parameter compares with the patient's own baseline."""

    label = _PARAMETER_LABELS[parameter]
    latest = getattr(patient.measurements[-1], parameter) if patient.measurements else None
    if latest is None:
        return f"The latest {label} reading is missing, which reduces confidence."
    baseline = _baseline(patient, parameter)
    if latest > baseline:
        return f"{label} is above this patient's established baseline."
    if latest < baseline:
        return f"{label} is below this patient's established baseline."
    return f"{label} remains close to this patient's established baseline."


def _baseline(patient: PatientDetail, parameter: str) -> float:
    """Personal baseline: the mean of the first half of the trajectory."""

    measurements = patient.measurements
    split_index = max(3, len(measurements) // 2)
    observed = _observed([getattr(measurement, parameter) for measurement in measurements[:split_index]])
    return float(np.mean(observed)) if observed else _BASELINES[parameter]


def iforest_anomalies(patient: PatientDetail) -> list[Anomaly] | None:
    """Flag measurements that deviate from the healthy population via Isolation Forest.

    A measurement is flagged when its isolation score falls clearly below the
    patient's own score distribution, and each flagged reading reports every
    parameter that deviates materially from the patient's personal baseline.
    """

    models = _ensure_models()
    if models is None or models["iforest"] is None:
        return None
    vectors = _measurement_vectors(patient, models["impute"])
    if len(vectors) == 0:
        return []
    try:
        scores = models["iforest"].decision_function(vectors)
    except Exception:  # noqa: BLE001 - IForest failure falls back to the threshold detector
        return None
    if len(scores) < 2:
        flagged = scores < 0
    else:
        flagged = scores <= float(np.median(scores)) - 0.06
    if not flagged.any():
        return []

    anomalies: list[Anomaly] = []
    measurements = patient.measurements
    for index, measurement in enumerate(measurements):
        if not flagged[index]:
            continue
        for parameter in _TRACKED_PARAMETERS:
            value = getattr(measurement, parameter)
            if value is None:
                continue
            baseline = _baseline(patient, parameter)
            deviation = abs(value - baseline)
            if deviation < _ANOMALY_SENSITIVITY[parameter]:
                continue
            next_value = (
                getattr(measurements[index + 1], parameter)
                if index < len(measurements) - 1
                else None
            )
            transient = next_value is not None and abs(next_value - baseline) < deviation * 0.5
            magnitude = deviation / _ANOMALY_SENSITIVITY[parameter]
            anomalies.append(
                Anomaly(
                    patient_id=patient.id,
                    timestamp=measurement.timestamp,
                    parameter=parameter,
                    value=round(float(value), 2),
                    baseline=round(baseline, 1),
                    severity="high" if magnitude >= 1.8 else "moderate",
                    is_transient=transient,
                )
            )
    return anomalies


def model_registry() -> list[dict]:
    """Return human-readable status for each ML component."""

    models = _ensure_models()
    available = models is not None
    return [
        {
            "name": "XGBoost",
            "kind": "risk",
            "status": "trained" if available else "unavailable",
            "description": "Gradient-boosted risk model; the primary ML risk scorer.",
            "metrics": {"roc_auc": models["xgb_auc"]} if available and models["xgb_auc"] is not None else {},
            "active": True,
        },
        {
            "name": "Logistic Regression",
            "kind": "risk",
            "status": "trained" if available else "unavailable",
            "description": "Linear baseline risk model, selectable on the patient page.",
            "metrics": {"roc_auc": models["logistic_auc"]} if available and models["logistic_auc"] is not None else {},
            "active": False,
        },
        {
            "name": "Isolation Forest",
            "kind": "anomaly",
            "status": "trained" if available else "unavailable",
            "description": "Flags measurements that deviate from the healthy population.",
            "metrics": {},
            "active": False,
        },
        {
            "name": "SHAP",
            "kind": "explainability",
            "status": "trained"
            if available and models["shap_explainer"] is not None
            else "unavailable",
            "description": "Feature-attribution explanations behind the XGBoost risk factors.",
            "metrics": {},
            "active": False,
        },
    ]
