from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum

from .config import get_settings
from .database import engine, Base
from .routers import babies, feedings, diapers, sleeps, events, pumpings, health, activities

# Create tables
Base.metadata.create_all(bind=engine)

settings = get_settings()

app = FastAPI(
    title="SimpleBaby Baby Tracker API",
    description="API for tracking baby sleep, feeding, and diaper changes",
    version="1.0.0",
    root_path="/api" if settings.environment in ("prod", "staging") else ""
)

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


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "environment": settings.environment}


@app.get("/")
def root():
    """Root endpoint."""
    return {"message": "SimpleBaby Baby Tracker API", "docs": "/docs"}


# Lambda handler
handler = Mangum(app, lifespan="off")
