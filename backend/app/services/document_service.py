"""Persist project RFQ / quote uploads to disk + Postgres."""

from __future__ import annotations

import re
import shutil
from datetime import datetime, timezone
from pathlib import Path

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.config import BACKEND_ROOT, get_settings
from app.models.project import Project
from app.models.project_document import ProjectDocument
from app.models.user import User
from app.utils.ids import new_document_id

DOCUMENT_TYPE_RFQ = "rfq"
DOCUMENT_TYPE_QUOTE = "quote"
VALID_DOCUMENT_TYPES = frozenset({DOCUMENT_TYPE_RFQ, DOCUMENT_TYPE_QUOTE})

RFQ_EXTENSIONS = frozenset({".xlsx", ".xls"})
QUOTE_EXTENSIONS = frozenset({".xlsx", ".xls", ".pdf"})


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def uploads_root() -> Path:
    settings = get_settings()
    root = Path(settings.uploads_dir)
    if not root.is_absolute():
        root = BACKEND_ROOT / root
    root.mkdir(parents=True, exist_ok=True)
    return root


def _safe_filename(name: str) -> str:
    base = Path(name).name
    cleaned = re.sub(r"[^\w.\- ()]+", "_", base).strip("._")
    return cleaned or "upload"


def _validate_extension(filename: str, document_type: str) -> None:
    ext = Path(filename).suffix.lower()
    allowed = RFQ_EXTENSIONS if document_type == DOCUMENT_TYPE_RFQ else QUOTE_EXTENSIONS
    if ext not in allowed:
        allowed_list = ", ".join(sorted(allowed))
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type for {document_type}. Allowed: {allowed_list}",
        )


def _project_upload_dir(
    organization_id: str,
    project_id: str,
    document_type: str,
) -> Path:
    path = uploads_root() / organization_id / project_id / document_type
    path.mkdir(parents=True, exist_ok=True)
    return path


def _to_response(doc: ProjectDocument) -> dict:
    return {
        "id": doc.id,
        "project_id": doc.project_id,
        "document_type": doc.document_type,
        "original_filename": doc.original_filename,
        "uploaded_by": doc.uploaded_by,
        "created_at": doc.created_at,
    }


def list_documents_for_project(
    db: Session,
    project: Project,
    document_type: str | None = None,
) -> list[ProjectDocument]:
    stmt = select(ProjectDocument).where(
        ProjectDocument.project_id == project.id,
        ProjectDocument.organization_id == project.organization_id,
    )
    if document_type:
        stmt = stmt.where(ProjectDocument.document_type == document_type)
    stmt = stmt.order_by(ProjectDocument.created_at.desc())
    return list(db.scalars(stmt).all())


def _delete_document_files(docs: list[ProjectDocument]) -> None:
    for doc in docs:
        path = Path(doc.storage_path)
        if path.is_file():
            path.unlink(missing_ok=True)


def _remove_documents(db: Session, docs: list[ProjectDocument]) -> None:
    if not docs:
        return
    _delete_document_files(docs)
    for doc in docs:
        db.delete(doc)
    db.commit()


async def save_project_document(
    db: Session,
    project: Project,
    user: User,
    upload: UploadFile,
    document_type: str,
    *,
    replace_existing_rfq: bool = False,
) -> ProjectDocument:
    if document_type not in VALID_DOCUMENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="document_type must be rfq or quote",
        )

    filename = upload.filename or "upload"
    _validate_extension(filename, document_type)

    if document_type == DOCUMENT_TYPE_RFQ and replace_existing_rfq:
        existing = list_documents_for_project(db, project, DOCUMENT_TYPE_RFQ)
        if existing:
            from app.services import qcr_generation_service

            qcr_generation_service.invalidate_project_qcr_results(db, project.id)
        _remove_documents(db, existing)

    safe_name = _safe_filename(filename)
    timestamp = utcnow().strftime("%Y%m%d_%H%M%S")
    stored_name = f"{timestamp}_{safe_name}"
    dest_dir = _project_upload_dir(
        project.organization_id,
        project.id,
        document_type,
    )
    dest_path = dest_dir / stored_name

    try:
        with dest_path.open("wb") as buffer:
            shutil.copyfileobj(upload.file, buffer)
    except OSError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to store uploaded file",
        ) from exc
    finally:
        await upload.close()

    now = utcnow()
    document = ProjectDocument(
        id=new_document_id(),
        project_id=project.id,
        organization_id=project.organization_id,
        document_type=document_type,
        original_filename=filename,
        storage_path=str(dest_path.resolve()),
        uploaded_by=user.id,
        created_at=now,
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    return document


def save_project_document_from_bytes(
    db: Session,
    project: Project,
    user: User,
    *,
    filename: str,
    content: bytes,
    document_type: str,
    replace_existing_rfq: bool = False,
) -> ProjectDocument:
    """Persist uploaded bytes using the same rules as multipart file uploads."""
    if document_type not in VALID_DOCUMENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="document_type must be rfq or quote",
        )
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Attachment content is empty",
        )

    _validate_extension(filename, document_type)

    if document_type == DOCUMENT_TYPE_RFQ and replace_existing_rfq:
        existing = list_documents_for_project(db, project, DOCUMENT_TYPE_RFQ)
        if existing:
            from app.services import qcr_generation_service

            qcr_generation_service.invalidate_project_qcr_results(db, project.id)
        _remove_documents(db, existing)

    safe_name = _safe_filename(filename)
    timestamp = utcnow().strftime("%Y%m%d_%H%M%S")
    stored_name = f"{timestamp}_{safe_name}"
    dest_dir = _project_upload_dir(
        project.organization_id,
        project.id,
        document_type,
    )
    dest_path = dest_dir / stored_name

    try:
        dest_path.write_bytes(content)
    except OSError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to store uploaded file",
        ) from exc

    now = utcnow()
    document = ProjectDocument(
        id=new_document_id(),
        project_id=project.id,
        organization_id=project.organization_id,
        document_type=document_type,
        original_filename=filename,
        storage_path=str(dest_path.resolve()),
        uploaded_by=user.id,
        created_at=now,
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    return document


async def save_quote_documents(
    db: Session,
    project: Project,
    user: User,
    uploads: list[UploadFile],
) -> list[ProjectDocument]:
    if not uploads:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one quote file is required",
        )

    saved: list[ProjectDocument] = []
    for upload in uploads:
        doc = await save_project_document(
            db,
            project,
            user,
            upload,
            DOCUMENT_TYPE_QUOTE,
            replace_existing_rfq=False,
        )
        saved.append(doc)
    return saved
