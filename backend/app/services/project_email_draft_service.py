"""Save, list, send, and delete project email drafts (Outlook + Claurix)."""

from __future__ import annotations

import json
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.project import Project
from app.models.project_email import EMAIL_STATUS_DRAFT, EMAIL_STATUS_SENT, ProjectEmail
from app.models.user import User
from app.services import email_attachment_service, project_activity_service
from app.services.html_sanitize_service import sanitize_email_html
from app.services.microsoft_graph_email import (
    GraphEmailAttachment,
    save_draft_email,
    send_email,
    send_outlook_draft,
)
from app.services.outlook_audit_log import log_send_mail_completed, log_send_mail_failed, log_send_mail_started
from app.services.outlook_connection_service import (
    OutlookConnectionNotFoundError,
    OutlookReconnectRequiredError,
    get_connection_with_valid_token,
    touch_connection_sync,
)
from app.services.outlook_graph_service import OutlookGraphError
from app.services.outlook_mail_service import _graph_call_with_retry, map_graph_error
from app.utils.ids import new_project_email_id


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _resolve_attachments(
    db: Session,
    project: Project,
    attachment_ids: list[str],
    inline_attachments: list[dict] | None,
) -> list[GraphEmailAttachment]:
    resolved: list[GraphEmailAttachment] = []
    for attachment_id in attachment_ids:
        resolved.append(
            email_attachment_service.resolve_attachment(db, project, attachment_id)
        )
    for item in inline_attachments or []:
        resolved.append(
            email_attachment_service.resolve_inline_attachment(
                name=str(item.get("name") or "attachment"),
                content_type=str(item.get("content_type") or ""),
                content_base64=str(item.get("content_base64") or ""),
            )
        )
    return resolved


def _draft_to_dict(row: ProjectEmail) -> dict:
    return {
        "id": row.id,
        "subject": row.subject,
        "to": json.loads(row.recipients or "[]"),
        "cc": json.loads(row.cc or "[]"),
        "bcc": json.loads(row.bcc or "[]"),
        "body_html": row.body_html or "",
        "attachment_ids": json.loads(row.attachment_ids or "[]"),
        "inline_attachments": json.loads(row.inline_attachments or "[]"),
        "outlook_draft_id": row.message_id,
        "conversation_id": row.conversation_id,
        "attachment_count": row.attachment_count,
        "created_at": row.created_at,
        "updated_at": row.updated_at or row.created_at,
    }


def get_draft_for_project(
    db: Session,
    project: Project,
    draft_id: str,
    *,
    organization_id: str,
) -> ProjectEmail:
    row = db.get(ProjectEmail, draft_id)
    if row is None or row.project_id != project.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Draft not found")
    if row.organization_id != organization_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Draft not accessible")
    if row.status != EMAIL_STATUS_DRAFT:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Draft not found")
    return row


def list_drafts_for_project(
    db: Session,
    project_id: str,
    *,
    organization_id: str,
    limit: int = 50,
) -> list[dict]:
    stmt = (
        select(ProjectEmail)
        .where(
            ProjectEmail.project_id == project_id,
            ProjectEmail.organization_id == organization_id,
            ProjectEmail.status == EMAIL_STATUS_DRAFT,
        )
        .order_by(ProjectEmail.updated_at.desc(), ProjectEmail.created_at.desc())
        .limit(limit)
    )
    rows = list(db.scalars(stmt).all())
    return [_draft_to_dict(row) for row in rows]


def save_project_email_draft(
    db: Session,
    project: Project,
    user: User,
    *,
    draft_id: str | None,
    to: list[str],
    cc: list[str],
    bcc: list[str],
    subject: str,
    body_html: str,
    attachment_ids: list[str],
    inline_attachments: list[dict] | None = None,
) -> dict:
    connection = get_connection_with_valid_token(db, user.id, user.organization_id)
    resolved = _resolve_attachments(db, project, attachment_ids, inline_attachments)
    safe_body = sanitize_email_html(body_html)
    trimmed_subject = subject.strip() or "(No subject)"

    existing: ProjectEmail | None = None
    outlook_draft_id: str | None = None
    if draft_id:
        existing = get_draft_for_project(
            db, project, draft_id, organization_id=project.organization_id
        )
        if existing.sender_user_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only edit your own drafts",
            )
        outlook_draft_id = existing.message_id

    try:
        result = _graph_call_with_retry(
            db,
            connection,
            lambda token: save_draft_email(
                token,
                to=to,
                cc=cc,
                bcc=bcc,
                subject=trimmed_subject,
                body_html=safe_body,
                attachments=resolved,
                outlook_draft_id=outlook_draft_id,
            ),
            path="/me/messages",
        )
        touch_connection_sync(db, connection)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except OutlookConnectionNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active Outlook connection found. Connect your mailbox in Settings.",
        ) from exc
    except OutlookReconnectRequiredError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Outlook session expired. Please reconnect your mailbox in Settings.",
        ) from exc
    except OutlookGraphError as exc:
        code, detail = map_graph_error(exc)
        raise HTTPException(status_code=code, detail=detail) from exc

    now = utcnow()
    inline_json = json.dumps(inline_attachments or [])

    if existing is not None:
        existing.subject = trimmed_subject
        existing.recipients = json.dumps(to)
        existing.cc = json.dumps(cc)
        existing.bcc = json.dumps(bcc)
        existing.body_html = safe_body
        existing.attachment_ids = json.dumps(attachment_ids)
        existing.inline_attachments = inline_json
        existing.message_id = result.message_id
        if result.conversation_id:
            existing.conversation_id = result.conversation_id
        existing.attachment_count = len(resolved)
        existing.updated_at = now
        row = existing
    else:
        row = ProjectEmail(
            id=new_project_email_id(),
            organization_id=project.organization_id,
            project_id=project.id,
            sender_user_id=user.id,
            subject=trimmed_subject,
            recipients=json.dumps(to),
            cc=json.dumps(cc),
            bcc=json.dumps(bcc),
            body_html=safe_body,
            attachment_ids=json.dumps(attachment_ids),
            inline_attachments=inline_json,
            message_id=result.message_id,
            conversation_id=result.conversation_id,
            sent_at=None,
            status=EMAIL_STATUS_DRAFT,
            attachment_count=len(resolved),
            created_at=now,
            updated_at=now,
        )
        db.add(row)

    db.commit()
    db.refresh(row)

    project_activity_service.log_email_draft_saved(
        db,
        organization_id=project.organization_id,
        project_id=project.id,
        user=user,
        subject=trimmed_subject,
        draft_id=row.id,
    )

    return _draft_to_dict(row)


