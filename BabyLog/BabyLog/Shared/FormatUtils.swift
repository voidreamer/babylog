import Foundation

// MARK: - FormatUtils

/// Utility functions for formatting dates, durations, measurements, and ages.
enum FormatUtils {

    // MARK: - ISO 8601 Date Parsing

    /// Shared ISO 8601 date formatter supporting fractional seconds.
    private static let isoFormatter: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f
    }()

    /// Fallback ISO 8601 formatter without fractional seconds.
    private static let isoFormatterNoFrac: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime]
        return f
    }()

    /// Date-only formatter (yyyy-MM-dd).
    private static let dateOnlyFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.locale = Locale(identifier: "en_US_POSIX")
        return f
    }()

    /// Parse an ISO 8601 date string, trying multiple formats.
    static func parseDate(_ dateString: String) -> Date? {
        if let d = isoFormatter.date(from: dateString) { return d }
        if let d = isoFormatterNoFrac.date(from: dateString) { return d }
        if let d = dateOnlyFormatter.date(from: dateString) { return d }
        return nil
    }

    // MARK: - Time Ago

    /// Relative time string: "2m ago", "1h ago", "3d ago", "just now".
    ///
    /// - Parameter dateString: An ISO 8601 date string from the API.
    /// - Returns: A human-readable relative time string.
    static func timeAgo(from dateString: String) -> String {
        guard let date = parseDate(dateString) else { return dateString }

        let now = Date()
        let interval = now.timeIntervalSince(date)

        guard interval >= 0 else { return "just now" }

        let seconds = Int(interval)
        let minutes = seconds / 60
        let hours = minutes / 60
        let days = hours / 24
        let weeks = days / 7
        let months = days / 30

        if seconds < 60 {
            return "just now"
        } else if minutes < 60 {
            return "\(minutes)m ago"
        } else if hours < 24 {
            return "\(hours)h ago"
        } else if days < 7 {
            return "\(days)d ago"
        } else if weeks < 4 {
            return "\(weeks)w ago"
        } else {
            return "\(months)mo ago"
        }
    }

    // MARK: - Format Duration

    /// Format a duration given in minutes: "1h 30m", "45m", "2h".
    ///
    /// - Parameter minutes: Duration in minutes.
    /// - Returns: Formatted duration string.
    static func formatDuration(minutes: Double) -> String {
        let totalMinutes = Int(minutes.rounded())
        guard totalMinutes > 0 else { return "0m" }

        let h = totalMinutes / 60
        let m = totalMinutes % 60

        if h > 0 && m > 0 {
            return "\(h)h \(m)m"
        } else if h > 0 {
            return "\(h)h"
        } else {
            return "\(m)m"
        }
    }

    // MARK: - Format Amount (ml / oz)

    /// Format a liquid amount in ml or oz.
    ///
    /// - Parameters:
    ///   - ml: Amount in milliliters.
    ///   - useOz: If true, convert and display in ounces.
    /// - Returns: Formatted string like "120 ml" or "4.1 oz".
    static func formatAmount(ml: Double, useOz: Bool) -> String {
        if useOz {
            let oz = ml / 29.5735
            return "\(formatDecimal(oz)) oz"
        }
        return "\(formatDecimal(ml)) ml"
    }

    // MARK: - Format Weight (kg / lbs)

    /// Format weight in kg or lbs.
    ///
    /// - Parameters:
    ///   - kg: Weight in kilograms.
    ///   - useLbs: If true, convert and display in pounds.
    /// - Returns: Formatted string like "3.5 kg" or "7.7 lbs".
    static func formatWeight(kg: Double, useLbs: Bool) -> String {
        if useLbs {
            let lbs = kg * 2.20462
            return "\(formatDecimal(lbs)) lbs"
        }
        return "\(formatDecimal(kg)) kg"
    }

    // MARK: - Format Height (cm / in)

    /// Format height in cm or inches.
    ///
    /// - Parameters:
    ///   - cm: Height in centimeters.
    ///   - useIn: If true, convert and display in inches.
    /// - Returns: Formatted string like "50 cm" or "19.7 in".
    static func formatHeight(cm: Double, useIn: Bool) -> String {
        if useIn {
            let inches = cm / 2.54
            return "\(formatDecimal(inches)) in"
        }
        return "\(formatDecimal(cm)) cm"
    }

    // MARK: - Baby Age

    /// Compute a human-readable age from an ISO date or yyyy-MM-dd birth date string.
    ///
    /// - Parameter birthDate: Birth date string (ISO 8601 or yyyy-MM-dd).
    /// - Returns: A string like "3 months, 2 weeks" or "1 year, 4 months".
    static func babyAge(birthDate: String) -> String {
        guard let date = parseDate(birthDate) else { return "" }

        let calendar = Calendar.current
        let now = Date()

        guard date <= now else { return "" }

        let components = calendar.dateComponents([.year, .month, .weekOfMonth, .day], from: date, to: now)
        let years = components.year ?? 0
        let months = components.month ?? 0
        let weeks = components.weekOfMonth ?? 0
        let days = components.day ?? 0

        var parts: [String] = []

        if years > 0 {
            parts.append("\(years) \(years == 1 ? "year" : "years")")
        }
        if months > 0 {
            parts.append("\(months) \(months == 1 ? "month" : "months")")
        }
        if years == 0 && weeks > 0 {
            parts.append("\(weeks) \(weeks == 1 ? "week" : "weeks")")
        }

        // If the baby is less than a week old, show days.
        if parts.isEmpty {
            if days > 0 {
                parts.append("\(days) \(days == 1 ? "day" : "days")")
            } else {
                return "Newborn"
            }
        }

        return parts.joined(separator: ", ")
    }

    // MARK: - Private Helpers

    /// Format a Double to a clean decimal string (strip trailing zeros, max 1 decimal).
    private static func formatDecimal(_ value: Double) -> String {
        let rounded = (value * 10).rounded() / 10
        if rounded == rounded.rounded() {
            return String(format: "%.0f", rounded)
        }
        return String(format: "%.1f", rounded)
    }
}
