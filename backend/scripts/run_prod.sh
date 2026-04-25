#!/usr/bin/env bash
set -euo pipefail

# Apply migrations then start gunicorn with uvicorn workers.
alembic upgrade head

exec gunicorn app.main:app \
    --workers "${WEB_CONCURRENCY:-4}" \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 0.0.0.0:8000 \
    --access-logfile - \
    --error-logfile - \
    --timeout 120 \
    --graceful-timeout 30 \
    --keep-alive 5
