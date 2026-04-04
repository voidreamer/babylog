import time
import uuid

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from .config import get_settings
from .database import Base, engine
from .logging_config import get_logger, setup_logging
from .rate_limit import limiter
from .routers import (
    activities,
    admin,
    analytics,
    babies,
    billing,
    diapers,
    events,
    export,
    feedings,
    health,
    pumpings,
    rest_planner,
    sleeps,
    subscription,
    users,
)

# Configure structured JSON logging
setup_logging()
logger = get_logger(__name__)

# Create tables
Base.metadata.create_all(bind=engine)

settings = get_settings()

# Initialize Sentry error monitoring
if settings.sentry_dsn:
    import sentry_sdk

    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        environment=settings.environment,
        traces_sample_rate=0.1,
        profiles_sample_rate=0.1,
        enable_tracing=True,
    )
    logger.info("Sentry initialized", extra={"environment": settings.environment})

app = FastAPI(
    title="HeyBub Baby Tracker API",
    description="API for tracking baby sleep, feeding, and diaper changes",
    version="1.0.0",
    root_path="/api" if settings.environment in ("prod", "staging") else "",
)

# Add rate limiter to app state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS - Restrict to allowed origins from settings
allowed_origins = [origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Admin-Key"],
)

# Include routers (root_path handles /api prefix in production)
app.include_router(babies.router)
app.include_router(feedings.router)
app.include_router(diapers.router)
app.include_router(sleeps.router)
app.include_router(events.router)
app.include_router(health.router)
app.include_router(pumpings.router)
app.include_router(activities.router)
app.include_router(analytics.router)
app.include_router(subscription.router)
app.include_router(admin.router)
app.include_router(export.router)
app.include_router(billing.router)
app.include_router(rest_planner.router)
app.include_router(users.router)


# Request logging middleware
@app.middleware("http")
async def log_requests(request: Request, call_next):
    request_id = request.headers.get("x-request-id", str(uuid.uuid4()))
    # Extract user_id from Authorization header (JWT sub claim) without full verification
    user_id = "anonymous"
    auth = request.headers.get("authorization", "")
    if auth.startswith("Bearer ") and auth.count(".") == 2:
        import base64
        import json as _json

        try:
            payload = auth.split(".")[1]
            # Fix base64 padding
            payload += "=" * (-len(payload) % 4)
            claims = _json.loads(base64.urlsafe_b64decode(payload))
            user_id = claims.get("sub", "anonymous")
        except Exception:
            pass

    start = time.perf_counter()
    response = await call_next(request)
    duration_ms = round((time.perf_counter() - start) * 1000, 1)

    logger.info(
        "%s %s %s",
        request.method,
        request.url.path,
        response.status_code,
        extra={
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "duration_ms": duration_ms,
            "user_id": user_id,
        },
    )
    response.headers["X-Request-Id"] = request_id
    return response


# Cache-Control middleware for performance
@app.middleware("http")
async def add_cache_control(request: Request, call_next):
    response = await call_next(request)
    path = request.url.path

    # Skip cache headers for non-GET or auth endpoints
    if request.method != "GET":
        return response

    if "/events/dashboard" in path:
        response.headers["Cache-Control"] = "private, max-age=60"
    elif "/analytics" in path or "/rest-planner" in path:
        response.headers["Cache-Control"] = "private, max-age=300"
    elif "/babies" in path:
        response.headers["Cache-Control"] = "private, max-age=60"
    elif "/events/timeline" in path or path == "/health":
        response.headers["Cache-Control"] = "no-cache"

    return response


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "environment": settings.environment}


@app.get("/")
def root():
    """Root endpoint."""
    return {"message": "HeyBub Baby Tracker API", "docs": "/docs"}


# Lambda handler
handler = Mangum(app, lifespan="off")
