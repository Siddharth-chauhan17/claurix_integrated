"""QCR generation job status schemas."""

from datetime import datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel

QcrGenerationStatus = Literal["idle", "processing", "completed", "failed"]


class QcrGenerationStatusResponse(BaseModel):
    project_id: str
    run_id: Optional[str] = None
    status: QcrGenerationStatus
    error_message: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    merged_policy_count: Optional[int] = None
    merged_results: Optional[list[dict[str, Any]]] = None
