"""What-if simulation endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import require_auth
from app.domain.schemas import RiskAssessment, SimulationRequest
from app.services.simulation import simulate_patient

router = APIRouter(prefix="/simulation", tags=["simulation"], dependencies=[Depends(require_auth)])


@router.post("", response_model=RiskAssessment)
def simulate(payload: SimulationRequest) -> RiskAssessment:
    """Reassess risk after simulated changes to a patient trajectory."""

    try:
        assessment = simulate_patient(payload)
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail=str(error),
        ) from error
    if assessment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Synthetic patient {payload.patient_id} was not found.",
        )
    return assessment
