"""Resolve email attachment references for project outbound mail."""

from __future__ import annotations

import mimetypes
from dataclasses import dataclass
from pathlib import Path

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.project import Project
from app.services import document_service, qcr_editing_service, qcr_export_service
from app.services.microsoft_graph_email import GraphEmailAttachment

ATTACHMENT_QCR_EXCEL = "qcr-excel"
ATTACHMENT_RFQ = "rfq"


@dataclass(frozen=True)
class EmailAttachmentDescriptor:
    id: str
    name: str
    content_type: str
    size_bytes: int | None
    available: bool
    kind: str


def _max_attachment_bytes() -> int:
    max_mb = max(1, get_settings().outlook_max_email_attachment_mb)
    return max_mb * 1024 * 1024


def _guess_content_type(filename: str) -> str:
    guessed, _ = mimetypes.guess_type(filename)
    return guessed or "application/octet-stream"


def _read_document_bytes(storage_path: str) -> tuple[bytes, str]:
    path = Path(storage_path)
    if not path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Attachment file not found on server",
        )
    content = path.read_bytes()
    return content, _guess_content_type(path.name)


def _qcr_export_bytes(db: Session, project: Project) -> tuple[bytes, str] | None:
    workspace = qcr_editing_service.get_qcr_editing_workspace(db, project)
    raw_clauses = workspace.broker_clauses or workspace.clauses
    if not raw_clauses:
        return None
    clauses: list[dict] = []
    for item in raw_clauses:
        if isinstance(item, dict):
            clauses.append(item)
        elif hasattr(item, "model_dump"):
            clauses.append(item.model_dump())
    if not clauses:
        return None
    insurers = workspace.insurers or []
    sections = [s.model_dump() for s in workspace.sections]
    try:
        content = qcr_export_service.export_qcr_workbook(
            clauses=clauses,
            sections=sections,
            insurers=insurers,
        )
    except ValueError:
        return None
    safe_name = "".join(
        ch if ch.isalnum() or ch in ("-", "_", " ") else "_"
        for ch in (project.name or project.id)
    ).strip() or project.id
    return content, f"QCR_{safe_name}.xlsx"


def _document_descriptor(doc) -> EmailAttachmentDescriptor:
    size = None
    try:
        size = Path(doc.storage_path).stat().st_size
    except OSError:
        pass
    return EmailAttachmentDescriptor(
        id=f"document:{doc.id}",
        name=doc.original_filename,
        content_type=_guess_content_type(doc.original_filename),
        size_bytes=size,
        available=True,
        kind=doc.document_type,
    )


def _first_rfq_document_id(db: Session, project: Project) -> str | None:
    for doc in document_service.list_documents_for_project(
        db, project, document_service.DOCUMENT_TYPE_RFQ
    ):
        return doc.id
    return None


def first_rfq_attachment_id(db: Session, project: Project) -> str | None:
    doc_id = _first_rfq_document_id(db, project)
    return f"document:{doc_id}" if doc_id else None


def list_available_attachments(
    db: Session,
    project: Project,
) -> list[EmailAttachmentDescriptor]:
    items: list[EmailAttachmentDescriptor] = []

    qcr = _qcr_export_bytes(db, project)
    items.append(
        EmailAttachmentDescriptor(
            id=ATTACHMENT_QCR_EXCEL,
            name=qcr[1] if qcr else "QCR.xlsx",
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            size_bytes=len(qcr[0]) if qcr else None,
            available=qcr is not None,
            kind="qcr",
        )
    )

    for doc in document_service.list_documents_for_project(db, project):
        items.append(_document_descriptor(doc))

    return items


def resolve_attachment(
    db: Session,
    project: Project,
    attachment_id: str,
) -> GraphEmailAttachment:
    max_bytes = _max_attachment_bytes()

    if attachment_id == ATTACHMENT_QCR_EXCEL:
        qcr = _qcr_export_bytes(db, project)
        if qcr is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="QCR export is not available for this project",
            )
        content, filename = qcr
        if len(content) > max_bytes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"QCR attachment exceeds {get_settings().outlook_max_email_attachment_mb} MB limit",
            )
        return GraphEmailAttachment(
            filename=filename,
            content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            content_bytes=content,
        )

    if attachment_id == ATTACHMENT_RFQ:
        docs = document_service.list_documents_for_project(
            db, project, document_service.DOCUMENT_TYPE_RFQ
        )
        if not docs:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No RFQ document found for this project",
            )
        doc = docs[0]
        content, content_type = _read_document_bytes(doc.storage_path)
        if len(content) > max_bytes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"RFQ attachment exceeds {get_settings().outlook_max_email_attachment_mb} MB limit",
            )
        return GraphEmailAttachment(
            filename=doc.original_filename,
            content_type=content_type,
            content_bytes=content,
        )

    if attachment_id.startswith("document:"):
        doc_id = attachment_id.split(":", 1)[1]
        doc = document_service.get_document_for_project(db, project, doc_id)
        if doc is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Attachment document not found",
            )
        content, content_type = _read_document_bytes(doc.storage_path)
        if len(content) > max_bytes:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Attachment exceeds {get_settings().outlook_max_email_attachment_mb} MB limit",
            )
        return GraphEmailAttachment(
            filename=doc.original_filename,
            content_type=content_type,
            content_bytes=content,
        )

    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f"Unknown attachment id: {attachment_id}",
    )


def resolve_inline_attachment(
    *,
    name: str,
    content_type: str,
    content_base64: str,
) -> GraphEmailAttachment:
    import base64

    max_bytes = _max_attachment_bytes()
    filename = (name or "attachment").strip() or "attachment"
    try:
        content = base64.b64decode(content_base64, validate=True)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid attachment encoding",
        ) from exc
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Attachment is empty",
        )
    if len(content) > max_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Attachment exceeds {get_settings().outlook_max_email_attachment_mb} MB limit",
        )
    return GraphEmailAttachment(
        filename=filename,
        content_type=content_type or _guess_content_type(filename),
        content_bytes=content,
    )
