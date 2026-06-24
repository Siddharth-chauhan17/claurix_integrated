"""Project email composer and activity timeline API."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.schemas.project_email import (
    EmailComposeContextResponse,
    ProjectActivityItem,
    ProjectActivityListResponse,
    ProjectEmailDraftListResponse,
    ProjectEmailDraftSaveRequest,
    ProjectEmailDraftSaveResponse,
    ProjectEmailSendRequest,
    ProjectEmailSendResponse,
)
from app.services import (
    project_activity_service,
    project_email_draft_service,
    project_email_send_service,
    project_service,
)
from app.services.outlook_connection_service import (
    OutlookConnectionNotFoundError,
    OutlookReconnectRequiredError,
    get_active_connection,
)
from app.services.outlook_graph_service import OutlookGraphError
from app.services.outlook_mail_service import map_graph_error, map_outlook_service_error

router = APIRouter(prefix="/projects", tags=["project-email"])


def _handle_mail_errors(exc: Exception) -> None:
    if isinstance(exc, OutlookConnectionNotFoundError):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active Outlook connection found. Connect your mailbox in Settings.",
        ) from exc
    mapped = map_outlook_service_error(exc)
    if mapped is not None:
        code, detail = mapped
        raise HTTPException(status_code=code, detail=detail) from exc
    if isinstance(exc, OutlookReconnectRequiredError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Outlook session expired. Please reconnect your mailbox in Settings.",
        ) from exc
    if isinstance(exc, OutlookGraphError):
        code, detail = map_graph_error(exc)
        raise HTTPException(status_code=code, detail=detail) from exc
    raise exc


@router.get(
    "/{project_id}/email/compose-context",
    response_model=EmailComposeContextResponse,
    summary="Prefill data for the project email composer",
)
def get_email_compose_context(
    project_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> EmailComposeContextResponse:
    project, client_name = project_service.get_project_for_user_or_raise(
        db, project_id, user
    )
    connection = get_active_connection(db, user.id, user.organization_id)
    defaults = project_email_send_service.build_compose_defaults(
        db, project, user, client_name=client_name
    )
    defaults["outlook_connected"] = connection is not None and connection.is_active
    return EmailComposeContextResponse.model_validate(defaults)


@router.post(
    "/{project_id}/email/composer-opened",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Log that the email composer was opened",
)
def log_email_composer_opened(
    project_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> None:
    project, _ = project_service.get_project_for_user_or_raise(db, project_id, user)
    project_activity_service.log_email_composer_opened(
        db,
        organization_id=project.organization_id,
        project_id=project.id,
        user=user,
    )


@router.post(
    "/{project_id}/email/send",
    response_model=ProjectEmailSendResponse,
    summary="Send a project email via the user's connected Outlook mailbox",
)
def send_project_email(
    project_id: str,
    payload: ProjectEmailSendRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ProjectEmailSendResponse:
    project, _ = project_service.get_project_for_user_or_raise(db, project_id, user)
    try:
        row = project_email_send_service.send_project_email(
            db,
            project,
            user,
            to=[str(x) for x in payload.to],
            cc=[str(x) for x in payload.cc],
            bcc=[str(x) for x in payload.bcc],
            subject=payload.subject,
            body_html=payload.body_html,
            attachment_ids=payload.attachment_ids,
            inline_attachments=[
                item.model_dump() for item in payload.inline_attachments
            ],
        )
    except HTTPException:
        raise
    except Exception as exc:
        _handle_mail_errors(exc)

    return ProjectEmailSendResponse(
        message_id=row.message_id,
        conversation_id=row.conversation_id,
        sent_at=row.sent_at or row.created_at,
        status="sent",
    )


@router.get(
    "/{project_id}/email/drafts",
    response_model=ProjectEmailDraftListResponse,
    summary="List saved email drafts for a project",
)
def list_project_email_drafts(
    project_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ProjectEmailDraftListResponse:
    project, _ = project_service.get_project_for_user_or_raise(db, project_id, user)
    items = project_email_draft_service.list_drafts_for_project(
        db,
        project.id,
        organization_id=project.organization_id,
    )
    return ProjectEmailDraftListResponse(
        count=len(items),
        items=[ProjectEmailDraftSaveResponse.model_validate(item) for item in items],
    )


@router.get(
    "/{project_id}/email/drafts/{draft_id}",
    response_model=ProjectEmailDraftSaveResponse,
    summary="Get a single email draft",
)
def get_project_email_draft(
    project_id: str,
    draft_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ProjectEmailDraftSaveResponse:
    project, _ = project_service.get_project_for_user_or_raise(db, project_id, user)
    row = project_email_draft_service.get_draft_for_project(
        db, project, draft_id, organization_id=project.organization_id
    )
    return ProjectEmailDraftSaveResponse.model_validate(
        project_email_draft_service._draft_to_dict(row)
    )


@router.post(
    "/{project_id}/email/drafts",
    response_model=ProjectEmailDraftSaveResponse,
    summary="Save an email draft to Outlook and Claurix",
)
def save_project_email_draft(
    project_id: str,
    payload: ProjectEmailDraftSaveRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ProjectEmailDraftSaveResponse:
    project, _ = project_service.get_project_for_user_or_raise(db, project_id, user)
    try:
        saved = project_email_draft_service.save_project_email_draft(
            db,
            project,
            user,
            draft_id=payload.draft_id,
            to=[str(x) for x in payload.to],
            cc=[str(x) for x in payload.cc],
            bcc=[str(x) for x in payload.bcc],
            subject=payload.subject,
            body_html=payload.body_html,
            attachment_ids=payload.attachment_ids,
            inline_attachments=[
                item.model_dump() for item in payload.inline_attachments
            ],
        )
    except HTTPException:
        raise
    except Exception as exc:
        _handle_mail_errors(exc)
    return ProjectEmailDraftSaveResponse.model_validate(saved)


@router.post(
    "/{project_id}/email/drafts/{draft_id}/send",
    response_model=ProjectEmailSendResponse,
    summary="Send a saved draft",
)
def send_project_email_draft(
    project_id: str,
    draft_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ProjectEmailSendResponse:
    project, _ = project_service.get_project_for_user_or_raise(db, project_id, user)
    try:
        row = project_email_draft_service.send_project_email_draft(
            db, project, user, draft_id
        )
    except HTTPException:
        raise
    except Exception as exc:
        _handle_mail_errors(exc)
    return ProjectEmailSendResponse(
        message_id=row.message_id,
        conversation_id=row.conversation_id,
        sent_at=row.sent_at or row.created_at,
        status="sent",
    )


@router.delete(
    "/{project_id}/email/drafts/{draft_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a saved draft",
)
def delete_project_email_draft(
    project_id: str,
    draft_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> None:
    project, _ = project_service.get_project_for_user_or_raise(db, project_id, user)
    project_email_draft_service.delete_project_email_draft(
        db, project, user, draft_id
    )


@router.get(
    "/{project_id}/activities",
    response_model=ProjectActivityListResponse,
    summary="List project activity timeline events",
)
def list_project_activities(
    project_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> ProjectActivityListResponse:
    project, _ = project_service.get_project_for_user_or_raise(db, project_id, user)
    rows = project_activity_service.list_activities_for_project(
        db,
        project.id,
        organization_id=project.organization_id,
    )
    items = [ProjectActivityItem.model_validate(row) for row in rows]
    return ProjectActivityListResponse(count=len(items), items=items)
