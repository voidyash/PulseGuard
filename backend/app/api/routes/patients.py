"""Synthetic patient, risk, anomaly, timeline, and recommendation endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.security import require_auth
from app.domain.schemas import (
    Anomaly,
    CreatePatientRequest,
    PatientDetail,
    PatientSummary,
    PatientTimeline,
    RecommendationsResponse,
    RiskAssessment,
    RiskModel,
)
from app.services.patient_service import (
    create_patient,
    get_anomalies,
    get_patient_detail,
    get_patient_summaries,
    get_recommendations,
    get_risk_assessment,
    get_timeline,
)

router = APIRouter(
    prefix="/patients",
    tags=["patients"],
    dependencies=[Depends(require_auth)],
)


def _not_found(patient_id: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Synthetic patient {patient_id} was not found.",
    )


@router.get("", response_model=list[PatientSummary])
def list_patient_profiles() -> list[PatientSummary]:
    """List synthetic patients ordered by their current prototype risk score."""

    return get_patient_summaries()


@router.post("", response_model=PatientDetail, status_code=status.HTTP_201_CREATED)
def add_patient(payload: CreatePatientRequest) -> PatientDetail:
    """Add a patient to the in-memory synthetic store."""

    return create_patient(payload)


@router.get("/{patient_id}", response_model=PatientDetail)
def read_patient_profile(patient_id: str) -> PatientDetail:
    """Return one synthetic patient and their longitudinal measurements."""

    patient = get_patient_detail(patient_id)
    if patient is None:
        raise _not_found(patient_id)
    return patient


@router.get("/{patient_id}/risk", response_model=RiskAssessment)
def read_patient_risk(
    patient_id: str,
    model: Annotated[RiskModel, Query(description="Risk scorer to use.")] = "hybrid",
) -> RiskAssessment:
    """Return separate risk, confidence, quality, and evidence fields."""

    assessment = get_risk_assessment(patient_id, model=model)
    if assessment is None:
        raise _not_found(patient_id)
    return assessment


@router.get("/{patient_id}/anomalies", response_model=list[Anomaly])
def read_patient_anomalies(patient_id: str) -> list[Anomaly]:
    """Return values that deviate notably from a personal baseline."""

    anomalies = get_anomalies(patient_id)
    if anomalies is None:
        raise _not_found(patient_id)
    return anomalies


@router.get("/{patient_id}/timeline", response_model=PatientTimeline)
def read_patient_timeline(patient_id: str) -> PatientTimeline:
    """Return per-parameter time-series features for charts and trend review."""

    timeline = get_timeline(patient_id)
    if timeline is None:
        raise _not_found(patient_id)
    return timeline


@router.get("/{patient_id}/recommendations", response_model=RecommendationsResponse)
def read_patient_recommendations(patient_id: str) -> RecommendationsResponse:
    """Return structured, non-diagnostic review guidance."""

    recommendations = get_recommendations(patient_id)
    if recommendations is None:
        raise _not_found(patient_id)
    return recommendations
