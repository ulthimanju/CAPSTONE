import os
import asyncio
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from app.infrastructure.database.session import engine
from app.config.settings import settings
from shared.health import check_postgres, check_mongo, check_rabbitmq

router = APIRouter(prefix="/health", tags=["Health"])


@router.get("/live")
async def liveness_check():
    return {"status": "live", "service": "document-service"}


@router.get("")
@router.get("/ready")
async def readiness_check():
    rabbitmq_url = getattr(settings, "rabbitmq_url", os.environ.get("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/"))
    mongo_url = getattr(settings, "mongo_url", os.environ.get("MONGO_URL", "mongodb://mongo:mongopassword@mongodb:27017"))

    pg_task = check_postgres(engine)
    mongo_task = check_mongo(mongo_url)
    rabbit_task = check_rabbitmq(rabbitmq_url)

    (pg_ok, pg_status), (mongo_ok, mongo_status), (rabbit_ok, rabbit_status) = await asyncio.gather(
        pg_task, mongo_task, rabbit_task
    )

    checks = {
        "postgres": pg_status,
        "mongodb": mongo_status,
        "rabbitmq": rabbit_status,
    }
    all_ok = pg_ok and mongo_ok and rabbit_ok
    status_code = 200 if all_ok else 503
    return JSONResponse(
        status_code=status_code,
        content={
            "status": "ready" if all_ok else "degraded",
            "service": "document-service",
            "checks": checks,
        },
    )

