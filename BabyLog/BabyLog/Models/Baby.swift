import Foundation

// MARK: - CaregiverRole

enum CaregiverRole: String, Codable, CaseIterable, Sendable {
    case viewer
    case caregiver
}

// MARK: - CaregiverEntry

struct CaregiverEntry: Codable, Identifiable, Hashable, Sendable {
    var id: String { email }
    let email: String
    let role: CaregiverRole
}

// MARK: - Baby

struct Baby: Codable, Identifiable, Hashable, Sendable {
    let id: Int
    let name: String
    let birthDate: String?
    let gender: String?
    let profilePhotoUrl: String?
    let bloodType: String?
    let birthplace: String?
    let birthTime: String?
    let isOwner: Bool?
    let sharedWith: [CaregiverEntry]?
    let createdAt: String?

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case birthDate = "birth_date"
        case gender
        case profilePhotoUrl = "profile_photo_url"
        case bloodType = "blood_type"
        case birthplace
        case birthTime = "birth_time"
        case isOwner = "is_owner"
        case sharedWith = "shared_with"
        case createdAt = "created_at"
    }
}
