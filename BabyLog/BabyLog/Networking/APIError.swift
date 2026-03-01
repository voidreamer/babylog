import Foundation

enum APIError: LocalizedError, Sendable {
    case unauthorized
    case notFound
    case serverError(statusCode: Int, message: String)
    case networkError(Error)
    case decodingError(Error)
    case noData
    case offline

    var errorDescription: String? {
        switch self {
        case .unauthorized: return "Unauthorized"
        case .notFound: return "Not found"
        case .serverError(_, let message): return message
        case .networkError(let error): return error.localizedDescription
        case .decodingError(let error): return "Decoding error: \(error.localizedDescription)"
        case .noData: return "No data"
        case .offline: return "You are offline"
        }
    }
}
