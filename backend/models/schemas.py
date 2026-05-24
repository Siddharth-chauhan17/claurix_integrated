from datetime import datetime

from pydantic import BaseModel, Field


class Clause(BaseModel):
    title: str
    risk: str
    explanation: str


class AnalysisResponse(BaseModel):
    risk_score: int = Field(..., ge=0, le=100)
    risk_level: str
    summary: str
    risk_flags: list[str]
    clauses: list[Clause]


class HistoryListItem(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    filename: str
    risk_level: str
    risk_score: int
    created_at: datetime
