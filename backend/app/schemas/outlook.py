"""Outlook integration API schemas."""

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field


OutlookStatusKind = Literal[
    "ok",
    "not_connected",
    "reconnect_required",
]


class OutlookStatusResponse(BaseModel):
    connected: bool
    email: Optional[str] = None
    is_active: bool = False
    expires_at: Optional[datetime] = None
    granted_scopes: Optional[str] = None
    last_sync_at: Optional[datetime] = None
    status: OutlookStatusKind = "not_connected"


class OutlookDisconnectResponse(BaseModel):
    status: Literal["disconnected"] = "disconnected"
    message: str = Field(default="Outlook mailbox disconnected.")
