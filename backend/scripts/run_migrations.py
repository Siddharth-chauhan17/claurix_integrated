"""Apply Alembic migrations (upgrade to head).

Used by Docker entrypoint, local dev, and API startup.
"""

import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_ROOT))

from alembic import command
from alembic.config import Config


def upgrade_head() -> None:
    """Run `alembic upgrade head` programmatically."""
    ini_path = BACKEND_ROOT / "alembic.ini"
    if not ini_path.exists():
        raise FileNotFoundError(f"Alembic config not found: {ini_path}")
    cfg = Config(str(ini_path))
    command.upgrade(cfg, "head")


def main() -> None:
    upgrade_head()
    print("Migrations applied (alembic upgrade head).")


if __name__ == "__main__":
    main()
