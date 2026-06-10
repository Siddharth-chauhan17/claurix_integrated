"""Project document uploads — RFQ and insurer quote files."""

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, File, Query, UploadFile, status
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
from app.services import document_service, project_service

router = APIRouter(prefix="/projects", tags=["documents"])


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
