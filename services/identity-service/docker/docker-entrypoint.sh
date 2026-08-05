#!/bin/sh
set -e

# Run database migrations if alembic is configured
if [ -f "alembic.ini" ]; then
    echo "Running database migrations..."
    alembic upgrade head || true
fi

exec "$@"
