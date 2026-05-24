import os
import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, user_id_from_claims
from app.models.analysis_history import AnalysisHistory
from models.schemas import AnalysisResponse, HistoryListItem
from services.ai_service import analyze_policy_ai

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "uploads"))
os.makedirs(UPLOAD_DIR, exist_ok=True)

router = APIRouter(prefix="", tags=["analyze"])


@router.post(
    "/analyze-policy",
    response_model=AnalysisResponse,
    summary="Upload a policy file and get structured risk analysis",
)
async def analyze_policy(
    file: UploadFile = File(..., description="Policy document (e.g. PDF)"),
    db: Session = Depends(get_db),
    user: dict[str, Any] = Depends(get_current_user),
) -> AnalysisResponse:
    file_bytes = await file.read()
    print("CWD:", os.getcwd())
    print("UPLOAD_DIR:", UPLOAD_DIR)
    print("File size:", len(file_bytes))

    original = os.path.basename(file.filename or "upload")
    file_id = uuid.uuid4().hex
    stored_name = f"{file_id}_{original}"
    file_path = os.path.join(UPLOAD_DIR, stored_name)
    print("Saving file to:", file_path)

    with open(file_path, "wb") as f:
        f.write(file_bytes)

    result = analyze_policy_ai(file_bytes)
    file_path_str = f"uploads/{stored_name}"

    user_id = user_id_from_claims(user)

 



    row = AnalysisHistory(
        user_id=user_id,
        filename=original,
        file_path=file_path_str,
        risk_score=result.risk_score,
        risk_level=result.risk_level,
        summary=result.summary,
        raw_response=result.model_dump(),
        created_at=datetime.now(timezone.utc),
    )
    db.add(row)
    db.commit()
    db.refresh(row)

    return result


@router.get(
    "/history",
    response_model=list[HistoryListItem],
    summary="Last 10 policy analyses",
)
def list_history(
    db: Session = Depends(get_db),
    user: dict[str, Any] = Depends(get_current_user),
) -> list[Any]:


    user_id = user_id_from_claims(user)


    stmt = (
        select(AnalysisHistory)
        .where(AnalysisHistory.user_id == user_id)
        .order_by(desc(AnalysisHistory.created_at))
        .limit(10)
    )
    results=  list(db.execute(stmt).scalars().all())


    return results