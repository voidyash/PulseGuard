"""Patient-facing application service backed by the synthetic repository."""

from app.domain.schemas import (
    Anomaly,
    CreatePatientRequest,
    ModelInfo,
    PatientDetail,
    PatientSummary,
    PatientTimeline,
    RecommendationsResponse,
    RiskAssessment,
)
from app.services import ml_engine
from app.services.recommendations import recommendations_for
from app.services.risk_engine import assess_patient, identify_anomalies
from app.services.synthetic_data import create_patient as store_patient
from app.services.synthetic_data import get_patient, list_patients, patient_profile
from app.services.time_series import patient_timeline


def get_patient_detail(patient_id: str) -> PatientDetail | None:
    """Return a complete synthetic profile, if it exists."""

    return get_patient(patient_id)


def create_patient(request: CreatePatientRequest) -> PatientDetail:
    """Add a patient to the in-memory synthetic store."""

    return store_patient(request)


def get_risk_assessment(patient_id: str, model: str = "hybrid") -> RiskAssessment | None:
    """Return the current prototype assessment, if the patient exists."""

    patient = get_patient(patient_id)
    return assess_patient(patient, model=model) if patient else None


def get_anomalies(patient_id: str) -> list[Anomaly] | None:
    """Return baseline-deviation anomalies, if the synthetic patient exists."""

    patient = get_patient(patient_id)
    return identify_anomalies(patient) if patient else None


def get_timeline(patient_id: str) -> PatientTimeline | None:
    """Return FR-03 time-series features, if the synthetic patient exists."""

    patient = get_patient(patient_id)
    return patient_timeline(patient) if patient else None


def get_recommendations(patient_id: str) -> RecommendationsResponse | None:
    """Return structured review guidance, if the synthetic patient exists."""

    patient = get_patient(patient_id)
    return recommendations_for(patient) if patient else None


def get_patient_summaries() -> list[PatientSummary]:
    """Return patient-list rows sorted by alert severity and risk."""

    summaries: list[PatientSummary] = []
    for patient in list_patients():
        assessment = assess_patient(patient)
        summaries.append(
            PatientSummary(
                **patient_profile(patient).model_dump(),
                risk=assessment.risk,
                confidence=assessment.confidence,
                alert_level=assessment.alert_level,
                data_quality=assessment.data_quality.score,
            )
        )
    return sorted(summaries, key=lambda summary: summary.risk, reverse=True)


def get_model_registry() -> list[ModelInfo]:
    """Return the status and metrics of each ML component."""

    return [ModelInfo(**entry) for entry in ml_engine.model_registry()]
