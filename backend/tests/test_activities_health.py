"""
Tests for new activity endpoints (Potty, TummyTime, Bath) and Health endpoints.
Tests CRUD operations for all recently added features.

NOTE: These tests require PostgreSQL and will be run in CI.
Local testing requires a PostgreSQL database due to the ARRAY column
in the Baby model which is not compatible with SQLite.
"""


class TestPottyEndpoints:
    """Test potty training CRUD operations."""

    def test_create_potty_log(self, client, auth_headers, sample_baby_data, sample_potty_data):
        """Should create a new potty log."""
        # Create a baby first
        baby_response = client.post("/babies/", json=sample_baby_data, headers=auth_headers)
        baby_id = baby_response.json()["id"]

        # Create potty log
        potty_data = {**sample_potty_data, "baby_id": baby_id}
        response = client.post("/activities/potty/", json=potty_data, headers=auth_headers)
        assert response.status_code == 201
        data = response.json()
        assert data["result"] == sample_potty_data["result"]
        assert data["potty_type"] == sample_potty_data["potty_type"]

    def test_get_potty_logs(self, client, auth_headers, sample_baby_data, sample_potty_data):
        """Should get potty logs for a baby."""
        # Create baby and potty log
        baby_response = client.post("/babies/", json=sample_baby_data, headers=auth_headers)
        baby_id = baby_response.json()["id"]

        potty_data = {**sample_potty_data, "baby_id": baby_id}
        client.post("/activities/potty/", json=potty_data, headers=auth_headers)

        response = client.get(f"/activities/potty/?baby_id={baby_id}", headers=auth_headers)
        assert response.status_code == 200
        assert len(response.json()) == 1

    def test_delete_potty_log(self, client, auth_headers, sample_baby_data, sample_potty_data):
        """Should delete a potty log."""
        # Create baby and potty log
        baby_response = client.post("/babies/", json=sample_baby_data, headers=auth_headers)
        baby_id = baby_response.json()["id"]

        potty_data = {**sample_potty_data, "baby_id": baby_id}
        potty_response = client.post("/activities/potty/", json=potty_data, headers=auth_headers)
        potty_id = potty_response.json()["id"]

        # Delete
        response = client.delete(f"/activities/potty/{potty_id}", headers=auth_headers)
        assert response.status_code == 204


class TestTummyTimeEndpoints:
    """Test tummy time CRUD operations."""

    def test_create_tummy_time(self, client, auth_headers, sample_baby_data, sample_tummy_time_data):
        """Should create a new tummy time log."""
        # Create a baby first
        baby_response = client.post("/babies/", json=sample_baby_data, headers=auth_headers)
        baby_id = baby_response.json()["id"]

        # Create tummy time
        tummy_data = {**sample_tummy_time_data, "baby_id": baby_id}
        response = client.post("/activities/tummy-time/", json=tummy_data, headers=auth_headers)
        assert response.status_code == 201
        data = response.json()
        assert data["duration_minutes"] == sample_tummy_time_data["duration_minutes"]

    def test_get_tummy_times(self, client, auth_headers, sample_baby_data, sample_tummy_time_data):
        """Should get tummy time logs for a baby."""
        # Create baby and tummy time
        baby_response = client.post("/babies/", json=sample_baby_data, headers=auth_headers)
        baby_id = baby_response.json()["id"]

        tummy_data = {**sample_tummy_time_data, "baby_id": baby_id}
        client.post("/activities/tummy-time/", json=tummy_data, headers=auth_headers)

        response = client.get(f"/activities/tummy-time/?baby_id={baby_id}", headers=auth_headers)
        assert response.status_code == 200
        assert len(response.json()) == 1

    def test_delete_tummy_time(self, client, auth_headers, sample_baby_data, sample_tummy_time_data):
        """Should delete a tummy time log."""
        # Create baby and tummy time
        baby_response = client.post("/babies/", json=sample_baby_data, headers=auth_headers)
        baby_id = baby_response.json()["id"]

        tummy_data = {**sample_tummy_time_data, "baby_id": baby_id}
        tummy_response = client.post("/activities/tummy-time/", json=tummy_data, headers=auth_headers)
        tummy_id = tummy_response.json()["id"]

        # Delete
        response = client.delete(f"/activities/tummy-time/{tummy_id}", headers=auth_headers)
        assert response.status_code == 204


