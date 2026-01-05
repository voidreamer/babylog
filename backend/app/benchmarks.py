"""
Age-based scientific benchmarks for baby care.

Sources:
- American Academy of Pediatrics (AAP)
- World Health Organization (WHO)
- Healthy Children guidelines
"""

from datetime import date
from typing import Optional


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
    # Fallback to toddler
    return get_diaper_benchmarks(999)


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
    return get_sleep_benchmarks(999)


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
        "notes": "Solids starting, milk still primary",
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
                "expected_interval_hours": {"min": benchmarks["interval_hours"][0], "max": benchmarks["interval_hours"][1]},
                "notes": benchmarks["notes"],
            }
    return get_feeding_benchmarks(999)


# =============================================================================
# Combined Benchmarks
# =============================================================================
def get_all_benchmarks(birth_date: Optional[date]) -> dict:
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
