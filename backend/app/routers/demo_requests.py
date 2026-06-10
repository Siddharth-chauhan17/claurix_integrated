"""Public demo request API."""

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import (
    DemoRequestCreate,
    DemoRequestListResponse,
    DemoRequestSubmitResponse,
    DemoRequestSummary,
)
from app.services import demo_request_service

router = APIRouter(prefix="/demo-requests", tags=["demo-requests"])


@router.post(
    "",
    response_model=DemoRequestSubmitResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit a demo request",
)
def create_demo_request(
    payload: DemoRequestCreate,
    db: Session = Depends(get_db),
) -> DemoRequestSubmitResponse:
    """Store a demo request from the public Request Demo form. No auth required."""
    normalized = demo_request_service.normalize_payload(payload)

    if demo_request_service.is_honeypot_triggered(normalized):
        return DemoRequestSubmitResponse()

    demo_request_service.assert_not_duplicate_submission(
        db, str(normalized.work_email)
    )
    demo_request_service.create_demo_request_record(db, normalized)
    return DemoRequestSubmitResponse()


@router.get(
    "",
    response_model=DemoRequestListResponse,
    summary="List recent demo requests (internal MVP visibility)",
)
def list_demo_requests(
    limit: int = Query(default=50, ge=1, le=100),
    db: Session = Depends(get_db),
) -> DemoRequestListResponse:
    """Return the latest demo requests for lightweight internal lead visibility."""
    rows = demo_request_service.list_demo_requests(db, limit=limit)
    items = [DemoRequestSummary.model_validate(row) for row in rows]
    return DemoRequestListResponse(count=len(items), items=items)
