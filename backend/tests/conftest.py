"""
Pytest fixtures for HeyBub API tests.
Uses PostgreSQL in CI, SQLite fallback for local development.
"""
import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, Column, Text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.database import Base, get_db
from app.rate_limit import limiter
from app import models

# Disable rate limiting in tests — TestClient shares one IP across all requests
limiter.enabled = False


# Check if we're running in CI with PostgreSQL or locally with SQLite
DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL and "postgresql" in DATABASE_URL:
    # CI environment - use PostgreSQL
    engine = create_engine(DATABASE_URL)
    USE_POSTGRES = True
else:
    # Local development - use in-memory SQLite
    # The ARRAY column issue is handled by using a different SQLite-compatible approach
    # We don't need to patch the model - just use the engine without PostgreSQL features
    USE_POSTGRES = False
    
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    """Override database dependency for testing."""
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


@pytest.fixture(scope="function")
def test_db():
    """Create fresh database tables for each test."""
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function") 
def client(test_db):
    """Test client with overridden dependencies."""
    app.dependency_overrides[get_db] = override_get_db
    
    with TestClient(app) as test_client:
        yield test_client
    
    app.dependency_overrides.clear()


@pytest.fixture
def auth_headers():
    """Mock authentication headers for testing."""
    return {"Authorization": "Bearer test-token"}


@pytest.fixture
def sample_baby_data():
    """Sample baby data for testing."""
    return {
        "name": "Test Baby",
        "birth_date": "2024-01-15T00:00:00Z",
        "gender": "girl"
    }


@pytest.fixture
def sample_feeding_data():
    """Sample feeding data for testing."""
    return {
        "time": "2024-06-15T14:30:00Z",
        "type": "bottle",
        "duration_minutes": 15,
        "amount_ml": 120,
        "notes": "Test feeding"
    }


@pytest.fixture
def sample_diaper_data():
    """Sample diaper data for testing."""
    return {
        "time": "2024-06-15T15:00:00Z",
        "type": "mixed",
        "poo_color": "yellow",
        "poo_consistency": "soft",
        "poo_amount": "medium"
    }


@pytest.fixture
def sample_sleep_data():
    """Sample sleep data for testing."""
    return {
        "start_time": "2024-06-15T13:00:00Z",
        "end_time": "2024-06-15T15:00:00Z",
        "notes": "Afternoon nap"
    }


@pytest.fixture
def sample_potty_data():
    """Sample potty training data for testing."""
    return {
        "time": "2024-06-15T09:00:00Z",
        "result": "success",
        "potty_type": "pee",
        "notes": "Morning potty"
    }


@pytest.fixture
def sample_tummy_time_data():
    """Sample tummy time data for testing."""
    return {
        "start_time": "2024-06-15T10:00:00Z",
        "duration_minutes": 15,
        "notes": "Good head control today"
    }


@pytest.fixture
def sample_bath_data():
    """Sample bath data for testing."""
    return {
        "time": "2024-06-15T18:00:00Z",
        "notes": "Evening bath"
    }


@pytest.fixture
def sample_doctor_visit_data():
    """Sample doctor visit data for testing."""
    return {
        "visit_date": "2024-06-15T10:00:00Z",
        "doctor_name": "Dr. Smith",
        "visit_type": "checkup",
        "weight_kg": 7.5,
        "height_cm": 65.0,
        "head_cm": 42.0,
        "notes": "Healthy checkup"
    }


@pytest.fixture
def sample_vaccination_data():
    """Sample vaccination data for testing."""
    return {
        "vaccine_name": "DTaP",
        "dose_number": 1,
        "given_date": "2024-06-15T11:00:00Z",
        "administered_by": "Dr. Smith",
        "notes": "First dose"
    }


@pytest.fixture
def sample_medication_data():
    """Sample medication data for testing."""
    return {
        "medication_name": "Vitamin D",
        "dosage": "400 IU",
        "frequency": "daily",
        "start_date": "2024-06-15T00:00:00Z",
        "is_active": True,
        "notes": "Daily supplement"
    }


@pytest.fixture
def sample_milestone_data():
    """Sample milestone data for testing."""
    return {
        "milestone_type": "First smile",
        "achieved_date": "2024-06-15T12:00:00Z",
        "notes": "Such a cute smile!"
    }


@pytest.fixture
def sample_growth_data():
    """Sample growth record data for testing."""
    return {
        "recorded_date": "2024-06-15T10:00:00Z",
        "weight_kg": 7.5,
        "height_cm": 65.0,
        "head_cm": 42.0,
        "notes": "Monthly measurement"
    }

