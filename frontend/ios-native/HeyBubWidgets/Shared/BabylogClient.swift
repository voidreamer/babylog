import Foundation

enum BabylogClientError: Error {
    case missingAuth
    case missingBaby
    case missingApiBase
    case http(Int, String)
    case decode
    case offline
}

/// HTTP client used by both the widget timeline provider and the App Intents.
/// Reads tokens from the shared Keychain, refreshes via Supabase when needed,
/// and queues offline writes through `PendingQueue` so the main app can drain
/// them later via the existing `PENDING_SYNC` pipeline.
struct BabylogClient {
    static let shared = BabylogClient()

    private var defaults: UserDefaults? { SharedDefaults.suite }

    var apiBase: String? { defaults?.string(forKey: SharedKeys.apiBaseUrl) }
    var supabaseUrl: String? { defaults?.string(forKey: SharedKeys.supabaseUrl) }
    var supabaseAnonKey: String? { defaults?.string(forKey: SharedKeys.supabaseAnonKey) }
    var selectedBabyId: Int? {
        let id = defaults?.integer(forKey: SharedKeys.selectedBabyId) ?? 0
        return id > 0 ? id : nil
    }
    var selectedBabyName: String? { defaults?.string(forKey: SharedKeys.selectedBabyName) }

    // MARK: - High-level operations

    func createDiaper(type: String) async throws {
        let baby = try requireBaby()
        let body: [String: Any] = [
            "baby_id": baby,
            "time": ISO8601DateFormatter.iso8601Z.string(from: Date()),
            "type": type
        ]
        try await postOrQueue(endpoint: "/diapers/", actionType: "CREATE_DIAPER", body: body)
    }

    func createFeeding(type: String, amountMl: Int? = nil, durationMinutes: Int? = nil) async throws {
        let baby = try requireBaby()
        var body: [String: Any] = [
            "baby_id": baby,
            "time": ISO8601DateFormatter.iso8601Z.string(from: Date()),
            "type": type
        ]
        if let v = amountMl { body["amount_ml"] = v }
        if let v = durationMinutes { body["duration_minutes"] = v }
        try await postOrQueue(endpoint: "/feedings/", actionType: "CREATE_FEEDING", body: body)
    }

    func startSleep() async throws {
        let baby = try requireBaby()
        let body: [String: Any] = [
            "baby_id": baby,
            "start_time": ISO8601DateFormatter.iso8601Z.string(from: Date()),
            "end_time": NSNull()
        ]
        try await postOrQueue(endpoint: "/sleeps/", actionType: "CREATE_SLEEP", body: body)
    }

    /// Ends the currently active sleep session. If we can't reach the network,
    /// queues an END_SLEEP marker; the main app will resolve the active
    /// session id when it drains.
    func endSleep() async throws {
        let baby = try requireBaby()
        // Try direct path first: GET active sleep, then POST /sleeps/{id}/end
        if let active = try? await fetchCurrentSleep(babyId: baby), let id = active.id {
            try await postRaw(endpoint: "/sleeps/\(id)/end", body: nil)
            return
        }
        // Fallback: queue as a "wake now" marker; React drain converts to endSleep
        // by looking up the current sleep at replay time.
        let body: [String: Any] = [
            "baby_id": baby,
            "wake_at": ISO8601DateFormatter.iso8601Z.string(from: Date())
        ]
        PendingQueue.enqueue(PendingAction(
            type: "END_SLEEP_BY_BABY",
            endpoint: "/sleeps/end-current",
            method: "POST",
            data: AnyCodable(body),
            created_at: ISO8601DateFormatter.iso8601Z.string(from: Date())
        ))
    }

    // MARK: - Read endpoints (timeline provider)

    struct DashboardSnapshot: Decodable {
        let lastFeedingAt: Date?
        let lastDiaperAt: Date?
        let currentSleepStart: Date?
        let lastSleepEnd: Date?
    }

    struct CurrentSleep: Decodable {
        let id: Int?
        let start_time: String?
    }

