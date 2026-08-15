"""Risk prediction endpoints."""

from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.core.security import require_auth
from app.domain.schemas import PatientDetail, PredictRequest, RiskAssessment, RiskModel
from app.services.risk_engine import assess_patient

router = APIRouter(prefix="/risk", tags=["risk"], dependencies=[Depends(require_auth)])


@router.post("/predict", response_model=RiskAssessment)
def predict_risk(
    payload: PredictRequest,
    model: Annotated[RiskModel, Query(description="Risk scorer to use.")] = "hybrid",
) -> RiskAssessment:
    """Score an arbitrary synthetic trajectory with the prototype engine."""

    patient = PatientDetail(
        id=payload.patient_id,
        display_name=f"Simulated patient {payload.patient_id}",
        age=0,
        sex="unknown",
        medical_history=[],
        created_at=datetime.now(UTC),
        measurements=payload.measurements,
    )
    return assess_patient(patient, model=model)
