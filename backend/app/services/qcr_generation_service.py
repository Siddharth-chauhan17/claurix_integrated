"""
QCR generation dispatch — mock when AI off, gap analysis when AI_ENABLED=true.
"""

from __future__ import annotations

from datetime import timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.project import Project
from app.models.qcr_generation_run import QcrGenerationRun
from app.models.user import User
from app.schemas.workspace import WorkspacePayload, WorkspaceResponse
from app.services import document_service, gap_analysis_service, mock_qcr_generator
from app.utils.ids import new_qcr_run_id


def _latest_run(db: Session, project_id: str) -> QcrGenerationRun | None:
    stmt = (
        select(QcrGenerationRun)
        .where(QcrGenerationRun.project_id == project_id)
        .order_by(QcrGenerationRun.started_at.desc())
        .limit(1)
    )
    return db.scalars(stmt).first()


def invalidate_project_qcr_results(db: Session, project_id: str) -> None:
    """Remove cached AI runs and broker edits after RFQ replacement."""
    from app.models.qcr_workspace_edit import QcrWorkspaceEdit

    runs = list(
        db.scalars(
            select(QcrGenerationRun).where(QcrGenerationRun.project_id == project_id)
        ).all()
    )
    for run in runs:
        db.delete(run)

    edit = db.get(QcrWorkspaceEdit, project_id)
    if edit is not None:
        db.delete(edit)

    if runs or edit is not None:
        db.commit()


def run_is_current_for_project(
    db: Session,
    project: Project,
    run: QcrGenerationRun | None,
) -> bool:
    """False when RFQ was re-uploaded after this run completed."""
    if run is None or run.completed_at is None:
        return False
    rfq_docs = document_service.list_documents_for_project(
        db, project, document_service.DOCUMENT_TYPE_RFQ
    )
    if not rfq_docs:
        return False
    latest_rfq = rfq_docs[0]
    completed_at = run.completed_at
    rfq_created = latest_rfq.created_at
    if completed_at.tzinfo is None:
        completed_at = completed_at.replace(tzinfo=timezone.utc)
    if rfq_created.tzinfo is None:
        rfq_created = rfq_created.replace(tzinfo=timezone.utc)
    return rfq_created <= completed_at


def get_generation_status(db: Session, project_id: str) -> QcrGenerationRun | None:
    return _latest_run(db, project_id)


def get_current_generation_status(
    db: Session,
    project: Project,
) -> QcrGenerationRun | None:
    run = _latest_run(db, project.id)
    if not run_is_current_for_project(db, project, run):
        return None
    return run


def generate_workspace(
    db: Session,
    project: Project,
    user: User,
    payload: WorkspacePayload,
) -> WorkspaceResponse:
    settings = get_settings()

    if not settings.ai_enabled:
        return mock_qcr_generator.generate_workspace(payload)

    run = QcrGenerationRun(
        id=new_qcr_run_id(),
        project_id=project.id,
        status=gap_analysis_service.QCR_STATUS_PROCESSING,
        generated_by=user.id,
        error_message=None,
        merged_results=None,
        started_at=gap_analysis_service.utcnow(),
        completed_at=None,
    )
    db.add(run)
    db.commit()

    workspace_id = gap_analysis_service.workspace_id_for_project(payload.project_id)

    try:
        merged = gap_analysis_service.run_gap_analysis(db, project, payload)
        response = gap_analysis_service.workspace_response_from_merged(
            payload,
            merged,
            workspace_id=workspace_id,
        )
        run.status = gap_analysis_service.QCR_STATUS_COMPLETED
        run.merged_results = merged
        run.completed_at = gap_analysis_service.utcnow()
        db.commit()
        return response
    except HTTPException as exc:
        run.status = gap_analysis_service.QCR_STATUS_FAILED
        detail = exc.detail
        run.error_message = detail if isinstance(detail, str) else str(detail)
        run.completed_at = gap_analysis_service.utcnow()
        db.commit()
        raise
    except ValueError as exc:
        run.status = gap_analysis_service.QCR_STATUS_FAILED
        run.error_message = str(exc)
        run.completed_at = gap_analysis_service.utcnow()
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        run.status = gap_analysis_service.QCR_STATUS_FAILED
        run.error_message = str(exc)
        run.completed_at = gap_analysis_service.utcnow()
        db.commit()
        raise
