from models.schemas import AnalysisResponse, Clause


def analyze_policy_ai(file_bytes: bytes) -> AnalysisResponse:
    _ = file_bytes
    return AnalysisResponse(
        risk_score=78,
        risk_level="High",
        summary="Weak compliance and missing clauses",
        risk_flags=[
            "No fire safety compliance",
            "Ambiguous stock valuation",
        ],
        clauses=[
            Clause(
                title="Fire Safety Clause",
                risk="High",
                explanation="Missing extinguisher requirement",
            ),
        ],
    )
