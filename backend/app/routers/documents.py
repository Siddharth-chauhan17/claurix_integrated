"""Project document uploads — RFQ and insurer quote files."""

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models.user import User
from app.schemas.documents import (
    ProjectDocumentListResponse,
    ProjectDocumentResponse,
    ProjectDocumentsUploadResponse,
    ProjectDocumentUploadResponse,
)
from app.schemas.outlook import (
    OutlookImportAttachmentRequest,
    OutlookImportAttachmentResponse,
)
from app.services import document_service, project_service
from app.services.outlook_connection_service import (
    OutlookConnectionNotFoundError,
    OutlookReconnectRequiredError,
)
from app.services.outlook_graph_service import (
    OutlookAttachmentTooLargeError,
    OutlookGraphError,
    OutlookGraphNotFound,
)
from app.services.outlook_mail_service import (
    import_attachment_to_project,
    map_graph_error,
    map_outlook_service_error,
)

router = APIRouter(prefix="/projects", tags=["documents"])


def _handle_outlook_import_errors(exc: Exception) -> None:
    if isinstance(exc, OutlookConnectionNotFoundError):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active Outlook connection found. Connect your mailbox first.",
        ) from exc
    mapped = map_outlook_service_error(exc)
    if mapped is not None:
        code, detail = mapped
        raise HTTPException(status_code=code, detail=detail) from exc
    if isinstance(exc, OutlookReconnectRequiredError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Outlook session expired. Please reconnect your mailbox.",
        ) from exc
    if isinstance(exc, OutlookGraphNotFound):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Outlook message or attachment not found",
        ) from exc
    if isinstance(exc, OutlookAttachmentTooLargeError):
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=str(exc),
        ) from exc
    if isinstance(exc, OutlookGraphError):
        code, detail = map_graph_error(exc)
        raise HTTPException(status_code=code, detail=detail) from exc
    raise exc


def _to_response(doc) -> ProjectDocumentResponse:
    return ProjectDocumentResponse(**document_service._to_response(doc))


@router.get(
    "/{project_id}/documents",
    response_model=ProjectDocumentListResponse,
    summary="List uploaded documents for a project",
)
def list_project_documents(
    project_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    document_type: Optional[str] = Query(default=None, pattern="^(rfq|quote)$"),
) -> ProjectDocumentListResponse:
    project, _ = project_service.get_project_for_user_or_raise(db, project_id, user)
    docs = document_service.list_documents_for_project(
        db, project, document_type=document_type
    )
    items = [_to_response(doc) for doc in docs]
    return ProjectDocumentListResponse(count=len(items), items=items)


@router.post(
    "/{project_id}/documents/rfq",
    response_model=ProjectDocumentUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload RFQ Excel for a project (replaces previous RFQ)",
)
async def upload_project_rfq(
    project_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    file: UploadFile = File(...),
) -> ProjectDocumentUploadResponse:
    project, _ = project_service.get_project_for_user_or_raise(db, project_id, user)
    doc = await document_service.save_project_document(
        db,
        project,
        user,
        file,
        document_service.DOCUMENT_TYPE_RFQ,
        replace_existing_rfq=True,
    )
    return ProjectDocumentUploadResponse(document=_to_response(doc))


@router.post(
    "/{project_id}/documents/quotes",
    response_model=ProjectDocumentsUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload one or more insurer quote files",
)
async def upload_project_quotes(
    project_id: str,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    files: list[UploadFile] = File(...),
) -> ProjectDocumentsUploadResponse:
    project, _ = project_service.get_project_for_user_or_raise(db, project_id, user)
    docs = await document_service.save_quote_documents(db, project, user, files)
    items = [_to_response(doc) for doc in docs]
    return ProjectDocumentsUploadResponse(count=len(items), items=items)


@router.post(
    "/{project_id}/mail/import-attachment",
    response_model=OutlookImportAttachmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Import an Outlook attachment into a project",
)
def import_outlook_attachment(
    project_id: str,
    payload: OutlookImportAttachmentRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> OutlookImportAttachmentResponse:
    """Download a file attachment from Outlook and store it as a project document."""
    project, _ = project_service.get_project_for_user_or_raise(db, project_id, user)
    try:
        document, _deduplicated = import_attachment_to_project(
            db,
            user,
            project,
            message_id=payload.message_id,
            attachment_id=payload.attachment_id,
            document_type=payload.document_type,
        )
    except HTTPException:
        raise
    except Exception as exc:
        _handle_outlook_import_errors(exc)

    return OutlookImportAttachmentResponse(
        document_id=document.id,
        file_name=document.original_filename,
        document_type=document.document_type,  # type: ignore[arg-type]
    )
