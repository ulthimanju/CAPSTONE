#!/bin/sh
set -e

if [ -f "alembic.ini" ]; then
    echo "Running database migrations..."
    alembic upgrade head || true
fi

exec "$@"
