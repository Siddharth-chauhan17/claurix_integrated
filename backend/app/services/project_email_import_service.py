"""Persist and query Outlook attachment import records per project."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.project_email_import import ProjectEmailImport
from app.utils.ids import new_project_email_import_id


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def get_import_status(
    db: Session,
    project_id: str,
    message_id: str,
    attachment_id: str,
    *,
    organization_id: str | None = None,
) -> ProjectEmailImport | None:
    """Return the import record for a project/message/attachment triple, if any."""
    stmt = select(ProjectEmailImport).where(
        ProjectEmailImport.project_id == project_id,
        ProjectEmailImport.message_id == message_id,
        ProjectEmailImport.attachment_id == attachment_id,
    )
    if organization_id is not None:
        stmt = stmt.where(ProjectEmailImport.organization_id == organization_id)
    return db.execute(stmt).scalar_one_or_none()


def get_imports_for_message(
    db: Session,
    project_id: str,
    message_id: str,
    *,
    organization_id: str,
) -> dict[str, ProjectEmailImport]:
    """Map attachment_id to import record for one message within a project."""
    stmt = select(ProjectEmailImport).where(
        ProjectEmailImport.project_id == project_id,
        ProjectEmailImport.message_id == message_id,
        ProjectEmailImport.organization_id == organization_id,
    )
    rows = db.execute(stmt).scalars().all()
    return {row.attachment_id: row for row in rows}


def apply_import_status_to_attachments(
    attachments: list[dict],
    imports_by_attachment_id: dict[str, ProjectEmailImport],
) -> list[dict]:
    """Attach per-project import flags to normalized attachment dicts."""
    enriched: list[dict] = []
    for attachment in attachments:
        item = dict(attachment)
        record = imports_by_attachment_id.get(item.get("id") or "")
        if record is not None:
            item["imported"] = True
            item["document_id"] = record.document_id
            item["document_type"] = record.document_type
        else:
            item["imported"] = False
            item["document_id"] = None
            item["document_type"] = None
        enriched.append(item)
    return enriched


def get_imports_for_project(
    db: Session,
    project_id: str,
    *,
    organization_id: str,
) -> list[ProjectEmailImport]:
    """Return all Outlook import records for a project (newest first)."""
    stmt = (
        select(ProjectEmailImport)
        .where(
            ProjectEmailImport.project_id == project_id,
            ProjectEmailImport.organization_id == organization_id,
        )
        .order_by(ProjectEmailImport.imported_at.desc())
    )
    return list(db.execute(stmt).scalars().all())


def record_import(
    db: Session,
    *,
    organization_id: str,
    project_id: str,
    message_id: str,
    attachment_id: str,
    document_id: str,
    document_type: str,
) -> ProjectEmailImport:
    """
    Persist a successful Outlook attachment import.

    Idempotent for the same project/message/attachment — returns the existing row
    without creating a duplicate.
    """
    existing = get_import_status(
        db,
        project_id,
        message_id,
        attachment_id,
        organization_id=organization_id,
    )
    if existing is not None:
        return existing

    now = utcnow()
    row = ProjectEmailImport(
        id=new_project_email_import_id(),
        organization_id=organization_id,
        project_id=project_id,
        message_id=message_id,
        attachment_id=attachment_id,
        document_id=document_id,
        document_type=document_type,
        imported_at=now,
    )
    db.add(row)
    try:
        db.commit()
        db.refresh(row)
        return row
    except IntegrityError:
        db.rollback()
        raced = get_import_status(
            db,
            project_id,
            message_id,
            attachment_id,
            organization_id=organization_id,
        )
        if raced is not None:
            return raced
        raise
