"""Pydantic schemas for auth and demo request APIs."""

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator


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


class UserResponse(BaseModel):
    """User data in API responses (no password)."""

    id: str
    organization_id: str
    employee_id: str
    name: str
    email: str
    created_at: datetime
    updated_at: datetime
    google_id: Optional[str] = None

    model_config = {"from_attributes": True}


class SignupResponse(BaseModel):
    """Response for POST /auth/signup. Session JWT is set only via HttpOnly cookie."""

    user: UserResponse
    message: str = Field(default="Account created successfully")


class LoginResponse(BaseModel):
    """Response for POST /auth/login. Session JWT is set only via HttpOnly cookie."""

    user: UserResponse


# ----- Clients -----


class ClientCreate(BaseModel):
    """POST /clients body — server sets org and created_by."""

    name: str = Field(..., min_length=1, max_length=255)
    industry: Optional[str] = Field(default=None, max_length=255)
    contact_name: Optional[str] = Field(default=None, max_length=255)
    contact_email: Optional[str] = Field(default=None, max_length=255)
    notes: Optional[str] = Field(default=None, max_length=5000)


class ClientResponse(BaseModel):
    """Client returned from API."""

    id: str
    organization_id: str
    name: str
    industry: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    notes: Optional[str] = None
    created_by: str
    created_at: datetime
    updated_at: datetime
    last_worked_at: datetime

    model_config = {"from_attributes": True}


class ClientListResponse(BaseModel):
    """GET /clients list."""

    count: int
    items: list[ClientResponse]


class ProjectResponse(BaseModel):
    """Project returned from API."""

    id: str
    organization_id: str
    client_id: str
    client_name: str
    name: str
    location: Optional[str] = None
    created_by: str
    created_at: datetime
    updated_at: datetime
    last_worked_at: datetime
    status: str

    model_config = {"from_attributes": True}


class ProjectStatusUpdate(BaseModel):
    """PATCH /projects/{id}/status body."""

    status: str = Field(..., pattern="^(active|completed)$")


class ProjectCreate(BaseModel):
    """POST /projects body — server sets org and created_by."""

    client_id: str = Field(..., min_length=1, max_length=32)
    name: str = Field(..., min_length=1, max_length=255)


class ProjectListResponse(BaseModel):
    """GET /projects list."""

    count: int
    items: list[ProjectResponse]


# ----- Demo request -----


class DemoRequestCreate(BaseModel):
    """POST /demo-requests body."""

    full_name: str = Field(..., min_length=1, max_length=255)
    work_email: EmailStr
    company_name: str = Field(..., min_length=1, max_length=255)
    job_role: str = Field(..., min_length=1, max_length=128)
    qcr_generation_method: str = Field(..., min_length=1, max_length=128)
    monthly_quote_volume: str = Field(..., min_length=1, max_length=64)
    operational_challenges: list[str] = Field(..., min_length=1, max_length=20)
    lines_of_business: list[str] = Field(..., min_length=1, max_length=20)
    review_team_size: str = Field(..., min_length=1, max_length=64)
    preferred_demo_date: date
    preferred_time_window: str = Field(..., min_length=1, max_length=32)
    requested_demo_topics: list[str] = Field(..., min_length=1, max_length=20)
    additional_notes: Optional[str] = Field(default=None, max_length=5000)
    website: Optional[str] = Field(default=None, max_length=255)

    @field_validator(
        "operational_challenges",
        "lines_of_business",
        "requested_demo_topics",
        mode="before",
    )
    @classmethod
    def reject_empty_array_items(cls, value: list[str]) -> list[str]:
        if not isinstance(value, list):
            raise ValueError("Expected a list of values")
        cleaned = [item.strip() for item in value if isinstance(item, str) and item.strip()]
        if not cleaned:
            raise ValueError("At least one value is required")
        return cleaned


class DemoRequestSubmitResponse(BaseModel):
    """Success response for POST /demo-requests."""

    success: bool = True
    message: str = "Demo request submitted successfully"


class DemoRequestSummary(BaseModel):
    """Lead summary for internal GET /demo-requests."""

    id: int
    full_name: str
    work_email: str
    company_name: str
    job_role: str
    qcr_generation_method: str
    monthly_quote_volume: str
    operational_challenges: list[str]
    lines_of_business: list[str]
    review_team_size: str
    preferred_demo_date: date
    preferred_time_window: str
    requested_demo_topics: list[str]
    additional_notes: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class DemoRequestListResponse(BaseModel):
    """Response for GET /demo-requests."""

    count: int
    items: list[DemoRequestSummary]
