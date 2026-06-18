"""Load and persist QCR editing workspace (AI baseline + broker saves)."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.project import Project
from app.models.qcr_workspace_edit import QcrWorkspaceEdit
from app.models.user import User
from app.schemas.qcr_editing import (
    QcrEditingWorkspaceResponse,
    QcrWorkspaceSaveRequest,
    QcrWorkspaceSaveResponse,
    WorkspaceSectionDescriptor,
)
from app.services import ai_response_mapper, document_service, gap_analysis_service, qcr_generation_service


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _workspace_id(project_id: str) -> str:
    return gap_analysis_service.workspace_id_for_project(project_id)


def _rfq_file_name(db: Session, project: Project) -> str | None:
    docs = document_service.list_documents_for_project(
        db, project, document_service.DOCUMENT_TYPE_RFQ
    )
    if docs:
        return docs[0].original_filename
    return None


def _get_broker_edit(db: Session, project_id: str) -> QcrWorkspaceEdit | None:
    return db.get(QcrWorkspaceEdit, project_id)


def _attach_broker_fields(
    response: QcrEditingWorkspaceResponse,
    edit: QcrWorkspaceEdit | None,
) -> QcrEditingWorkspaceResponse:
    if edit is None:
        return response
    return response.model_copy(
        update={
            "broker_clauses": edit.clauses,
            "broker_saved_at": edit.updated_at,
            "broker_saved_by": edit.updated_by,
        }
    )


def get_qcr_editing_workspace(
    db: Session,
    project: Project,
) -> QcrEditingWorkspaceResponse:
    settings = get_settings()
    run = qcr_generation_service.get_current_generation_status(db, project)
    rfq_name = _rfq_file_name(db, project)
    broker_edit = _get_broker_edit(db, project.id)

    if (
        settings.ai_enabled
        and run is not None
        and run.status == gap_analysis_service.QCR_STATUS_COMPLETED
        and run.merged_results
    ):
        payload = ai_response_mapper.merged_results_to_editing_payload(
            run.merged_results,
            rfq_file_name=rfq_name,
        )
        if payload["clauses"]:
            base = QcrEditingWorkspaceResponse(
                project_id=project.id,
                source="gap_analysis",
                workspace_id=_workspace_id(project.id),
                insurers=payload["insurers"],
                sections=[
                    WorkspaceSectionDescriptor(**s) for s in payload["sections"]
                ],
                clauses=payload["clauses"],
                rfq_file_name=rfq_name,
                generated_at=run.completed_at,
                run_id=run.id,
            )
            return _attach_broker_fields(base, broker_edit)

    base = QcrEditingWorkspaceResponse(
        project_id=project.id,
        source="mock",
        workspace_id=_workspace_id(project.id),
        insurers=[],
        sections=[],
        clauses=None,
        rfq_file_name=rfq_name,
        generated_at=run.completed_at if run else None,
        run_id=run.id if run else None,
    )
    return _attach_broker_fields(base, broker_edit)


def save_qcr_editing_workspace(
    db: Session,
    project: Project,
    user: User,
    body: QcrWorkspaceSaveRequest,
) -> QcrWorkspaceSaveResponse:
    expected_workspace_id = _workspace_id(project.id)
    if body.workspace_id != expected_workspace_id:
        body = body.model_copy(update={"workspace_id": expected_workspace_id})

    now = body.saved_at if body.saved_at else utcnow()
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)

    existing = _get_broker_edit(db, project.id)
    if existing is None:
        row = QcrWorkspaceEdit(
            project_id=project.id,
            workspace_id=body.workspace_id,
            clauses=body.clauses,
            updated_by=user.id,
            updated_at=now,
        )
        db.add(row)
    else:
        existing.workspace_id = body.workspace_id
        existing.clauses = body.clauses
        existing.updated_by = user.id
        existing.updated_at = now

    db.commit()

    return QcrWorkspaceSaveResponse(
        project_id=project.id,
        workspace_id=body.workspace_id,
        saved_at=now,
        saved_by=user.id,
        clause_count=len(body.clauses),
    )
