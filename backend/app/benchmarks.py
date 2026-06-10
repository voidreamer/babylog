"""
Age-based scientific benchmarks for baby care.

Sources:
- American Academy of Pediatrics (AAP)
- World Health Organization (WHO)
- Healthy Children guidelines
"""

from datetime import date


def calculate_age_weeks(birth_date: date) -> int:
    """Calculate baby's age in weeks from birth date."""
    if not birth_date:
        return 0
    today = date.today()
    days = (today - birth_date).days
    return max(0, days // 7)


def calculate_age_months(birth_date: date) -> float:
    """Calculate baby's age in months from birth date."""
    if not birth_date:
        return 0
    today = date.today()
    days = (today - birth_date).days
    return max(0, days / 30.44)  # Average days per month


# =============================================================================
# Diaper Benchmarks by Age
# =============================================================================
DIAPER_BENCHMARKS = {
    # age_weeks_max: (min_wet, max_wet, min_dirty, max_dirty)
    # First few days - colostrum phase
    1: {"wet": (1, 2), "dirty": (1, 2), "notes": "Colostrum phase - output increasing"},
    # Week 1-2: Milk coming in
    2: {"wet": (5, 6), "dirty": (3, 4), "notes": "Milk established, frequent stools normal"},
    # Weeks 2-6: Peak diaper phase
    6: {"wet": (6, 8), "dirty": (3, 5), "notes": "Breastfed babies may poop after every feed"},
    # 6 weeks - 3 months: Stools may decrease
    12: {"wet": (6, 8), "dirty": (1, 3), "notes": "Some breastfed babies poop less frequently"},
    # 3-6 months
    26: {"wet": (5, 7), "dirty": (1, 2), "notes": "Before solids - less frequent stools normal"},
    # 6-12 months (solids introduced)
    52: {"wet": (4, 6), "dirty": (1, 2), "notes": "Solid foods change stool consistency"},
    # 12+ months (toddler)
    999: {"wet": (4, 6), "dirty": (1, 2), "notes": "Regular pattern established"},
}


def get_diaper_benchmarks(age_weeks: int) -> dict:
    """Get expected diaper counts for baby's age."""
    for max_weeks, benchmarks in sorted(DIAPER_BENCHMARKS.items()):
        if age_weeks <= max_weeks:
            return {
                "expected_wet_diapers": {"min": benchmarks["wet"][0], "max": benchmarks["wet"][1]},
                "expected_dirty_diapers": {"min": benchmarks["dirty"][0], "max": benchmarks["dirty"][1]},
                "notes": benchmarks["notes"],
            }
    # Fallback to the oldest bracket (always matches, so this cannot recurse forever)
    return get_diaper_benchmarks(max(DIAPER_BENCHMARKS))


# =============================================================================
# Sleep Benchmarks by Age
# =============================================================================
SLEEP_BENCHMARKS = {
    # age_weeks_max: (min_hours_total, max_hours_total, typical_night_hours, naps_per_day)
    2: {"total": (16, 18), "night": (8, 9), "naps": (4, 5), "notes": "Short sleep cycles, frequent waking"},
    6: {"total": (15, 17), "night": (8, 9), "naps": (3, 4), "notes": "May start longer stretches"},
    12: {"total": (14, 16), "night": (9, 10), "naps": (3, 4), "notes": "Night sleep consolidating"},
    26: {"total": (14, 15), "night": (10, 11), "naps": (2, 3), "notes": "Transitioning to 2-3 naps"},
    52: {"total": (12, 14), "night": (10, 12), "naps": (1, 2), "notes": "1-2 naps typical"},
    104: {"total": (11, 14), "night": (10, 12), "naps": (1, 1), "notes": "Transitioning to 1 nap"},
    999: {"total": (11, 13), "night": (10, 12), "naps": (0, 1), "notes": "May drop naps entirely"},
}


def get_sleep_benchmarks(age_weeks: int) -> dict:
    """Get expected sleep patterns for baby's age."""
    for max_weeks, benchmarks in sorted(SLEEP_BENCHMARKS.items()):
        if age_weeks <= max_weeks:
            return {
                "expected_total_sleep_hours": {"min": benchmarks["total"][0], "max": benchmarks["total"][1]},
                "expected_night_sleep_hours": {"min": benchmarks["night"][0], "max": benchmarks["night"][1]},
                "expected_naps_per_day": {"min": benchmarks["naps"][0], "max": benchmarks["naps"][1]},
                "notes": benchmarks["notes"],
            }
    return get_sleep_benchmarks(max(SLEEP_BENCHMARKS))


# =============================================================================
# Wake Window Benchmarks by Age (for nap predictions)
# =============================================================================
# Wake windows = optimal awake time between sleeps
# Based on pediatric sleep research and sleep consultant guidelines.
#
# Each entry now also has bucketed sub-windows:
#   day:     daytime wake windows (between morning wake and ~2h before bedtime)
#   evening: pre-bedtime wake windows (last awake stretch of the day, usually longest)
#   night:   night-waking → back-to-sleep windows (very short)
#
# Top-level min/optimal/max are kept for backwards compatibility and represent
# the daytime window (the common case).
WAKE_WINDOW_BENCHMARKS = {
    # age_weeks_max: bucketed wake windows in minutes
    2: {
        "min": 45,
        "optimal": 60,
        "max": 75,
        "day": {"min": 45, "optimal": 60, "max": 75},
        "evening": {"min": 45, "optimal": 60, "max": 90},
        "night": {"min": 0, "optimal": 5, "max": 20},
        "notes": "Newborn - very short wake windows",
    },
    4: {
        "min": 60,
        "optimal": 75,
        "max": 90,
        "day": {"min": 60, "optimal": 75, "max": 90},
        "evening": {"min": 60, "optimal": 90, "max": 105},
        "night": {"min": 0, "optimal": 10, "max": 25},
        "notes": "1 month - still sleepy",
    },
    8: {
        "min": 75,
        "optimal": 90,
        "max": 120,
        "day": {"min": 75, "optimal": 90, "max": 120},
        "evening": {"min": 90, "optimal": 105, "max": 135},
        "night": {"min": 0, "optimal": 10, "max": 30},
        "notes": "2 months - slightly longer",
    },
    12: {
        "min": 90,
        "optimal": 105,
        "max": 135,
        "day": {"min": 90, "optimal": 105, "max": 135},
        "evening": {"min": 105, "optimal": 120, "max": 150},
        "night": {"min": 0, "optimal": 15, "max": 35},
        "notes": "3 months - more alert periods",
    },
    16: {
        "min": 105,
        "optimal": 120,
        "max": 150,
        "day": {"min": 90, "optimal": 105, "max": 135},
        "evening": {"min": 120, "optimal": 150, "max": 180},
        "night": {"min": 0, "optimal": 15, "max": 45},
        "notes": "4 months - 2-3h daytime, longer pre-bedtime, short night wakes (sleep regression common)",
    },
    20: {
        "min": 120,
        "optimal": 150,
        "max": 180,
        "day": {"min": 105, "optimal": 135, "max": 165},
        "evening": {"min": 135, "optimal": 165, "max": 195},
        "night": {"min": 0, "optimal": 20, "max": 50},
        "notes": "5 months - consolidating naps",
    },
    26: {
        "min": 150,
        "optimal": 180,
        "max": 210,
        "day": {"min": 135, "optimal": 165, "max": 195},
        "evening": {"min": 165, "optimal": 195, "max": 225},
        "night": {"min": 0, "optimal": 20, "max": 60},
        "notes": "6 months - 2-3 naps typical",
    },
    36: {
        "min": 180,
        "optimal": 210,
        "max": 240,
        "day": {"min": 165, "optimal": 195, "max": 225},
        "evening": {"min": 195, "optimal": 225, "max": 255},
        "night": {"min": 0, "optimal": 25, "max": 60},
        "notes": "8-9 months - transitioning to 2 naps",
    },
    44: {
        "min": 210,
        "optimal": 240,
        "max": 270,
        "day": {"min": 195, "optimal": 225, "max": 255},
        "evening": {"min": 225, "optimal": 255, "max": 285},
        "night": {"min": 0, "optimal": 25, "max": 60},
        "notes": "10-11 months - 2 naps",
    },
    52: {
        "min": 210,
        "optimal": 270,
        "max": 330,
        "day": {"min": 210, "optimal": 255, "max": 300},
        "evening": {"min": 240, "optimal": 285, "max": 330},
        "night": {"min": 0, "optimal": 25, "max": 60},
        "notes": "12 months - 1-2 naps",
    },
    78: {
        "min": 300,
        "optimal": 330,
        "max": 390,
        "day": {"min": 270, "optimal": 315, "max": 360},
        "evening": {"min": 300, "optimal": 345, "max": 390},
        "night": {"min": 0, "optimal": 30, "max": 75},
        "notes": "18 months - transitioning to 1 nap",
    },
    104: {
        "min": 330,
        "optimal": 360,
        "max": 420,
        "day": {"min": 300, "optimal": 345, "max": 390},
        "evening": {"min": 330, "optimal": 375, "max": 420},
        "night": {"min": 0, "optimal": 30, "max": 90},
        "notes": "2 years - 1 nap or none",
    },
    999: {
        "min": 360,
        "optimal": 420,
        "max": 480,
        "day": {"min": 330, "optimal": 390, "max": 450},
        "evening": {"min": 360, "optimal": 420, "max": 480},
        "night": {"min": 0, "optimal": 30, "max": 90},
        "notes": "Toddler - may drop nap",
    },
}


def get_wake_window_benchmarks(age_weeks: int, bucket: str | None = None) -> dict:
    """
    Get expected wake window for baby's age in minutes.

    When `bucket` is None, returns the historic flat shape (daytime defaults).
    When `bucket` is one of "day" | "evening" | "night", returns the bucket
    sub-window for that age.
    """
    for max_weeks, benchmarks in sorted(WAKE_WINDOW_BENCHMARKS.items()):
        if age_weeks <= max_weeks:
            if bucket in ("day", "evening", "night"):
                b = benchmarks[bucket]
                return {
                    "min_minutes": b["min"],
                    "optimal_minutes": b["optimal"],
                    "max_minutes": b["max"],
                    "bucket": bucket,
                    "notes": benchmarks["notes"],
                }
            return {
                "min_minutes": benchmarks["min"],
                "optimal_minutes": benchmarks["optimal"],
                "max_minutes": benchmarks["max"],
                "notes": benchmarks["notes"],
            }
    return get_wake_window_benchmarks(max(WAKE_WINDOW_BENCHMARKS), bucket)


# =============================================================================
# Sleep cycle / restorative-sleep length by age (minutes)
# =============================================================================
# A "restorative" sleep is one that fully resets sleep pressure. Anything
# shorter discharges pressure proportionally (see recovery_fraction()).
#
# Roughly aligned to infant sleep cycle research:
#   - 0-3m: ~30 min cycles (no clear stages yet)
#   - 3-6m: ~45 min cycles (stage emergence)
#   - 6-12m: ~50 min
#   - 12m+: ~60 min (adult-like cycles)
RESTORATIVE_MINUTES_BY_AGE: list[tuple[int, int]] = [
    (12, 30),
    (26, 45),
    (52, 50),
    (999, 60),
]


def restorative_minutes_for_age(age_weeks: int) -> int:
    """Minutes of sleep needed for a 'full' pressure reset at this age."""
    for max_weeks, minutes in RESTORATIVE_MINUTES_BY_AGE:
        if age_weeks <= max_weeks:
            return minutes
    return RESTORATIVE_MINUTES_BY_AGE[-1][1]


# =============================================================================
# Feeding Benchmarks by Age
# =============================================================================
FEEDING_BENCHMARKS = {
    # age_weeks_max: feeds_per_day, amount_per_feed_ml (for bottle), interval_hours
    2: {
        "feeds": (8, 12),
        "amount_ml": (30, 60),
        "interval_hours": (2, 3),
        "notes": "Feed on demand, very frequent",
    },
    6: {
        "feeds": (6, 10),
        "amount_ml": (60, 120),
        "interval_hours": (2.5, 3.5),
        "notes": "Stomach capacity increasing",
    },
    12: {
        "feeds": (5, 8),
        "amount_ml": (120, 180),
        "interval_hours": (3, 4),
        "notes": "More predictable schedule emerging",
    },
    26: {
        "feeds": (4, 6),
        "amount_ml": (180, 240),
        "interval_hours": (3, 4),
        "notes": "Milk feeds may space out as stomach capacity grows",
    },
    52: {
        "feeds": (3, 5),
        "amount_ml": (180, 240),
        "interval_hours": (4, 5),
        "notes": "Solids becoming more significant",
    },
    999: {
        "feeds": (2, 4),
        "amount_ml": (150, 200),
        "interval_hours": (4, 6),
        "notes": "Transitioning to table foods",
    },
}


def get_feeding_benchmarks(age_weeks: int) -> dict:
    """Get expected feeding patterns for baby's age."""
    for max_weeks, benchmarks in sorted(FEEDING_BENCHMARKS.items()):
        if age_weeks <= max_weeks:
            return {
                "expected_feeds_per_day": {"min": benchmarks["feeds"][0], "max": benchmarks["feeds"][1]},
                "expected_amount_per_feed_ml": {"min": benchmarks["amount_ml"][0], "max": benchmarks["amount_ml"][1]},
                "expected_interval_hours": {
                    "min": benchmarks["interval_hours"][0],
                    "max": benchmarks["interval_hours"][1],
                },
                "notes": benchmarks["notes"],
            }
    return get_feeding_benchmarks(max(FEEDING_BENCHMARKS))


# =============================================================================
# Combined Benchmarks
# =============================================================================
def get_all_benchmarks(birth_date: date | None) -> dict:
    """Get all benchmarks for a baby based on their birth date."""
    if not birth_date:
        return {
            "age_weeks": None,
            "age_months": None,
            "error": "Birth date required for benchmarks",
        }

    age_weeks = calculate_age_weeks(birth_date)
    age_months = round(calculate_age_months(birth_date), 1)

    return {
        "age_weeks": age_weeks,
        "age_months": age_months,
        "diapers": get_diaper_benchmarks(age_weeks),
        "sleep": get_sleep_benchmarks(age_weeks),
        "feeding": get_feeding_benchmarks(age_weeks),
    }
