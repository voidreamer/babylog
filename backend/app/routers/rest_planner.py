"""
Rest Planner router — predicts parent rest windows based on baby sleep/feeding patterns.

Uses science-backed models:
1. EWMA recency weighting (recent naps weighted more)
2. Bayesian adaptive wake windows (personalized from benchmark priors)
3. Borbély Process S (homeostatic sleep pressure curve)
4. Circadian sleep gate alignment (age-appropriate biological windows)
5. Feeding-sleep correlation
6. Multi-signal fusion with data-quality-based weights
"""

import math
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, Query, Request
from sqlalchemy.orm import Session

from ..auth import get_current_user, get_user_email
from ..benchmarks import (
    calculate_age_weeks,
    get_wake_window_benchmarks,
    restorative_minutes_for_age,
)
from ..database import get_db
from ..logging_config import get_logger
from ..models import Feeding, Sleep
from ..predictions import calculate_sleep_pressure, calculate_standard_deviation, make_aware
from ..rate_limit import RATE_READ, limiter
from .utils import verify_baby_access

router = APIRouter(prefix="/rest-planner", tags=["rest-planner"])
logger = get_logger(__name__)

# =============================================================================
# Constants
# =============================================================================

EWMA_DECAY = 0.85
PRESSURE_THRESHOLD = 0.65
DEFAULT_TAU_MINUTES = 150.0

# Circadian gates: (hour_of_day_local, strength). Now includes bedtime and a
# wide-kernel night-maintenance gate so propensity stays high through the night.
CIRCADIAN_GATES: dict[tuple[int, int], list[tuple[float, float]]] = {
    (0, 12): [
        (9.0, 0.5),
        (12.5, 0.6),
        (15.5, 0.4),
        (20.0, 0.85),  # bedtime (younger babies sleep earlier-ish but unconsolidated)
        (2.0, 0.95),  # night maintenance
    ],
    (12, 26): [
        (9.0, 0.7),
        (12.5, 0.9),
        (15.5, 0.6),
        (19.5, 0.95),  # bedtime
        (2.0, 1.0),  # night maintenance
    ],
    (26, 52): [
        (9.5, 0.8),
        (13.0, 0.9),
        (19.0, 0.95),  # bedtime
        (2.0, 1.0),  # night maintenance
    ],
    (52, 78): [
        (9.5, 0.7),
        (12.5, 0.8),
        (19.5, 0.9),
        (2.0, 1.0),
    ],
    (78, 999): [
        (13.0, 0.9),
        (20.0, 0.85),
        (2.0, 1.0),
    ],
}
CIRCADIAN_SIGMA = 1.0
# Wider Gaussian kernel for the night-maintenance gate so the high-propensity
# plateau covers the full overnight stretch rather than peaking sharply at 02:00.
CIRCADIAN_NIGHT_SIGMA = 3.0
NIGHT_GATE_HOUR = 2.0  # any gate at this hour is treated as "night" with a wider sigma

# Day/night boundary defaults (local hours) when not enough history exists.
# (age_weeks_max, bedtime_hour, morning_wake_hour)
DEFAULT_DAY_NIGHT_BOUNDARIES: list[tuple[int, float, float]] = [
    (12, 20.0, 7.0),
    (26, 19.5, 6.5),
    (52, 19.0, 6.5),
    (999, 19.5, 7.0),
]
# Minimum overnight sleep length (minutes) used to identify the "main night sleep"
# when learning per-baby bedtime / morning-wake.
NIGHT_SLEEP_MIN_DURATION = 180
LEARN_DAY_NIGHT_DAYS = 21
LEARN_DAY_NIGHT_MIN_SAMPLES = 5


# =============================================================================
# Pure Helper Functions (no DB access, independently testable)
# =============================================================================


def weighted_median(values: list[float], weights: list[float]) -> float:
    """Compute weighted median — robust central tendency."""
    if not values:
        return 0.0
    if len(values) == 1:
        return values[0]

    paired = sorted(zip(values, weights), key=lambda x: x[0])
    total_weight = sum(w for _, w in paired)
    if total_weight == 0:
        return values[0]

    cumulative = 0.0
    for val, w in paired:
        cumulative += w
        if cumulative >= total_weight / 2:
            return val
    return paired[-1][0]


def weighted_iqr(values: list[float], weights: list[float]) -> float:
    """Compute weighted IQR — robust spread estimate."""
    if len(values) < 4:
        return calculate_standard_deviation(values) if len(values) >= 2 else 0.0

    paired = sorted(zip(values, weights), key=lambda x: x[0])
    total_weight = sum(w for _, w in paired)
    if total_weight == 0:
        return 0.0

    cumulative = 0.0
    q1 = paired[0][0]
    q3 = paired[-1][0]

    for val, w in paired:
        cumulative += w
        if cumulative >= total_weight * 0.25 and q1 == paired[0][0]:
            q1 = val
        if cumulative >= total_weight * 0.75:
            q3 = val
            break

    return q3 - q1


def compute_ewma_weights(timestamps: list[datetime], now: datetime, decay: float = EWMA_DECAY) -> list[float]:
    """Compute recency weights: decay^days_ago for each timestamp."""
    weights = []
    for ts in timestamps:
        days_ago = max(0, (now - ts).total_seconds() / 86400)
        weights.append(decay**days_ago)
    return weights


def bayesian_wake_window(
    observed_wake_durations: list[float],
    weights: list[float],
    age_weeks: int,
    bucket: str | None = None,
) -> tuple[float, float]:
    """
    Bayesian Normal-Normal conjugate update for wake windows.

    Prior: N(benchmark_optimal, ((max-min)/4)^2) — uses the bucketed sub-window
    when `bucket` is provided so day/evening/night each get their own prior.
    Likelihood: EWMA-weighted observed wake durations
    Returns: (posterior_mean, posterior_std)
    """
    benchmarks = get_wake_window_benchmarks(age_weeks, bucket)
    prior_mean = benchmarks["optimal_minutes"]
    prior_std = (benchmarks["max_minutes"] - benchmarks["min_minutes"]) / 4.0
    if prior_std <= 0:
        prior_std = 30.0

    if not observed_wake_durations or not weights:
        return (prior_mean, prior_std)

    # Weighted mean and effective sample size
    total_w = sum(weights)
    if total_w == 0:
        return (prior_mean, prior_std)

    obs_mean = sum(v * w for v, w in zip(observed_wake_durations, weights)) / total_w
    n_eff = total_w  # effective sample count (sum of weights)

    # Estimate observation variance from weighted residuals
    if len(observed_wake_durations) >= 2:
        wss = sum(w * (v - obs_mean) ** 2 for v, w in zip(observed_wake_durations, weights))
        obs_var = wss / total_w
        obs_std = max(obs_var**0.5, 5.0)  # floor at 5 min
    else:
        obs_std = prior_std

    # Normal-Normal conjugate update
    prior_prec = 1.0 / (prior_std**2)
    obs_prec = n_eff / (obs_std**2)
    posterior_prec = prior_prec + obs_prec
    posterior_mean = (prior_prec * prior_mean + obs_prec * obs_mean) / posterior_prec
    posterior_std = (1.0 / posterior_prec) ** 0.5

    return (posterior_mean, posterior_std)


