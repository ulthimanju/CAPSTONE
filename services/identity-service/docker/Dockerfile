# --- Stage 1: Builder ---
FROM python:3.11-slim AS builder

WORKDIR /build

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy workspace lock and configs required to resolve dependencies
COPY pyproject.toml uv.lock ./
COPY shared/ ./shared/
COPY services/identity-service/pyproject.toml ./services/identity-service/

# Sync only identity-service and its dependencies (including shared)
RUN uv sync --frozen --package identity-service --no-dev

# --- Stage 2: Runtime Image ---
FROM python:3.11-slim AS runner

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/app/.venv/bin:$PATH"

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd -g 10001 appgroup && \
    useradd -u 10001 -g appgroup -s /bin/sh -m appuser

COPY --from=builder /build/.venv /app/.venv
COPY --from=builder /build/shared /app/shared

COPY services/identity-service/app/ /app/app/
COPY services/identity-service/scripts/ /app/scripts/
COPY services/identity-service/alembic.ini /app/
COPY services/identity-service/docker/docker-entrypoint.sh /app/docker-entrypoint.sh
COPY services/identity-service/docker/healthcheck.py /app/healthcheck.py

RUN chmod +x /app/docker-entrypoint.sh && \
    chown -R appuser:appgroup /app

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python /app/healthcheck.py || exit 1

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
