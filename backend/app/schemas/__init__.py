"""
Pydantic schemas package.

Legacy auth/client/project/demo schemas live in legacy.py.
Workspace QCR contracts live in workspace.py — import either module or use re-exports below.
"""

from app.schemas.legacy import *  # noqa: F403
from app.schemas.workspace import (  # noqa: F401
    WORKSPACE_SCHEMA_VERSION,
    AIAnalysis,
    Clause,
    Comment,
    ComparisonType,
    DocumentDescriptor,
    DocumentType,
    InsurerValue,
    PolicySection,
    RiskLevel,
    SectionSourceMapping,
    SelectedPolicySection,
    SourceLocation,
    SourceReference,
    SourceTrace,
    SourceType,
    WorkspaceMetadata,
    WorkspacePayload,
    WorkspaceResponse,
)