class TestBathEndpoints:
    """Test bath CRUD operations."""

    def test_create_bath(self, client, auth_headers, sample_baby_data, sample_bath_data):
        """Should create a new bath log."""
        # Create a baby first
        baby_response = client.post("/babies/", json=sample_baby_data, headers=auth_headers)
        baby_id = baby_response.json()["id"]

        # Create bath
        bath_data = {**sample_bath_data, "baby_id": baby_id}
        response = client.post("/activities/baths/", json=bath_data, headers=auth_headers)
        assert response.status_code == 201
        data = response.json()
        assert data["notes"] == sample_bath_data["notes"]

    def test_get_baths(self, client, auth_headers, sample_baby_data, sample_bath_data):
        """Should get bath logs for a baby."""
        # Create baby and bath
        baby_response = client.post("/babies/", json=sample_baby_data, headers=auth_headers)
        baby_id = baby_response.json()["id"]

        bath_data = {**sample_bath_data, "baby_id": baby_id}
        client.post("/activities/baths/", json=bath_data, headers=auth_headers)

        response = client.get(f"/activities/baths/?baby_id={baby_id}", headers=auth_headers)
        assert response.status_code == 200
        assert len(response.json()) == 1

    def test_delete_bath(self, client, auth_headers, sample_baby_data, sample_bath_data):
        """Should delete a bath log."""
        # Create baby and bath
        baby_response = client.post("/babies/", json=sample_baby_data, headers=auth_headers)
        baby_id = baby_response.json()["id"]

        bath_data = {**sample_bath_data, "baby_id": baby_id}
        bath_response = client.post("/activities/baths/", json=bath_data, headers=auth_headers)
        bath_id = bath_response.json()["id"]

        # Delete
        response = client.delete(f"/activities/baths/{bath_id}", headers=auth_headers)
        assert response.status_code == 204


