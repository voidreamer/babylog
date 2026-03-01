import Foundation

// MARK: - AnalyticsDataPoints

struct AnalyticsDataPoints: Codable, Hashable, Sendable {
    let feedings: Int
    let sleeps: Int
}

// MARK: - AnalyticsData

struct AnalyticsData: Codable, Hashable, Sendable {
    let hasEnoughData: Bool
    let dataPoints: AnalyticsDataPoints?
    let patterns: AnalyticsPatterns?
    let predictions: AnalyticsPredictions?
    let benchmarks: AnalyticsBenchmarks?
    let todayVsAverage: TodayVsAverage?
    let trends: AnalyticsTrends?

    enum CodingKeys: String, CodingKey {
        case hasEnoughData = "has_enough_data"
        case dataPoints = "data_points"
        case patterns
        case predictions
        case benchmarks
        case todayVsAverage = "today_vs_average"
        case trends
    }
}

// MARK: - AnalyticsPatterns

struct AnalyticsPatterns: Codable, Hashable, Sendable {
    let usualWakeTime: String?
    let usualBedtime: String?
    let wakeIntervalHours: Double?
    let avgFeedingIntervalHours: Double?
    let avgNapDurationMinutes: Double?

    enum CodingKeys: String, CodingKey {
        case usualWakeTime = "usual_wake_time"
        case usualBedtime = "usual_bedtime"
        case wakeIntervalHours = "wake_interval_hours"
        case avgFeedingIntervalHours = "avg_feeding_interval_hours"
        case avgNapDurationMinutes = "avg_nap_duration_minutes"
    }
}

// MARK: - PredictionConfidence

struct PredictionConfidence: Codable, Hashable, Sendable {
    let rangeMinutes: Double
    let qualityLabel: String

    enum CodingKeys: String, CodingKey {
        case rangeMinutes = "range_minutes"
        case qualityLabel = "quality_label"
    }
}

// MARK: - Prediction

struct Prediction: Codable, Hashable, Sendable {
    let inMinutes: Double?
    let pastDue: Bool?
    let confidence: PredictionConfidence?

    enum CodingKeys: String, CodingKey {
        case inMinutes = "in_minutes"
        case pastDue = "past_due"
        case confidence
    }
}

// MARK: - WakeWindow

struct WakeWindow: Codable, Hashable, Sendable {
    let min: Double
    let max: Double
}

// MARK: - NapPrediction

struct NapPrediction: Codable, Hashable, Sendable {
    let inMinutes: Double?
    let pastDue: Bool?
    let confidence: PredictionConfidence?
    let status: String?
    let statusLabel: String?
    let wakeWindow: WakeWindow?

    enum CodingKeys: String, CodingKey {
        case inMinutes = "in_minutes"
        case pastDue = "past_due"
        case confidence
        case status
        case statusLabel = "status_label"
        case wakeWindow = "wake_window"
    }
}

// MARK: - SleepPressure

struct SleepPressure: Codable, Hashable, Sendable {
    let score: Double
    let zone: String
    let label: String
    let minutesAwake: Double
    let recommendation: String

    enum CodingKeys: String, CodingKey {
        case score
        case zone
        case label
        case minutesAwake = "minutes_awake"
        case recommendation
    }
}

// MARK: - AnalyticsPredictions

struct AnalyticsPredictions: Codable, Hashable, Sendable {
    let nextFeeding: Prediction?
    let nextNap: NapPrediction?
    let sleepPressure: SleepPressure?

    enum CodingKeys: String, CodingKey {
        case nextFeeding = "next_feeding"
        case nextNap = "next_nap"
        case sleepPressure = "sleep_pressure"
    }
}

// MARK: - MinMaxRange

struct MinMaxRange: Codable, Hashable, Sendable {
    let min: Double
    let max: Double
}

// MARK: - BenchmarkCategory

struct BenchmarkCategory: Codable, Hashable, Sendable {
    let expectedRange: MinMaxRange?
    let notes: String?

    // The backend uses different key names per category, so we decode manually.
    init(expectedRange: MinMaxRange?, notes: String?) {
        self.expectedRange = expectedRange
        self.notes = notes
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: DynamicCodingKey.self)
        notes = try container.decodeIfPresent(String.self, forKey: DynamicCodingKey(stringValue: "notes")!)

        // Try all known range key names
        let rangeKeys = [
            "expected_wet_diapers",
            "expected_total_sleep_hours",
            "expected_feeds_per_day"
        ]
        var range: MinMaxRange?
        for key in rangeKeys {
            if let decoded = try? container.decodeIfPresent(MinMaxRange.self, forKey: DynamicCodingKey(stringValue: key)!) {
                range = decoded
                break
            }
        }
        expectedRange = range
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: DynamicCodingKey.self)
        try container.encodeIfPresent(notes, forKey: DynamicCodingKey(stringValue: "notes")!)
        // Encoding the range is context-dependent; omit for simplicity
        // or callers can re-encode with the appropriate key.
        if let range = expectedRange {
            try container.encode(range, forKey: DynamicCodingKey(stringValue: "expected_range")!)
        }
    }

    private struct DynamicCodingKey: CodingKey {
        var stringValue: String
        var intValue: Int?

        init?(stringValue: String) { self.stringValue = stringValue }
        init?(intValue: Int) { self.stringValue = "\(intValue)"; self.intValue = intValue }
    }
}

// MARK: - AnalyticsBenchmarks

struct AnalyticsBenchmarks: Codable, Hashable, Sendable {
    let ageWeeks: Int?
    let diapers: BenchmarkCategory?
    let sleep: BenchmarkCategory?
    let feeding: BenchmarkCategory?

    enum CodingKeys: String, CodingKey {
        case ageWeeks = "age_weeks"
        case diapers
        case sleep
        case feeding
    }
}

// MARK: - TodayVsAverageItem

struct TodayVsAverageItem: Codable, Hashable, Sendable {
    let today: Double
    let dailyAvg: Double

    enum CodingKeys: String, CodingKey {
        case today
        case dailyAvg = "daily_avg"
    }
}

// MARK: - TodayVsAverageDiapers

struct TodayVsAverageDiapers: Codable, Hashable, Sendable {
    let today: Double
    let dailyAvg: Double
    let wetToday: Int?

    enum CodingKeys: String, CodingKey {
        case today
        case dailyAvg = "daily_avg"
        case wetToday = "wet_today"
    }
}

// MARK: - TodayVsAverage

struct TodayVsAverage: Codable, Hashable, Sendable {
    let feedings: TodayVsAverageItem?
    let diapers: TodayVsAverageDiapers?
    let sleepHours: TodayVsAverageItem?

    enum CodingKeys: String, CodingKey {
        case feedings
        case diapers
        case sleepHours = "sleep_hours"
    }
}

// MARK: - TrendItem

struct TrendItem: Codable, Hashable, Sendable {
    let trend: String
    let trendLabel: String
    let description: String

    enum CodingKeys: String, CodingKey {
        case trend
        case trendLabel = "trend_label"
        case description
    }
}

// MARK: - AnalyticsTrends

struct AnalyticsTrends: Codable, Hashable, Sendable {
    let sleep: TrendItem?
    let feeding: TrendItem?
}
