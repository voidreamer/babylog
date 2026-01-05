"""
Tests for analytics and benchmarks functionality.
"""

import pytest
from datetime import datetime, timedelta, timezone, date
from app.benchmarks import (
    calculate_age_weeks,
    calculate_age_months,
    get_diaper_benchmarks,
    get_sleep_benchmarks,
    get_feeding_benchmarks,
    get_all_benchmarks,
)


class TestAgeCalculations:
    """Test age calculation functions."""
    
    def test_calculate_age_weeks_newborn(self):
        """Test age calculation for newborn (born today)."""
        today = date.today()
        assert calculate_age_weeks(today) == 0
    
    def test_calculate_age_weeks_one_week(self):
        """Test age calculation for 1 week old."""
        one_week_ago = date.today() - timedelta(days=7)
        assert calculate_age_weeks(one_week_ago) == 1
    
    def test_calculate_age_weeks_partial_week(self):
        """Test that partial weeks are floored."""
        ten_days_ago = date.today() - timedelta(days=10)
        assert calculate_age_weeks(ten_days_ago) == 1  # 10 days = 1 full week
    
    def test_calculate_age_months(self):
        """Test age in months calculation."""
        sixty_days_ago = date.today() - timedelta(days=60)
        age = calculate_age_months(sixty_days_ago)
        assert 1.9 < age < 2.1  # Approximately 2 months


class TestDiaperBenchmarks:
    """Test diaper benchmark functions."""
    
    def test_newborn_diaper_benchmarks(self):
        """Test diaper benchmarks for newborn (1 week)."""
        benchmarks = get_diaper_benchmarks(1)
        assert benchmarks["expected_wet_diapers"]["min"] >= 1
        assert benchmarks["expected_wet_diapers"]["max"] >= benchmarks["expected_wet_diapers"]["min"]
        assert "notes" in benchmarks
    
    def test_two_week_old_benchmarks(self):
        """Test that 2 week old gets higher diaper expectations."""
        benchmarks = get_diaper_benchmarks(2)
        assert benchmarks["expected_wet_diapers"]["min"] >= 5
    
    def test_older_baby_benchmarks(self):
        """Test benchmarks for 6 month old (26 weeks)."""
        benchmarks = get_diaper_benchmarks(26)
        assert benchmarks["expected_wet_diapers"]["min"] > 0
        assert benchmarks["expected_dirty_diapers"]["min"] >= 1


class TestSleepBenchmarks:
    """Test sleep benchmark functions."""
    
    def test_newborn_sleep_benchmarks(self):
        """Newborns should need 16-18 hours of sleep."""
        benchmarks = get_sleep_benchmarks(1)
        assert benchmarks["expected_total_sleep_hours"]["min"] >= 16
        assert benchmarks["expected_total_sleep_hours"]["max"] <= 18
    
    def test_older_baby_needs_less_sleep(self):
        """Older babies need less total sleep."""
        newborn = get_sleep_benchmarks(1)
        six_month = get_sleep_benchmarks(26)
        assert six_month["expected_total_sleep_hours"]["min"] < newborn["expected_total_sleep_hours"]["min"]
    
    def test_naps_decrease_with_age(self):
        """Expected naps per day decrease as baby ages."""
        newborn = get_sleep_benchmarks(1)
        toddler = get_sleep_benchmarks(100)
        assert toddler["expected_naps_per_day"]["max"] < newborn["expected_naps_per_day"]["max"]


class TestFeedingBenchmarks:
    """Test feeding benchmark functions."""
    
    def test_newborn_feeding_frequency(self):
        """Newborns should feed 8-12 times per day."""
        benchmarks = get_feeding_benchmarks(1)
        assert benchmarks["expected_feeds_per_day"]["min"] >= 8
        assert benchmarks["expected_feeds_per_day"]["max"] <= 12
    
    def test_feeding_interval_increases_with_age(self):
        """Older babies can go longer between feeds."""
        newborn = get_feeding_benchmarks(1)
        six_month = get_feeding_benchmarks(26)
        assert six_month["expected_interval_hours"]["min"] > newborn["expected_interval_hours"]["min"]


class TestAllBenchmarks:
    """Test combined benchmark function."""
    
    def test_all_benchmarks_with_valid_date(self):
        """Test getting all benchmarks for a valid birth date."""
        birth_date = date.today() - timedelta(days=14)  # 2 weeks old
        benchmarks = get_all_benchmarks(birth_date)
        
        assert benchmarks["age_weeks"] == 2
        assert "diapers" in benchmarks
        assert "sleep" in benchmarks
        assert "feeding" in benchmarks
    
    def test_all_benchmarks_without_date(self):
        """Test handling of missing birth date."""
        benchmarks = get_all_benchmarks(None)
        assert benchmarks["age_weeks"] is None
        assert "error" in benchmarks


# Analytics helper function tests
class TestAnalyticsHelpers:
    """Test analytics calculation helper functions."""
    
    def test_average_time_of_day(self):
        """Test calculation of average time from timestamps."""
        from app.routers.analytics import calculate_average_time_of_day
        
        # Morning times
        times = [
            datetime(2024, 1, 1, 7, 0, tzinfo=timezone.utc),
            datetime(2024, 1, 2, 7, 30, tzinfo=timezone.utc),
            datetime(2024, 1, 3, 8, 0, tzinfo=timezone.utc),
        ]
        result = calculate_average_time_of_day(times)
        assert result == "07:30" or result == "07:31"  # Account for rounding
    
    def test_average_time_empty_list(self):
        """Test handling of empty timestamp list."""
        from app.routers.analytics import calculate_average_time_of_day
        assert calculate_average_time_of_day([]) is None
    
    def test_average_interval(self):
        """Test calculation of average interval between events."""
        from app.routers.analytics import calculate_average_interval
        
        times = [
            datetime(2024, 1, 1, 8, 0, tzinfo=timezone.utc),
            datetime(2024, 1, 1, 11, 0, tzinfo=timezone.utc),  # 3 hours later
            datetime(2024, 1, 1, 14, 0, tzinfo=timezone.utc),  # 3 hours later
        ]
        result = calculate_average_interval(times)
        assert result == 3.0
    
    def test_average_interval_single_event(self):
        """Single event should return None."""
        from app.routers.analytics import calculate_average_interval
        times = [datetime(2024, 1, 1, 8, 0, tzinfo=timezone.utc)]
        assert calculate_average_interval(times) is None
    
    def test_predict_next_event(self):
        """Test prediction of next event."""
        from app.routers.analytics import predict_next_event
        
        now = datetime.now(timezone.utc)
        times = [now - timedelta(hours=3)]
        
        prediction = predict_next_event(times, avg_interval_hours=3.0)
        assert prediction is not None
        assert "time" in prediction
        assert "in_minutes" in prediction
