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


class MessageSummary(BaseModel):
    id: str
    subject: str
    sender_name: Optional[str] = None
    sender_email: Optional[str] = None
    received_at: Optional[datetime] = None
    has_attachments: bool = False
    conversation_id: Optional[str] = None


class MessageDetail(BaseModel):
    id: str
    subject: str
    sender_name: Optional[str] = None
    sender_email: Optional[str] = None
    received_at: Optional[datetime] = None
    body_preview: Optional[str] = None
    has_attachments: bool = False
    conversation_id: Optional[str] = None


class MessageListResponse(BaseModel):
    messages: list[MessageSummary] = Field(default_factory=list)


class AttachmentSummary(BaseModel):
    id: str
    name: str
    content_type: Optional[str] = None
    size_bytes: Optional[int] = None
    is_inline: bool = False
    extension: Optional[str] = None
    imported: bool = False
    document_id: Optional[str] = None
    document_type: Optional[Literal["rfq", "quote"]] = None


class AttachmentListResponse(BaseModel):
    message_id: str
    attachments: list[AttachmentSummary] = Field(default_factory=list)


class OutlookImportAttachmentRequest(BaseModel):
    message_id: str = Field(min_length=1)
    attachment_id: str = Field(min_length=1)
    document_type: Literal["rfq", "quote"]


class OutlookImportAttachmentResponse(BaseModel):
    status: Literal["imported"] = "imported"
    document_id: str
    file_name: str
    document_type: Literal["rfq", "quote"]


class RelatedEmailSummary(BaseModel):
    message_id: str
    subject: str
    sender_name: Optional[str] = None
    sender_email: Optional[str] = None
    received_at: Optional[datetime] = None
    has_attachments: bool = False
    conversation_id: Optional[str] = None


class RelatedEmailListResponse(BaseModel):
    messages: list[RelatedEmailSummary] = Field(default_factory=list)
