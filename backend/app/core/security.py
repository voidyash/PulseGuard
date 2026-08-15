"""Minimal authentication for the hackathon prototype.

The prototype uses one demo account whose credentials come from environment
variables, PBKDF2 password hashing, and short-lived in-memory bearer tokens. This
is deliberately simple and hackathon-only; a production deployment would use a
managed identity provider and persisted sessions.
"""

import hashlib
import hmac
import os
import secrets
import time
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

_PBKDF2_ITERATIONS = 600_000
TOKEN_TTL_SECONDS = 12 * 60 * 60

_DEMO_USERNAME = os.getenv("PULSEGUARD_DEMO_USERNAME", "demo")
_DEMO_PASSWORD = os.getenv("PULSEGUARD_DEMO_PASSWORD", "demo-password")

_bearer = HTTPBearer(auto_error=False)
_tokens: dict[str, float] = {}


def _password_hashes(password: str) -> tuple[str, str]:
    salt = secrets.token_bytes(16)
    derived = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, _PBKDF2_ITERATIONS)
    return salt.hex(), derived.hex()


def verify_password(password: str, salt_hex: str, expected_hash_hex: str) -> bool:
    """Return whether the password derives to the expected PBKDF2 hash."""

    salt = bytes.fromhex(salt_hex)
    derived = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, _PBKDF2_ITERATIONS)
    return hmac.compare_digest(derived.hex(), expected_hash_hex)


_DEMO_SALT_HEX, _DEMO_HASH_HEX = _password_hashes(_DEMO_PASSWORD)


def authenticate(username: str, password: str) -> bool:
    """Validate demo credentials without revealing which field was wrong."""

    if not hmac.compare_digest(username, _DEMO_USERNAME):
        return False
    return verify_password(password, _DEMO_SALT_HEX, _DEMO_HASH_HEX)


def issue_token(username: str) -> str:
    """Issue an in-memory bearer token valid for TOKEN_TTL_SECONDS."""

    token = secrets.token_urlsafe(32)
    _tokens[token] = time.time() + TOKEN_TTL_SECONDS
    return token


def require_auth(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(_bearer)],
) -> None:
    """FastAPI dependency rejecting requests without a valid bearer token."""

    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    expires_at = _tokens.get(credentials.credentials)
    if expires_at is None or time.time() > expires_at:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
            headers={"WWW-Authenticate": "Bearer"},
        )
