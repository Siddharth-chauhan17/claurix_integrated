#!/bin/sh
set -e
# Wait for PostgreSQL to be ready (optional; compose depends_on is usually enough)
# Run migrations / create tables
python -m scripts.init_db
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
