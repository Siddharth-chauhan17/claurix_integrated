"""QCR editing workspace API — raw AI clause contract (frontend v2.0)."""

from datetime import datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field

QcrEditingDataSource = Literal["gap_analysis", "mock"]


class WorkspaceSectionDescriptor(BaseModel):
    id: str = Field(..., min_length=1, max_length=128)
    label: str = Field(..., min_length=1, max_length=255)


class AiInsurerComparisonRawSchema(BaseModel):
    insurer: str
    proposal_clause: str
    status: str
    gap_score: float = Field(ge=0, le=1)
    differences: list[str] = Field(default_factory=list)
    broker_note: Optional[str] = None


class AiClauseComparisonRawSchema(BaseModel):
    policy_name: Optional[str] = None
    rfq_clause: str
    rfq_requirement: str
    comparisons: list[AiInsurerComparisonRawSchema]
    source: Optional[dict[str, Any]] = None


class QcrWorkspaceSaveRequest(BaseModel):
    """POST /projects/{id}/qcr-workspace — broker clause snapshot."""

    workspace_id: str = Field(..., min_length=1, max_length=64)
    clauses: list[dict[str, Any]] = Field(..., min_length=1)
    saved_at: Optional[datetime] = None


class QcrWorkspaceSaveResponse(BaseModel):
    project_id: str
    workspace_id: str
    saved_at: datetime
    saved_by: str
    clause_count: int


class QcrEditingWorkspaceResponse(BaseModel):
    """
    GET /projects/{id}/qcr-workspace

    When source=mock, clauses is null — frontend uses built-in mock data.
    """

    project_id: str
    source: QcrEditingDataSource
    workspace_id: str
    insurers: list[str] = Field(default_factory=list)
    sections: list[WorkspaceSectionDescriptor] = Field(default_factory=list)
    clauses: Optional[list[AiClauseComparisonRawSchema]] = None
    rfq_file_name: Optional[str] = None
    generated_at: Optional[datetime] = None
    run_id: Optional[str] = None
    broker_clauses: Optional[list[dict[str, Any]]] = None
    broker_saved_at: Optional[datetime] = None
    broker_saved_by: Optional[str] = None
