"""Create database tables. Run once after DB is up: python -m scripts.init_db."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import inspect, text

from app.config import get_settings
from app.database import Base, engine
from app.models.client import Client  # noqa: F401
from app.models.demo_request import DemoRequest  # noqa: F401
from app.models.organization import Organization  # noqa: F401
from app.models.project import Project  # noqa: F401
from app.models.project_document import ProjectDocument  # noqa: F401
from app.models.qcr_generation_run import QcrGenerationRun  # noqa: F401
from app.models.qcr_workspace_edit import QcrWorkspaceEdit  # noqa: F401
from app.models.user import User  # noqa: F401
from scripts.reset_identity import reset_identity_foundation


def _ensure_demo_request_array_columns() -> None:
    inspector = inspect(engine)
    if "demo_requests" not in inspector.get_table_names():
        return

    columns = {col["name"]: col for col in inspector.get_columns("demo_requests")}
    array_columns = (
        "operational_challenges",
        "lines_of_business",
        "requested_demo_topics",
    )

    with engine.begin() as conn:
        for column_name in array_columns:
            if column_name not in columns:
                continue
            column_type = str(columns[column_name]["type"]).upper()
            if "JSON" not in column_type:
                continue

            temp_column = f"{column_name}_array_tmp"
            conn.execute(
                text(
                    f"""
                    ALTER TABLE demo_requests
                    ADD COLUMN IF NOT EXISTS {temp_column} varchar(128)[]
                    """
                )
            )
            conn.execute(
                text(
                    f"""
                    UPDATE demo_requests
                    SET {temp_column} = COALESCE(
                      (
                        SELECT array_agg(value)
                        FROM jsonb_array_elements_text({column_name}::jsonb) AS value
                      ),
                      ARRAY[]::varchar[]
                    )
                    """
                )
            )
            conn.execute(text(f"ALTER TABLE demo_requests DROP COLUMN {column_name}"))
            conn.execute(
                text(
                    f"ALTER TABLE demo_requests RENAME COLUMN {temp_column} TO {column_name}"
                )
            )
            columns.pop(column_name, None)


def _ensure_client_last_worked_at_column() -> None:
    inspector = inspect(engine)
    if "clients" not in inspector.get_table_names():
        return
    columns = {col["name"] for col in inspector.get_columns("clients")}
    if "last_worked_at" in columns:
        return

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                ALTER TABLE clients
                ADD COLUMN IF NOT EXISTS last_worked_at TIMESTAMPTZ
                """
            )
        )
        conn.execute(
            text(
                """
                UPDATE clients
                SET last_worked_at = COALESCE(updated_at, created_at)
                WHERE last_worked_at IS NULL
                """
            )
        )
        conn.execute(
            text(
                """
                ALTER TABLE clients
                ALTER COLUMN last_worked_at SET NOT NULL
                """
            )
        )


def _ensure_project_status_column() -> None:
    inspector = inspect(engine)
    if "projects" not in inspector.get_table_names():
        return
    columns = {col["name"] for col in inspector.get_columns("projects")}
    if "status" in columns:
        return

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                ALTER TABLE projects
                ADD COLUMN IF NOT EXISTS status VARCHAR(16) DEFAULT 'active'
                """
            )
        )
        conn.execute(
            text(
                """
                UPDATE projects
                SET status = 'active'
                WHERE status IS NULL
                """
            )
        )
        conn.execute(
            text(
                """
                ALTER TABLE projects
                ALTER COLUMN status SET NOT NULL
                """
            )
        )


def init_db() -> None:
    settings = get_settings()
    if settings.reset_identity_on_startup:
        reset_identity_foundation(wipe=True)
    Base.metadata.create_all(bind=engine)
    if settings.reset_identity_on_startup:
        reset_identity_foundation(wipe=False)
    _ensure_demo_request_array_columns()
    _ensure_client_last_worked_at_column()
    _ensure_project_status_column()
    print("Tables created.")


if __name__ == "__main__":
    init_db()
