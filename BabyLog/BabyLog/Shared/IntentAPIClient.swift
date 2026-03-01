import Foundation

/// Lightweight API client for use in App Intents and Widget extensions.
/// Does NOT use @Observable or @MainActor — safe for extension processes.
enum IntentAPIClient {

    private static var baseURL: String { Configuration.apiBaseURL }

    private static var token: String? {
        KeychainHelper.loadString(key: "access_token")
    }

    // MARK: - Feedings

    static func logFeeding(babyId: Int, type: String = "breast") async throws {
        let body: [String: Any] = [
            "baby_id": babyId,
            "time": isoNow(),
            "type": type,
            "duration_minutes": type == "breast" ? 15 : NSNull(),
            "amount_ml": (type == "formula" || type == "bottle") ? 120 : NSNull()
        ]
        try await post(endpoint: Endpoints.Feedings.base, body: body)
    }

    // MARK: - Diapers

    static func logDiaper(babyId: Int, type: String = "pee") async throws {
        let body: [String: Any] = [
            "baby_id": babyId,
            "time": isoNow(),
            "type": type
        ]
        try await post(endpoint: Endpoints.Diapers.base, body: body)
    }

    // MARK: - Sleep

    static func startSleep(babyId: Int) async throws -> SleepRecord {
        let body: [String: Any] = [
            "baby_id": babyId,
            "start_time": isoNow()
        ]
        return try await post(endpoint: Endpoints.Sleeps.base, body: body)
    }

    static func endSleep(sleepId: Int) async throws -> SleepRecord {
        return try await request(endpoint: Endpoints.Sleeps.end(sleepId), method: "PUT")
    }

    static func getCurrentSleep(babyId: Int) async throws -> SleepRecord? {
        return try await request(endpoint: Endpoints.Sleeps.current(babyId: babyId), method: "GET")
    }

    // MARK: - Pumping

    static func logPumping(babyId: Int) async throws {
        let body: [String: Any] = [
            "baby_id": babyId,
            "time": isoNow()
        ]
        try await post(endpoint: Endpoints.Pumpings.base, body: body)
    }

    // MARK: - Bath

    static func logBath(babyId: Int) async throws {
        let body: [String: Any] = [
            "baby_id": babyId,
            "time": isoNow()
        ]
        try await post(endpoint: Endpoints.Baths.base, body: body)
    }

    // MARK: - Tummy Time

    static func logTummyTime(babyId: Int) async throws {
        let body: [String: Any] = [
            "baby_id": babyId,
            "start_time": isoNow(),
            "duration_minutes": 5
        ]
        try await post(endpoint: Endpoints.TummyTimes.base, body: body)
    }

    // MARK: - Dashboard

    static func getDashboard(babyId: Int) async throws -> DashboardData {
        let tzOffset = TimeZone.current.secondsFromGMT() / 60
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd"
        let localDate = dateFormatter.string(from: Date())
        let endpoint = Endpoints.Events.dashboard(babyId: babyId, localDate: localDate, tzOffset: tzOffset)
        return try await request(endpoint: endpoint, method: "GET")
    }

    // MARK: - Private Helpers

    @discardableResult
    private static func post<T: Decodable>(endpoint: String, body: [String: Any]) async throws -> T {
        var request = try makeRequest(endpoint: endpoint, method: "POST")
        request.httpBody = try JSONSerialization.data(withJSONObject: body.compactMapValues { $0 is NSNull ? nil : $0 })
        let (data, response) = try await URLSession.shared.data(for: request)
        try checkResponse(response)
        return try JSONDecoder().decode(T.self, from: data)
    }

    private static func post(endpoint: String, body: [String: Any]) async throws {
        var request = try makeRequest(endpoint: endpoint, method: "POST")
        request.httpBody = try JSONSerialization.data(withJSONObject: body.compactMapValues { $0 is NSNull ? nil : $0 })
        let (_, response) = try await URLSession.shared.data(for: request)
        try checkResponse(response)
    }

    private static func request<T: Decodable>(endpoint: String, method: String) async throws -> T {
        let request = try makeRequest(endpoint: endpoint, method: method)
        let (data, response) = try await URLSession.shared.data(for: request)
        try checkResponse(response)
        return try JSONDecoder().decode(T.self, from: data)
    }

    private static func makeRequest(endpoint: String, method: String) throws -> URLRequest {
        guard let url = URL(string: baseURL + "/api" + endpoint) else {
            throw IntentAPIError.invalidURL
        }
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.timeoutInterval = 10
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        return request
    }

    private static func checkResponse(_ response: URLResponse) throws {
        guard let http = response as? HTTPURLResponse else {
            throw IntentAPIError.invalidResponse
        }
        guard (200...299).contains(http.statusCode) else {
            throw IntentAPIError.httpError(http.statusCode)
        }
    }

    private static func isoNow() -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        return formatter.string(from: Date())
    }
}

// MARK: - IntentAPIError

enum IntentAPIError: LocalizedError {
    case invalidURL
    case invalidResponse
    case httpError(Int)
    case noToken

    var errorDescription: String? {
        switch self {
        case .invalidURL: return "Invalid API URL"
        case .invalidResponse: return "Invalid server response"
        case .httpError(let code): return "Server error (\(code))"
        case .noToken: return "Not authenticated"
        }
    }
}
