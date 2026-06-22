"""Project API — list and create projects for accessible clients."""

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models.project import Project
from app.models.user import User
from app.schemas import (
    ProjectCreate,
    ProjectListResponse,
    ProjectResponse,
    ProjectStatusUpdate,
)
from app.schemas.outlook import RelatedEmailListResponse, RelatedEmailSummary
from app.services import client_service, project_service
from app.services.outlook_connection_service import (
    OutlookConnectionNotFoundError,
    OutlookReconnectRequiredError,
)
from app.services.outlook_graph_service import OutlookGraphError, OutlookGraphNotFound
from app.services.outlook_mail_service import map_graph_error, map_outlook_service_error
from app.services.outlook_related_email_service import (
    list_related_emails_for_project,
    to_related_email_response,
)

router = APIRouter(prefix="/projects", tags=["projects"])


def _handle_related_email_errors(exc: Exception) -> None:
    if isinstance(exc, OutlookConnectionNotFoundError):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active Outlook connection found. Connect your mailbox first.",
        ) from exc
    mapped = map_outlook_service_error(exc)
    if mapped is not None:
        code, detail = mapped
        raise HTTPException(status_code=code, detail=detail) from exc
    if isinstance(exc, OutlookReconnectRequiredError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Outlook session expired. Please reconnect your mailbox.",
        ) from exc
    if isinstance(exc, OutlookGraphNotFound):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found",
        ) from exc
    if isinstance(exc, OutlookGraphError):
        code, detail = map_graph_error(exc)
        raise HTTPException(status_code=code, detail=detail) from exc
    raise exc


def _to_response(project: Project, client_name: str) -> ProjectResponse:
    return ProjectResponse(
        id=project.id,
        organization_id=project.organization_id,
        client_id=project.client_id,
        client_name=client_name,
        name=project.name,
        location=project.location,
        created_by=project.created_by,
        created_at=project.created_at,
        updated_at=project.updated_at,
        last_worked_at=project.last_worked_at,
        status=project.status,
    )


@router.get(
    "",
    response_model=ProjectListResponse,
    summary="List projects for the current user",
)
def list_projects(
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    limit: int = Query(default=10, ge=1, le=100),
    client_id: Optional[str] = Query(default=None, max_length=32),
) -> ProjectListResponse:
    rows = project_service.list_projects_for_user(
        db, user, limit=limit, client_id=client_id
    )
    items = [_to_response(project, client_name) for project, client_name in rows]
    return ProjectListResponse(count=len(items), items=items)


@router.patch(
    "/{project_id}/status",
    response_model=ProjectResponse,
    summary="Mark project as active or completed",
)
def update_project_status(
    project_id: str,
    payload: ProjectStatusUpdate,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ProjectResponse:
    project, client_name = project_service.get_project_for_user_or_raise(
        db, project_id, user
    )
    try:
        project = project_service.set_project_status(db, project, payload.status)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    return _to_response(project, client_name)


@router.post(
    "/{project_id}/touch",
    response_model=ProjectResponse,
    summary="Mark project as recently worked on",
)
def touch_project(
    project_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ProjectResponse:
    project, client_name = project_service.get_project_for_user_or_raise(
        db, project_id, user
    )
    project = project_service.touch_project_last_worked(db, project)
    return _to_response(project, client_name)


@router.get(
    "/{project_id}/related-emails",
    response_model=RelatedEmailListResponse,
    summary="List Outlook emails related to a project",
)
def list_project_related_emails(
    project_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> RelatedEmailListResponse:
    """Return mailbox messages matching the project and client names."""
    project, client_name = project_service.get_project_for_user_or_raise(
        db, project_id, user
    )
    try:
        raw_messages = list_related_emails_for_project(
            db,
            user,
            project,
            client_name=client_name,
        )
    except Exception as exc:
        _handle_related_email_errors(exc)

    messages = [
        RelatedEmailSummary.model_validate(to_related_email_response(item))
        for item in raw_messages
    ]
    return RelatedEmailListResponse(messages=messages)


@router.get(
    "/{project_id}",
    response_model=ProjectResponse,
    summary="Get a project by id",
)
def get_project(
    project_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ProjectResponse:
    project, client_name = project_service.get_project_for_user_or_raise(
        db, project_id, user
    )
    project = project_service.touch_project_last_worked(db, project)
    return _to_response(project, client_name)


@router.post(
    "",
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a project under a client",
)
def create_project(
    payload: ProjectCreate,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ProjectResponse:
    try:
        project = project_service.create_project(
            db, user, payload.client_id, payload.name
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    client = client_service.get_client_for_user_or_raise(db, project.client_id, user)
    return _to_response(project, client.name)
