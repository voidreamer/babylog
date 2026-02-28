from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from .config import get_settings
from .database import engine, Base
from .routers import babies, feedings, diapers, sleeps, events, pumpings, health, activities, analytics, subscription, admin, export, billing, rest_planner, users

# Create tables
Base.metadata.create_all(bind=engine)

settings = get_settings()

# Rate limiter - uses client IP for identification
# In production behind Caddy, use X-Forwarded-For header
def get_real_client_ip(request: Request) -> str:
    """Extract real client IP, accounting for proxies."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return get_remote_address(request)

limiter = Limiter(key_func=get_real_client_ip)

app = FastAPI(
    title="HeyBub Baby Tracker API",
    description="API for tracking baby sleep, feeding, and diaper changes",
    version="1.0.0",
    root_path="/api" if settings.environment in ("prod", "staging") else ""
)

# Add rate limiter to app state
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS - Restrict to allowed origins from settings
# Parse comma-separated origins from environment
allowed_origins = [origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,  # Can be True now that we have specific origins
    allow_methods=["*"],
    allow_headers=["*"],
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
    elif "/analytics" in path:
        response.headers["Cache-Control"] = "private, max-age=300"
    elif "/rest-planner" in path:
        response.headers["Cache-Control"] = "private, max-age=300"
    elif "/babies" in path:
        response.headers["Cache-Control"] = "private, max-age=60"
    elif "/events/timeline" in path:
        response.headers["Cache-Control"] = "no-cache"
    elif "/health" == path:
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
