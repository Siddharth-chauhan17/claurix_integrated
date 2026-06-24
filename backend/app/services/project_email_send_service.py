"""Orchestrate project outbound email via Microsoft Graph."""

from __future__ import annotations

import json
from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.client import Client
from app.models.project import Project
from app.models.project_email import EMAIL_STATUS_SENT, ProjectEmail
from app.models.user import User
from app.services import email_attachment_service, project_activity_service
from app.services.html_sanitize_service import sanitize_email_html
from app.services.microsoft_graph_email import GraphEmailAttachment, send_email
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


def _load_client(db: Session, project: Project) -> Client | None:
    return db.get(Client, project.client_id)


def build_compose_defaults(
    db: Session,
    project: Project,
    user: User,
    *,
    client_name: str,
) -> dict:
    client = _load_client(db, project)
    contact_email = (client.contact_email if client else None) or None
    to_addresses: list[str] = []
    if contact_email and contact_email.strip():
        to_addresses.append(contact_email.strip())

    workspace = None
    insurer_names: list[str] = []
    try:
        from app.services import qcr_editing_service

        workspace = qcr_editing_service.get_qcr_editing_workspace(db, project)
        insurer_names = list(workspace.insurers or [])
    except Exception:
        insurer_names = []

    subject = f"RFQ - {client_name} - {project.name}"
    body_html = (
        "<p>Dear Team,</p>"
        "<p>Please find attached the QCR for the above placement.</p>"
        "<p>Kindly review and provide your feedback.</p>"
        "<p>Regards,<br>"
        f"{user.name}</p>"
    )

    attachments = email_attachment_service.list_available_attachments(db, project)
    default_attachment_ids: list[str] = []
    if any(
        item.id == email_attachment_service.ATTACHMENT_QCR_EXCEL and item.available
        for item in attachments
    ):
        default_attachment_ids.append(email_attachment_service.ATTACHMENT_QCR_EXCEL)
    rfq_doc_id = email_attachment_service.first_rfq_attachment_id(db, project)
    if rfq_doc_id:
        default_attachment_ids.append(rfq_doc_id)

    return {
        "to": to_addresses,
        "cc": [],
        "bcc": [],
        "subject": subject,
        "body_html": body_html,
        "insurer_names": insurer_names,
        "attachments": [
            {
                "id": item.id,
                "name": item.name,
                "content_type": item.content_type,
                "size_bytes": item.size_bytes,
                "available": item.available,
                "kind": item.kind,
            }
            for item in attachments
        ],
        "default_attachment_ids": default_attachment_ids,
        "sender_name": user.name,
        "sender_email": user.email,
    }


def send_project_email(
    db: Session,
    project: Project,
    user: User,
    *,
    to: list[str],
    cc: list[str],
    bcc: list[str],
    subject: str,
    body_html: str,
    attachment_ids: list[str],
    inline_attachments: list[dict] | None = None,
) -> ProjectEmail:
    connection = get_connection_with_valid_token(db, user.id, user.organization_id)

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

    safe_body = sanitize_email_html(body_html)
    log_send_mail_started(
        user_id=user.id,
        organization_id=user.organization_id,
        project_id=project.id,
        recipient_count=len(to),
        attachment_count=len(resolved),
    )

    try:
        result = _graph_call_with_retry(
            db,
            connection,
            lambda token: send_email(
                token,
                to=to,
                cc=cc,
                bcc=bcc,
                subject=subject,
                body_html=safe_body,
                attachments=resolved,
            ),
            path="/me/messages",
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
    except Exception as exc:
        log_send_mail_failed(
            user_id=user.id,
            organization_id=user.organization_id,
            project_id=project.id,
            reason=type(exc).__name__,
        )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_REQUEST,
            detail="Failed to send email. Please try again.",
        ) from exc

    now = utcnow()
    email_row = ProjectEmail(
        id=new_project_email_id(),
        organization_id=project.organization_id,
        project_id=project.id,
        sender_user_id=user.id,
        subject=subject.strip(),
        recipients=json.dumps(to),
        cc=json.dumps(cc),
        bcc=json.dumps(bcc),
        message_id=result.message_id,
        conversation_id=result.conversation_id,
        sent_at=now,
        status=EMAIL_STATUS_SENT,
        attachment_count=len(resolved),
        created_at=now,
    )
    db.add(email_row)
    db.commit()
    db.refresh(email_row)

    log_send_mail_completed(
        user_id=user.id,
        organization_id=user.organization_id,
        project_id=project.id,
        message_id=result.message_id,
        attachment_count=len(resolved),
    )
    project_activity_service.log_email_sent(
        db,
        organization_id=project.organization_id,
        project_id=project.id,
        user=user,
        recipient_count=len(to),
        subject=subject.strip(),
        message_id=result.message_id,
        attachment_count=len(resolved),
    )

    return email_row
