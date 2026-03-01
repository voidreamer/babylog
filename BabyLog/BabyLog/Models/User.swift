import Foundation

// MARK: - User

struct AppUser: Codable, Identifiable, Hashable, Sendable {
    let id: String
    let email: String
}

// MARK: - Session

struct Session: Codable, Hashable, Sendable {
    let accessToken: String

    enum CodingKeys: String, CodingKey {
        case accessToken = "access_token"
    }
}

// MARK: - SyncAction

struct SyncAction: Codable, Identifiable, Hashable, Sendable {
    let id: Int?
    let type: String
    let endpoint: String?
    let method: String?
    let data: [String: AnyCodable]?
    let createdAt: String?
    let retryCount: Int?
    let lastRetry: String?

    enum CodingKeys: String, CodingKey {
        case id
        case type
        case endpoint
        case method
        case data
        case createdAt = "created_at"
        case retryCount = "retry_count"
        case lastRetry = "last_retry"
    }
}
