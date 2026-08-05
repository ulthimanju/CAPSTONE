# --- Stage 1: Base Builder ---
FROM python:3.11-slim AS builder

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_LINK_MODE=copy

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy workspace definition to install common dependencies
COPY pyproject.toml uv.lock ./
COPY shared/ ./shared/
COPY services/identity-service/pyproject.toml ./services/identity-service/
COPY services/workspace-service/pyproject.toml ./services/workspace-service/
COPY services/document-service/pyproject.toml ./services/document-service/
COPY services/rag-service/pyproject.toml ./services/rag-service/
COPY services/ai-service/pyproject.toml ./services/ai-service/
COPY services/notification-service/pyproject.toml ./services/notification-service/
COPY services/api-gateway/pyproject.toml ./services/api-gateway/

# Build full workspace venv with BuildKit cache mount for uv
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev

# --- Stage 2: Base Runtime ---
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

COPY --from=builder /app/.venv /app/.venv
COPY --from=builder /app/shared /app/shared
COPY docker/docker-entrypoint.sh /app/docker-entrypoint.sh
COPY docker/healthcheck.py /app/healthcheck.py

RUN chmod +x /app/docker-entrypoint.sh && \
    chown -R appuser:appgroup /app
