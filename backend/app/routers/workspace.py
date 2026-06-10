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
from app.schemas.workspace import WorkspacePayload, WorkspaceResponse
from app.services import project_service
from app.services.mock_qcr_generator import generate_workspace

router = APIRouter(prefix="/projects", tags=["workspace"])


@router.post(
    "/{project_id}/generate-qcr",
    response_model=WorkspaceResponse,
    summary="Generate QCR workspace from section mappings (mock AI)",
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

    project_service.get_project_for_user_or_raise(db, project_id, user)

    return generate_workspace(payload)
