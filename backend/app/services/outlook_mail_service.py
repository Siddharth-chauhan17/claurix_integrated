"""Outlook inbox read operations — Graph calls with automatic token refresh."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.project import Project
from app.models.project_document import ProjectDocument
from app.models.user import User
from app.services.outlook_audit_log import (
    log_attachment_import_completed,
    log_attachment_import_failed,
    log_attachment_import_started,
    log_graph_error,
)
from app.services.outlook_connection_service import (
    OutlookConnectionNotFoundError,
    OutlookReconnectRequiredError,
    OutlookTokenAccessError,
    force_refresh_connection,
    get_connection_with_valid_token,
    get_plaintext_access_token,
    has_stored_access_token,
    touch_connection_sync,
)
from app.services.outlook_graph_service import (
    OutlookGraphError,
    OutlookGraphService,
    OutlookGraphUnauthorized,
)
from app.services.outlook_import_guard import (
    DuplicateImportCacheHit,
    get_recent_import,
    remember_import,
    run_import_once,
)
from app.services.project_email_import_service import record_import

_graph = OutlookGraphService()


def _persist_import_record(
    db: Session,
    project: Project,
    *,
    message_id: str,
    attachment_id: str,
    document: ProjectDocument,
) -> None:
    record_import(
        db,
        organization_id=project.organization_id,
        project_id=project.id,
        message_id=message_id,
        attachment_id=attachment_id,
        document_id=document.id,
        document_type=document.document_type,
    )


def _graph_call_with_retry(db, connection, call, *, path: str = ""):
    """Execute a Graph call; on 401 force-refresh once and retry."""
    try:
        return call(get_plaintext_access_token(connection))
    except OutlookGraphUnauthorized:
        log_graph_error(
            status_code=401,
            path=path,
            user_id=connection.user_id,
            organization_id=connection.organization_id,
        )
        connection = force_refresh_connection(db, connection)
        if not connection.is_active or not has_stored_access_token(connection):
            raise OutlookReconnectRequiredError() from None
        return call(get_plaintext_access_token(connection))


def list_inbox_messages(
    db: Session,
    user: User,
    *,
    page_size: int = 25,
    unread_only: bool = False,
) -> list[dict]:
    connection = get_connection_with_valid_token(db, user.id, user.organization_id)
    messages = _graph_call_with_retry(
        db,
        connection,
        lambda token: _graph.list_messages(
            token,
            top=page_size,
            unread_only=unread_only,
        ),
        path="/me/messages",
    )
    touch_connection_sync(db, connection)
    return messages


def get_inbox_message(
    db: Session,
    user: User,
    message_id: str,
) -> dict:
    connection = get_connection_with_valid_token(db, user.id, user.organization_id)
    result = _graph_call_with_retry(
        db,
        connection,
        lambda token: _graph.get_message(token, message_id),
        path=f"/me/messages/{message_id}",
    )
    touch_connection_sync(db, connection)
    return result


def list_message_attachments(
    db: Session,
    user: User,
    message_id: str,
) -> list[dict]:
    connection = get_connection_with_valid_token(db, user.id, user.organization_id)
    attachments = _graph_call_with_retry(
        db,
        connection,
        lambda token: _graph.list_attachments(token, message_id),
        path=f"/me/messages/{message_id}/attachments",
    )
    touch_connection_sync(db, connection)
    return attachments


def _load_document(db: Session, document_id: str, project: Project) -> ProjectDocument:
    stmt = select(ProjectDocument).where(
        ProjectDocument.id == document_id,
        ProjectDocument.project_id == project.id,
        ProjectDocument.organization_id == project.organization_id,
    )
    document = db.execute(stmt).scalar_one_or_none()
    if document is None:
        raise ValueError(f"Cached import document not found: {document_id}")
    return document


def _perform_import(
    db: Session,
    user: User,
    project: Project,
    connection,
    *,
    message_id: str,
    attachment_id: str,
    document_type: str,
) -> ProjectDocument:
    from app.services import document_service

    downloaded = _graph_call_with_retry(
        db,
        connection,
        lambda token: _graph.download_attachment(
            token,
            message_id,
            attachment_id,
            enforce_import_size=True,
        ),
        path=f"/me/messages/{message_id}/attachments/{attachment_id}/$value",
    )
    return document_service.save_project_document_from_bytes(
        db,
        project,
        user,
        filename=downloaded["filename"],
        content=downloaded["bytes"],
        document_type=document_type,
        replace_existing_rfq=document_type == document_service.DOCUMENT_TYPE_RFQ,
    )


def import_attachment_to_project(
    db: Session,
    user: User,
    project: Project,
    *,
    message_id: str,
    attachment_id: str,
    document_type: str,
) -> tuple[ProjectDocument, bool]:
    """Download Outlook fileAttachment and create a ProjectDocument.

    Returns (document, deduplicated).
    """
    log_attachment_import_started(
        user_id=user.id,
        organization_id=user.organization_id,
        project_id=project.id,
        message_id=message_id,
        attachment_id=attachment_id,
        document_type=document_type,
    )

    cached = get_recent_import(project.id, message_id, attachment_id)
    if cached is not None:
        document = _load_document(db, cached.document_id, project)
        log_attachment_import_completed(
            user_id=user.id,
            organization_id=user.organization_id,
            project_id=project.id,
            message_id=message_id,
            attachment_id=attachment_id,
            document_id=document.id,
            file_name=document.original_filename,
            document_type=document.document_type,
            deduplicated=True,
        )
        _persist_import_record(
            db,
            project,
            message_id=message_id,
            attachment_id=attachment_id,
            document=document,
        )
        return document, True

    connection = get_connection_with_valid_token(db, user.id, user.organization_id)

    def _remember(document: ProjectDocument) -> None:
        remember_import(
            project.id,
            message_id,
            attachment_id,
            document_id=document.id,
            file_name=document.original_filename,
            document_type=document.document_type,
        )

    try:
        try:
            document, _ = run_import_once(
                project.id,
                message_id,
                attachment_id,
                lambda: _perform_import(
                    db,
                    user,
                    project,
                    connection,
                    message_id=message_id,
                    attachment_id=attachment_id,
                    document_type=document_type,
                ),
                remember_fn=_remember,
            )
            deduplicated = False
        except DuplicateImportCacheHit as hit:
            document = _load_document(db, hit.cached.document_id, project)
            deduplicated = True

        touch_connection_sync(db, connection)
        log_attachment_import_completed(
            user_id=user.id,
            organization_id=user.organization_id,
            project_id=project.id,
            message_id=message_id,
            attachment_id=attachment_id,
            document_id=document.id,
            file_name=document.original_filename,
            document_type=document.document_type,
            deduplicated=deduplicated,
        )
        _persist_import_record(
            db,
            project,
            message_id=message_id,
            attachment_id=attachment_id,
            document=document,
        )
        return document, deduplicated
    except Exception as exc:
        log_attachment_import_failed(
            user_id=user.id,
            organization_id=user.organization_id,
            project_id=project.id,
            message_id=message_id,
            attachment_id=attachment_id,
            reason=type(exc).__name__,
        )
        raise


def map_graph_error(exc: OutlookGraphError) -> tuple[int, str]:
    """Map Graph errors to HTTP status and detail message."""
    if isinstance(exc, OutlookGraphUnauthorized):
        return 401, "Outlook session expired. Please reconnect your mailbox."
    status = exc.status_code or 502
    if status == 403:
        return 403, str(exc)
    if status == 404:
        return 404, "Message not found"
    if status == 429:
        return 429, "Microsoft Outlook is busy. Please try again in a moment."
    if status >= 500:
        return 502, "Microsoft Graph is temporarily unavailable"
    return 502, str(exc)


def map_outlook_service_error(exc: Exception) -> tuple[int, str] | None:
    """Map Outlook service errors to HTTP status and detail."""
    if isinstance(exc, OutlookTokenAccessError):
        return 401, str(exc) or "Outlook session expired. Please reconnect your mailbox."
    if isinstance(exc, OutlookReconnectRequiredError):
        return 401, str(exc) or "Outlook session expired. Please reconnect your mailbox."
    return None
