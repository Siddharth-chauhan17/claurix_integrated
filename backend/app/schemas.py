"""Pydantic schemas for auth API."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


# ----- Request bodies -----

# Bcrypt supports up to 72 bytes; 64 chars keeps us safely under that and avoids
# silent truncation. Enforced via validation only (no truncation).
PASSWORD_MIN_LENGTH = 8
PASSWORD_MAX_LENGTH = 64


class SignupRequest(BaseModel):
    """POST /auth/signup body."""

    name: str = Field(..., min_length=1, max_length=255, examples=["Jane Doe"])
    email: EmailStr = Field(..., examples=["jane@example.com"])
    password: str = Field(
        ...,
        min_length=PASSWORD_MIN_LENGTH,
        max_length=PASSWORD_MAX_LENGTH,
        description="Password must be between 8 and 64 characters (bcrypt limit).",
    )


class LoginRequest(BaseModel):
    """POST /auth/login body."""

    email: EmailStr = Field(..., examples=["jane@example.com"])
    password: str = Field(..., min_length=1)


# ----- Responses -----


class Token(BaseModel):
    """JWT token returned on login/signup."""

    access_token: str = Field(..., description="JWT bearer token")
    token_type: str = Field(default="bearer", description="Token type")
    expires_in: int = Field(..., description="Seconds until token expiry")


class UserResponse(BaseModel):
    """User data in API responses (no password)."""

    id: int
    name: str
    email: str
    created_at: datetime
    google_id: Optional[str] = None

    model_config = {"from_attributes": True}


class SignupResponse(BaseModel):
    """Response for POST /auth/signup."""

    user: UserResponse
    token: Token
    message: str = Field(default="Account created successfully")


class LoginResponse(BaseModel):
    """Response for POST /auth/login."""

    user: UserResponse
    token: Token