    func fetchDashboard() async throws -> DashboardSnapshot {
        let baby = try requireBaby()
        let tz = -TimeZone.current.secondsFromGMT() / 60
        let local = DateFormatter.yyyyMMddLocal.string(from: Date())
        let path = "/events/dashboard?baby_id=\(baby)&local_date=\(local)&tz_offset=\(tz)"
        let data = try await getRaw(endpoint: path)
        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            throw BabylogClientError.decode
        }
        let parser = ISO8601DateFormatter()
        parser.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        func parse(_ s: String?) -> Date? { s.flatMap { parser.date(from: $0) } }
        let lastFeed = (json["last_feeding"] as? [String: Any])?["time"] as? String
        let lastDiap = (json["last_diaper"] as? [String: Any])?["time"] as? String
        let cur = json["current_sleep"] as? [String: Any]
        let lastSleep = json["last_sleep"] as? [String: Any]
        return DashboardSnapshot(
            lastFeedingAt: parse(lastFeed),
            lastDiaperAt: parse(lastDiap),
            currentSleepStart: parse(cur?["start_time"] as? String),
            lastSleepEnd: parse(lastSleep?["end_time"] as? String)
        )
    }

    func fetchCurrentSleep(babyId: Int) async throws -> CurrentSleep {
        let data = try await getRaw(endpoint: "/sleeps/current?baby_id=\(babyId)")
        return try JSONDecoder().decode(CurrentSleep.self, from: data)
    }

    // MARK: - Network primitives

    private func requireBaby() throws -> Int {
        guard let id = selectedBabyId else { throw BabylogClientError.missingBaby }
        return id
    }

    private func authorizedRequest(_ url: URL, method: String, body: Data? = nil) async throws -> URLRequest {
        let token = try await ensureAccessToken()
        var req = URLRequest(url: url)
        req.httpMethod = method
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        req.httpBody = body
        return req
    }

    private func postRaw(endpoint: String, body: [String: Any]?) async throws {
        guard let base = apiBase, let url = URL(string: base + endpoint) else {
            throw BabylogClientError.missingApiBase
        }
        let payload = try body.map { try JSONSerialization.data(withJSONObject: $0) }
        let req = try await authorizedRequest(url, method: "POST", body: payload)
        let (data, resp) = try await URLSession.shared.data(for: req)
        guard let http = resp as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            let code = (resp as? HTTPURLResponse)?.statusCode ?? -1
            let msg = String(data: data, encoding: .utf8) ?? ""
            throw BabylogClientError.http(code, msg)
        }
    }

    private func getRaw(endpoint: String) async throws -> Data {
        guard let base = apiBase, let url = URL(string: base + endpoint) else {
            throw BabylogClientError.missingApiBase
        }
        let req = try await authorizedRequest(url, method: "GET")
        let (data, resp) = try await URLSession.shared.data(for: req)
        guard let http = resp as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            let code = (resp as? HTTPURLResponse)?.statusCode ?? -1
            let msg = String(data: data, encoding: .utf8) ?? ""
            throw BabylogClientError.http(code, msg)
        }
        return data
    }

    /// Try the network first; on any failure, write to PendingQueue and let the
    /// main app's existing sync pipeline replay it. This keeps the intent's
    /// `perform()` fast — never blocks on retries inside the extension.
    private func postOrQueue(endpoint: String, actionType: String, body: [String: Any]) async throws {
        do {
            try await postRaw(endpoint: endpoint, body: body)
        } catch {
            PendingQueue.enqueue(PendingAction(
                type: actionType,
                endpoint: endpoint,
                method: "POST",
                data: AnyCodable(body),
                created_at: ISO8601DateFormatter.iso8601Z.string(from: Date())
            ))
        }
    }

    // MARK: - Token refresh

    /// Returns a non-expired access token; refreshes via Supabase if needed.
    private func ensureAccessToken() async throws -> String {
        guard let token = SharedKeychain.read(key: SharedKeys.accessToken) else {
            throw BabylogClientError.missingAuth
        }
        let expiresAt = defaults?.double(forKey: SharedKeys.expiresAt) ?? 0
        // Refresh if within 60s of expiry
        if expiresAt > 0 && Date().timeIntervalSince1970 + 60 < expiresAt {
            return token
        }
        return try await refreshAccessToken() ?? token
    }

    private func refreshAccessToken() async throws -> String? {
        guard let refresh = SharedKeychain.read(key: SharedKeys.refreshToken),
              let supabase = supabaseUrl,
              let anonKey = supabaseAnonKey,
              let url = URL(string: "\(supabase)/auth/v1/token?grant_type=refresh_token") else {
            return nil
        }
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.setValue(anonKey, forHTTPHeaderField: "apikey")
        req.httpBody = try JSONSerialization.data(withJSONObject: ["refresh_token": refresh])
        let (data, resp) = try await URLSession.shared.data(for: req)
        guard let http = resp as? HTTPURLResponse, (200..<300).contains(http.statusCode),
              let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let access = json["access_token"] as? String,
              let newRefresh = json["refresh_token"] as? String,
              let expiresIn = json["expires_in"] as? Int else { return nil }
        try? SharedKeychain.write(key: SharedKeys.accessToken, value: access)
        try? SharedKeychain.write(key: SharedKeys.refreshToken, value: newRefresh)
        defaults?.set(Date().timeIntervalSince1970 + Double(expiresIn), forKey: SharedKeys.expiresAt)
        return access
    }
}

extension ISO8601DateFormatter {
    static let iso8601Z: ISO8601DateFormatter = {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime]
        return f
    }()
}

extension DateFormatter {
    static let yyyyMMddLocal: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        f.locale = Locale(identifier: "en_US_POSIX")
        return f
    }()
}
