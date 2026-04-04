"""
Advanced prediction algorithms for baby activity patterns.

Features:
1. Wake Window Predictions - Age-appropriate nap timing
2. Confidence Intervals - Statistical uncertainty ranges
3. Sleep Pressure Score - Real-time tiredness indicator
4. Trend Detection - Pattern improvement/decline analysis
"""

from datetime import UTC, datetime, timedelta

from .benchmarks import get_wake_window_benchmarks


def make_aware(dt: datetime | None) -> datetime | None:
    """Ensure datetime is timezone-aware (UTC)."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=UTC)
    return dt


# =============================================================================
# Statistical Utilities
# =============================================================================


def calculate_standard_deviation(values: list[float]) -> float:
    """Calculate sample standard deviation without numpy."""
    if len(values) < 2:
        return 0.0
    mean = sum(values) / len(values)
    variance = sum((x - mean) ** 2 for x in values) / (len(values) - 1)
    return variance**0.5


def calculate_intervals_hours(timestamps: list[datetime]) -> list[float]:
    """Calculate intervals between timestamps in hours."""
    if len(timestamps) < 2:
        return []

    sorted_ts = sorted([make_aware(ts) for ts in timestamps])
    intervals = []
    for i in range(1, len(sorted_ts)):
        diff = (sorted_ts[i] - sorted_ts[i - 1]).total_seconds() / 3600
        # Filter out unreasonable intervals (> 24 hours)
        if 0 < diff < 24:
            intervals.append(diff)
    return intervals


def linear_regression_slope(values: list[float]) -> float:
    """Calculate slope of simple linear regression (trend direction)."""
    if len(values) < 2:
        return 0.0

    n = len(values)
    x_values = list(range(n))

    x_mean = sum(x_values) / n
    y_mean = sum(values) / n

    numerator = sum((x - x_mean) * (y - y_mean) for x, y in zip(x_values, values))
    denominator = sum((x - x_mean) ** 2 for x in x_values)

    if denominator == 0:
        return 0.0

    return numerator / denominator


# =============================================================================
# Feature 1: Wake Window-Based Nap Predictions
# =============================================================================


def predict_next_nap_wake_window(
    last_wake_time: datetime | None, age_weeks: int, now: datetime | None = None
) -> dict | None:
    """
    Predict next nap time based on age-appropriate wake windows.

    This replaces the naive "average interval" approach with pediatric
    sleep science - babies have optimal awake periods based on age.

    Returns:
        Dict with prediction details including time, status, and context
    """
    if not last_wake_time:
        return None

    if now is None:
        now = datetime.now(UTC)

    last_wake = make_aware(last_wake_time)
    now = make_aware(now)

    # Get age-appropriate wake window
    wake_window = get_wake_window_benchmarks(age_weeks)
    optimal_minutes = wake_window["optimal_minutes"]
    min_minutes = wake_window["min_minutes"]
    max_minutes = wake_window["max_minutes"]

    # Calculate predicted nap time
    predicted_time = last_wake + timedelta(minutes=optimal_minutes)

    # Calculate current awake duration
    minutes_awake = int((now - last_wake).total_seconds() / 60)

    # Calculate minutes until predicted nap
    minutes_until = int((predicted_time - now).total_seconds() / 60)

    # Determine status based on wake window position
    if minutes_awake < min_minutes:
        status = "too_early"
        status_label = "Not ready yet"
    elif minutes_awake <= optimal_minutes:
        status = "approaching"
        status_label = "Sleep window opening"
    elif minutes_awake <= max_minutes:
        status = "optimal"
        status_label = "Optimal nap time"
    else:
        status = "overtired"
        status_label = "May be overtired"

    return {
        "time": predicted_time.isoformat(),
        "in_minutes": minutes_until,
        "past_due": minutes_until < 0,
        "wake_window_based": True,
        "status": status,
        "status_label": status_label,
        "minutes_awake": minutes_awake,
        "wake_window": {
            "min": min_minutes,
            "optimal": optimal_minutes,
            "max": max_minutes,
            "notes": wake_window["notes"],
        },
    }


# =============================================================================
# Feature 2: Confidence Intervals
# =============================================================================


def calculate_confidence_interval(intervals: list[float], confidence_level: float = 0.80) -> dict | None:
    """
    Calculate statistical confidence interval for predictions.

    Uses standard deviation to provide uncertainty ranges that help
    parents set realistic expectations.

    Args:
        intervals: List of historical intervals (in hours)
        confidence_level: Desired confidence (0.80 = 80%)

    Returns:
        Dict with range_minutes, confidence_pct, and quality assessment
    """
    if len(intervals) < 3:
        return None

    std_dev = calculate_standard_deviation(intervals)
    mean_interval = sum(intervals) / len(intervals)

    # Z-scores for common confidence levels
    z_scores = {0.80: 1.28, 0.90: 1.645, 0.95: 1.96}
    z = z_scores.get(confidence_level, 1.28)

    # Calculate range in minutes
    range_hours = z * std_dev
    range_minutes = int(range_hours * 60)

    # Calculate coefficient of variation (lower = more consistent)
    cv = (std_dev / mean_interval) if mean_interval > 0 else 1.0

    # Confidence quality based on sample size and consistency
    # More data + more consistent = higher confidence
    sample_bonus = min(20, len(intervals) * 2)  # Up to +20% for sample size
    consistency_bonus = max(0, 30 - int(cv * 50))  # Up to +30% for consistency
    confidence_pct = min(95, 45 + sample_bonus + consistency_bonus)

    # Quality label
    if cv < 0.15:
        quality = "very_consistent"
        quality_label = "Very predictable pattern"
    elif cv < 0.25:
        quality = "consistent"
        quality_label = "Fairly predictable"
    elif cv < 0.40:
        quality = "moderate"
        quality_label = "Some variability"
    else:
        quality = "variable"
        quality_label = "Pattern still developing"

    return {
        "range_minutes": range_minutes,
        "confidence_pct": confidence_pct,
        "std_dev_hours": round(std_dev, 2),
        "sample_size": len(intervals),
        "quality": quality,
        "quality_label": quality_label,
    }


# =============================================================================
# Feature 3: Sleep Pressure Score
# =============================================================================


def calculate_sleep_pressure(
    last_wake_time: datetime | None, age_weeks: int, now: datetime | None = None
) -> dict | None:
    """
    Calculate real-time "tiredness" score (0-100).

    Based on time awake relative to age-appropriate wake windows.
    This is what sleep consultants charge $200+/session to teach.

    Score ranges:
        0-30:  Alert - baby is well-rested, not ready for sleep
        31-50: Building - getting ready, watch for cues
        51-70: Optimal - ideal time to put down for nap
        71-85: High - getting overtired, act quickly
        86-100: Overtired - may fight sleep, harder to settle

    Returns:
        Dict with score, label, and recommendations
    """
    if not last_wake_time:
        return None

    if now is None:
        now = datetime.now(UTC)

    last_wake = make_aware(last_wake_time)
    now = make_aware(now)

    # Get wake window for age
    wake_window = get_wake_window_benchmarks(age_weeks)
    min_minutes = wake_window["min_minutes"]
    optimal_minutes = wake_window["optimal_minutes"]
    max_minutes = wake_window["max_minutes"]

    # Calculate minutes awake
    minutes_awake = int((now - last_wake).total_seconds() / 60)

    # Handle edge case: if negative (future wake time somehow), clamp to 0
    minutes_awake = max(0, minutes_awake)

    # Calculate score based on position in wake window
    if minutes_awake < min_minutes:
        # Too early - low pressure (0-30)
        progress = minutes_awake / min_minutes
        score = int(progress * 30)
        label = "Alert"
        recommendation = "Baby is well-rested - not ready for sleep yet"
        zone = "green"
    elif minutes_awake <= optimal_minutes:
        # Building up - moderate pressure (31-70)
        progress = (minutes_awake - min_minutes) / (optimal_minutes - min_minutes)
        score = 31 + int(progress * 39)
        if score < 50:
            label = "Getting sleepy"
            recommendation = "Watch for tired cues (yawning, eye rubbing)"
        else:
            label = "Ready for nap"
            recommendation = "Ideal time to start nap routine"
        zone = "yellow"
    elif minutes_awake <= max_minutes:
        # Past optimal - high pressure (71-85)
        progress = (minutes_awake - optimal_minutes) / (max_minutes - optimal_minutes)
        score = 71 + int(progress * 14)
        label = "Getting overtired"
        recommendation = "Put down soon - may become harder to settle"
        zone = "orange"
    else:
        # Overtired (86-100)
        extra_minutes = minutes_awake - max_minutes
        # Caps at 100 after 30 min past max
        score = min(100, 86 + int(extra_minutes / 2))
        label = "Overtired"
        recommendation = "May fight sleep - keep routine calm and short"
        zone = "red"

    return {
        "score": score,
        "label": label,
        "zone": zone,
        "recommendation": recommendation,
        "minutes_awake": minutes_awake,
        "optimal_window": {
            "opens_at": min_minutes,
            "ideal_at": optimal_minutes,
            "closes_at": max_minutes,
        },
        "time_until_optimal": max(0, optimal_minutes - minutes_awake),
    }


# =============================================================================
# Feature 4: Trend Detection
# =============================================================================


def detect_trend(daily_values: list[float], metric_name: str = "metric", threshold: float = 0.05) -> dict | None:
    """
    Detect whether a pattern is improving, declining, or stable.

    Uses simple linear regression on daily aggregated values.

    Args:
        daily_values: List of daily values (e.g., total sleep hours per day)
        metric_name: Name for display (e.g., "sleep", "feeding")
        threshold: Slope threshold for significance

    Returns:
        Dict with trend direction, description, and statistics
    """
    if len(daily_values) < 4:
        return {
            "trend": "insufficient_data",
            "trend_label": "Need more data",
            "description": "Need at least 4 days of data to detect trends",
            "days_analyzed": len(daily_values),
        }

    slope = linear_regression_slope(daily_values)
    avg_value = sum(daily_values) / len(daily_values)

    # Normalize slope as percentage of average
    if avg_value > 0:
        relative_slope = slope / avg_value
    else:
        relative_slope = 0

    # Calculate variability
    std_dev = calculate_standard_deviation(daily_values)
    cv = (std_dev / avg_value) if avg_value > 0 else 1.0

    # Determine trend
    if abs(relative_slope) < threshold:
        trend = "stable"
        trend_label = "Stable"
        if cv < 0.15:
            description = f"{metric_name.title()} pattern is consistent"
        else:
            description = f"{metric_name.title()} varies but no clear trend"
    elif relative_slope > 0:
        trend = "improving"
        change_per_week = slope * 7
        if metric_name == "sleep":
            trend_label = "More sleep"
            description = f"Gaining ~{abs(change_per_week):.1f} hrs/week (avg {avg_value:.1f} hrs/day)"
        elif metric_name == "feeding":
            trend_label = "More feeds"
            description = f"Up ~{abs(change_per_week):.1f} feeds/week (avg {avg_value:.1f}/day)"
        else:
            trend_label = "Increasing"
            description = f"Up ~{abs(change_per_week):.1f}/week"
    else:
        trend = "declining"
        change_per_week = slope * 7
        if metric_name == "sleep":
            trend_label = "Less sleep"
            description = f"Down ~{abs(change_per_week):.1f} hrs/week (avg {avg_value:.1f} hrs/day)"
        elif metric_name == "feeding":
            trend_label = "Fewer feeds"
            description = f"Down ~{abs(change_per_week):.1f} feeds/week (avg {avg_value:.1f}/day)"
        else:
            trend_label = "Decreasing"
            description = f"Down ~{abs(change_per_week):.1f}/week"

    return {
        "trend": trend,
        "trend_label": trend_label,
        "description": description,
        "slope": round(slope, 3),
        "days_analyzed": len(daily_values),
        "average": round(avg_value, 2),
        "std_dev": round(std_dev, 2),
        "variability": "high" if cv > 0.25 else "moderate" if cv > 0.15 else "low",
    }


def calculate_daily_totals(records: list, get_value: callable, get_date: callable, days: int = 14) -> list[float]:
    """
    Aggregate records into daily totals for trend analysis.

    Args:
        records: List of records (e.g., Sleep objects)
        get_value: Function to extract value from record (e.g., lambda s: s.duration_minutes)
        get_date: Function to extract date from record (e.g., lambda s: s.start_time.date())
        days: Number of days to analyze

    Returns:
        List of daily totals, one per day (oldest first)
    """
    from collections import defaultdict
    from datetime import date

    today = date.today()
    start_date = today - timedelta(days=days - 1)

    # Group by date
    daily = defaultdict(float)
    for record in records:
        try:
            record_date = get_date(record)
            if isinstance(record_date, datetime):
                record_date = record_date.date()
            if start_date <= record_date <= today:
                value = get_value(record)
                if value is not None:
                    daily[record_date] += value
        except (AttributeError, TypeError):
            continue

    # Build list of daily values (fill gaps with 0)
    result = []
    current = start_date
    while current <= today:
        result.append(daily.get(current, 0))
        current += timedelta(days=1)

    return result
