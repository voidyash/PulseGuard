"""FR-03 time-series features for one synthetic patient trajectory."""

from statistics import fmean

from app.domain.schemas import (
    ParameterSeries,
    PatientDetail,
    PatientTimeline,
    RiskTimelinePoint,
    TimeSeriesPoint,
)
from app.services.risk_engine import assess_patient, baseline_for, identify_anomalies

_TRACKED_PARAMETERS = (
    "heart_rate",
    "spo2",
    "temperature",
    "systolic_bp",
    "diastolic_bp",
    "glucose",
    "sleep_hours",
    "activity_level",
)
_ROLLING_WINDOW = 6
_SHORT_WINDOW = 3


def _slope_or_none(values: list[float]) -> float | None:
    if len(values) < 2:
        return None
    return (values[-1] - values[0]) / (len(values) - 1)


def _mean_or_none(values: list[float]) -> float | None:
    return fmean(values) if values else None


def _trend_label(slope: float | None) -> str:
    if slope is None:
        return "stable"
    if slope > 1e-9:
        return "increasing"
    if slope < -1e-9:
        return "decreasing"
    return "stable"


def patient_timeline(patient: PatientDetail) -> PatientTimeline:
    """Compute rolling means, slopes, rates of change, and baseline deviations."""

    anomaly_keys = {
        (anomaly.timestamp, anomaly.parameter) for anomaly in identify_anomalies(patient)
    }
    series: list[ParameterSeries] = []
    for parameter in _TRACKED_PARAMETERS:
        values = [getattr(measurement, parameter) for measurement in patient.measurements]
        if not any(value is not None for value in values):
            continue
        baseline = baseline_for(patient, parameter)
        observed = [value for value in values if value is not None]
        slope_long = _slope_or_none(observed)
        points: list[TimeSeriesPoint] = []
        for index, measurement in enumerate(patient.measurements):
            value = values[index]
            previous = values[index - 1] if index > 0 else None
            percentage_change = (
                ((value - previous) / previous) * 100
                if value is not None and previous not in (None, 0)
                else None
            )
            rolling = _mean_or_none(
                [
                    item
                    for item in values[max(0, index - _ROLLING_WINDOW + 1) : index + 1]
                    if item is not None
                ]
            )
            short_observed = [
                item
                for item in values[max(0, index - _SHORT_WINDOW + 1) : index + 1]
                if item is not None
            ]
            slope_short = _slope_or_none(short_observed)
            points.append(
                TimeSeriesPoint(
                    timestamp=measurement.timestamp,
                    value=value,
                    baseline=round(baseline, 2),
                    baseline_deviation=round(value - baseline, 2) if value is not None else None,
                    percentage_change=round(percentage_change, 2)
                    if percentage_change is not None
                    else None,
                    rolling_mean=round(rolling, 2) if rolling is not None else None,
                    slope_short=round(slope_short, 4) if slope_short is not None else None,
                    slope_long=round(slope_long, 4) if slope_long is not None else None,
                    trend_short=_trend_label(slope_short),
                    trend_long=_trend_label(slope_long),
                    is_anomaly=(measurement.timestamp, parameter) in anomaly_keys,
                )
            )
        series.append(ParameterSeries(parameter=parameter, baseline=round(baseline, 2), points=points))
    return PatientTimeline(patient_id=patient.id, series=series, risk_points=_risk_points(patient))


def _risk_points(patient: PatientDetail) -> list[RiskTimelinePoint]:
    """Reassess the trajectory at each measurement to expose a risk history."""

    points: list[RiskTimelinePoint] = []
    for index in range(len(patient.measurements)):
        prefix = patient.model_copy(deep=True, update={"measurements": patient.measurements[: index + 1]})
        assessment = assess_patient(prefix)
        points.append(
            RiskTimelinePoint(
                timestamp=patient.measurements[index].timestamp,
                risk=assessment.risk,
                confidence=assessment.confidence,
                alert_level=assessment.alert_level,
            )
        )
    return points
