"""Pre-production identity reset: wipe users/orgs/clients, ensure schema."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import inspect, text

from app.database import SessionLocal, engine
from app.models.client import Client  # noqa: F401
from app.models.organization import Organization  # noqa: F401
from app.models.user import User  # noqa: F401
from app.services.org_assignment_service import get_or_create_personal_organization


def _ensure_organization_domain_column() -> None:
    inspector = inspect(engine)
    if "organizations" not in inspector.get_table_names():
        return
    columns = {col["name"] for col in inspector.get_columns("organizations")}
    with engine.begin() as conn:
        if "domain" not in columns:
            conn.execute(
                text(
                    "ALTER TABLE organizations ADD COLUMN domain VARCHAR(255)"
                )
            )
            conn.execute(
                text(
                    """
                    UPDATE organizations
                    SET domain = LOWER(REPLACE(name, ' ', '')) || '.local'
                    WHERE domain IS NULL
                    """
                )
            )
        conn.execute(
            text(
                """
                CREATE UNIQUE INDEX IF NOT EXISTS uq_organizations_domain
                ON organizations (domain)
                """
            )
        )


def wipe_identity_data() -> None:
    """Remove all users, organizations, and clients (pre-production reset)."""
    inspector = inspect(engine)
    tables = set(inspector.get_table_names())
    with engine.begin() as conn:
        if "clients" in tables:
            conn.execute(text("TRUNCATE TABLE clients RESTART IDENTITY CASCADE"))
        if "users" in tables:
            conn.execute(text("TRUNCATE TABLE users RESTART IDENTITY CASCADE"))
        if "organizations" in tables:
            conn.execute(text("TRUNCATE TABLE organizations RESTART IDENTITY CASCADE"))
    print("Identity data wiped (users, organizations, clients).")


def seed_personal_organization() -> None:
    db = SessionLocal()
    try:
        get_or_create_personal_organization(db)
        db.commit()
        print("Personal testing organization (org_personal) ready.")
    finally:
        db.close()


def reset_identity_foundation(*, wipe: bool = True) -> None:
    if wipe:
        wipe_identity_data()
    _ensure_organization_domain_column()
    seed_personal_organization()


if __name__ == "__main__":
    reset_identity_foundation(wipe=True)
