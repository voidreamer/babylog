"""
API endpoint tests for SimpleBaby.
Tests core CRUD operations for babies, feedings, diapers, and sleeps.
"""
import pytest


class TestHealthEndpoint:
    """Test health check endpoint."""
    
    def test_health_check(self, client):
        """Health endpoint should return healthy status."""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
    
    def test_root_endpoint(self, client):
        """Root endpoint should return API info."""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data


class TestBabyEndpoints:
    """Test baby CRUD operations."""
    
    def test_create_baby(self, client, auth_headers, sample_baby_data):
        """Should create a new baby."""
        response = client.post("/babies/", json=sample_baby_data, headers=auth_headers)
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == sample_baby_data["name"]
        assert data["gender"] == sample_baby_data["gender"]
        assert "id" in data
    
    def test_get_babies_empty(self, client, auth_headers):
        """Should return empty list when no babies exist."""
        response = client.get("/babies/", headers=auth_headers)
        assert response.status_code == 200
        assert response.json() == []
    
    def test_get_babies_with_data(self, client, auth_headers, sample_baby_data):
        """Should return list of babies."""
        # Create a baby first
        client.post("/babies/", json=sample_baby_data, headers=auth_headers)
        
        response = client.get("/babies/", headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["name"] == sample_baby_data["name"]
    
    def test_get_baby_by_id(self, client, auth_headers, sample_baby_data):
        """Should get a specific baby by ID."""
        # Create a baby
        create_response = client.post("/babies/", json=sample_baby_data, headers=auth_headers)
        baby_id = create_response.json()["id"]
        
        response = client.get(f"/babies/{baby_id}", headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["id"] == baby_id
    
    def test_get_baby_not_found(self, client, auth_headers):
        """Should return 404 for non-existent baby."""
        response = client.get("/babies/99999", headers=auth_headers)
        assert response.status_code == 404
    
    def test_update_baby(self, client, auth_headers, sample_baby_data):
        """Should update baby information."""
        # Create a baby
        create_response = client.post("/babies/", json=sample_baby_data, headers=auth_headers)
        baby_id = create_response.json()["id"]
        
        # Update the baby
        update_data = {"name": "Updated Name"}
        response = client.put(f"/babies/{baby_id}", json=update_data, headers=auth_headers)
        assert response.status_code == 200
        assert response.json()["name"] == "Updated Name"
    
    def test_delete_baby(self, client, auth_headers, sample_baby_data):
        """Should delete a baby."""
        # Create a baby
        create_response = client.post("/babies/", json=sample_baby_data, headers=auth_headers)
        baby_id = create_response.json()["id"]
        
        # Delete the baby
        response = client.delete(f"/babies/{baby_id}", headers=auth_headers)
        assert response.status_code == 204
        
        # Verify it's gone
        get_response = client.get(f"/babies/{baby_id}", headers=auth_headers)
        assert get_response.status_code == 404


class TestFeedingEndpoints:
    """Test feeding CRUD operations."""
    
    def test_create_feeding(self, client, auth_headers, sample_baby_data, sample_feeding_data):
        """Should create a new feeding."""
        # Create a baby first
        baby_response = client.post("/babies/", json=sample_baby_data, headers=auth_headers)
        baby_id = baby_response.json()["id"]
        
        # Create feeding
        feeding_data = {**sample_feeding_data, "baby_id": baby_id}
        response = client.post("/feedings/", json=feeding_data, headers=auth_headers)
        assert response.status_code == 201
        data = response.json()
        assert data["type"] == sample_feeding_data["type"]
        assert data["amount_ml"] == sample_feeding_data["amount_ml"]
    
    def test_get_feedings(self, client, auth_headers, sample_baby_data, sample_feeding_data):
        """Should get feedings for a baby."""
        # Create baby and feeding
        baby_response = client.post("/babies/", json=sample_baby_data, headers=auth_headers)
        baby_id = baby_response.json()["id"]
        
        feeding_data = {**sample_feeding_data, "baby_id": baby_id}
        client.post("/feedings/", json=feeding_data, headers=auth_headers)
        
        response = client.get(f"/feedings/?baby_id={baby_id}", headers=auth_headers)
        assert response.status_code == 200
        assert len(response.json()) == 1
    
    def test_delete_feeding(self, client, auth_headers, sample_baby_data, sample_feeding_data):
        """Should delete a feeding."""
        # Create baby and feeding
        baby_response = client.post("/babies/", json=sample_baby_data, headers=auth_headers)
        baby_id = baby_response.json()["id"]
        
        feeding_data = {**sample_feeding_data, "baby_id": baby_id}
        feeding_response = client.post("/feedings/", json=feeding_data, headers=auth_headers)
        feeding_id = feeding_response.json()["id"]
        
        # Delete
        response = client.delete(f"/feedings/{feeding_id}", headers=auth_headers)
        assert response.status_code == 204


class TestDiaperEndpoints:
    """Test diaper CRUD operations."""
    
    def test_create_diaper(self, client, auth_headers, sample_baby_data, sample_diaper_data):
        """Should create a new diaper change."""
        # Create a baby first
        baby_response = client.post("/babies/", json=sample_baby_data, headers=auth_headers)
        baby_id = baby_response.json()["id"]
        
        # Create diaper
        diaper_data = {**sample_diaper_data, "baby_id": baby_id}
        response = client.post("/diapers/", json=diaper_data, headers=auth_headers)
        assert response.status_code == 201
        data = response.json()
        assert data["type"] == sample_diaper_data["type"]
        assert data["poo_color"] == sample_diaper_data["poo_color"]
    
    def test_get_diapers(self, client, auth_headers, sample_baby_data, sample_diaper_data):
        """Should get diapers for a baby."""
        # Create baby and diaper
        baby_response = client.post("/babies/", json=sample_baby_data, headers=auth_headers)
        baby_id = baby_response.json()["id"]
        
        diaper_data = {**sample_diaper_data, "baby_id": baby_id}
        client.post("/diapers/", json=diaper_data, headers=auth_headers)
        
        response = client.get(f"/diapers/?baby_id={baby_id}", headers=auth_headers)
        assert response.status_code == 200
        assert len(response.json()) == 1


class TestSleepEndpoints:
    """Test sleep CRUD operations."""
    
    def test_create_sleep(self, client, auth_headers, sample_baby_data, sample_sleep_data):
        """Should create a new sleep session."""
        # Create a baby first
        baby_response = client.post("/babies/", json=sample_baby_data, headers=auth_headers)
        baby_id = baby_response.json()["id"]
        
        # Create sleep
        sleep_data = {**sample_sleep_data, "baby_id": baby_id}
        response = client.post("/sleeps/", json=sleep_data, headers=auth_headers)
        assert response.status_code == 201
        data = response.json()
        assert data["notes"] == sample_sleep_data["notes"]
        assert "duration_minutes" in data
    
    def test_get_sleeps(self, client, auth_headers, sample_baby_data, sample_sleep_data):
        """Should get sleeps for a baby."""
        # Create baby and sleep
        baby_response = client.post("/babies/", json=sample_baby_data, headers=auth_headers)
        baby_id = baby_response.json()["id"]
        
        sleep_data = {**sample_sleep_data, "baby_id": baby_id}
        client.post("/sleeps/", json=sleep_data, headers=auth_headers)
        
        response = client.get(f"/sleeps/?baby_id={baby_id}", headers=auth_headers)
        assert response.status_code == 200
        assert len(response.json()) == 1


class TestValidation:
    """Test input validation."""
    
    def test_invalid_feeding_type(self, client, auth_headers, sample_baby_data):
        """Should reject invalid feeding type."""
        baby_response = client.post("/babies/", json=sample_baby_data, headers=auth_headers)
        baby_id = baby_response.json()["id"]
        
        invalid_feeding = {
            "baby_id": baby_id,
            "time": "2024-06-15T14:30:00Z",
            "type": "invalid_type"  # Not in enum
        }
        response = client.post("/feedings/", json=invalid_feeding, headers=auth_headers)
        assert response.status_code == 422  # Validation error
    
    def test_invalid_diaper_type(self, client, auth_headers, sample_baby_data):
        """Should reject invalid diaper type."""
        baby_response = client.post("/babies/", json=sample_baby_data, headers=auth_headers)
        baby_id = baby_response.json()["id"]
        
        invalid_diaper = {
            "baby_id": baby_id,
            "time": "2024-06-15T15:00:00Z",
            "type": "invalid"  # Not in enum
        }
        response = client.post("/diapers/", json=invalid_diaper, headers=auth_headers)
        assert response.status_code == 422
    
    def test_missing_required_field(self, client, auth_headers):
        """Should reject baby without name."""
        response = client.post("/babies/", json={}, headers=auth_headers)
        assert response.status_code == 422
