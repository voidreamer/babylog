from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum

from .config import get_settings
from .database import engine, Base
from .routers import babies, feedings, diapers, sleeps, events, pumpings, health

# Create tables
Base.metadata.create_all(bind=engine)

settings = get_settings()

app = FastAPI(
    title="SimpleBaby Baby Tracker API",
    description="API for tracking baby sleep, feeding, and diaper changes",
    version="1.0.0",
    root_path="/api" if settings.environment in ("prod", "staging") else ""
)

# CORS - Allow all origins for now (can be restricted later)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,  # Must be False when using allow_origins=["*"]
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
