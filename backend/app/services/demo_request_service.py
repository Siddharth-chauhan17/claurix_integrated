"""Business logic for demo request submissions."""

from datetime import datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.models.demo_request import DemoRequest
from app.schemas import DemoRequestCreate

DUPLICATE_COOLDOWN_MINUTES = 15
MAX_ARRAY_ITEMS = 20
MAX_ARRAY_ITEM_LENGTH = 128


def normalize_string_list(values: list[str]) -> list[str]:
    cleaned: list[str] = []
    seen: set[str] = set()
    for value in values:
        item = value.strip()
        if not item or len(item) > MAX_ARRAY_ITEM_LENGTH:
            continue
        if item in seen:
            continue
        seen.add(item)
        cleaned.append(item)
    return cleaned


def normalize_payload(payload: DemoRequestCreate) -> DemoRequestCreate:
    operational = normalize_string_list(payload.operational_challenges)
    lines = normalize_string_list(payload.lines_of_business)
    topics = normalize_string_list(payload.requested_demo_topics)

    if not operational:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please select at least one operational challenge.",
        )
    if not lines:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please select at least one line of business.",
        )
    if not topics:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please select at least one demo topic.",
        )
    if len(operational) > MAX_ARRAY_ITEMS or len(lines) > MAX_ARRAY_ITEMS or len(topics) > MAX_ARRAY_ITEMS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Too many selections in one or more fields.",
        )

    notes = payload.additional_notes.strip() if payload.additional_notes else None
    if notes == "":
        notes = None

    return DemoRequestCreate(
        full_name=payload.full_name.strip(),
        work_email=payload.work_email,
        company_name=payload.company_name.strip(),
        job_role=payload.job_role.strip(),
        qcr_generation_method=payload.qcr_generation_method.strip(),
        monthly_quote_volume=payload.monthly_quote_volume.strip(),
        operational_challenges=operational,
        lines_of_business=lines,
        review_team_size=payload.review_team_size.strip(),
        preferred_demo_date=payload.preferred_demo_date,
        preferred_time_window=payload.preferred_time_window.strip(),
        requested_demo_topics=topics,
        additional_notes=notes,
        website=payload.website,
    )


def is_honeypot_triggered(payload: DemoRequestCreate) -> bool:
    return bool(payload.website and payload.website.strip())


def assert_not_duplicate_submission(db: Session, work_email: str) -> None:
    cutoff = datetime.utcnow() - timedelta(minutes=DUPLICATE_COOLDOWN_MINUTES)
    recent = db.execute(
        select(DemoRequest.id).where(
            DemoRequest.work_email == work_email.strip().lower(),
            DemoRequest.created_at >= cutoff,
        )
    ).scalar_one_or_none()
    if recent is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "A demo request was recently submitted with this email. "
                "Please wait before submitting again."
            ),
        )


def list_demo_requests(db: Session, limit: int = 50) -> list[DemoRequest]:
    """Return the latest demo requests for internal lead visibility."""
    return list(
        db.execute(
            select(DemoRequest).order_by(desc(DemoRequest.created_at)).limit(limit)
        )
        .scalars()
        .all()
    )


def create_demo_request_record(db: Session, payload: DemoRequestCreate) -> DemoRequest:
    record = DemoRequest(
        full_name=payload.full_name,
        work_email=str(payload.work_email).strip().lower(),
        company_name=payload.company_name,
        job_role=payload.job_role,
        qcr_generation_method=payload.qcr_generation_method,
        monthly_quote_volume=payload.monthly_quote_volume,
        operational_challenges=payload.operational_challenges,
        lines_of_business=payload.lines_of_business,
        review_team_size=payload.review_team_size,
        preferred_demo_date=payload.preferred_demo_date,
        preferred_time_window=payload.preferred_time_window,
        requested_demo_topics=payload.requested_demo_topics,
        additional_notes=payload.additional_notes,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record
