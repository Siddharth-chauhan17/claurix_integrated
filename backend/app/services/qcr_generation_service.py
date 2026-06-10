"""
QCR generation dispatch — mock when AI off, gap analysis when AI_ENABLED=true.
"""

from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.project import Project
from app.models.qcr_generation_run import QcrGenerationRun
from app.models.user import User
from app.schemas.workspace import WorkspacePayload, WorkspaceResponse
from app.services import gap_analysis_service, mock_qcr_generator
from app.utils.ids import new_qcr_run_id


def _latest_run(db: Session, project_id: str) -> QcrGenerationRun | None:
    stmt = (
        select(QcrGenerationRun)
        .where(QcrGenerationRun.project_id == project_id)
        .order_by(QcrGenerationRun.started_at.desc())
        .limit(1)
    )
    return db.scalars(stmt).first()


def get_generation_status(db: Session, project_id: str) -> QcrGenerationRun | None:
    return _latest_run(db, project_id)


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
    except Exception as exc:
        run.status = gap_analysis_service.QCR_STATUS_FAILED
        run.error_message = str(exc)
        run.completed_at = gap_analysis_service.utcnow()
        db.commit()
        raise
