FROM synapse-python-base:latest

WORKDIR /app

COPY shared/ /app/shared/
COPY services/rag-service/app/ /app/app/

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python /app/healthcheck.py || exit 1

ENTRYPOINT ["/app/docker-entrypoint.sh"]