def send_project_email_draft(
    db: Session,
    project: Project,
    user: User,
    draft_id: str,
) -> ProjectEmail:
    row = get_draft_for_project(
        db, project, draft_id, organization_id=project.organization_id
    )
    if row.sender_user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only send your own drafts",
        )

    to = json.loads(row.recipients or "[]")
    if not to:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Add at least one recipient in To before sending.",
        )

    connection = get_connection_with_valid_token(db, user.id, user.organization_id)
    attachment_ids = json.loads(row.attachment_ids or "[]")
    inline_attachments = json.loads(row.inline_attachments or "[]")
    resolved = _resolve_attachments(db, project, attachment_ids, inline_attachments)
    safe_body = row.body_html or ""

    log_send_mail_started(
        user_id=user.id,
        organization_id=user.organization_id,
        project_id=project.id,
        recipient_count=len(to),
        attachment_count=len(resolved),
    )

    try:
        if row.message_id:
            result = _graph_call_with_retry(
                db,
                connection,
                lambda token: send_outlook_draft(token, str(row.message_id)),
                path="/me/messages/send",
            )
        else:
            result = _graph_call_with_retry(
                db,
                connection,
                lambda token: send_email(
                    token,
                    to=to,
                    cc=json.loads(row.cc or "[]"),
                    bcc=json.loads(row.bcc or "[]"),
                    subject=row.subject,
                    body_html=safe_body,
                    attachments=resolved,
                ),
                path="/me/sendMail",
            )
        touch_connection_sync(db, connection)
    except ValueError as exc:
        log_send_mail_failed(
            user_id=user.id,
            organization_id=user.organization_id,
            project_id=project.id,
            reason="validation",
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except OutlookConnectionNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active Outlook connection found. Connect your mailbox in Settings.",
        ) from exc
    except OutlookReconnectRequiredError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Outlook session expired. Please reconnect your mailbox in Settings.",
        ) from exc
    except OutlookGraphError as exc:
        log_send_mail_failed(
            user_id=user.id,
            organization_id=user.organization_id,
            project_id=project.id,
            reason=type(exc).__name__,
        )
        code, detail = map_graph_error(exc)
        raise HTTPException(status_code=code, detail=detail) from exc

    now = utcnow()
    row.status = EMAIL_STATUS_SENT
    row.sent_at = now
    row.updated_at = now
    if result.message_id:
        row.message_id = result.message_id
    if result.conversation_id:
        row.conversation_id = result.conversation_id
    db.commit()
    db.refresh(row)

    log_send_mail_completed(
        user_id=user.id,
        organization_id=user.organization_id,
        project_id=project.id,
        message_id=row.message_id,
        attachment_count=len(resolved),
    )
    project_activity_service.log_email_sent(
        db,
        organization_id=project.organization_id,
        project_id=project.id,
        user=user,
        recipient_count=len(to),
        subject=row.subject,
        message_id=row.message_id,
        attachment_count=len(resolved),
    )

    return row


def delete_project_email_draft(
    db: Session,
    project: Project,
    user: User,
    draft_id: str,
) -> None:
    row = get_draft_for_project(
        db, project, draft_id, organization_id=project.organization_id
    )
    if row.sender_user_id != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own drafts",
        )

    if row.message_id:
        connection = get_connection_with_valid_token(db, user.id, user.organization_id)
        try:
            from app.services.outlook_graph_service import OutlookGraphService

            _graph_call_with_retry(
                db,
                connection,
                lambda token: OutlookGraphService().delete_draft_message(
                    token, str(row.message_id)
                ),
                path="/me/messages",
            )
        except (OutlookGraphError, OutlookConnectionNotFoundError, OutlookReconnectRequiredError):
            pass

    db.delete(row)
    db.commit()
