"""Model registry endpoint exposing the prototype's ML components."""

from fastapi import APIRouter, Depends

from app.core.security import require_auth
from app.domain.schemas import ModelInfo
from app.services.patient_service import get_model_registry

router = APIRouter(
    prefix="/models",
    tags=["models"],
    dependencies=[Depends(require_auth)],
)


@router.get("", response_model=list[ModelInfo])
def list_models() -> list[ModelInfo]:
    """Return status and metrics for XGBoost, Logistic Regression, Isolation Forest, and SHAP."""

    return get_model_registry()
