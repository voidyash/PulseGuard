"""Service health endpoint."""

from fastapi import APIRouter

router = APIRouter(tags=["health"])


@router.get("/health")
def health_check() -> dict[str, str]:
    """Report that the synthetic prototype API is running."""

    return {"status": "ok", "data_mode": "synthetic"}
