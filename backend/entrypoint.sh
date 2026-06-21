#!/bin/sh
set -e
python -m scripts.run_migrations
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
