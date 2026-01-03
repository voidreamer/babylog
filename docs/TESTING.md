# Testing & CI/CD Guide

A practical guide to setting up pytest tests and GitHub Actions CI/CD for FastAPI projects.

---

## Quick Start

```bash
# Run tests locally (requires dependencies)
cd backend
pip install -r requirements.txt
python -m pytest tests/ -v
```

---

## Project Structure

```
backend/
├── app/                    # Application code
│   ├── main.py
│   ├── models.py
│   ├── schemas.py
│   └── routers/
├── tests/                  # Test files
│   ├── conftest.py         # Fixtures & setup
│   └── test_api.py         # API tests
├── requirements.txt        # Dependencies (includes pytest)
└── pyproject.toml          # Pytest configuration
```

---

## Writing Tests

### 1. Test File Structure

```python
# tests/test_api.py
import pytest

class TestFeatureName:
    """Group related tests in classes."""
    
    def test_something_works(self, client, auth_headers):
        """Test names should describe the expected behavior."""
        response = client.get("/endpoint", headers=auth_headers)
        assert response.status_code == 200
        
    def test_something_fails_gracefully(self, client):
        """Test error cases too."""
        response = client.get("/nonexistent")
        assert response.status_code == 404
```

### 2. Using Fixtures

Fixtures are reusable test helpers defined in `conftest.py`:

```python
# tests/conftest.py
import pytest
from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture
def client():
    """FastAPI test client."""
    with TestClient(app) as c:
        yield c

@pytest.fixture
def auth_headers():
    """Mock auth headers."""
    return {"Authorization": "Bearer test-token"}

@pytest.fixture
def sample_data():
    """Sample request data."""
    return {"name": "Test", "value": 123}
```

### 3. Common Test Patterns

```python
# Test CRUD operations
def test_create_item(self, client, auth_headers, sample_data):
    response = client.post("/items/", json=sample_data, headers=auth_headers)
    assert response.status_code == 201
    assert response.json()["name"] == sample_data["name"]

def test_get_item(self, client, auth_headers):
    # Create first
    create_resp = client.post("/items/", json={"name": "Test"}, headers=auth_headers)
    item_id = create_resp.json()["id"]
    
    # Then get
    response = client.get(f"/items/{item_id}", headers=auth_headers)
    assert response.status_code == 200

def test_validation_error(self, client, auth_headers):
    response = client.post("/items/", json={}, headers=auth_headers)  # Missing required fields
    assert response.status_code == 422  # Validation error
```

---

## CI/CD Pipeline

### How It Works

```
Push to GitHub → CI Workflow Triggered → Tests Run → Deploy (if passing)
```

### Workflow File: `.github/workflows/ci-backend.yml`

```yaml
name: CI - Backend Tests

on:
  pull_request:
    paths: ['backend/**']      # Only run when backend changes
  push:
    branches: [main, staging]
    paths: ['backend/**']

jobs:
  test:
    runs-on: ubuntu-latest
    
    # PostgreSQL service for integration tests
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test_db
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    env:
      DATABASE_URL: postgresql://test:test@localhost:5432/test_db
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
      
      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
      
      - name: Run tests
        run: |
          cd backend
          python -m pytest tests/ -v --tb=short
```

---

## Applying to Other Projects

### Step 1: Add Dependencies

```txt
# requirements.txt
pytest>=7.0.0
pytest-asyncio>=0.21.0  # If using async
```

### Step 2: Create `pyproject.toml`

```toml
[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = ["test_*.py"]
python_functions = ["test_*"]
```

### Step 3: Create `tests/conftest.py`

```python
import os
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.database import Base, get_db

# Use env var for CI, fallback for local
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///:memory:")

engine = create_engine(DATABASE_URL)
TestingSessionLocal = sessionmaker(bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture(scope="function")
def test_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
def client(test_db):
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()
```

### Step 4: Write Tests

Create `tests/test_api.py` with your test cases.

### Step 5: Add GitHub Workflow

Copy `.github/workflows/ci-backend.yml` and adjust paths/settings for your project.

---

## Tips

| Tip | Description |
|-----|-------------|
| **Test one thing** | Each test should verify one behavior |
| **Use fixtures** | Avoid duplicating setup code |
| **Test errors** | Don't just test happy paths |
| **Name clearly** | `test_create_user_with_invalid_email_fails` > `test_user` |
| **Run often** | Tests in CI catch bugs before production |

---

## Commands Reference

```bash
# Run all tests
pytest tests/ -v

# Run specific test file
pytest tests/test_api.py -v

# Run specific test class
pytest tests/test_api.py::TestBabyEndpoints -v

# Run specific test
pytest tests/test_api.py::TestBabyEndpoints::test_create_baby -v

# Show print statements
pytest tests/ -v -s

# Stop on first failure
pytest tests/ -v -x
```
