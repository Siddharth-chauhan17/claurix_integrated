"""Import Outlook attachments into Claurix project document pipeline."""

from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.models.project import Project
from app.models.user import User


class OutlookMailService:
    """Link Graph mail to projects and import RFQ / quote attachments."""

    def import_attachment(
        self,
        db: Session,
        user: User,
        project: Project,
        *,
        message_id: str,
        attachment_id: str,
        document_type: str,
    ) -> dict[str, Any]:
        raise NotImplementedError
