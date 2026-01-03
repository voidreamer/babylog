"""
Pytest fixtures for SimpleBaby API tests.
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
from app import models


# Check if we're running in CI with PostgreSQL or locally with SQLite
DATABASE_URL = os.getenv("DATABASE_URL")

if DATABASE_URL and "postgresql" in DATABASE_URL:
    # CI environment - use PostgreSQL
    engine = create_engine(DATABASE_URL)
    USE_POSTGRES = True
else:
    # Local development - use in-memory SQLite
    # Need to patch ARRAY column for SQLite compatibility
    USE_POSTGRES = False
    models.Baby.shared_with_emails = Column(Text, default='[]')
    
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
