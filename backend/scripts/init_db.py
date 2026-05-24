"""Create database tables. Run once after DB is up: python -m scripts.init_db."""

import sys
from pathlib import Path

# Ensure app is on path when run as script
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.database import Base, engine
from app.models.analysis_history import AnalysisHistory  # noqa: F401
from app.models.user import User  # noqa: F401


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    print("Tables created.")


if __name__ == "__main__":
    init_db()
