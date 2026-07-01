"""
Canonical QCR workspace domain contracts (renderer-agnostic).

Semantic insurance objects only — no UI, AG Grid, or layout metadata.
Mirrors frontend types/workspace.ts for stable API contracts.
"""

from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

WORKSPACE_SCHEMA_VERSION = "1.0"

DocumentType = Literal["rfq", "quote", "policy", "endorsement", "other"]
SourceType = Literal[
    "spreadsheet", "pdf", "word", "email", "image", "unknown"
]
RiskLevel = Literal["low", "medium", "high", "critical"]
ClauseCategory = Literal[
    "financial",
    "coverage",
    "exclusion",
    "limit",
    "deductible",
    "warranty",
    "general",
    "other",
]
ComparisonType = Literal[
    "numeric", "text", "boolean", "date", "list", "structured"
]


class SourceLocation(BaseModel):
    sheet_name: Optional[str] = None
    row_start: Optional[int] = Field(default=None, ge=1)
    row_end: Optional[int] = Field(default=None, ge=1)
    page_start: Optional[int] = Field(default=None, ge=1)
    page_end: Optional[int] = Field(default=None, ge=1)
    column_start: Optional[str] = None
    column_end: Optional[str] = None
    anchor_id: Optional[str] = None


class SourceReference(BaseModel):
    source_type: SourceType
    location: SourceLocation
    label: Optional[str] = None


class SectionSourceMapping(BaseModel):
    document_id: str = Field(..., min_length=1, max_length=64)
    source_reference: SourceReference


class DocumentDescriptor(BaseModel):
    document_id: str = Field(..., min_length=1, max_length=64)
    file_name: str = Field(..., min_length=1, max_length=512)
    document_type: DocumentType
    uploaded_at: Optional[datetime] = None
    mime_type: Optional[str] = None
    server_document_id: Optional[str] = Field(default=None, max_length=64)


class SelectedPolicySection(BaseModel):
    section_id: str = Field(..., min_length=1, max_length=64)
    section_name: str = Field(..., min_length=1, max_length=255)
    source_mappings: list[SectionSourceMapping] = Field(..., min_length=1)


class WorkspaceMetadata(BaseModel):
    project_name: Optional[str] = None
    client_name: Optional[str] = None
    generated_by: Optional[str] = "mock"
    mapping_count: Optional[int] = None
    document_count: Optional[int] = None


class WorkspacePayload(BaseModel):
    """Input to QCR orchestration — JSON canonical state, not Excel."""

    project_id: str = Field(..., min_length=1, max_length=32)
    schema_version: str = Field(default=WORKSPACE_SCHEMA_VERSION)
    documents: list[DocumentDescriptor] = Field(default_factory=list)
    selected_sections: list[SelectedPolicySection] = Field(..., min_length=1)
    metadata: Optional[WorkspaceMetadata] = None


class InsurerValue(BaseModel):
    insurer: str = Field(..., min_length=1, max_length=255)
    value: str = Field(..., max_length=4096)
    value_id: Optional[str] = None


class AIAnalysis(BaseModel):
    summary: str = Field(..., max_length=8000)
    risk_level: RiskLevel
    recommendation: str = Field(..., max_length=8000)
    confidence: Optional[float] = Field(default=None, ge=0, le=1)


class Comment(BaseModel):
    comment_id: str = Field(..., min_length=1, max_length=64)
    author: Optional[str] = None
    body: str = Field(..., max_length=8000)
    created_at: datetime


class SourceTrace(BaseModel):
    document_id: str
    source_type: SourceType
    sheet_name: Optional[str] = None
    row_start: Optional[int] = Field(default=None, ge=1)
    row_end: Optional[int] = Field(default=None, ge=1)
    page_start: Optional[int] = Field(default=None, ge=1)
    page_end: Optional[int] = Field(default=None, ge=1)


class Clause(BaseModel):
    clause_id: str
    title: str
    category: ClauseCategory
    comparison_type: ComparisonType
    editable: bool = True
    values: list[InsurerValue] = Field(..., min_length=1)
    ai_analysis: AIAnalysis
    comments: list[Comment] = Field(default_factory=list)


class PolicySection(BaseModel):
    section_id: str
    section_name: str
    source_trace: list[SourceTrace] = Field(default_factory=list)
    clauses: list[Clause] = Field(default_factory=list)


class WorkspaceResponse(BaseModel):
    """Orchestration output — consumed by any renderer (web, PDF, Excel, mobile)."""

    workspace_id: str
    project_id: str
    schema_version: str = WORKSPACE_SCHEMA_VERSION
    generated_at: datetime
    metadata: WorkspaceMetadata
    sections: list[PolicySection] = Field(default_factory=list)
