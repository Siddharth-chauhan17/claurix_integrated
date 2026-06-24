"""Send outbound email via Microsoft Graph (user mailbox)."""

from __future__ import annotations

import base64
import re
from dataclasses import dataclass
from typing import Any

from app.services.outlook_graph_service import (
    FILE_ATTACHMENT_ODATA_TYPE,
    OutlookGraphError,
    OutlookGraphService,
)

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


@dataclass(frozen=True)
class GraphEmailAttachment:
    filename: str
    content_type: str
    content_bytes: bytes


@dataclass(frozen=True)
class SentEmailResult:
    message_id: str | None
    conversation_id: str | None


def _normalize_recipients(addresses: list[str]) -> list[dict[str, Any]]:
    cleaned: list[dict[str, Any]] = []
    for raw in addresses:
        address = (raw or "").strip()
        if not address:
            continue
        if not _EMAIL_RE.match(address):
            raise ValueError(f"Invalid email address: {address}")
        cleaned.append({"emailAddress": {"address": address}})
    return cleaned


def _build_graph_message(
    *,
    to: list[str],
    cc: list[str],
    bcc: list[str],
    subject: str,
    body_html: str,
    attachments: list[GraphEmailAttachment],
) -> dict[str, Any]:
    trimmed_subject = subject.strip()
    if not trimmed_subject:
        raise ValueError("Subject is required")

    to_recipients = _normalize_recipients(to)
    if not to_recipients:
        raise ValueError("At least one recipient is required")

    message: dict[str, Any] = {
        "subject": trimmed_subject,
        "body": {
            "contentType": "HTML",
            "content": body_html,
        },
        "toRecipients": to_recipients,
        "ccRecipients": _normalize_recipients(cc),
        "bccRecipients": _normalize_recipients(bcc),
    }

    if attachments:
        message["attachments"] = [
            {
                "@odata.type": FILE_ATTACHMENT_ODATA_TYPE,
                "name": item.filename,
                "contentType": item.content_type,
                "contentBytes": base64.b64encode(item.content_bytes).decode("ascii"),
            }
            for item in attachments
        ]

    return message


@dataclass(frozen=True)
class DraftEmailResult:
    message_id: str
    conversation_id: str | None


def _normalize_recipients_optional(addresses: list[str]) -> list[dict[str, Any]]:
    """Like _normalize_recipients but skips invalid addresses (for drafts)."""
    cleaned: list[dict[str, Any]] = []
    for raw in addresses:
        address = (raw or "").strip()
        if not address or not _EMAIL_RE.match(address):
            continue
        cleaned.append({"emailAddress": {"address": address}})
    return cleaned


def _build_graph_draft_payload(
    *,
    to: list[str],
    cc: list[str],
    bcc: list[str],
    subject: str,
    body_html: str,
    attachments: list[GraphEmailAttachment],
) -> dict[str, Any]:
    """Build Graph message JSON for draft create/update (relaxed validation)."""
    trimmed_subject = subject.strip() or "(No subject)"
    safe_body = body_html.strip() or "<p></p>"

    message: dict[str, Any] = {
        "subject": trimmed_subject,
        "body": {
            "contentType": "HTML",
            "content": safe_body,
        },
        "toRecipients": _normalize_recipients_optional(to),
        "ccRecipients": _normalize_recipients_optional(cc),
        "bccRecipients": _normalize_recipients_optional(bcc),
    }

    if attachments:
        message["attachments"] = [
            {
                "@odata.type": FILE_ATTACHMENT_ODATA_TYPE,
                "name": item.filename,
                "contentType": item.content_type,
                "contentBytes": base64.b64encode(item.content_bytes).decode("ascii"),
            }
            for item in attachments
        ]

    return message


def save_draft_email(
    access_token: str,
    *,
    to: list[str],
    cc: list[str] | None = None,
    bcc: list[str] | None = None,
    subject: str,
    body_html: str,
    attachments: list[GraphEmailAttachment] | None = None,
    outlook_draft_id: str | None = None,
    graph: OutlookGraphService | None = None,
) -> DraftEmailResult:
    """Create or update an Outlook draft (requires Mail.ReadWrite)."""
    client = graph or OutlookGraphService()
    payload = _build_graph_draft_payload(
        to=to,
        cc=cc or [],
        bcc=bcc or [],
        subject=subject,
        body_html=body_html,
        attachments=attachments or [],
    )

    try:
        if outlook_draft_id:
            try:
                client.delete_draft_message(access_token, outlook_draft_id)
            except OutlookGraphError:
                pass
        created = client.create_draft_message(access_token, payload)
    except OutlookGraphError as exc:
        if exc.status_code == 403:
            raise ValueError(
                "Outlook draft permission missing. Reconnect your mailbox in Settings "
                "to grant Mail.ReadWrite."
            ) from exc
        raise

    message_id = created.get("id")
    if not message_id:
        raise OutlookGraphError(
            "Graph did not return a message id after creating the draft",
            status_code=502,
        )
    conversation_id = created.get("conversationId")
    return DraftEmailResult(
        message_id=str(message_id),
        conversation_id=str(conversation_id) if conversation_id else None,
    )


def send_outlook_draft(
    access_token: str,
    outlook_draft_id: str,
    *,
    graph: OutlookGraphService | None = None,
) -> SentEmailResult:
    """Send an existing Outlook draft (requires Mail.Send)."""
    client = graph or OutlookGraphService()
    try:
        client.send_draft_message(access_token, outlook_draft_id)
    except OutlookGraphError as exc:
        if exc.status_code == 403:
            raise ValueError(
                "Outlook could not send mail. Ensure Mail.Send is granted and reconnect "
                "your mailbox in Settings."
            ) from exc
        raise
    return SentEmailResult(message_id=outlook_draft_id, conversation_id=None)


def send_email(
    access_token: str,
    *,
    to: list[str],
    cc: list[str] | None = None,
    bcc: list[str] | None = None,
    subject: str,
    body_html: str,
    attachments: list[GraphEmailAttachment] | None = None,
    graph: OutlookGraphService | None = None,
) -> SentEmailResult:
    """
    Send email from the connected user's mailbox via Graph sendMail.

    Uses POST /me/sendMail (Mail.Send). Draft creation (POST /me/messages) requires
    Mail.ReadWrite and is intentionally avoided.
    """
    client = graph or OutlookGraphService()
    message_payload = _build_graph_message(
        to=to,
        cc=cc or [],
        bcc=bcc or [],
        subject=subject,
        body_html=body_html,
        attachments=attachments or [],
    )

    try:
        client.send_mail_message(access_token, message_payload, save_to_sent_items=True)
    except OutlookGraphError as exc:
        if exc.status_code == 403:
            raise ValueError(
                "Outlook could not send mail. Ensure Mail.Send is granted and reconnect "
                "your mailbox in Settings."
            ) from exc
        raise

    return SentEmailResult(
        message_id=None,
        conversation_id=None,
    )
