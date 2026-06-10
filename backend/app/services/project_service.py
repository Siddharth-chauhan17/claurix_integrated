"""Project listing and creation — creator-scoped via client access."""

from datetime import datetime, timezone

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.client import Client
from app.models.project import Project
from app.models.user import User
from app.services import client_service
from app.utils.ids import is_valid_project_id, new_project_id

PROJECT_STATUS_ACTIVE = "active"
PROJECT_STATUS_COMPLETED = "completed"
VALID_PROJECT_STATUSES = frozenset({PROJECT_STATUS_ACTIVE, PROJECT_STATUS_COMPLETED})


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def list_projects_for_user(
    db: Session,
    user: User,
    limit: int = 10,
    client_id: str | None = None,
) -> list[tuple[Project, str]]:
    """
    Return (project, client_name) tuples for the user's projects.
    When client_id is set, verifies client access.
    Always orders by last_worked_at desc (most recently worked on first).
    """
    if client_id:
        client_service.get_client_for_user_or_raise(db, client_id, user)

    stmt = (
        select(Project, Client.name)
        .join(Client, Client.id == Project.client_id)
        .where(
            Project.organization_id == user.organization_id,
            Project.created_by == user.id,
        )
    )
    if client_id:
        stmt = stmt.where(Project.client_id == client_id)
    stmt = stmt.order_by(Project.last_worked_at.desc())
    stmt = stmt.limit(limit)
    return list(db.execute(stmt).all())


def list_recent_projects_for_user(
    db: Session,
    user: User,
    limit: int = 10,
) -> list[tuple[Project, str]]:
    return list_projects_for_user(db, user, limit=limit)


def get_project_for_user_or_raise(
    db: Session, project_id: str, user: User
) -> tuple[Project, str]:
    """Fetch project + client name; 404/403 if missing or inaccessible."""
    if not is_valid_project_id(project_id):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )
    stmt = (
        select(Project, Client.name)
        .join(Client, Client.id == Project.client_id)
        .where(Project.id == project_id)
    )
    row = db.execute(stmt).first()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )
    project, client_name = row
    if (
        project.organization_id != user.organization_id
        or project.created_by != user.id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this project",
        )
    return project, client_name


def set_project_status(db: Session, project: Project, status: str) -> Project:
    if status not in VALID_PROJECT_STATUSES:
        raise ValueError("Invalid project status")
    now = utcnow()
    project.status = status
    project.updated_at = now
    db.commit()
    db.refresh(project)
    return project


def touch_project_last_worked(db: Session, project: Project) -> Project:
    """Record that the user opened or worked on this project (workspace recents)."""
    now = utcnow()
    project.last_worked_at = now
    project.updated_at = now
    client = db.get(Client, project.client_id)
    if client is not None:
        client.last_worked_at = now
        client.updated_at = now
    db.commit()
    db.refresh(project)
    return project


def create_project(db: Session, user: User, client_id: str, name: str) -> Project:
    client_service.get_client_for_user_or_raise(db, client_id, user)
    now = utcnow()
    trimmed = name.strip()
    if not trimmed:
        raise ValueError("Project name is required")

    for _ in range(5):
        project = Project(
            id=new_project_id(),
            organization_id=user.organization_id,
            client_id=client_id,
            name=trimmed,
            created_by=user.id,
            created_at=now,
            updated_at=now,
            last_worked_at=now,
            status=PROJECT_STATUS_ACTIVE,
            location=None,
        )
        db.add(project)
        try:
            db.commit()
            db.refresh(project)
            return project
        except IntegrityError:
            db.rollback()
    raise RuntimeError("Failed to generate unique project id")
