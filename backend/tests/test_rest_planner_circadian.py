"""
Tests for the circadian-aware sleep prediction helpers.

Covers:
- Bucketed wake-window benchmarks (day / evening / night)
- learn_day_night_boundaries: recovers bedtime/wake from history
- classify_wake_bucket: 24h-aware classification
- bayesian_wake_window with bucket filter
- extract_bucketed_wake_durations
- recovery_fraction + effective_pressure_after_sleep (short sleeps don't reset)
- compute_current_effective_pressure (full walk with partial discharge)
- Circadian gate cyclical lookup (next gate from late evening should wrap)
"""

from datetime import UTC, datetime

import pytest

from app.benchmarks import (
    get_wake_window_benchmarks,
    restorative_minutes_for_age,
)
from app.routers.rest_planner import (
    _circular_median_hour,
    _hour_in_range,
    bayesian_wake_window,
    circadian_nearest_gate,
    circadian_score,
    classify_wake_bucket,
    compute_current_effective_pressure,
    effective_pressure_after_sleep,
    extract_bucketed_wake_durations,
    get_circadian_gates,
    learn_day_night_boundaries,
    recovery_fraction,
)


class _FakeSleep:
    """Minimal stand-in for the SQLAlchemy Sleep model used by helpers."""

    def __init__(self, start_iso: str, end_iso: str):
        self.start_time = datetime.fromisoformat(start_iso).replace(tzinfo=UTC)
        self.end_time = datetime.fromisoformat(end_iso).replace(tzinfo=UTC)
        self.duration_minutes = int(
            (self.end_time - self.start_time).total_seconds() / 60
        )


def _sample_sleeps_4mo() -> list[_FakeSleep]:
    """Realistic ~14 days of sleep for a 4-month-old (UTC, tz_offset=0)."""
    return [
        _FakeSleep("2026-04-21T01:21:00", "2026-04-21T07:37:00"),
        _FakeSleep("2026-04-20T21:55:00", "2026-04-20T22:35:00"),
        _FakeSleep("2026-04-20T16:57:00", "2026-04-20T19:27:00"),
        _FakeSleep("2026-04-20T14:22:00", "2026-04-20T15:12:00"),
        _FakeSleep("2026-04-20T09:11:00", "2026-04-20T12:38:00"),
        _FakeSleep("2026-04-20T02:05:00", "2026-04-20T08:56:00"),
        _FakeSleep("2026-04-19T19:04:00", "2026-04-19T21:15:00"),
        _FakeSleep("2026-04-19T16:30:00", "2026-04-19T17:12:00"),
        _FakeSleep("2026-04-19T13:52:00", "2026-04-19T14:34:00"),
        _FakeSleep("2026-04-19T06:54:00", "2026-04-19T11:31:00"),
        _FakeSleep("2026-04-19T01:55:00", "2026-04-19T06:39:00"),
        _FakeSleep("2026-04-18T20:21:00", "2026-04-18T20:51:00"),
        _FakeSleep("2026-04-18T15:11:00", "2026-04-18T15:55:00"),
        _FakeSleep("2026-04-18T12:40:00", "2026-04-18T13:24:00"),
        _FakeSleep("2026-04-18T09:22:00", "2026-04-18T10:59:00"),
        _FakeSleep("2026-04-18T05:09:00", "2026-04-18T08:52:00"),
        _FakeSleep("2026-04-18T01:18:00", "2026-04-18T04:56:00"),
        _FakeSleep("2026-04-17T22:53:00", "2026-04-17T23:20:00"),
        _FakeSleep("2026-04-17T19:28:00", "2026-04-17T19:56:00"),
        _FakeSleep("2026-04-17T16:38:00", "2026-04-17T18:27:00"),
        _FakeSleep("2026-04-17T07:29:00", "2026-04-17T12:35:00"),
        _FakeSleep("2026-04-17T02:20:00", "2026-04-17T06:46:00"),
        _FakeSleep("2026-04-16T20:53:00", "2026-04-16T21:42:00"),
        _FakeSleep("2026-04-16T16:42:00", "2026-04-16T19:01:00"),
        _FakeSleep("2026-04-16T13:18:00", "2026-04-16T13:54:00"),
        _FakeSleep("2026-04-16T07:42:00", "2026-04-16T11:33:00"),
        _FakeSleep("2026-04-16T01:20:00", "2026-04-16T07:08:00"),
    ]


