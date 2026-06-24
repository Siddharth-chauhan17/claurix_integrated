"""Project activity timeline persistence."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.project_activity import (
    ACTIVITY_EMAIL_COMPOSER_OPENED,
    ACTIVITY_EMAIL_DRAFT_SAVED,
    ACTIVITY_EMAIL_SENT,
    ProjectActivity,
)
from app.models.user import User
from app.utils.ids import new_project_activity_id


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def log_activity(
    db: Session,
    *,
    organization_id: str,
    project_id: str,
    user_id: str,
    activity_type: str,
    summary: str,
    metadata: dict[str, Any] | None = None,
) -> ProjectActivity:
    row = ProjectActivity(
        id=new_project_activity_id(),
        organization_id=organization_id,
        project_id=project_id,
        user_id=user_id,
        activity_type=activity_type,
        summary=summary,
        metadata_json=json.dumps(metadata) if metadata else None,
        created_at=utcnow(),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def log_email_composer_opened(
    db: Session,
    *,
    organization_id: str,
    project_id: str,
    user: User,
) -> ProjectActivity:
    return log_activity(
        db,
        organization_id=organization_id,
        project_id=project_id,
        user_id=user.id,
        activity_type=ACTIVITY_EMAIL_COMPOSER_OPENED,
        summary=f"{user.name} opened the email composer",
    )


def log_email_draft_saved(
    db: Session,
    *,
    organization_id: str,
    project_id: str,
    user: User,
    subject: str,
    draft_id: str,
) -> ProjectActivity:
    return log_activity(
        db,
        organization_id=organization_id,
        project_id=project_id,
        user_id=user.id,
        activity_type=ACTIVITY_EMAIL_DRAFT_SAVED,
        summary=f"{user.name} saved an email draft",
        metadata={"subject": subject, "draft_id": draft_id},
    )


def log_email_sent(
    db: Session,
    *,
    organization_id: str,
    project_id: str,
    user: User,
    recipient_count: int,
    subject: str,
    message_id: str | None,
    attachment_count: int,
) -> ProjectActivity:
    plural = "insurers" if recipient_count != 1 else "insurer"
    summary = f"{user.name} sent email to {recipient_count} {plural}"
    return log_activity(
        db,
        organization_id=organization_id,
        project_id=project_id,
        user_id=user.id,
        activity_type=ACTIVITY_EMAIL_SENT,
        summary=summary,
        metadata={
            "subject": subject,
            "recipient_count": recipient_count,
            "message_id": message_id,
            "attachment_count": attachment_count,
        },
    )


def list_activities_for_project(
    db: Session,
    project_id: str,
    *,
    organization_id: str,
    limit: int = 50,
) -> list[ProjectActivity]:
    stmt = (
        select(ProjectActivity)
        .where(
            ProjectActivity.project_id == project_id,
            ProjectActivity.organization_id == organization_id,
        )
        .order_by(ProjectActivity.created_at.desc())
        .limit(limit)
    )
    return list(db.scalars(stmt).all())
