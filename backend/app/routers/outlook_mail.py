"""Outlook inbox read API — list and view mailbox messages."""

from __future__ import annotations

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.schemas.outlook import (
    AttachmentListResponse,
    AttachmentSummary,
    MessageDetail,
    MessageListResponse,
    MessageSummary,
)
from app.services import project_service
from app.services.outlook_connection_service import (
    OutlookConnectionNotFoundError,
    OutlookReconnectRequiredError,
)
from app.services.outlook_graph_service import OutlookGraphError, OutlookGraphNotFound
from app.services.outlook_mail_service import (
    get_inbox_message,
    list_inbox_messages,
    list_message_attachments,
    map_graph_error,
    map_outlook_service_error,
)
from app.services.project_email_import_service import (
    apply_import_status_to_attachments,
    get_imports_for_message,
)

router = APIRouter(prefix="/mail", tags=["outlook-mail"])


def _handle_mailbox_errors(exc: Exception) -> None:
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


@router.get(
    "/messages",
    response_model=MessageListResponse,
    summary="List recent Outlook inbox messages",
)
def list_mail_messages(
    user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
    page_size: int = Query(default=25, ge=1, le=100, alias="page_size"),
    unread_only: bool = Query(default=False, alias="unread_only"),
) -> MessageListResponse:
    """Return recent messages from the authenticated user's connected Outlook mailbox."""
    try:
        raw_messages = list_inbox_messages(
            db,
            user,
            page_size=page_size,
            unread_only=unread_only,
        )
    except Exception as exc:
        _handle_mailbox_errors(exc)

    messages = [MessageSummary.model_validate(item) for item in raw_messages]
    return MessageListResponse(messages=messages)


@router.get(
    "/messages/{message_id}",
    response_model=MessageDetail,
    summary="Get a single Outlook message",
)
def get_mail_message(
    message_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> MessageDetail:
    """Return metadata and body preview for one Outlook message."""
    try:
        raw = get_inbox_message(db, user, message_id)
    except Exception as exc:
        _handle_mailbox_errors(exc)

    return MessageDetail.model_validate(raw)


@router.get(
    "/messages/{message_id}/attachments",
    response_model=AttachmentListResponse,
    summary="List file attachments on an Outlook message",
)
def list_mail_message_attachments(
    message_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
    project_id: Optional[str] = Query(
        default=None,
        alias="project_id",
        description="Project context for attachment import status",
    ),
) -> AttachmentListResponse:
    """Return metadata for file attachments on a message (no file content)."""
    try:
        raw_attachments = list_message_attachments(db, user, message_id)
    except Exception as exc:
        _handle_mailbox_errors(exc)

    if project_id is not None:
        project, _ = project_service.get_project_for_user_or_raise(db, project_id, user)
        imports_by_attachment_id = get_imports_for_message(
            db,
            project.id,
            message_id,
            organization_id=project.organization_id,
        )
        raw_attachments = apply_import_status_to_attachments(
            raw_attachments,
            imports_by_attachment_id,
        )
    else:
        raw_attachments = apply_import_status_to_attachments(raw_attachments, {})

    attachments = [AttachmentSummary.model_validate(item) for item in raw_attachments]
    return AttachmentListResponse(message_id=message_id, attachments=attachments)
