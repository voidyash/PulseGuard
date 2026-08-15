"""Public request and response schemas for the synthetic PulseGuard prototype."""

from datetime import UTC, datetime
from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

VitalParameter = Literal[
    "heart_rate",
    "spo2",
    "temperature",
    "systolic_bp",
    "diastolic_bp",
    "glucose",
    "sleep_hours",
    "activity_level",
]

RiskModel = Literal["hybrid", "xgboost", "logistic"]


class AlertLevel(StrEnum):
    """Triage level based on an explainable prototype risk score."""

    STABLE = "stable"
    WATCH = "watch"
    WARNING = "warning"
    CRITICAL = "critical"


class VitalMeasurement(BaseModel):
    """One timestamped synthetic observation for a patient."""

    timestamp: datetime | None = None
    heart_rate: float | None = Field(default=None, ge=0)
    spo2: float | None = Field(default=None, ge=0, le=100)
    temperature: float | None = Field(default=None, ge=25, le=45)
    systolic_bp: float | None = Field(default=None, ge=0)
    diastolic_bp: float | None = Field(default=None, ge=0)
    glucose: float | None = Field(default=None, ge=0)
    sleep_hours: float | None = Field(default=None, ge=0, le=24)
    activity_level: float | None = Field(default=None, ge=0, le=1)

    @model_validator(mode="after")
    def _default_timestamp(self) -> "VitalMeasurement":
        """Default an omitted timestamp to now so client-created readings are usable."""

        if self.timestamp is None:
            self.timestamp = datetime.now(UTC)
        return self


class Patient(BaseModel):
    """Synthetic patient profile shown to clinicians in the prototype."""

    model_config = ConfigDict(frozen=True)

    id: str
    display_name: str
    age: int = Field(ge=0, le=130)
    sex: str
    medical_history: list[str]
    created_at: datetime
    data_source: str = "synthetic"


class PatientDetail(Patient):
    """Patient profile including its longitudinal synthetic measurements."""

    measurements: list[VitalMeasurement]


class RiskFactor(BaseModel):
    """Human-readable evidence contributing to a prototype risk score."""

    parameter: str
    summary: str
    contribution: float = Field(ge=0, le=1)


class DataQuality(BaseModel):
    """Completeness information kept distinct from prediction confidence."""

    score: float = Field(ge=0, le=1)
    important_missing_parameters: list[str]


class RiskAssessment(BaseModel):
    """Non-diagnostic prototype output for a single patient trajectory."""

    patient_id: str
    assessed_at: datetime
    risk: float = Field(ge=0, le=1)
    confidence: float = Field(ge=0, le=1)
    alert_level: AlertLevel
    data_quality: DataQuality
    top_factors: list[RiskFactor]
    alert_suppressed: bool
    suppression_reason: str | None = None
    prototype_notice: str = "Synthetic-data prototype for clinical review support only; not a diagnosis or treatment recommendation."


class Anomaly(BaseModel):
    """A notable value relative to the patient's own synthetic baseline."""

    patient_id: str
    timestamp: datetime
    parameter: str
    value: float
    baseline: float
    severity: str
    is_transient: bool


class PatientSummary(Patient):
    """A patient-list row with current triage fields."""

    risk: float = Field(ge=0, le=1)
    confidence: float = Field(ge=0, le=1)
    alert_level: AlertLevel
    data_quality: float = Field(ge=0, le=1)


class TimeSeriesPoint(BaseModel):
    """One point of a parameter trajectory with FR-03 time-series features."""

    timestamp: datetime
    value: float | None
    baseline: float
    baseline_deviation: float | None
    percentage_change: float | None
    rolling_mean: float | None
    slope_short: float | None
    slope_long: float | None
    trend_short: str
    trend_long: str
    is_anomaly: bool


class ParameterSeries(BaseModel):
    """A single parameter's trajectory against the patient's own baseline."""

    parameter: str
    baseline: float
    points: list[TimeSeriesPoint]


class RiskTimelinePoint(BaseModel):
    """Prototype risk as it evolved up to one measurement in the trajectory."""

    timestamp: datetime
    risk: float = Field(ge=0, le=1)
    confidence: float = Field(ge=0, le=1)
    alert_level: AlertLevel


class PatientTimeline(BaseModel):
    """Per-parameter time-series features for one synthetic patient."""

    patient_id: str
    series: list[ParameterSeries]
    risk_points: list[RiskTimelinePoint] = Field(default_factory=list)


class Recommendation(BaseModel):
    """One structured, non-diagnostic suggestion for clinical review."""

    category: str
    priority: str
    text: str
    rationale: str


class RecommendationsResponse(BaseModel):
    """Structured review guidance for one patient, kept separate from risk."""

    patient_id: str
    generated_at: datetime
    recommendations: list[Recommendation]


class SimulationChange(BaseModel):
    """One parameter override applied to a copy of the patient trajectory."""

    index: int = -1
    parameter: VitalParameter
    value: float | None


class SimulationRequest(BaseModel):
    """What-if scenario: which measurements to override before reassessment."""

    patient_id: str
    changes: list[SimulationChange] = Field(min_length=1)
    model: RiskModel = "hybrid"


class PredictRequest(BaseModel):
    """Arbitrary synthetic trajectory to score with the prototype engine."""

    patient_id: str = "simulated"
    measurements: list[VitalMeasurement] = Field(min_length=1)


class LoginRequest(BaseModel):
    """Demo credentials for the hackathon prototype."""

    username: str
    password: str


class LoginResponse(BaseModel):
    """Bearer token returned after successful authentication."""

    access_token: str
    token_type: str = "bearer"
    expires_in: int
    username: str


class CreatePatientRequest(BaseModel):
    """Profile for a patient added through the dashboard."""

    display_name: str | None = Field(default=None, max_length=120)
    age: int = Field(ge=0, le=130)
    sex: str = Field(min_length=1, max_length=40)
    medical_history: list[str] = Field(default_factory=list)
    measurements: list[VitalMeasurement] = Field(default_factory=list, max_length=200)


class ModelInfo(BaseModel):
    """One ML component exposed by the prototype's model registry."""

    name: str
    kind: Literal["risk", "anomaly", "explainability"]
    status: Literal["trained", "unavailable"]
    description: str
    metrics: dict[str, float] = Field(default_factory=dict)
    active: bool = False
