import Foundation

// MARK: - SubscriptionStatus

struct SubscriptionStatus: Codable, Hashable, Sendable {
    let premium: Bool
}

// MARK: - PromoResult

struct PromoResult: Codable, Hashable, Sendable {
    let valid: Bool
    let premium: Bool
    let message: String?
}
