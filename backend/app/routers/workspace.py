"""
QCR workspace orchestration API.

POST /projects/{project_id}/generate-qcr accepts WorkspacePayload (JSON canonical input)
and returns WorkspaceResponse. Auth + project ownership enforced before orchestration.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.schemas.qcr_editing import (
    QcrEditingWorkspaceResponse,
    QcrWorkspaceSaveRequest,
    QcrWorkspaceSaveResponse,
)
from app.schemas.qcr_generation import QcrGenerationStatusResponse
from app.schemas.workspace import WorkspacePayload, WorkspaceResponse
from app.services import (
    gap_analysis_service,
    project_service,
    qcr_editing_service,
    qcr_generation_service,
)

router = APIRouter(prefix="/projects", tags=["workspace"])


@router.get(
    "/{project_id}/qcr-workspace",
    response_model=QcrEditingWorkspaceResponse,
    summary="QCR editing workspace clauses (gap-analysis or mock fallback)",
)
def get_qcr_editing_workspace(
    project_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> QcrEditingWorkspaceResponse:
    project, _ = project_service.get_project_for_user_or_raise(db, project_id, user)
    return qcr_editing_service.get_qcr_editing_workspace(db, project)


@router.post(
    "/{project_id}/qcr-workspace",
    response_model=QcrWorkspaceSaveResponse,
    summary="Save broker QCR clause edits for a project",
)
def save_qcr_editing_workspace(
    project_id: str,
    body: QcrWorkspaceSaveRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> QcrWorkspaceSaveResponse:
    project, _ = project_service.get_project_for_user_or_raise(db, project_id, user)
    return qcr_editing_service.save_qcr_editing_workspace(db, project, user, body)


@router.get(
    "/{project_id}/generate-qcr/status",
    response_model=QcrGenerationStatusResponse,
    summary="Latest QCR / gap-analysis generation status (AI mode)",
)
def get_generate_qcr_status(
    project_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> QcrGenerationStatusResponse:
    project_service.get_project_for_user_or_raise(db, project_id, user)
    run = qcr_generation_service.get_generation_status(db, project_id)
    if run is None:
        return QcrGenerationStatusResponse(
            project_id=project_id,
            status="idle",
            merged_policy_count=0,
        )
    merged = run.merged_results or []
    return QcrGenerationStatusResponse(
        project_id=project_id,
        run_id=run.id,
        status=run.status,  # type: ignore[arg-type]
        error_message=run.error_message,
        started_at=run.started_at,
        completed_at=run.completed_at,
        merged_policy_count=len(merged) if isinstance(merged, list) else 0,
        merged_results=merged if run.status == gap_analysis_service.QCR_STATUS_COMPLETED else None,
    )


@router.post(
    "/{project_id}/generate-qcr",
    response_model=WorkspaceResponse,
    summary="Generate QCR workspace (mock or gap-analysis when AI_ENABLED=true)",
)
def generate_qcr(
    project_id: str,
    payload: WorkspacePayload,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> WorkspaceResponse:
    if payload.project_id != project_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="project_id in body must match URL",
        )

    project, _ = project_service.get_project_for_user_or_raise(db, project_id, user)

    return qcr_generation_service.generate_workspace(db, project, user, payload)
