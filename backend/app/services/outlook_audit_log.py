"""Structured logging for Outlook integration (no tokens or file content)."""

from __future__ import annotations

import logging
import re
from typing import Any

logger = logging.getLogger("claurix.outlook")

_SENSITIVE_PATTERNS = (
    re.compile(r"v1:gAAAAA\S+"),
    re.compile(r"gAAAAA\S+"),
    re.compile(r"EwB[A-Za-z0-9\-_]+\.[\w\-]+\.[\w\-]+"),
    re.compile(r"eyJ[A-Za-z0-9\-_]+\.[\w\-]+\.[\w\-]+"),
)


def _sanitize_for_log(value: str) -> str:
    sanitized = value
    for pattern in _SENSITIVE_PATTERNS:
        sanitized = pattern.sub("[REDACTED_TOKEN]", sanitized)
    return sanitized


def _format_context(**fields: Any) -> str:
    parts = [f"{key}={value}" for key, value in fields.items() if value is not None]
    return " ".join(parts)


def log_oauth_connected(
    *,
    user_id: str,
    organization_id: str,
    connection_id: str | None = None,
    email: str | None = None,
) -> None:
    logger.info(
        "event=oauth_connected %s",
        _format_context(
            user_id=user_id,
            organization_id=organization_id,
            connection_id=connection_id,
            email=email,
        ),
    )


def log_oauth_disconnected(
    *,
    user_id: str,
    organization_id: str,
    connection_id: str | None = None,
    email: str | None = None,
) -> None:
    logger.info(
        "event=oauth_disconnected %s",
        _format_context(
            user_id=user_id,
            organization_id=organization_id,
            connection_id=connection_id,
            email=email,
        ),
    )


def log_token_refresh_success(
    *,
    user_id: str,
    organization_id: str,
    connection_id: str,
) -> None:
    logger.info(
        "event=token_refresh_success %s",
        _format_context(
            user_id=user_id,
            organization_id=organization_id,
            connection_id=connection_id,
        ),
    )


def log_token_refresh_failure(
    *,
    user_id: str,
    organization_id: str,
    connection_id: str,
    reason: str,
) -> None:
    logger.warning(
        "event=token_refresh_failure %s reason=%s",
        _format_context(
            user_id=user_id,
            organization_id=organization_id,
            connection_id=connection_id,
        ),
        _sanitize_for_log(reason),
    )


def log_attachment_import_started(
    *,
    user_id: str,
    organization_id: str,
    project_id: str,
    message_id: str,
    attachment_id: str,
    document_type: str,
) -> None:
    logger.info(
        "event=attachment_import_started %s document_type=%s",
        _format_context(
            user_id=user_id,
            organization_id=organization_id,
            project_id=project_id,
            message_id=message_id,
            attachment_id=attachment_id,
        ),
        document_type,
    )


def log_attachment_import_completed(
    *,
    user_id: str,
    organization_id: str,
    project_id: str,
    message_id: str,
    attachment_id: str,
    document_id: str,
    file_name: str,
    document_type: str,
    deduplicated: bool = False,
) -> None:
    logger.info(
        "event=attachment_import_completed %s document_id=%s file_name=%s document_type=%s deduplicated=%s",
        _format_context(
            user_id=user_id,
            organization_id=organization_id,
            project_id=project_id,
            message_id=message_id,
            attachment_id=attachment_id,
        ),
        document_id,
        file_name,
        document_type,
        deduplicated,
    )


def log_attachment_import_failed(
    *,
    user_id: str,
    organization_id: str,
    project_id: str,
    message_id: str,
    attachment_id: str,
    reason: str,
) -> None:
    logger.warning(
        "event=attachment_import_failed %s reason=%s",
        _format_context(
            user_id=user_id,
            organization_id=organization_id,
            project_id=project_id,
            message_id=message_id,
            attachment_id=attachment_id,
        ),
        reason,
    )


def log_send_mail_started(
    *,
    user_id: str,
    organization_id: str,
    project_id: str,
    recipient_count: int,
    attachment_count: int,
) -> None:
    logger.info(
        "event=send_mail_started %s recipient_count=%s attachment_count=%s",
        _format_context(
            user_id=user_id,
            organization_id=organization_id,
            project_id=project_id,
        ),
        recipient_count,
        attachment_count,
    )


def log_send_mail_completed(
    *,
    user_id: str,
    organization_id: str,
    project_id: str,
    message_id: str | None,
    attachment_count: int,
) -> None:
    logger.info(
        "event=send_mail_completed %s message_id=%s attachment_count=%s",
        _format_context(
            user_id=user_id,
            organization_id=organization_id,
            project_id=project_id,
        ),
        message_id,
        attachment_count,
    )


def log_send_mail_failed(
    *,
    user_id: str,
    organization_id: str,
    project_id: str,
    reason: str,
) -> None:
    logger.warning(
        "event=send_mail_failed %s reason=%s",
        _format_context(
            user_id=user_id,
            organization_id=organization_id,
            project_id=project_id,
        ),
        reason,
    )


def log_graph_error(
    *,
    status_code: int,
    path: str,
    user_id: str | None = None,
    organization_id: str | None = None,
    project_id: str | None = None,
    message_id: str | None = None,
) -> None:
    event = {
        401: "graph_401",
        429: "graph_429",
    }.get(status_code, "graph_5xx" if status_code >= 500 else "graph_error")

    log_fn = logger.warning if status_code in (401, 429, 500, 502, 503) else logger.error
    log_fn(
        "event=%s status_code=%s path=%s %s",
        event,
        status_code,
        path,
        _format_context(
            user_id=user_id,
            organization_id=organization_id,
            project_id=project_id,
            message_id=message_id,
        ),
    )
