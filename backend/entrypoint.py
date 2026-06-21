"""Run Alembic migrations then start uvicorn. Used as Docker entrypoint."""

import os
import sys


def main() -> None:
    sys.path.insert(0, "/app")
    os.chdir("/app")
    from scripts.run_migrations import upgrade_head

    upgrade_head()
    os.execvp("uvicorn", ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"])


if __name__ == "__main__":
    main()