# =============================================================================
# Bucketed wake-window benchmarks
# =============================================================================


class TestBucketedWakeWindowBenchmarks:
    def test_flat_shape_unchanged_for_backwards_compat(self):
        bm = get_wake_window_benchmarks(16)
        assert "min_minutes" in bm
        assert "optimal_minutes" in bm
        assert "max_minutes" in bm
        assert "bucket" not in bm  # only present when bucket arg given

    def test_day_bucket_4mo_matches_real_world(self):
        bm = get_wake_window_benchmarks(16, "day")
        assert bm["bucket"] == "day"
        # 4mo daytime wake windows: ~90-120min
        assert 75 <= bm["min_minutes"] <= 105
        assert 90 <= bm["optimal_minutes"] <= 120
        assert 120 <= bm["max_minutes"] <= 150

    def test_evening_bucket_longer_than_day(self):
        day = get_wake_window_benchmarks(16, "day")
        evening = get_wake_window_benchmarks(16, "evening")
        assert evening["optimal_minutes"] > day["optimal_minutes"]

    def test_night_bucket_much_shorter(self):
        night = get_wake_window_benchmarks(16, "night")
        day = get_wake_window_benchmarks(16, "day")
        # Night wake windows should be a fraction of daytime
        assert night["optimal_minutes"] < day["optimal_minutes"] / 3
        assert night["min_minutes"] == 0  # no minimum at night


class TestRestorativeMinutes:
    def test_increases_with_age(self):
        assert restorative_minutes_for_age(4) <= restorative_minutes_for_age(16)
        assert restorative_minutes_for_age(16) <= restorative_minutes_for_age(52)
        assert restorative_minutes_for_age(52) <= restorative_minutes_for_age(200)

    def test_4mo_is_roughly_one_sleep_cycle(self):
        # A 4-month-old's sleep cycle is ~45 min
        assert 30 <= restorative_minutes_for_age(16) <= 60


# =============================================================================
# Day / Night Boundary Learning
# =============================================================================


class TestLearnDayNightBoundaries:
    def test_falls_back_to_age_default_with_no_data(self):
        b = learn_day_night_boundaries([], tz_offset=0, age_weeks=16)
        assert b["learned"] is False
        assert 18.0 <= b["bedtime_hour"] <= 22.0
        assert 5.0 <= b["morning_wake_hour"] <= 8.0

    def test_learns_from_real_4mo_data(self):
        sleeps = _sample_sleeps_4mo()
        now = datetime(2026, 4, 21, 12, 0, 0, tzinfo=UTC)
        b = learn_day_night_boundaries(sleeps, tz_offset=0, age_weeks=16, now=now)
        # The sample data shows a 4mo whose longest consolidated night sleep
        # starts in the late evening / early morning range.
        assert b["learned"] is True
        bed = b["bedtime_hour"]
        # Accept either late-evening (20-23) or early-morning (00-04) start
        assert (20.0 <= bed <= 23.99) or (0.0 <= bed <= 4.0)
        assert 5.5 <= b["morning_wake_hour"] <= 9.0
        assert "evening_start" in b


class TestClassifyWakeBucket:
    def setup_method(self):
        self.boundaries = {
            "bedtime_hour": 21.0,
            "morning_wake_hour": 7.0,
            "evening_start": 19.0,
        }

    def test_morning_is_day(self):
        dt = datetime(2026, 4, 21, 9, 0)
        assert classify_wake_bucket(dt, self.boundaries) == "day"

    def test_afternoon_is_day(self):
        dt = datetime(2026, 4, 21, 15, 0)
        assert classify_wake_bucket(dt, self.boundaries) == "day"

    def test_late_evening_is_evening(self):
        dt = datetime(2026, 4, 21, 20, 0)
        assert classify_wake_bucket(dt, self.boundaries) == "evening"

    def test_after_bedtime_is_night(self):
        dt = datetime(2026, 4, 21, 23, 30)
        assert classify_wake_bucket(dt, self.boundaries) == "night"

    def test_three_am_is_night(self):
        dt = datetime(2026, 4, 21, 3, 0)
        assert classify_wake_bucket(dt, self.boundaries) == "night"

    def test_just_before_morning_wake_is_night(self):
        dt = datetime(2026, 4, 21, 6, 30)
        assert classify_wake_bucket(dt, self.boundaries) == "night"

    def test_right_at_morning_wake_is_day(self):
        dt = datetime(2026, 4, 21, 7, 30)
        assert classify_wake_bucket(dt, self.boundaries) == "day"


