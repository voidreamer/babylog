import Foundation

// MARK: - DoctorVisit

struct DoctorVisit: Codable, Identifiable, Hashable, Sendable {
    let id: Int
    let babyId: Int
    let visitDate: String
    let visitType: String?
    let doctorName: String?
    let weightKg: Double?
    let heightCm: Double?
    let headCm: Double?
    let nextVisitDate: String?
    let notes: String?

    enum CodingKeys: String, CodingKey {
        case id
        case babyId = "baby_id"
        case visitDate = "visit_date"
        case visitType = "visit_type"
        case doctorName = "doctor_name"
        case weightKg = "weight_kg"
        case heightCm = "height_cm"
        case headCm = "head_cm"
        case nextVisitDate = "next_visit_date"
        case notes
    }
}

// MARK: - Vaccination

struct Vaccination: Codable, Identifiable, Hashable, Sendable {
    let id: Int
    let babyId: Int
    let vaccineName: String
    let doseNumber: Int
    let givenDate: String
    let administeredBy: String?
    let nextDueDate: String?
    let notes: String?

    enum CodingKeys: String, CodingKey {
        case id
        case babyId = "baby_id"
        case vaccineName = "vaccine_name"
        case doseNumber = "dose_number"
        case givenDate = "given_date"
        case administeredBy = "administered_by"
        case nextDueDate = "next_due_date"
        case notes
    }
}

// MARK: - Medication

struct Medication: Codable, Identifiable, Hashable, Sendable {
    let id: Int
    let babyId: Int
    let medicationName: String
    let dosage: String?
    let frequency: String?
    let startDate: String
    let endDate: String?
    let isActive: Bool
    let notes: String?

    enum CodingKeys: String, CodingKey {
        case id
        case babyId = "baby_id"
        case medicationName = "medication_name"
        case dosage
        case frequency
        case startDate = "start_date"
        case endDate = "end_date"
        case isActive = "is_active"
        case notes
    }
}

// MARK: - GrowthRecord

struct GrowthRecord: Codable, Identifiable, Hashable, Sendable {
    let id: Int
    let babyId: Int
    let recordedDate: String
    let weightKg: Double?
    let heightCm: Double?
    let headCm: Double?
    let notes: String?

    enum CodingKeys: String, CodingKey {
        case id
        case babyId = "baby_id"
        case recordedDate = "recorded_date"
        case weightKg = "weight_kg"
        case heightCm = "height_cm"
        case headCm = "head_cm"
        case notes
    }
}

// MARK: - Tooth

struct Tooth: Codable, Identifiable, Hashable, Sendable {
    let id: Int
    let babyId: Int
    let position: String
    let emergedDate: String

    enum CodingKeys: String, CodingKey {
        case id
        case babyId = "baby_id"
        case position
        case emergedDate = "emerged_date"
    }
}

// MARK: - SickDay

struct SickDay: Codable, Identifiable, Hashable, Sendable {
    let id: Int
    let babyId: Int
    let date: String
    let symptoms: [String]
    let temperature: Double?
    let notes: String?

    enum CodingKeys: String, CodingKey {
        case id
        case babyId = "baby_id"
        case date
        case symptoms
        case temperature
        case notes
    }
}

// MARK: - AllergySeverity

enum AllergySeverity: String, Codable, CaseIterable, Sendable {
    case mild
    case moderate
    case severe
}

// MARK: - Allergy

struct Allergy: Codable, Identifiable, Hashable, Sendable {
    let id: Int
    let babyId: Int
    let allergen: String
    let severity: AllergySeverity?
    let reaction: String?
    let discoveredDate: String?
    let notes: String?

    enum CodingKeys: String, CodingKey {
        case id
        case babyId = "baby_id"
        case allergen
        case severity
        case reaction
        case discoveredDate = "discovered_date"
        case notes
    }
}
