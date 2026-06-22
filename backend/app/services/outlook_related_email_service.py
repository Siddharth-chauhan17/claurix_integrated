"""Project-aware Outlook email discovery — keyword match and relevance ranking."""

from __future__ import annotations

import re

from datetime import datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.models.project import Project
from app.models.user import User
from app.services.outlook_connection_service import (
    get_connection_with_valid_token,
    touch_connection_sync,
)
from app.services.outlook_graph_service import OutlookGraphError, OutlookGraphService
from app.services.outlook_mail_service import _graph_call_with_retry

_graph = OutlookGraphService()

RELATED_EMAIL_MAX_RESULTS = 50
RELATED_EMAIL_SEARCH_TOP = 75
RELATED_EMAIL_FALLBACK_TOP = 100
MIN_TOKEN_LENGTH = 3

_FIELD_WEIGHTS = {
    "subject": 10,
    "body_preview": 5,
    "sender_email": 8,
    "sender_name": 6,
}


def build_search_keywords(project_name: str, client_name: str) -> list[str]:
    """Derive search phrases from project and client names (deduped, ordered)."""
    keywords: list[str] = []
    seen: set[str] = set()

    def add_phrase(raw: str) -> None:
        phrase = re.sub(r"\s+", " ", (raw or "").strip())
        if not phrase:
            return
        key = phrase.lower()
        if key in seen:
            return
        seen.add(key)
        keywords.append(phrase)

    add_phrase(project_name)
    add_phrase(client_name)

    for raw in (project_name, client_name):
        for token in re.split(r"[\s,;/|]+", raw or ""):
            cleaned = token.strip(".,;:-_()[]\"'")
            if len(cleaned) >= MIN_TOKEN_LENGTH and cleaned.lower() not in seen:
                seen.add(cleaned.lower())
                keywords.append(cleaned)

    return keywords


def _escape_search_term(term: str) -> str:
    return term.replace("\\", "\\\\").replace('"', '\\"')


def build_graph_search_query(project_name: str, client_name: str) -> str:
    """Build a Graph $search query from project/client phrases and significant tokens."""
    terms: list[str] = []
    for keyword in build_search_keywords(project_name, client_name)[:8]:
        escaped = _escape_search_term(keyword)
        if " " in keyword:
            terms.append(f'"{escaped}"')
        else:
            terms.append(escaped)
    return " OR ".join(terms)


def _field_text(message: dict[str, Any], field: str) -> str:
    value = message.get(field)
    return str(value).lower() if value else ""


def score_message_relevance(message: dict[str, Any], keywords: list[str]) -> int:
    """Score how closely a message matches project/client keywords."""
    subject = _field_text(message, "subject")
    body_preview = _field_text(message, "body_preview")
    sender_email = _field_text(message, "sender_email")
    sender_name = _field_text(message, "sender_name")

    score = 0
    for keyword in keywords:
        term = keyword.lower().strip()
        if not term:
            continue
        if term in subject:
            score += _FIELD_WEIGHTS["subject"]
        if term in body_preview:
            score += _FIELD_WEIGHTS["body_preview"]
        if term in sender_email:
            score += _FIELD_WEIGHTS["sender_email"]
        if term in sender_name:
            score += _FIELD_WEIGHTS["sender_name"]
    return score


def _received_at_sort_key(message: dict[str, Any]) -> datetime:
    received = message.get("received_at")
    if isinstance(received, datetime):
        return received
    return datetime.min.replace(tzinfo=timezone.utc)


def _fetch_candidate_messages(
    db: Session,
    connection,
    *,
    project_name: str,
    client_name: str,
) -> list[dict[str, Any]]:
    candidates: dict[str, dict[str, Any]] = {}

    search_query = build_graph_search_query(project_name, client_name)
    if search_query:
        try:
            for message in _graph_call_with_retry(
                db,
                connection,
                lambda token: _graph.search_messages(
                    token,
                    search_query=search_query,
                    top=RELATED_EMAIL_SEARCH_TOP,
                ),
                path="/me/messages?$search",
            ):
                message_id = message.get("id")
                if message_id:
                    candidates[message_id] = message
        except OutlookGraphError:
            pass

    # Always merge recent inbox — Graph $search can miss mail (index lag, top limits).
    try:
        for message in _graph_call_with_retry(
            db,
            connection,
            lambda token: _graph.list_messages_with_preview(
                token,
                top=RELATED_EMAIL_FALLBACK_TOP,
            ),
            path="/me/messages",
        ):
            message_id = message.get("id")
            if message_id:
                candidates[message_id] = message
    except OutlookGraphError:
        pass

    return list(candidates.values())


def list_related_emails_for_project(
    db: Session,
    user: User,
    project: Project,
    *,
    client_name: str,
) -> list[dict[str, Any]]:
    """
    Return Outlook messages likely related to a project, sorted by relevance.

    Each item includes message fields for API serialization plus internal
    ``relevance_score`` (caller should strip before responding).
    """
    keywords = build_search_keywords(project.name, client_name)
    if not keywords:
        return []

    connection = get_connection_with_valid_token(db, user.id, user.organization_id)
    candidates = _fetch_candidate_messages(
        db,
        connection,
        project_name=project.name,
        client_name=client_name,
    )

    scored: list[tuple[int, dict[str, Any]]] = []
    for message in candidates:
        relevance = score_message_relevance(message, keywords)
        if relevance <= 0:
            continue
        enriched = dict(message)
        enriched["relevance_score"] = relevance
        scored.append((relevance, enriched))

    scored.sort(
        key=lambda item: (item[0], _received_at_sort_key(item[1])),
        reverse=True,
    )

    touch_connection_sync(db, connection)
    return [message for _, message in scored[:RELATED_EMAIL_MAX_RESULTS]]


def to_related_email_response(message: dict[str, Any]) -> dict[str, Any]:
    """Map normalized Graph message to related-email API fields."""
    return {
        "message_id": message.get("id") or "",
        "subject": message.get("subject") or "(No subject)",
        "sender_name": message.get("sender_name"),
        "sender_email": message.get("sender_email"),
        "received_at": message.get("received_at"),
        "has_attachments": bool(message.get("has_attachments", False)),
        "conversation_id": message.get("conversation_id"),
    }