# =============================================================================
# Bucketed Bayesian Wake Windows
# =============================================================================


class TestBayesianWakeWindowBuckets:
    def test_falls_back_to_prior_with_no_data(self):
        mean_day, _ = bayesian_wake_window([], [], 16, bucket="day")
        # Should equal the day-bucket optimal benchmark
        bm = get_wake_window_benchmarks(16, "day")
        assert mean_day == bm["optimal_minutes"]

    def test_night_prior_is_short(self):
        mean_night, _ = bayesian_wake_window([], [], 16, bucket="night")
        assert mean_night < 30.0  # night prior should be a few minutes

    def test_observation_pulls_posterior_toward_data(self):
        # Strong evidence of 100-min daytime windows should pull posterior
        # below the 105-min prior toward the observed mean.
        durations = [95, 100, 105, 100, 95, 100] * 3
        weights = [1.0] * len(durations)
        mean, std = bayesian_wake_window(durations, weights, 16, bucket="day")
        assert 95 < mean < 110
        assert std < 30


# =============================================================================
# Bucketed Wake-Duration Extraction
# =============================================================================


class TestExtractBucketedWakeDurations:
    def test_separates_day_from_night_correctly(self):
        sleeps = _sample_sleeps_4mo()
        boundaries = {
            "bedtime_hour": 21.0,
            "morning_wake_hour": 7.0,
            "evening_start": 19.0,
        }
        now = datetime(2026, 4, 21, 12, 0, 0, tzinfo=UTC)
        out = extract_bucketed_wake_durations(sleeps, boundaries, tz_offset=0, now=now)

        assert "day" in out and "evening" in out and "night" in out
        # All buckets should have parallel-length lists
        for b in ("day", "evening", "night"):
            assert len(out[b]["durations"]) == len(out[b]["weights"])
            assert len(out[b]["durations"]) == len(out[b]["timestamps"])

        # Daytime bucket should have the most samples for this dataset
        assert len(out["day"]["durations"]) >= len(out["night"]["durations"])

    def test_handles_empty_input(self):
        boundaries = {
            "bedtime_hour": 21.0,
            "morning_wake_hour": 7.0,
            "evening_start": 19.0,
        }
        out = extract_bucketed_wake_durations([], boundaries, tz_offset=0)
        for b in ("day", "evening", "night"):
            assert out[b]["durations"] == []


# =============================================================================
# Recovery Fraction & Effective Pressure
# =============================================================================


class TestRecoveryFraction:
    def test_zero_sleep_no_recovery(self):
        assert recovery_fraction(0, 16) == 0.0

    def test_negative_clamped(self):
        assert recovery_fraction(-10, 16) == 0.0

    def test_short_catnap_partial(self):
        rf = recovery_fraction(5, 16)
        assert 0.05 < rf < 0.20  # 5/45 ≈ 0.111

    def test_full_cycle_full_recovery(self):
        assert recovery_fraction(45, 16) == 1.0

    def test_long_sleep_caps_at_one(self):
        assert recovery_fraction(180, 16) == 1.0


class TestEffectivePressureAfterSleep:
    def test_full_recovery_zeroes_pressure(self):
        assert effective_pressure_after_sleep(0.8, 60, 16) == 0.0

    def test_short_sleep_partial_discharge(self):
        before = 0.7
        after = effective_pressure_after_sleep(before, 5, 16)
        # 5min @ 16w → recovery ≈ 0.111, so after ≈ 0.7 * 0.889 ≈ 0.622
        assert 0.55 < after < 0.65

    def test_zero_pressure_stays_zero(self):
        assert effective_pressure_after_sleep(0.0, 30, 16) == 0.0


