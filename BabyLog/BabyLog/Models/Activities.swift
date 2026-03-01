import Foundation

// MARK: - FeedingType

enum FeedingType: String, Codable, CaseIterable, Sendable {
    case breast
    case bottle
    case formula
    case breastmilkBottle = "breastmilk_bottle"
    case solid
}

// MARK: - Feeding

struct Feeding: Codable, Identifiable, Hashable, Sendable {
    let id: IntOrString
    let babyId: Int
    let time: String
    let type: FeedingType
    let durationMinutes: Double?
    let amountMl: Double?
    let notes: String?
    let createdAt: String?

    enum CodingKeys: String, CodingKey {
        case id
        case babyId = "baby_id"
        case time
        case type
        case durationMinutes = "duration_minutes"
        case amountMl = "amount_ml"
        case notes
        case createdAt = "created_at"
    }
}

// MARK: - DiaperType

enum DiaperType: String, Codable, CaseIterable, Sendable {
    case pee
    case poo
    case mixed
}

// MARK: - Diaper

struct Diaper: Codable, Identifiable, Hashable, Sendable {
    let id: IntOrString
    let babyId: Int
    let time: String
    let type: DiaperType
    let pooColor: String?
    let pooConsistency: String?
    let pooAmount: String?
    let notes: String?
    let createdAt: String?

    enum CodingKeys: String, CodingKey {
        case id
        case babyId = "baby_id"
        case time
        case type
        case pooColor = "poo_color"
        case pooConsistency = "poo_consistency"
        case pooAmount = "poo_amount"
        case notes
        case createdAt = "created_at"
    }
}

// MARK: - Sleep

struct SleepRecord: Codable, Identifiable, Hashable, Sendable {
    let id: IntOrString
    let babyId: Int
    let startTime: String
    let endTime: String?
    let durationMinutes: Double?
    let notes: String?
    let createdAt: String?

    enum CodingKeys: String, CodingKey {
        case id
        case babyId = "baby_id"
        case startTime = "start_time"
        case endTime = "end_time"
        case durationMinutes = "duration_minutes"
        case notes
        case createdAt = "created_at"
    }
}

// MARK: - Pumping

struct Pumping: Codable, Identifiable, Hashable, Sendable {
    let id: IntOrString
    let babyId: Int
    let time: String
    let durationMinutes: Double?
    let amountMl: Double?
    let notes: String?
    let createdAt: String?

    enum CodingKeys: String, CodingKey {
        case id
        case babyId = "baby_id"
        case time
        case durationMinutes = "duration_minutes"
        case amountMl = "amount_ml"
        case notes
        case createdAt = "created_at"
    }
}

// MARK: - PottyResult

enum PottyResult: String, Codable, CaseIterable, Sendable {
    case success
    case attempt
    case accident
}

// MARK: - PottyLog

struct PottyLog: Codable, Identifiable, Hashable, Sendable {
    let id: IntOrString
    let babyId: Int
    let time: String
    let result: PottyResult
    let pottyType: String?
    let notes: String?
    let createdAt: String?

    enum CodingKeys: String, CodingKey {
        case id
        case babyId = "baby_id"
        case time
        case result
        case pottyType = "potty_type"
        case notes
        case createdAt = "created_at"
    }
}

// MARK: - TummyTime

struct TummyTime: Codable, Identifiable, Hashable, Sendable {
    let id: IntOrString
    let babyId: Int
    let startTime: String
    let durationMinutes: Double?
    let notes: String?
    let createdAt: String?

    enum CodingKeys: String, CodingKey {
        case id
        case babyId = "baby_id"
        case startTime = "start_time"
        case durationMinutes = "duration_minutes"
        case notes
        case createdAt = "created_at"
    }
}

// MARK: - Bath

struct Bath: Codable, Identifiable, Hashable, Sendable {
    let id: IntOrString
    let babyId: Int
    let time: String
    let notes: String?
    let createdAt: String?

    enum CodingKeys: String, CodingKey {
        case id
        case babyId = "baby_id"
        case time
        case notes
        case createdAt = "created_at"
    }
}

// MARK: - Supplement

struct Supplement: Codable, Identifiable, Hashable, Sendable {
    let id: IntOrString
    let babyId: Int
    let time: String
    let name: String
    let dosage: String?
    let notes: String?
    let createdAt: String?

    enum CodingKeys: String, CodingKey {
        case id
        case babyId = "baby_id"
        case time
        case name
        case dosage
        case notes
        case createdAt = "created_at"
    }
}
