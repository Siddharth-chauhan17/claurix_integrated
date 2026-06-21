"""Backwards-compatible entry point for database setup.

Schema is managed by Alembic. This module delegates to run_migrations.
Prefer: python -m scripts.run_migrations
"""

from scripts.run_migrations import upgrade_head


def init_db() -> None:
    """Apply pending Alembic migrations."""
    upgrade_head()
    print("Database ready (alembic upgrade head).")


if __name__ == "__main__":
    init_db()
