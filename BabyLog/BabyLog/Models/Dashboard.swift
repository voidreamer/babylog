import Foundation

// MARK: - DailySummaryData

struct DailySummaryData: Codable, Hashable, Sendable {
    let totalFeedings: Int
    let totalDiapers: Int
    let totalMl: Double
    let peeCount: Int
    let pooCount: Int
    let mixedCount: Int
    let totalSleepMinutes: Double
    let sleepCount: Int
    let pumpingCount: Int
    let totalPumpingMl: Double
    let pottyCount: Int
    let pottySuccessCount: Int
    let tummyCount: Int
    let tummyMinutes: Double
    let bathCount: Int

    enum CodingKeys: String, CodingKey {
        case totalFeedings = "total_feedings"
        case totalDiapers = "total_diapers"
        case totalMl = "total_ml"
        case peeCount = "pee_count"
        case pooCount = "poo_count"
        case mixedCount = "mixed_count"
        case totalSleepMinutes = "total_sleep_minutes"
        case sleepCount = "sleep_count"
        case pumpingCount = "pumping_count"
        case totalPumpingMl = "total_pumping_ml"
        case pottyCount = "potty_count"
        case pottySuccessCount = "potty_success_count"
        case tummyCount = "tummy_count"
        case tummyMinutes = "tummy_minutes"
        case bathCount = "bath_count"
    }
}

// MARK: - DashboardData

struct DashboardData: Codable, Hashable, Sendable {
    let lastFeeding: Feeding?
    let lastDiaper: Diaper?
    let lastSleep: SleepRecord?
    let currentSleep: SleepRecord?
    let lastPumping: Pumping?
    let lastPotty: PottyLog?
    let lastTummy: TummyTime?
    let lastBath: Bath?
    let lastSupplement: Supplement?
    let dailySummary: DailySummaryData?

    enum CodingKeys: String, CodingKey {
        case lastFeeding = "last_feeding"
        case lastDiaper = "last_diaper"
        case lastSleep = "last_sleep"
        case currentSleep = "current_sleep"
        case lastPumping = "last_pumping"
        case lastPotty = "last_potty"
        case lastTummy = "last_tummy"
        case lastBath = "last_bath"
        case lastSupplement = "last_supplement"
        case dailySummary = "daily_summary"
    }
}

// MARK: - TimelineEvent

struct TimelineEvent: Codable, Identifiable, Hashable, Sendable {
    let id: Int
    let eventType: String
    let time: String
    let details: [String: AnyCodable]

    enum CodingKeys: String, CodingKey {
        case id
        case eventType = "event_type"
        case time
        case details
    }
}

// MARK: - UpcomingItem

struct UpcomingItem: Codable, Identifiable, Hashable, Sendable {
    var id: String { "\(type)-\(title)-\(date ?? "")" }
    let type: String
    let title: String
    let date: String?
    let frequency: String?
    let dosage: String?
    let color: String

    enum CodingKeys: String, CodingKey {
        case type
        case title
        case date
        case frequency
        case dosage
        case color
    }
}

// MARK: - AnyCodable
// A type-erased Codable value for handling `Record<string, unknown>` / arbitrary JSON.

struct AnyCodable: Codable, Hashable, Sendable {
    let value: AnyHashableSendable

    init(_ value: some Hashable & Sendable) {
        self.value = AnyHashableSendable(value)
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()

        if container.decodeNil() {
            value = AnyHashableSendable(NilValue.shared)
        } else if let bool = try? container.decode(Bool.self) {
            value = AnyHashableSendable(bool)
        } else if let int = try? container.decode(Int.self) {
            value = AnyHashableSendable(int)
        } else if let double = try? container.decode(Double.self) {
            value = AnyHashableSendable(double)
        } else if let string = try? container.decode(String.self) {
            value = AnyHashableSendable(string)
        } else if let array = try? container.decode([AnyCodable].self) {
            value = AnyHashableSendable(array)
        } else if let dict = try? container.decode([String: AnyCodable].self) {
            value = AnyHashableSendable(dict)
        } else {
            throw DecodingError.dataCorruptedError(
                in: container,
                debugDescription: "AnyCodable could not decode value"
            )
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        let base = value.base

        switch base {
        case is NilValue:
            try container.encodeNil()
        case let bool as Bool:
            try container.encode(bool)
        case let int as Int:
            try container.encode(int)
        case let double as Double:
            try container.encode(double)
        case let string as String:
            try container.encode(string)
        case let array as [AnyCodable]:
            try container.encode(array)
        case let dict as [String: AnyCodable]:
            try container.encode(dict)
        default:
            throw EncodingError.invalidValue(
                base,
                EncodingError.Context(
                    codingPath: encoder.codingPath,
                    debugDescription: "AnyCodable cannot encode \(type(of: base))"
                )
            )
        }
    }
}

// MARK: - AnyHashableSendable
// Wraps any Hashable & Sendable value for use inside AnyCodable.

struct AnyHashableSendable: Hashable, Sendable {
    let base: any Sendable
    private let _hashValue: Int
    private let _isEqual: @Sendable (any Sendable) -> Bool

    init<T: Hashable & Sendable>(_ value: T) {
        self.base = value
        self._hashValue = value.hashValue
        self._isEqual = { other in
            guard let otherT = other as? T else { return false }
            return value == otherT
        }
    }

    static func == (lhs: AnyHashableSendable, rhs: AnyHashableSendable) -> Bool {
        lhs._isEqual(rhs.base)
    }

    func hash(into hasher: inout Hasher) {
        hasher.combine(_hashValue)
    }
}

// MARK: - NilValue
// Sentinel type representing a decoded JSON null inside AnyCodable.

struct NilValue: Hashable, Sendable {
    static let shared = NilValue()
}