class TestComputeCurrentEffectivePressure:
    def test_returns_zeros_with_no_sleeps(self):
        now = datetime(2026, 4, 21, 12, 0, 0, tzinfo=UTC)
        eff = compute_current_effective_pressure([], age_weeks=16, tau=140.0, now=now)
        assert eff["pressure"] == 0.0
        assert eff["effective_minutes_awake"] == 0.0
        assert eff["last_sleep_duration_min"] is None

    def test_full_night_sleep_resets(self):
        sleeps = [_FakeSleep("2026-04-21T01:00:00", "2026-04-21T07:00:00")]
        now = datetime(2026, 4, 21, 8, 0, 0, tzinfo=UTC)
        eff = compute_current_effective_pressure(sleeps, age_weeks=16, tau=140.0, now=now)
        # 6h sleep fully recovers, then 1h awake → moderate pressure
        assert eff["last_sleep_recovery_fraction"] == 1.0
        assert eff["wall_minutes_awake"] == 60.0
        assert 0.3 < eff["pressure"] < 0.5

    def test_short_catnap_doesnt_fully_reset(self):
        # 90min awake (high pressure), then a 5min catnap, then 15min more awake
        sleeps = [
            _FakeSleep("2026-04-21T07:00:00", "2026-04-21T08:30:00"),  # 90min sleep (1)
            _FakeSleep("2026-04-21T10:00:00", "2026-04-21T10:05:00"),  # 5min catnap
        ]
        now = datetime(2026, 4, 21, 10, 20, 0, tzinfo=UTC)
        eff = compute_current_effective_pressure(sleeps, age_weeks=16, tau=140.0, now=now)
        # The catnap only discharges ~11% of accumulated pressure
        assert eff["last_sleep_recovery_fraction"] < 0.2
        assert eff["last_sleep_duration_min"] == 5
        # Effective awake is greater than the 15min wall-clock awake since catnap
        assert eff["effective_minutes_awake"] > eff["wall_minutes_awake"]


# =============================================================================
# Circadian Gates (cyclical)
# =============================================================================


class TestCircadianCyclical:
    def test_nearest_gate_wraps_at_midnight(self):
        gates = get_circadian_gates(16)
        # From 22:00, the next gate should be the night-maintenance gate (02:00)
        # not jump back to 09:00 which would be 11h away.
        nearest = circadian_nearest_gate(22.0, gates)
        assert nearest is not None
        assert nearest[0] == 2.0

    def test_nearest_gate_morning(self):
        gates = get_circadian_gates(16)
        # From 03:00, next should be the morning gate (09:00)
        nearest = circadian_nearest_gate(3.0, gates)
        assert nearest is not None
        assert nearest[0] == 9.0

    def test_night_gate_has_high_score(self):
        gates = get_circadian_gates(16)
        # Score at 02:00 should be near 1.0 (right on the night gate)
        assert circadian_score(2.0, gates) > 0.8

    def test_bedtime_score_high(self):
        gates = get_circadian_gates(16)
        # Score at 19:30 should reflect the bedtime gate
        assert circadian_score(19.5, gates) > 0.7


class TestHourInRange:
    def test_normal_range(self):
        assert _hour_in_range(10.0, 8.0, 12.0) is True
        assert _hour_in_range(15.0, 8.0, 12.0) is False

    def test_wraps_midnight(self):
        # Night range 22:00 - 07:00 wraps over midnight
        assert _hour_in_range(2.0, 22.0, 7.0) is True
        assert _hour_in_range(23.0, 22.0, 7.0) is True
        assert _hour_in_range(10.0, 22.0, 7.0) is False
        assert _hour_in_range(22.0, 22.0, 7.0) is True


class TestCircularMedianHour:
    def test_simple_average(self):
        assert _circular_median_hour([10.0, 12.0, 14.0]) == pytest.approx(12.0, abs=0.5)

    def test_wraps_around_midnight(self):
        # 23, 0, 1 should average to 0 (midnight), not 8
        result = _circular_median_hour([23.0, 0.0, 1.0])
        assert result < 0.5 or result > 23.5

    def test_empty_returns_zero(self):
        assert _circular_median_hour([]) == 0.0