def estimate_tau(wake_durations: list[float]) -> float:
    """
    Estimate Process S time constant from observed wake-to-sleep durations.
    τ = -median_wake / ln(1 - threshold)
    """
    if not wake_durations:
        return DEFAULT_TAU_MINUTES

    sorted_d = sorted(wake_durations)
    n = len(sorted_d)
    median_wake = sorted_d[n // 2] if n % 2 == 1 else (sorted_d[n // 2 - 1] + sorted_d[n // 2]) / 2

    if median_wake <= 0:
        return DEFAULT_TAU_MINUTES

    denom = math.log(1.0 - PRESSURE_THRESHOLD)  # ln(0.35) ≈ -1.0498
    if denom == 0:
        return DEFAULT_TAU_MINUTES

    tau = -median_wake / denom
    return max(60.0, min(tau, 600.0))  # clamp to [60, 600] minutes


def sleep_pressure_at(minutes_awake: float, tau: float) -> float:
    """Evaluate Borbély Process S: S(t) = 1 - exp(-t/τ), returns 0-1."""
    if tau <= 0:
        tau = DEFAULT_TAU_MINUTES
    return 1.0 - math.exp(-minutes_awake / tau)


def minutes_until_pressure_threshold(
    current_awake_minutes: float, tau: float, threshold: float = PRESSURE_THRESHOLD
) -> float:
    """Predict minutes until sleep pressure reaches threshold."""
    if tau <= 0:
        tau = DEFAULT_TAU_MINUTES

    # Target time: t = -τ * ln(1 - threshold)
    target_minutes = -tau * math.log(1.0 - threshold)
    remaining = target_minutes - current_awake_minutes
    return max(0.0, remaining)


def get_circadian_gates(age_weeks: int) -> list[tuple[float, float]]:
    """Get age-appropriate circadian sleep gates as (hour, strength) tuples."""
    for (lo, hi), gates in CIRCADIAN_GATES.items():
        if lo <= age_weeks < hi:
            return gates
    # Very young babies (<3m): no strong circadian signal yet
    return [(9.0, 0.5), (12.5, 0.6), (15.5, 0.4)]


def _gate_sigma(gate_hour: float) -> float:
    """Use a wider kernel for the night-maintenance gate so propensity stays
    high across the overnight stretch (not just a sharp peak at 02:00)."""
    if abs(gate_hour - NIGHT_GATE_HOUR) < 0.5:
        return CIRCADIAN_NIGHT_SIGMA
    return CIRCADIAN_SIGMA


def circadian_score(hour: float, gates: list[tuple[float, float]]) -> float:
    """Compute circadian alignment score at a given hour (sum of Gaussian kernels).

    Hours are treated cyclically (24h) so gates near midnight don't get cut off.
    """
    total = 0.0
    for gate_hour, strength in gates:
        sigma = _gate_sigma(gate_hour)
        # Cyclical distance on a 24h clock
        diff = (hour - gate_hour) % 24
        if diff > 12:
            diff -= 24
        exponent = -0.5 * (diff / sigma) ** 2
        total += strength * math.exp(exponent)
    return total


def circadian_nearest_gate(current_hour: float, gates: list[tuple[float, float]]) -> tuple[float, float] | None:
    """Find the next future circadian gate from current_hour, considering the
    24h cycle so a gate at 02:00 can be 'next' from 22:00.
    """
    if not gates:
        return None
    best: tuple[float, float] | None = None
    best_delta = 25.0
    for h, s in gates:
        delta = (h - current_hour) % 24
        if delta == 0:
            delta = 24  # don't return current hour itself
        if delta < best_delta:
            best_delta = delta
            best = (h, s)
    return best


# =============================================================================
# Day / Night Boundary Learning
# =============================================================================


def _default_boundaries(age_weeks: int) -> tuple[float, float]:
    """Age-based fallback bedtime/morning-wake hours when data is sparse."""
    for max_w, bed, wake in DEFAULT_DAY_NIGHT_BOUNDARIES:
        if age_weeks <= max_w:
            return bed, wake
    return DEFAULT_DAY_NIGHT_BOUNDARIES[-1][1], DEFAULT_DAY_NIGHT_BOUNDARIES[-1][2]


def _circular_median_hour(hours: list[float]) -> float:
    """Median of hour-of-day values respecting 24h wrap (e.g. 23.5 and 0.5
    should average near midnight, not noon)."""
    if not hours:
        return 0.0
    if len(hours) == 1:
        return hours[0] % 24
    # Convert to unit-circle coordinates, average, convert back
    xs = [math.cos(2 * math.pi * h / 24) for h in hours]
    ys = [math.sin(2 * math.pi * h / 24) for h in hours]
    mx = sum(xs) / len(xs)
    my = sum(ys) / len(ys)
    angle = math.atan2(my, mx)
    h = (angle / (2 * math.pi)) * 24
    h = h % 24
    # Clamp 24.0 (possible from -0.0 % 24 float drift) into [0, 24)
    if h >= 24.0:
        h -= 24.0
    return h


def learn_day_night_boundaries(
    sleeps: list[Sleep],
    tz_offset: int,
    age_weeks: int,
    now: datetime | None = None,
) -> dict:
    """
    Learn the baby's bedtime and morning-wake hour from history.

    Strategy: pick the longest sleep starting between 18:00 and 03:00 local on
    each of the last LEARN_DAY_NIGHT_DAYS days as the "main night sleep".
    Median-aggregate its start hour (bedtime) and end hour (morning wake).
    Fall back to age defaults if fewer than LEARN_DAY_NIGHT_MIN_SAMPLES samples.
    """
    if now is None:
        now = datetime.now(UTC)

    cutoff = now - timedelta(days=LEARN_DAY_NIGHT_DAYS)

    # Group candidate "main night sleeps" by local calendar date of start
    by_date: dict = {}
    for s in sleeps:
        if not s.end_time or not s.duration_minutes:
            continue
        if s.duration_minutes < NIGHT_SLEEP_MIN_DURATION:
            continue
        st_utc = make_aware(s.start_time)
        if st_utc < cutoff:
            continue
        st_local = st_utc - timedelta(minutes=tz_offset)
        # Accept sleeps starting 18:00 - 03:59 local as candidate night sleeps
        if not (st_local.hour >= 18 or st_local.hour < 4):
            continue
        # Use the local date of the evening (so 01:30 belongs to previous day)
        date_key = (st_local - timedelta(hours=12)).date()
        existing = by_date.get(date_key)
        if existing is None or s.duration_minutes > existing.duration_minutes:
            by_date[date_key] = s

    bedtime_hours: list[float] = []
    wake_hours: list[float] = []
    for s in by_date.values():
        st_local = make_aware(s.start_time) - timedelta(minutes=tz_offset)
        et_local = make_aware(s.end_time) - timedelta(minutes=tz_offset)
        bedtime_hours.append(st_local.hour + st_local.minute / 60.0)
        wake_hours.append(et_local.hour + et_local.minute / 60.0)

    default_bed, default_wake = _default_boundaries(age_weeks)
    if len(bedtime_hours) >= LEARN_DAY_NIGHT_MIN_SAMPLES:
        bedtime_hour = _circular_median_hour(bedtime_hours)
        morning_wake_hour = _circular_median_hour(wake_hours)
        learned = True
    else:
        bedtime_hour = default_bed
        morning_wake_hour = default_wake
        learned = False

    # Normalize hours to [0, 24)
    bedtime_hour = bedtime_hour % 24
    morning_wake_hour = morning_wake_hour % 24
    if bedtime_hour >= 24.0:
        bedtime_hour -= 24.0
    if morning_wake_hour >= 24.0:
        morning_wake_hour -= 24.0

    # Evening starts ~2h before bedtime; floor at 16:00 to avoid degenerate windows
    evening_start = max(16.0, bedtime_hour - 2.0) if bedtime_hour >= 18.0 else 16.0

    return {
        "bedtime_hour": round(bedtime_hour, 2),
        "morning_wake_hour": round(morning_wake_hour, 2),
        "evening_start": round(evening_start, 2),
        "samples": len(bedtime_hours),
        "learned": learned,
    }


def _hour_in_range(h: float, lo: float, hi: float) -> bool:
    """True if hour h is in [lo, hi) on a 24h clock, supporting wrap."""
    if lo <= hi:
        return lo <= h < hi
    return h >= lo or h < hi


def classify_wake_bucket(local_dt: datetime, boundaries: dict) -> str:
    """Return 'day' | 'evening' | 'night' for a local datetime."""
    h = local_dt.hour + local_dt.minute / 60.0
    morning = boundaries["morning_wake_hour"]
    evening = boundaries["evening_start"]
    bedtime = boundaries["bedtime_hour"]
    # Night: from bedtime through morning wake
    if _hour_in_range(h, bedtime, morning):
        return "night"
    # Evening: from evening_start to bedtime
    if _hour_in_range(h, evening, bedtime):
        return "evening"
    return "day"


# =============================================================================
# Partial Pressure Discharge for Short Sleeps
# =============================================================================


def recovery_fraction(sleep_duration_min: float, age_weeks: int) -> float:
    """
    Fraction of sleep pressure discharged by a sleep of the given duration.

    A "restorative" sleep of one age-appropriate cycle (~45 min for a 4mo)
    fully resets pressure. Anything shorter discharges proportionally.
    Clamped to [0, 1].
    """
    if sleep_duration_min <= 0:
        return 0.0
    restorative = max(1, restorative_minutes_for_age(age_weeks))
    return min(1.0, sleep_duration_min / restorative)


def effective_pressure_after_sleep(pressure_before: float, sleep_duration_min: float, age_weeks: int) -> float:
    """Pressure remaining after a sleep of the given duration."""
    rf = recovery_fraction(sleep_duration_min, age_weeks)
    return max(0.0, pressure_before * (1.0 - rf))


def compute_current_effective_pressure(
    sleeps: list[Sleep],
    age_weeks: int,
    tau: float,
    now: datetime,
) -> dict:
    """
    Walk all completed sleeps in chronological order, accumulating pressure
    during wake and discharging it partially during each sleep, then add wake
    accumulation since the last wake.

    Returns:
        {
            "pressure": float in [0, 1],
            "effective_minutes_awake": float,
            "wall_minutes_awake": float,
            "last_sleep_recovery_fraction": float,
            "last_sleep_duration_min": float | None,
        }
    """
    sorted_sleeps = sorted(
        [s for s in sleeps if s.start_time and s.end_time and s.duration_minutes],
        key=lambda s: make_aware(s.start_time),
    )

    if not sorted_sleeps:
        return {
            "pressure": 0.0,
            "effective_minutes_awake": 0.0,
            "wall_minutes_awake": 0.0,
            "last_sleep_recovery_fraction": 1.0,
            "last_sleep_duration_min": None,
        }

    pressure = 0.0
    last_wake: datetime | None = None
    last_sleep_dur: float | None = None
    last_recovery: float = 1.0

    for s in sorted_sleeps:
        st = make_aware(s.start_time)
        et = make_aware(s.end_time)
        if last_wake is not None and st > last_wake:
            wake_min = (st - last_wake).total_seconds() / 60.0
            pressure = sleep_pressure_at(_pressure_to_minutes(pressure, tau) + wake_min, tau)
        # Discharge during this sleep
        dur = float(s.duration_minutes)
        last_sleep_dur = dur
        last_recovery = recovery_fraction(dur, age_weeks)
        pressure = effective_pressure_after_sleep(pressure, dur, age_weeks)
        last_wake = et

    # Wake stretch from last wake until now
    wall_minutes_awake = 0.0
    if last_wake is not None and now > last_wake:
        wall_minutes_awake = (now - last_wake).total_seconds() / 60.0
        pressure = sleep_pressure_at(_pressure_to_minutes(pressure, tau) + wall_minutes_awake, tau)

    eff_awake = _pressure_to_minutes(pressure, tau)
    return {
        "pressure": round(pressure, 4),
        "effective_minutes_awake": round(eff_awake, 1),
        "wall_minutes_awake": round(wall_minutes_awake, 1),
        "last_sleep_recovery_fraction": round(last_recovery, 3),
        "last_sleep_duration_min": last_sleep_dur,
    }


def _pressure_to_minutes(pressure: float, tau: float) -> float:
    """Inverse of Process S: minutes_awake = -tau * ln(1 - pressure)."""
    p = max(0.0, min(0.999, pressure))
    return -tau * math.log(1.0 - p)


def compute_feed_to_sleep_interval(sleeps: list, feedings: list, tz_offset: int) -> float | None:
    """
    Compute median minutes from last feeding to sleep onset.
    Returns None if insufficient data.
    """
    if not sleeps or not feedings:
        return None

    feeding_times_sorted = sorted([make_aware(f.time) for f in feedings])
    if not feeding_times_sorted:
        return None

    intervals = []
    for s in sleeps:
        if not s.end_time or not s.duration_minutes:
            continue
        if s.duration_minutes >= 180:
            continue

        sleep_start = make_aware(s.start_time)
        # Find the most recent feeding before this sleep
        last_feed_before = None
        for ft in reversed(feeding_times_sorted):
            if ft <= sleep_start:
                last_feed_before = ft
                break
        if last_feed_before:
            diff = (sleep_start - last_feed_before).total_seconds() / 60
            if 0 < diff < 480:  # reasonable range
                intervals.append(diff)

    if len(intervals) < 3:
        return None

    intervals.sort()
    n = len(intervals)
    return intervals[n // 2]


def fuse_predictions(
    pattern_time: datetime | None,
    pressure_time: datetime | None,
    circadian_time: datetime | None,
    feeding_time: datetime | None,
    data_quality: float,
    now: datetime,
) -> tuple[datetime, dict]:
    """
    Multi-signal fusion with data-quality-based weights.
    Returns (predicted_start, signals_dict).
    """
    signals = {}
    weighted_sum = 0.0
    weight_total = 0.0

    candidates = [
        ("pattern", pattern_time, 0.40 * data_quality),
        ("pressure", pressure_time, 0.30 * data_quality),
        ("circadian", circadian_time, 0.20 * 1.0),  # always available
        ("feeding", feeding_time, 0.10 * data_quality),
    ]

    for name, pred, weight in candidates:
        if pred is not None and weight > 0:
            offset = (pred - now).total_seconds()
            weighted_sum += weight * offset
            weight_total += weight
            signals[name] = {
                "time": pred.isoformat(),
                "weight": round(weight, 3),
            }

    if weight_total > 0:
        fused_offset = weighted_sum / weight_total
        fused_time = now + timedelta(seconds=fused_offset)
    else:
        # Fallback: 2 hours from now
        fused_time = now + timedelta(hours=2)

    return (fused_time, signals)


def compute_prediction_interval(posterior_std: float, signals: dict, now: datetime) -> tuple[datetime, datetime]:
    """
    Compute earliest/latest prediction from posterior uncertainty + signal spread.
    """
    # Base uncertainty from Bayesian posterior (in minutes)
    half_range = max(10.0, posterior_std * 1.2)

    # Add signal disagreement
    if len(signals) >= 2:
        times = []
        for sig in signals.values():
            if "time" in sig:
                t = datetime.fromisoformat(sig["time"])
                times.append((t - now).total_seconds() / 60)
        if len(times) >= 2:
            spread = max(times) - min(times)
            half_range = max(half_range, spread / 2)

    half_range = min(half_range, 60.0)  # cap at ±60 minutes

    center_offset = sum(
        (datetime.fromisoformat(s["time"]) - now).total_seconds() / 60 for s in signals.values() if "time" in s
    ) / max(1, len(signals))

    center = now + timedelta(minutes=center_offset)
    earliest = center - timedelta(minutes=half_range)
    latest = center + timedelta(minutes=half_range)

    return (earliest, latest)


def compute_confidence_score(
    sample_count: int,
    posterior_std: float,
    signal_agreement: float,
    iqr_minutes: float,
) -> int:
    """
    Compute numeric confidence 0-100 from multiple factors.
    """
    # Sample size factor (0-30 pts): diminishing returns above 10
    sample_factor = min(30, sample_count * 3)

    # Posterior precision factor (0-30 pts): tighter posterior = more confident
    precision_factor = max(0, 30 - int(posterior_std / 3))

    # Signal agreement factor (0-25 pts): signals agreeing = more confident
    agreement_factor = max(0, int(signal_agreement * 25))

    # Consistency factor (0-15 pts): low IQR = consistent pattern
    if iqr_minutes > 0:
        consistency_factor = max(0, 15 - int(iqr_minutes / 10))
    else:
        consistency_factor = 10

    score = sample_factor + precision_factor + agreement_factor + consistency_factor
    return max(5, min(100, score))


# =============================================================================
# Bucketed wake-duration extraction
# =============================================================================


def extract_bucketed_wake_durations(
    sleeps: list[Sleep],
    boundaries: dict,
    tz_offset: int,
    now: datetime | None = None,
) -> dict[str, dict]:
    """
    Walk consecutive completed sleeps and bucket the wake-to-sleep durations
    between them by the local time of the wake-up that started each stretch.

    Returns:
        {
            "day":     {"durations": [...], "weights": [...], "timestamps": [...]},
            "evening": {...},
            "night":   {...},
        }
    """
    if now is None:
        now = datetime.now(UTC)

    out: dict[str, dict] = {
        "day": {"durations": [], "weights": [], "timestamps": []},
        "evening": {"durations": [], "weights": [], "timestamps": []},
        "night": {"durations": [], "weights": [], "timestamps": []},
    }

    sorted_sleeps = sorted(
        [s for s in sleeps if s.end_time and s.start_time],
        key=lambda s: make_aware(s.start_time),
    )
    if len(sorted_sleeps) < 2:
        return out

    # Build raw (wake_end_utc, wake_minutes, bucket) tuples first, then weight
    raw: list[tuple[datetime, float, str]] = []
    for i in range(1, len(sorted_sleeps)):
        prev = sorted_sleeps[i - 1]
        curr = sorted_sleeps[i]
        wake_end_utc = make_aware(prev.end_time)
        next_start_utc = make_aware(curr.start_time)
        wake_min = (next_start_utc - wake_end_utc).total_seconds() / 60.0
        # Allow short wakes (down to 1 minute) — we WANT to learn the night
        # back-to-sleep stretches that the old code filtered out.
        if not (1 <= wake_min <= 720):
            continue
        wake_end_local = wake_end_utc - timedelta(minutes=tz_offset)
        bucket = classify_wake_bucket(wake_end_local, boundaries)
        raw.append((wake_end_utc, wake_min, bucket))

    if not raw:
        return out

    timestamps = [t for t, _, _ in raw]
    weights = compute_ewma_weights(timestamps, now)
    for (ts, wm, bucket), w in zip(raw, weights):
        out[bucket]["durations"].append(wm)
        out[bucket]["weights"].append(w)
        out[bucket]["timestamps"].append(ts)

    return out


# =============================================================================
# Nap Clustering (updated with EWMA + robust stats)
# =============================================================================


def cluster_naps(sleeps: list[Sleep], tz_offset: int, now: datetime | None = None) -> dict[str, dict]:
    """
    Group historical daytime naps into morning/midday/afternoon clusters.
    Uses EWMA weights and weighted median/IQR for robustness.

    Returns dict keyed by cluster name with avg_start_minutes, avg_duration,
    std_dev_start, count (backward compat), plus new median/iqr fields.
    """
    if now is None:
        now = datetime.now(UTC)

    clusters: dict[str, list[dict]] = {
        "morning": [],  # 6:00-10:00
        "midday": [],  # 10:00-14:00
        "afternoon": [],  # 14:00-18:00
    }

    for s in sleeps:
        if not s.end_time or not s.duration_minutes:
            continue
        duration = s.duration_minutes
        if duration >= 180:
            continue  # skip overnight sleeps

        st = make_aware(s.start_time) - timedelta(minutes=tz_offset)
        hour = st.hour

        if 6 <= hour < 10:
            bucket = "morning"
        elif 10 <= hour < 14:
            bucket = "midday"
        elif 14 <= hour < 18:
            bucket = "afternoon"
        else:
            continue  # skip nighttime

        minutes_from_midnight = st.hour * 60 + st.minute
        clusters[bucket].append(
            {
                "start_minutes": minutes_from_midnight,
                "duration": duration,
                "timestamp": make_aware(s.start_time),
            }
        )

    result = {}
    for name, naps in clusters.items():
        if len(naps) < 2:
            continue

        starts = [n["start_minutes"] for n in naps]
        durations = [n["duration"] for n in naps]
        timestamps = [n["timestamp"] for n in naps]

        # EWMA weights
        weights = compute_ewma_weights(timestamps, now)

        result[name] = {
            # Backward compat fields
            "avg_start_minutes": sum(starts) / len(starts),
            "avg_duration": sum(durations) / len(durations),
            "std_dev_start": calculate_standard_deviation(starts),
            "count": len(naps),
            # New robust fields
            "median_start_minutes": weighted_median(starts, weights),
            "iqr_start": weighted_iqr(starts, weights),
            "median_duration": weighted_median(durations, weights),
            "iqr_duration": weighted_iqr(durations, weights),
        }
    return result


# =============================================================================
# Rest Window Projection (updated with multi-signal fusion)
# =============================================================================


def project_rest_windows(
    last_wake_time: datetime | None,
    active_sleep: Sleep | None,
    nap_clusters: dict[str, dict],
    wake_window_minutes: float,
    wake_window_std: float,
    avg_nap_duration: float,
    feeding_times: list[datetime],
    avg_feeding_interval_minutes: float | None,
    tau_minutes: float,
    circadian_gates_list: list[tuple[float, float]],
    feed_to_sleep_minutes: float | None,
    tz_offset: int,
    now: datetime,
    boundaries: dict | None = None,
    bucketed_windows: dict[str, tuple[float, float]] | None = None,
    night_sleep_duration: float | None = None,
) -> list[dict]:
    """
    Chain forward from last wake time to project today's remaining rest windows.
    Uses multi-signal fusion for each predicted nap.

    When `boundaries` and `bucketed_windows` are provided, each chained step
    picks the wake window matching the cursor's bucket (day / evening / night)
    rather than using a single global average.
    """
    windows = []
    local_now = now - timedelta(minutes=tz_offset)
    # Bedtime cutoff for the chain — anchor on the learned bedtime hour when
    # available, otherwise fall back to 20:00 local.
    if boundaries:
        bedtime_h = boundaries["bedtime_hour"] % 24
        bedtime_hour_int = min(23, int(bedtime_h))
        bedtime_minute_int = min(59, int((bedtime_h % 1) * 60))
        bedtime_local = local_now.replace(
            hour=bedtime_hour_int,
            minute=bedtime_minute_int,
            second=0,
            microsecond=0,
        )
        # If now is already past today's bedtime, push bedtime to "today" still
        # (chain might still emit a window stretching into tomorrow).
    else:
        bedtime_local = local_now.replace(hour=20, minute=0, second=0, microsecond=0)
    bedtime_utc = bedtime_local + timedelta(minutes=tz_offset)

    # If baby is currently sleeping, add a "rest now" window
    if active_sleep:
        sleep_start = make_aware(active_sleep.start_time)
        elapsed = (now - sleep_start).total_seconds() / 60
        predicted_remaining = max(0, avg_nap_duration - elapsed)
        predicted_end = now + timedelta(minutes=predicted_remaining)

        pressure_val = sleep_pressure_at(
            max(0, (sleep_start - (last_wake_time or sleep_start)).total_seconds() / 60),
            tau_minutes,
        )

        windows.append(
            {
                "start": sleep_start.isoformat(),
                "end": predicted_end.isoformat(),
                "duration_minutes": round(predicted_remaining),
                "label": "current_nap",
                "is_current": True,
                "sleep_pressure_at_start": round(pressure_val, 2),
            }
        )
        # After this nap, chain forward
        chain_start = predicted_end
    elif last_wake_time:
        chain_start = last_wake_time
    else:
        return windows

    # Chain forward: wake window → nap → wake window → nap ...
    cursor = chain_start
    max_iterations = 6
    for _ in range(max_iterations):
        # Pick bucket-appropriate wake window for this step
        cursor_local_for_bucket = cursor - timedelta(minutes=tz_offset)
        if boundaries and bucketed_windows:
            cursor_bucket = classify_wake_bucket(cursor_local_for_bucket, boundaries)
            ww_mean, ww_std = bucketed_windows.get(cursor_bucket, (wake_window_minutes, wake_window_std))
        else:
            cursor_bucket = "day"
            ww_mean, ww_std = wake_window_minutes, wake_window_std

        # --- Signal 1: Pattern-based prediction ---
        pattern_pred = cursor + timedelta(minutes=ww_mean)

        # --- Signal 2: Sleep pressure prediction ---
        (cursor - (last_wake_time or cursor)).total_seconds() / 60
        # For chained naps, cursor IS the wake time from previous nap
        mins_pressure = minutes_until_pressure_threshold(0, tau_minutes)
        pressure_pred = cursor + timedelta(minutes=mins_pressure)

        # --- Signal 3: Circadian prediction ---
        cursor_local = cursor - timedelta(minutes=tz_offset)
        cursor_hour = cursor_local.hour + cursor_local.minute / 60.0
        nearest = circadian_nearest_gate(cursor_hour, circadian_gates_list)
        if nearest:
            gate_hour, gate_strength = nearest
            gh = gate_hour % 24
            gh_int = min(23, int(gh))
            gh_min = min(59, int((gh % 1) * 60))
            # Compute the next future gate datetime, allowing wrap to tomorrow
            # (e.g. cursor at 22:00 looking for the 02:00 night gate).
            gate_local = cursor_local.replace(
                hour=gh_int,
                minute=gh_min,
                second=0,
                microsecond=0,
            )
            if gate_local <= cursor_local:
                gate_local = gate_local + timedelta(days=1)
            circadian_pred = gate_local + timedelta(minutes=tz_offset)
        else:
            circadian_pred = None

        # --- Signal 4: Feeding-based prediction ---
        feeding_pred = None
        if feed_to_sleep_minutes and feeding_times:
            last_feed = max(make_aware(ft) for ft in feeding_times)
            if last_feed > cursor - timedelta(hours=6):
                feeding_pred = last_feed + timedelta(minutes=feed_to_sleep_minutes)
                if feeding_pred < cursor:
                    feeding_pred = None

        # --- Data quality estimate ---
        total_cluster_samples = sum(c.get("count", 0) for c in nap_clusters.values())
        data_quality = min(1.0, total_cluster_samples / 15.0)

        # --- Fuse predictions ---
        fused_time, signals = fuse_predictions(
            pattern_time=pattern_pred,
            pressure_time=pressure_pred,
            circadian_time=circadian_pred,
            feeding_time=feeding_pred,
            data_quality=data_quality,
            now=now,
        )

        next_nap_start = fused_time
        # If predicted sleep would land on/after bedtime, emit a single bedtime
        # window using learned night-sleep duration (or fallback) and stop.
        if next_nap_start >= bedtime_utc:
            bedtime_dur = night_sleep_duration if night_sleep_duration else 600
            bed_end = bedtime_utc + timedelta(minutes=bedtime_dur)
            if bed_end > now:
                windows.append(
                    {
                        "start": bedtime_utc.isoformat(),
                        "end": bed_end.isoformat(),
                        "duration_minutes": round(bedtime_dur),
                        "label": "bedtime",
                        "is_current": False,
                        "sleep_pressure_at_start": round(
                            sleep_pressure_at((bedtime_utc - cursor).total_seconds() / 60, tau_minutes),
                            2,
                        ),
                    }
                )
            break

        # Find matching cluster for this nap's local time
        local_start = next_nap_start - timedelta(minutes=tz_offset)
        hour = local_start.hour
        duration = avg_nap_duration  # fallback

        if 6 <= hour < 10 and "morning" in nap_clusters:
            duration = nap_clusters["morning"].get("median_duration", nap_clusters["morning"]["avg_duration"])
        elif 10 <= hour < 14 and "midday" in nap_clusters:
            duration = nap_clusters["midday"].get("median_duration", nap_clusters["midday"]["avg_duration"])
        elif 14 <= hour < 18 and "afternoon" in nap_clusters:
            duration = nap_clusters["afternoon"].get("median_duration", nap_clusters["afternoon"]["avg_duration"])

        nap_end = next_nap_start + timedelta(minutes=duration)

        # Skip windows already in the past
        if nap_end <= now:
            cursor = nap_end
            continue

        # Determine label
        if 6 <= hour < 10:
            label = "morning_nap"
        elif 10 <= hour < 14:
            label = "midday_nap"
        else:
            label = "afternoon_nap"

        # Check for feeding overlap
        notes = []
        has_feeding_overlap = False
        if avg_feeding_interval_minutes and feeding_times:
            last_feed = max(make_aware(ft) for ft in feeding_times)
            feed_cursor = last_feed
            while feed_cursor < nap_end:
                feed_cursor += timedelta(minutes=avg_feeding_interval_minutes)
                if next_nap_start <= feed_cursor <= nap_end:
                    has_feeding_overlap = True
                    break
            if has_feeding_overlap:
                notes.append("feedingMayOverlap")
            else:
                notes.append("noFeedingOverlap")

        # Sleep pressure at predicted start
        awake_at_start = (next_nap_start - cursor).total_seconds() / 60
        pressure_val = sleep_pressure_at(awake_at_start, tau_minutes)

        # Prediction interval (use per-step bucket std)
        earliest, latest = compute_prediction_interval(ww_std, signals, now)

        # Signal agreement (for confidence)
        signal_times = []
        for sig in signals.values():
            if "time" in sig:
                st = datetime.fromisoformat(sig["time"])
                signal_times.append((st - now).total_seconds() / 60)
        if len(signal_times) >= 2:
            spread = max(signal_times) - min(signal_times)
            agreement = max(0.0, 1.0 - spread / 120.0)
        else:
            agreement = 0.5

        # Cluster IQR for confidence
        cluster_name = label.replace("_nap", "")
        cluster = nap_clusters.get(cluster_name)
        iqr_val = cluster.get("iqr_start", 30.0) if cluster else 30.0

        conf_score = compute_confidence_score(
            sample_count=cluster["count"] if cluster else 0,
            posterior_std=ww_std,
            signal_agreement=agreement,
            iqr_minutes=iqr_val,
        )

        windows.append(
            {
                "start": next_nap_start.isoformat(),
                "end": nap_end.isoformat(),
                "duration_minutes": round(duration),
                "label": label,
                "is_current": False,
                "has_feeding_overlap": has_feeding_overlap,
                "notes": notes,
                # New fields
                "start_range": {
                    "earliest": earliest.isoformat(),
                    "latest": latest.isoformat(),
                },
                "confidence_score": conf_score,
                "sleep_pressure_at_start": round(pressure_val, 2),
                "signals": signals,
            }
        )

        cursor = nap_end

    return windows


# =============================================================================
# Scoring (updated with confidence_score thresholds)
# =============================================================================


def score_window(window: dict, nap_clusters: dict[str, dict]) -> dict:
    """Add confidence and quality scores to a rest window."""
    label = window.get("label", "")
    cluster_name = label.replace("_nap", "")
    cluster = nap_clusters.get(cluster_name)

    # Categorical confidence — derived from numeric confidence_score if available
    conf_score = window.get("confidence_score")
    if conf_score is not None:
        if conf_score >= 70:
            confidence = "high"
        elif conf_score >= 45:
            confidence = "medium"
        else:
            confidence = "low"
    elif cluster and cluster["count"] >= 5 and cluster["std_dev_start"] < 60:
        confidence = "high"
    elif cluster and cluster["count"] >= 3:
        confidence = "medium"
    else:
        confidence = "low"

    # Quality score
    score = 0
    duration = window.get("duration_minutes", 0)
    if duration >= 60:
        score += 2
    elif duration >= 30:
        score += 1
    if not window.get("has_feeding_overlap", False):
        score += 1
    if confidence == "high":
        score += 1

    if score >= 4:
        quality = "great"
    elif score >= 2:
        quality = "good"
    else:
        quality = "fair"

    window["confidence"] = confidence
    window["quality"] = quality
    return window


# =============================================================================
# Main Endpoint
# =============================================================================


@router.get("/{baby_id}")
@limiter.limit(RATE_READ)
async def get_rest_plan(
    request: Request,
    baby_id: int,
    days: int = Query(default=7, ge=3, le=14, description="Days of history to analyze"),
    tz_offset: int = Query(default=0, ge=-840, le=840, description="Timezone offset in minutes"),
    db: Session = Depends(get_db),
    user: dict = Depends(get_current_user),
    user_email: str = Depends(get_user_email),
):
    """
    Predict parent rest windows for the remainder of today.

    Uses multi-signal fusion: historical patterns, sleep pressure (Process S),
    circadian sleep gates, and feeding correlation.
    """
    from fastapi import HTTPException

    try:
        user_id = user.get("sub")
        baby, _role = verify_baby_access(db, baby_id, user_id, user_email)
        now = datetime.now(UTC)
        start_date = now - timedelta(days=days)

        # ------------------------------------------------------------------
        # Phase 1: Data Gathering
        # ------------------------------------------------------------------
        sleeps = (
            db.query(Sleep)
            .filter(
                Sleep.baby_id == baby_id,
            )
            .order_by(Sleep.start_time.desc())
            .limit(200)
            .all()
        )
        sleeps = [s for s in sleeps if make_aware(s.start_time) >= start_date]

        feedings = (
            db.query(Feeding)
            .filter(
                Feeding.baby_id == baby_id,
            )
            .order_by(Feeding.time.desc())
            .limit(200)
            .all()
        )
        feedings = [f for f in feedings if make_aware(f.time) >= start_date]

        active_sleep = (
            db.query(Sleep)
            .filter(
                Sleep.baby_id == baby_id,
                Sleep.end_time.is_(None),
            )
            .first()
        )

        # Baby age
        birth_date = None
        if baby.birth_date:
            bd = make_aware(baby.birth_date)
            birth_date = bd.date() if hasattr(bd, "date") else bd
        age_weeks = calculate_age_weeks(birth_date) if birth_date else 0

        # Not enough data?  Return minimal response so frontend can hide section
        completed_sleeps = [s for s in sleeps if s.end_time]
        if len(completed_sleeps) < 3:
            fallback_boundaries = learn_day_night_boundaries([], tz_offset, age_weeks, now)
            local_now = now - timedelta(minutes=tz_offset)
            return {
                "baby_id": baby_id,
                "generated_at": now.isoformat(),
                "current_state": None,
                "rest_windows": [],
                "summary": {
                    "total_rest_minutes_remaining": 0,
                    "next_rest_in_minutes": None,
                    "rest_windows_count": 0,
                    "message_key": "no_rest_predicted",
                },
                "patterns_used": {
                    "avg_nap_duration": None,
                    "avg_wake_window": None,
                    "avg_feeding_interval": None,
                    "data_days": days,
                    "has_enough_data": False,
                },
                "mode": classify_wake_bucket(local_now, fallback_boundaries),
                "boundaries": fallback_boundaries,
            }

        # ------------------------------------------------------------------
        # Phase 2: Nap Pattern Clustering (EWMA + robust stats)
        # ------------------------------------------------------------------
        nap_clusters = cluster_naps(completed_sleeps, tz_offset, now)

        # Compute overall averages
        nap_durations = []
        for s in completed_sleeps:
            st = make_aware(s.start_time) - timedelta(minutes=tz_offset)
            if 6 <= st.hour < 18 and s.duration_minutes and s.duration_minutes < 180:
                nap_durations.append(s.duration_minutes)
        avg_nap_duration = (sum(nap_durations) / len(nap_durations)) if nap_durations else 60.0

        # ------------------------------------------------------------------
        # Phase 2b: Extract wake durations for Bayesian + Process S
        # ------------------------------------------------------------------
        wake_durations = []
        sorted_sleeps = sorted(completed_sleeps, key=lambda s: s.start_time)
        for i in range(1, len(sorted_sleeps)):
            prev = sorted_sleeps[i - 1]
            curr = sorted_sleeps[i]
            if prev.end_time and curr.start_time:
                wake_end = make_aware(prev.end_time)
                next_start = make_aware(curr.start_time)
                wake_min = (next_start - wake_end).total_seconds() / 60
                # Only daytime wake periods (reasonable range)
                if 15 < wake_min < 480:
                    wake_durations.append(wake_min)

        # EWMA weights for wake durations
        wake_timestamps = []
        for i in range(1, len(sorted_sleeps)):
            prev = sorted_sleeps[i - 1]
            if prev.end_time:
                wake_timestamps.append(make_aware(prev.end_time))
        if len(wake_timestamps) > len(wake_durations):
            wake_timestamps = wake_timestamps[: len(wake_durations)]
        wake_weights = compute_ewma_weights(wake_timestamps, now) if wake_timestamps else []

        # Bayesian adaptive wake window (overall, daytime-only — backwards compat)
        adapted_ww_mean, adapted_ww_std = bayesian_wake_window(wake_durations, wake_weights, age_weeks)

        # Process S time constant — estimated from daytime wakes only so the
        # very-short night wakes don't deflate tau (a 5-min night wake would
        # otherwise pull the median down).
        tau = estimate_tau(wake_durations)

        # ------------------------------------------------------------------
        # Phase 2c: Circadian-aware day/night boundaries + bucketed windows
        # ------------------------------------------------------------------
        boundaries = learn_day_night_boundaries(completed_sleeps, tz_offset, age_weeks, now)

        bucketed_raw = extract_bucketed_wake_durations(completed_sleeps, boundaries, tz_offset, now)
        bucketed_windows: dict[str, tuple[float, float]] = {}
        for bucket in ("day", "evening", "night"):
            durations = bucketed_raw[bucket]["durations"]
            weights = bucketed_raw[bucket]["weights"]
            mean, std = bayesian_wake_window(durations, weights, age_weeks, bucket=bucket)
            bucketed_windows[bucket] = (mean, std)

        # Median main-night-sleep duration (for bedtime windows + night-mode display)
        night_sleep_durations = []
        for s in completed_sleeps:
            if s.duration_minutes and s.duration_minutes >= NIGHT_SLEEP_MIN_DURATION:
                st_local = make_aware(s.start_time) - timedelta(minutes=tz_offset)
                if st_local.hour >= 18 or st_local.hour < 4:
                    night_sleep_durations.append(s.duration_minutes)
        night_sleep_durations.sort()
        if night_sleep_durations:
            n = len(night_sleep_durations)
            night_sleep_duration_median = (
                night_sleep_durations[n // 2]
                if n % 2 == 1
                else (night_sleep_durations[n // 2 - 1] + night_sleep_durations[n // 2]) / 2
            )
        else:
            night_sleep_duration_median = None

        # Circadian gates
        circ_gates = get_circadian_gates(age_weeks)

        # Feed-to-sleep interval
        feed_to_sleep = compute_feed_to_sleep_interval(completed_sleeps, feedings, tz_offset)

        # Feeding interval
        feeding_times = [f.time for f in feedings]
        avg_feeding_interval_minutes = None
        if len(feeding_times) >= 2:
            sorted_ft = sorted([make_aware(ft) for ft in feeding_times])
            intervals = []
            for i in range(1, len(sorted_ft)):
                diff = (sorted_ft[i] - sorted_ft[i - 1]).total_seconds() / 60
                if 0 < diff < 24 * 60:
                    intervals.append(diff)
            if intervals:
                avg_feeding_interval_minutes = sum(intervals) / len(intervals)

        # Last wake time
        wake_times = [make_aware(s.end_time) for s in completed_sleeps if s.end_time]
        last_wake_time = max(wake_times) if wake_times else None

        # ------------------------------------------------------------------
        # Phase 3: Project Rest Windows (multi-signal fusion)
        # ------------------------------------------------------------------
        windows = project_rest_windows(
            last_wake_time=last_wake_time,
            active_sleep=active_sleep,
            nap_clusters=nap_clusters,
            wake_window_minutes=adapted_ww_mean,
            wake_window_std=adapted_ww_std,
            avg_nap_duration=avg_nap_duration,
            feeding_times=feeding_times,
            avg_feeding_interval_minutes=avg_feeding_interval_minutes,
            tau_minutes=tau,
            circadian_gates_list=circ_gates,
            feed_to_sleep_minutes=feed_to_sleep,
            tz_offset=tz_offset,
            now=now,
            boundaries=boundaries,
            bucketed_windows=bucketed_windows,
            night_sleep_duration=night_sleep_duration_median,
        )

        # ------------------------------------------------------------------
        # Phase 4: Scoring
        # ------------------------------------------------------------------
        for w in windows:
            score_window(w, nap_clusters)

        # ------------------------------------------------------------------
        # Current state
        # ------------------------------------------------------------------
        is_sleeping = active_sleep is not None
        minutes_awake = 0
        if not is_sleeping and last_wake_time:
            minutes_awake = int((now - last_wake_time).total_seconds() / 60)

        # Compute current mode early so sleep-pressure is bucket-aware
        local_now = now - timedelta(minutes=tz_offset)
        current_mode = classify_wake_bucket(local_now, boundaries)

        sleep_pressure_state = None
        if not is_sleeping and last_wake_time:
            sleep_pressure_state = calculate_sleep_pressure(last_wake_time, age_weeks, now, bucket=current_mode)

        last_feed_minutes_ago = None
        if feeding_times:
            last_feed = max(make_aware(ft) for ft in feeding_times)
            last_feed_minutes_ago = int((now - last_feed).total_seconds() / 60)

        # Effective pressure walking all sleeps with partial discharge
        eff = compute_current_effective_pressure(completed_sleeps, age_weeks, tau, now)

        current_state = {
            "is_sleeping": is_sleeping,
            "minutes_awake": minutes_awake,
            "sleep_pressure": sleep_pressure_state.get("score") if sleep_pressure_state else None,
            "last_feed_minutes_ago": last_feed_minutes_ago,
            # New circadian-aware fields
            "mode": current_mode,
            "effective_minutes_awake": int(eff["effective_minutes_awake"]),
            "wall_minutes_awake": int(eff["wall_minutes_awake"]),
            "last_sleep_recovery_fraction": eff["last_sleep_recovery_fraction"],
            "last_sleep_duration_min": eff["last_sleep_duration_min"],
            "effective_pressure": int(round(eff["pressure"] * 100)),
        }

        # ------------------------------------------------------------------
        # Summary
        # ------------------------------------------------------------------
        future_windows = [w for w in windows if not w.get("is_current")]
        total_rest = sum(w["duration_minutes"] for w in windows)

        if is_sleeping:
            message_key = "rest_now"
            next_rest_in = 0
        elif future_windows:
            first_future = future_windows[0]
            first_start = datetime.fromisoformat(first_future["start"])
            mins_until = int((first_start - now).total_seconds() / 60)
            if mins_until <= 15:
                message_key = "rest_soon"
            else:
                message_key = "rest_later"
            next_rest_in = max(0, mins_until)
        else:
            message_key = "no_rest_predicted"
            next_rest_in = None

        summary = {
            "total_rest_minutes_remaining": total_rest,
            "next_rest_in_minutes": next_rest_in,
            "rest_windows_count": len(windows),
            "message_key": message_key,
        }

        # Signals used list
        signals_used = ["pattern", "pressure", "circadian"]
        if feed_to_sleep is not None:
            signals_used.append("feeding")

        patterns_used = {
            # Backward compat
            "avg_nap_duration": round(avg_nap_duration),
            "avg_wake_window": round(adapted_ww_mean),
            "avg_feeding_interval": round(avg_feeding_interval_minutes) if avg_feeding_interval_minutes else None,
            "data_days": days,
            "has_enough_data": True,
            # New fields
            "tau_minutes": round(tau, 1),
            "adapted_wake_window": round(adapted_ww_mean, 1),
            "adapted_wake_window_std": round(adapted_ww_std, 1),
            "circadian_gates": [{"hour": h, "strength": s} for h, s in circ_gates],
            "feed_to_sleep_minutes": round(feed_to_sleep, 1) if feed_to_sleep else None,
            "signals_used": signals_used,
            # Bucketed wake windows (day / evening / night) — learned per baby
            "bucketed_wake_windows": {
                bucket: {
                    "mean_minutes": round(mean, 1),
                    "std_minutes": round(std, 1),
                    "sample_count": len(bucketed_raw[bucket]["durations"]),
                }
                for bucket, (mean, std) in bucketed_windows.items()
            },
            "night_sleep_duration_median": (
                round(night_sleep_duration_median) if night_sleep_duration_median else None
            ),
        }

        return {
            "baby_id": baby_id,
            "generated_at": now.isoformat(),
            "current_state": current_state,
            "rest_windows": windows,
            "summary": summary,
            "patterns_used": patterns_used,
            # Top-level mode + learned boundaries (for UI badge + tooltips)
            "mode": current_mode,
            "boundaries": boundaries,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.exception(f"Rest planner error for baby {baby_id}: {str(e)}")
        from fastapi import HTTPException

        raise HTTPException(status_code=500, detail=f"Rest planner calculation failed: {str(e)}")
