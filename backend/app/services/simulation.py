"""FR-13 what-if simulation over a copy of a synthetic patient trajectory."""

from app.domain.schemas import RiskAssessment, SimulationRequest
from app.services.risk_engine import assess_patient
from app.services.synthetic_data import get_patient


def simulate_patient(request: SimulationRequest) -> RiskAssessment | None:
    """Apply overrides to a deep copy of the patient and reassess risk.

    Returns None when the patient does not exist and raises ValueError when a
    change targets a measurement index outside the trajectory.
    """

    patient = get_patient(request.patient_id)
    if patient is None:
        return None
    simulated = patient.model_copy(deep=True)
    measurement_count = len(simulated.measurements)
    for change in request.changes:
        index = change.index if change.index >= 0 else measurement_count + change.index
        if index < 0 or index >= measurement_count:
            raise ValueError(
                f"Measurement index {change.index} is out of range for patient {request.patient_id}."
            )
        setattr(simulated.measurements[index], change.parameter, change.value)
    return assess_patient(simulated, model=request.model)
