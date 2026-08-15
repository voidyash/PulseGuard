"""Authentication endpoints for the hackathon prototype."""

from fastapi import APIRouter, HTTPException, status

from app.core.security import TOKEN_TTL_SECONDS, authenticate, issue_token
from app.domain.schemas import LoginRequest, LoginResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest) -> LoginResponse:
    """Exchange demo credentials for a short-lived bearer token."""

    if not authenticate(payload.username, payload.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password.",
        )
    return LoginResponse(
        access_token=issue_token(payload.username),
        expires_in=TOKEN_TTL_SECONDS,
        username=payload.username,
    )
