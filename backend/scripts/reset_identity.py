"""Pre-production identity reset: wipe users/orgs/clients and re-seed."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import inspect, text

from app.database import SessionLocal, engine
from app.models.client import Client  # noqa: F401
from app.models.organization import Organization  # noqa: F401
from app.models.user import User  # noqa: F401
from app.services.org_assignment_service import get_or_create_personal_organization


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
    else:
        seed_personal_organization()


if __name__ == "__main__":
    reset_identity_foundation(wipe=True)
    reset_identity_foundation(wipe=False)
