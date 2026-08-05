# --- Stage 1: Builder ---
FROM python:3.11-slim AS builder

WORKDIR /build

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml uv.lock ./
COPY shared/ ./shared/
COPY services/rag-service/pyproject.toml ./services/rag-service/

RUN uv sync --frozen --package rag-service --no-dev

# --- Stage 2: Runtime ---
FROM python:3.11-slim AS runner

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/app/.venv/bin:$PATH"

RUN apt-get update && apt-get install -y --no-install-recommends libpq5 \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd -g 10001 appgroup && useradd -u 10001 -g appgroup -s /bin/sh -m appuser

COPY --from=builder /build/.venv /app/.venv
COPY --from=builder /build/shared /app/shared

COPY services/rag-service/app/ /app/app/
COPY docker/docker-entrypoint.sh /app/docker-entrypoint.sh
COPY docker/healthcheck.py /app/healthcheck.py

RUN chmod +x /app/docker-entrypoint.sh && chown -R appuser:appgroup /app

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python /app/healthcheck.py || exit 1

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
