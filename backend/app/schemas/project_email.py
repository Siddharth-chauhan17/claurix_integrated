"""Project email composer and send API schemas."""

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator


class EmailAttachmentDescriptorSchema(BaseModel):
    id: str
    name: str
    content_type: str
    size_bytes: Optional[int] = None
    available: bool
    kind: str


class EmailComposeContextResponse(BaseModel):
    to: list[str] = Field(default_factory=list)
    cc: list[str] = Field(default_factory=list)
    bcc: list[str] = Field(default_factory=list)
    subject: str
    body_html: str
    insurer_names: list[str] = Field(default_factory=list)
    attachments: list[EmailAttachmentDescriptorSchema] = Field(default_factory=list)
    default_attachment_ids: list[str] = Field(default_factory=list)
    sender_name: str
    sender_email: str
    outlook_connected: bool = False


class InlineEmailAttachment(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    content_type: str = Field(default="application/octet-stream", max_length=128)
    content_base64: str = Field(min_length=1)


class ProjectEmailSendRequest(BaseModel):
    """Send immediately — requires recipients and subject."""
    to: list[EmailStr] = Field(min_length=1)
    cc: list[EmailStr] = Field(default_factory=list)
    bcc: list[EmailStr] = Field(default_factory=list)
    subject: str = Field(min_length=1, max_length=512)
    body_html: str = Field(min_length=1, max_length=500_000)
    attachment_ids: list[str] = Field(default_factory=list)
    inline_attachments: list[InlineEmailAttachment] = Field(default_factory=list)

    @field_validator("to", "cc", "bcc", mode="before")
    @classmethod
    def strip_addresses(cls, value: list[str]) -> list[str]:
        if not isinstance(value, list):
            return value
        return [str(item).strip() for item in value if str(item).strip()]


class ProjectEmailDraftSaveRequest(BaseModel):
    draft_id: Optional[str] = None
    to: list[EmailStr] = Field(default_factory=list)
    cc: list[EmailStr] = Field(default_factory=list)
    bcc: list[EmailStr] = Field(default_factory=list)
    subject: str = Field(default="", max_length=512)
    body_html: str = Field(default="", max_length=500_000)
    attachment_ids: list[str] = Field(default_factory=list)
    inline_attachments: list[InlineEmailAttachment] = Field(default_factory=list)

    @field_validator("to", "cc", "bcc", mode="before")
    @classmethod
    def strip_addresses(cls, value: list[str]) -> list[str]:
        if not isinstance(value, list):
            return value
        return [str(item).strip() for item in value if str(item).strip()]


class ProjectEmailDraftItem(BaseModel):
    id: str
    subject: str
    to: list[str] = Field(default_factory=list)
    cc: list[str] = Field(default_factory=list)
    bcc: list[str] = Field(default_factory=list)
    body_html: str = ""
    attachment_ids: list[str] = Field(default_factory=list)
    inline_attachments: list[InlineEmailAttachment] = Field(default_factory=list)
    outlook_draft_id: Optional[str] = None
    conversation_id: Optional[str] = None
    attachment_count: int = 0
    created_at: datetime
    updated_at: datetime


class ProjectEmailDraftListResponse(BaseModel):
    count: int
    items: list[ProjectEmailDraftItem]


class ProjectEmailDraftSaveResponse(ProjectEmailDraftItem):
    pass


class ProjectEmailSendResponse(BaseModel):
    message_id: Optional[str] = None
    conversation_id: Optional[str] = None
    sent_at: datetime
    status: Literal["sent"] = "sent"


class ProjectActivityItem(BaseModel):
    id: str
    activity_type: str
    summary: str
    created_at: datetime
    user_id: str

    model_config = {"from_attributes": True}


class ProjectActivityListResponse(BaseModel):
    count: int
    items: list[ProjectActivityItem]
