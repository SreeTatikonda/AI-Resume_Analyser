#!/usr/bin/env bash
set -euo pipefail
exec celery -A app.workers.celery_app.celery_app worker --loglevel=INFO --concurrency="${CELERY_CONCURRENCY:-2}"
