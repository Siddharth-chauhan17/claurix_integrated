"""Project document upload API schemas."""

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

DocumentType = Literal["rfq", "quote"]


class ProjectDocumentResponse(BaseModel):
    id: str
    project_id: str
    document_type: DocumentType
    original_filename: str
    uploaded_by: str
    created_at: datetime


class ProjectDocumentListResponse(BaseModel):
    count: int
    items: list[ProjectDocumentResponse]


class ProjectDocumentUploadResponse(BaseModel):
    document: ProjectDocumentResponse


class ProjectDocumentsUploadResponse(BaseModel):
    count: int
    items: list[ProjectDocumentResponse] = Field(default_factory=list)