class TestDoctorVisitEndpoints:
    """Test doctor visit CRUD operations."""

    def test_create_doctor_visit(self, client, auth_headers, sample_baby_data, sample_doctor_visit_data):
        """Should create a new doctor visit."""
        # Create a baby first
        baby_response = client.post("/babies/", json=sample_baby_data, headers=auth_headers)
        baby_id = baby_response.json()["id"]

        # Create doctor visit
        visit_data = {**sample_doctor_visit_data, "baby_id": baby_id}
        response = client.post("/health/doctor-visits/", json=visit_data, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["doctor_name"] == sample_doctor_visit_data["doctor_name"]
        assert data["visit_type"] == sample_doctor_visit_data["visit_type"]

    def test_get_doctor_visits(self, client, auth_headers, sample_baby_data, sample_doctor_visit_data):
        """Should get doctor visits for a baby."""
        # Create baby and visit
        baby_response = client.post("/babies/", json=sample_baby_data, headers=auth_headers)
        baby_id = baby_response.json()["id"]

        visit_data = {**sample_doctor_visit_data, "baby_id": baby_id}
        client.post("/health/doctor-visits/", json=visit_data, headers=auth_headers)

        response = client.get(f"/health/doctor-visits/?baby_id={baby_id}", headers=auth_headers)
        assert response.status_code == 200
        assert len(response.json()) == 1


class TestVaccinationEndpoints:
    """Test vaccination CRUD operations."""

    def test_create_vaccination(self, client, auth_headers, sample_baby_data, sample_vaccination_data):
        """Should create a new vaccination record."""
        # Create a baby first
        baby_response = client.post("/babies/", json=sample_baby_data, headers=auth_headers)
        baby_id = baby_response.json()["id"]

        # Create vaccination
        vacc_data = {**sample_vaccination_data, "baby_id": baby_id}
        response = client.post("/health/vaccinations/", json=vacc_data, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["vaccine_name"] == sample_vaccination_data["vaccine_name"]
        assert data["dose_number"] == sample_vaccination_data["dose_number"]

    def test_get_vaccinations(self, client, auth_headers, sample_baby_data, sample_vaccination_data):
        """Should get vaccinations for a baby."""
        # Create baby and vaccination
        baby_response = client.post("/babies/", json=sample_baby_data, headers=auth_headers)
        baby_id = baby_response.json()["id"]

        vacc_data = {**sample_vaccination_data, "baby_id": baby_id}
        client.post("/health/vaccinations/", json=vacc_data, headers=auth_headers)

        response = client.get(f"/health/vaccinations/?baby_id={baby_id}", headers=auth_headers)
        assert response.status_code == 200
        assert len(response.json()) == 1


class TestMedicationEndpoints:
    """Test medication CRUD operations."""

    def test_create_medication(self, client, auth_headers, sample_baby_data, sample_medication_data):
        """Should create a new medication record."""
        # Create a baby first
        baby_response = client.post("/babies/", json=sample_baby_data, headers=auth_headers)
        baby_id = baby_response.json()["id"]

        # Create medication
        med_data = {**sample_medication_data, "baby_id": baby_id}
        response = client.post("/health/medications/", json=med_data, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["medication_name"] == sample_medication_data["medication_name"]
        assert data["is_active"] == sample_medication_data["is_active"]

    def test_get_medications(self, client, auth_headers, sample_baby_data, sample_medication_data):
        """Should get medications for a baby."""
        # Create baby and medication
        baby_response = client.post("/babies/", json=sample_baby_data, headers=auth_headers)
        baby_id = baby_response.json()["id"]

        med_data = {**sample_medication_data, "baby_id": baby_id}
        client.post("/health/medications/", json=med_data, headers=auth_headers)

        response = client.get(f"/health/medications/?baby_id={baby_id}", headers=auth_headers)
        assert response.status_code == 200
        assert len(response.json()) == 1


class TestMilestoneEndpoints:
    """Test milestone CRUD operations."""

    def test_create_milestone(self, client, auth_headers, sample_baby_data, sample_milestone_data):
        """Should create a new milestone."""
        # Create a baby first
        baby_response = client.post("/babies/", json=sample_baby_data, headers=auth_headers)
        baby_id = baby_response.json()["id"]

        # Create milestone
        milestone_data = {**sample_milestone_data, "baby_id": baby_id}
        response = client.post("/health/milestones/", json=milestone_data, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert data["milestone_type"] == sample_milestone_data["milestone_type"]

    def test_get_milestones(self, client, auth_headers, sample_baby_data, sample_milestone_data):
        """Should get milestones for a baby."""
        # Create baby and milestone
        baby_response = client.post("/babies/", json=sample_baby_data, headers=auth_headers)
        baby_id = baby_response.json()["id"]

        milestone_data = {**sample_milestone_data, "baby_id": baby_id}
        client.post("/health/milestones/", json=milestone_data, headers=auth_headers)

        response = client.get(f"/health/milestones/?baby_id={baby_id}", headers=auth_headers)
        assert response.status_code == 200
        assert len(response.json()) == 1


class TestGrowthRecordEndpoints:
    """Test growth record CRUD operations."""

    def test_create_growth_record(self, client, auth_headers, sample_baby_data, sample_growth_data):
        """Should create a new growth record."""
        # Create a baby first
        baby_response = client.post("/babies/", json=sample_baby_data, headers=auth_headers)
        baby_id = baby_response.json()["id"]

        # Create growth record
        growth_data = {**sample_growth_data, "baby_id": baby_id}
        response = client.post("/health/growth/", json=growth_data, headers=auth_headers)
        assert response.status_code == 200
        data = response.json()
        assert float(data["weight_kg"]) == sample_growth_data["weight_kg"]
        assert float(data["height_cm"]) == sample_growth_data["height_cm"]

    def test_get_growth_records(self, client, auth_headers, sample_baby_data, sample_growth_data):
        """Should get growth records for a baby."""
        # Create baby and growth record
        baby_response = client.post("/babies/", json=sample_baby_data, headers=auth_headers)
        baby_id = baby_response.json()["id"]

        growth_data = {**sample_growth_data, "baby_id": baby_id}
        client.post("/health/growth/", json=growth_data, headers=auth_headers)

        response = client.get(f"/health/growth/?baby_id={baby_id}", headers=auth_headers)
        assert response.status_code == 200
        assert len(response.json()) == 1


class TestActivityValidation:
    """Test input validation for new activity types."""

    def test_invalid_potty_result(self, client, auth_headers, sample_baby_data):
        """Should reject invalid potty result."""
        baby_response = client.post("/babies/", json=sample_baby_data, headers=auth_headers)
        baby_id = baby_response.json()["id"]

        invalid_potty = {
            "baby_id": baby_id,
            "time": "2024-06-15T09:00:00Z",
            "result": "invalid_result"  # Not in enum
        }
        response = client.post("/activities/potty/", json=invalid_potty, headers=auth_headers)
        assert response.status_code == 422  # Validation error
