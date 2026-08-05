#!/bin/sh
set -e

# Prepend virtualenv bin path
export PATH="/app/.venv/bin:$PATH"

if [ -f "alembic.ini" ] && [ -f "app/infrastructure/database/migrations/env.py" ]; then
    echo "Running database migrations..."
    alembic upgrade head || true
fi

exec python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
