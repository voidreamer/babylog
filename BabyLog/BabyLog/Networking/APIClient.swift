import Foundation
import Observation

// Configuration is defined in Auth/Configuration.swift

// MARK: - Flexible ISO8601 Date Decoding

/// A custom JSONDecoder.DateDecodingStrategy that handles:
///   - Full ISO 8601 with fractional seconds  ("2024-03-15T10:30:00.000Z")
///   - Full ISO 8601 without fractional seconds ("2024-03-15T10:30:00Z")
///   - Date-only strings                       ("2024-03-15")
private let flexibleDateFormatter: DateFormatter = {
    let f = DateFormatter()
    f.locale = Locale(identifier: "en_US_POSIX")
    f.timeZone = TimeZone(secondsFromGMT: 0)
    return f
}()

private let flexibleDateDecodingStrategy: JSONDecoder.DateDecodingStrategy = .custom { decoder in
    let container = try decoder.singleValueContainer()
    let string = try container.decode(String.self)

    // 1. ISO 8601 with fractional seconds
    let isoFractional = ISO8601DateFormatter()
    isoFractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    if let date = isoFractional.date(from: string) { return date }

    // 2. ISO 8601 without fractional seconds
    let iso = ISO8601DateFormatter()
    iso.formatOptions = [.withInternetDateTime]
    if let date = iso.date(from: string) { return date }

    // 3. Date-only "yyyy-MM-dd"
    let df = flexibleDateFormatter
    df.dateFormat = "yyyy-MM-dd"
    if let date = df.date(from: string) { return date }

    throw DecodingError.dataCorruptedError(
        in: container,
        debugDescription: "Cannot decode date from: \(string)"
    )
}

// MARK: - Inline Response Stubs
// Lightweight types for endpoints whose response shape is not yet in the Models layer.
// Replace these with proper model imports as the Models layer grows.

// MARK: - API Response Types
// Types not already in the Models layer.

struct UpcomingResponse: Codable, Sendable {
    let upcoming: [UpcomingItem]
}

struct RestPlanData: Codable, Sendable {
    let babyId: Int?
    let plan: [String: AnyCodable]?

    enum CodingKeys: String, CodingKey {
        case babyId = "baby_id"
        case plan
    }
}

struct UserInfo: Codable, Sendable {
    let email: String?
    let onboardingCompleted: Bool?
    let tourCompleted: Bool?

    enum CodingKeys: String, CodingKey {
        case email
        case onboardingCompleted = "onboarding_completed"
        case tourCompleted = "tour_completed"
    }
}

struct CheckoutSession: Codable, Sendable {
    let url: String?
    let sessionId: String?

    enum CodingKeys: String, CodingKey {
        case url
        case sessionId = "session_id"
    }
}

struct BillingSubscription: Codable, Sendable {
    let status: String?
    let currentPeriodEnd: String?
    let cancelAtPeriodEnd: Bool?

    enum CodingKeys: String, CodingKey {
        case status
        case currentPeriodEnd = "current_period_end"
        case cancelAtPeriodEnd = "cancel_at_period_end"
    }
}

struct BillingPortal: Codable, Sendable {
    let url: String?
}

struct ExportData: Codable, Sendable {
    let data: [String: AnyCodable]?
}

// MARK: - Share / Caregiver request bodies

private struct ShareBabyRequest: Encodable {
    let email: String
    let role: String
}

private struct UpdateCaregiverRequest: Encodable {
    let email: String
    let role: String
}

private struct CheckoutRequest: Encodable {
    let priceId: String
    let successUrl: String
    let cancelUrl: String

    enum CodingKeys: String, CodingKey {
        case priceId = "price_id"
        case successUrl = "success_url"
        case cancelUrl = "cancel_url"
    }
}

// MARK: - APIClient

@Observable
@MainActor
final class APIClient {

    // MARK: Dependencies

    /// Closure that returns a valid bearer token (e.g. Supabase access token).
    /// Set this from the auth layer on app launch.
    var tokenProvider: (() async -> String?)?

    /// Called when the server returns 401, so the auth layer can sign out / re-authenticate.
    var onUnauthorized: (() async -> Void)?

    // MARK: Private

    private let session: URLSession = .shared
    private let baseURL: String = Configuration.apiBaseURL

    private let decoder: JSONDecoder = {
        let d = JSONDecoder()
        // Do NOT use .convertFromSnakeCase — models define explicit CodingKeys
        d.dateDecodingStrategy = flexibleDateDecodingStrategy
        return d
    }()

    private let encoder: JSONEncoder = {
        let e = JSONEncoder()
        // Do NOT use .convertToSnakeCase — models define explicit CodingKeys
        return e
    }()

    nonisolated init() {}

    // MARK: - Generic Request

    /// Perform an HTTP request and decode the response into `T`.
    func request<T: Decodable>(
        _ endpoint: String,
        method: String = "GET",
        body: (some Encodable)? = nil as EmptyBody?
    ) async throws -> T {
        let data = try await rawRequest(endpoint, method: method, body: body)
        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            throw APIError.decodingError(error)
        }
    }

    /// Perform an HTTP request that returns no meaningful body (e.g. 204 DELETE).
    func requestVoid(
        _ endpoint: String,
        method: String = "GET",
        body: (some Encodable)? = nil as EmptyBody?
    ) async throws {
        _ = try await rawRequest(endpoint, method: method, body: body)
    }

    // MARK: - Raw Request

    private func rawRequest(
        _ endpoint: String,
        method: String,
        body: (some Encodable)?
    ) async throws -> Data {
        guard let url = URL(string: baseURL + "/api" + endpoint) else {
            throw APIError.networkError(URLError(.badURL))
        }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.timeoutInterval = 15
        request.cachePolicy = .reloadIgnoringLocalCacheData
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        // Bearer auth
        if let provider = tokenProvider, let token = await provider() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        // Body
        if let body, !(body is EmptyBody) {
            request.httpBody = try encoder.encode(body)
        }

        let data: Data
        let response: URLResponse
        do {
            (data, response) = try await session.data(for: request)
        } catch {
            throw APIError.networkError(error)
        }

        guard let http = response as? HTTPURLResponse else {
            throw APIError.noData
        }

        switch http.statusCode {
        case 200...299:
            return data
        case 401:
            await onUnauthorized?()
            throw APIError.unauthorized
        case 404:
            throw APIError.notFound
        default:
            let message = parseErrorMessage(from: data) ?? "HTTP \(http.statusCode)"
            throw APIError.serverError(statusCode: http.statusCode, message: message)
        }
    }

    /// Parse the FastAPI error detail from a JSON response body.
    private func parseErrorMessage(from data: Data) -> String? {
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let detail = json["detail"] else { return nil }
        if let string = detail as? String { return string }
        if let array = detail as? [[String: Any]] {
            return array.compactMap { $0["msg"] as? String }.joined(separator: "; ")
        }
        if let raw = try? JSONSerialization.data(withJSONObject: detail),
           let string = String(data: raw, encoding: .utf8) {
            return string
        }
        return nil
    }

    // MARK: - Babies

    func getBabies() async throws -> [Baby] {
        try await request(Endpoints.Babies.list)
    }

    func getBaby(id: Int) async throws -> Baby {
        try await request(Endpoints.Babies.detail(id))
    }

    func createBaby(_ data: some Encodable) async throws -> Baby {
        try await request(Endpoints.Babies.list, method: "POST", body: data)
    }

    func updateBaby(id: Int, _ data: some Encodable) async throws -> Baby {
        try await request(Endpoints.Babies.detail(id), method: "PUT", body: data)
    }

    func deleteBaby(id: Int) async throws {
        try await requestVoid(Endpoints.Babies.detail(id), method: "DELETE")
    }

    func shareBaby(id: Int, email: String, role: String = "caregiver") async throws {
        try await requestVoid(
            Endpoints.Babies.share(id),
            method: "POST",
            body: ShareBabyRequest(email: email, role: role)
        )
    }

    func unshareBaby(id: Int, email: String) async throws {
        try await requestVoid(Endpoints.Babies.unshare(id, email: email), method: "DELETE")
    }

    func updateCaregiverRole(babyId: Int, email: String, role: String) async throws {
        try await requestVoid(
            Endpoints.Babies.caregiverRole(babyId, email: email),
            method: "PATCH",
            body: UpdateCaregiverRequest(email: email, role: role)
        )
    }

    // MARK: - Feedings

    func getFeedings(babyId: Int, limit: Int = 50) async throws -> [Feeding] {
        try await request(Endpoints.Feedings.list(babyId: babyId, limit: limit))
    }

    func createFeeding(_ data: some Encodable) async throws -> Feeding {
        try await request(Endpoints.Feedings.base, method: "POST", body: data)
    }

    func deleteFeeding(id: Int) async throws {
        try await requestVoid(Endpoints.Feedings.detail(id), method: "DELETE")
    }

    func updateFeeding(id: Int, _ data: some Encodable) async throws -> Feeding {
        try await request(Endpoints.Feedings.detail(id), method: "PUT", body: data)
    }

    // MARK: - Diapers

    func getDiapers(babyId: Int, limit: Int = 50) async throws -> [Diaper] {
        try await request(Endpoints.Diapers.list(babyId: babyId, limit: limit))
    }

    func createDiaper(_ data: some Encodable) async throws -> Diaper {
        try await request(Endpoints.Diapers.base, method: "POST", body: data)
    }

    func deleteDiaper(id: Int) async throws {
        try await requestVoid(Endpoints.Diapers.detail(id), method: "DELETE")
    }

    func updateDiaper(id: Int, _ data: some Encodable) async throws -> Diaper {
        try await request(Endpoints.Diapers.detail(id), method: "PUT", body: data)
    }

    // MARK: - Sleeps

    func getSleeps(babyId: Int, limit: Int = 50) async throws -> [SleepRecord] {
        try await request(Endpoints.Sleeps.list(babyId: babyId, limit: limit))
    }

    func getCurrentSleep(babyId: Int) async throws -> SleepRecord? {
        try await request(Endpoints.Sleeps.current(babyId: babyId))
    }

    func createSleep(_ data: some Encodable) async throws -> SleepRecord {
        try await request(Endpoints.Sleeps.base, method: "POST", body: data)
    }

    func endSleep(id: Int) async throws -> SleepRecord {
        try await request(Endpoints.Sleeps.end(id), method: "POST")
    }

    func deleteSleep(id: Int) async throws {
        try await requestVoid(Endpoints.Sleeps.detail(id), method: "DELETE")
    }

    func updateSleep(id: Int, _ data: some Encodable) async throws -> SleepRecord {
        try await request(Endpoints.Sleeps.detail(id), method: "PUT", body: data)
    }

    // MARK: - Pumpings

    func getPumpings(babyId: Int, limit: Int = 50) async throws -> [Pumping] {
        try await request(Endpoints.Pumpings.list(babyId: babyId, limit: limit))
    }

    func createPumping(_ data: some Encodable) async throws -> Pumping {
        try await request(Endpoints.Pumpings.base, method: "POST", body: data)
    }

    func deletePumping(id: Int) async throws {
        try await requestVoid(Endpoints.Pumpings.detail(id), method: "DELETE")
    }

    func updatePumping(id: Int, _ data: some Encodable) async throws -> Pumping {
        try await request(Endpoints.Pumpings.detail(id), method: "PUT", body: data)
    }

    // MARK: - Events

    func getTimeline(babyId: Int, date: String? = nil, tzOffset: Int? = nil) async throws -> [TimelineEvent] {
        try await request(Endpoints.Events.timeline(babyId: babyId, date: date, tzOffset: tzOffset))
    }

    func getDashboard(babyId: Int, localDate: String? = nil, tzOffset: Int? = nil) async throws -> DashboardData {
        try await request(Endpoints.Events.dashboard(babyId: babyId, localDate: localDate, tzOffset: tzOffset))
    }

    // MARK: - Health: Doctor Visits

    func getDoctorVisits(babyId: Int) async throws -> [DoctorVisit] {
        try await request(Endpoints.DoctorVisits.list(babyId: babyId))
    }

    func createDoctorVisit(_ data: some Encodable) async throws -> DoctorVisit {
        try await request(Endpoints.DoctorVisits.base, method: "POST", body: data)
    }

    func deleteDoctorVisit(id: Int) async throws {
        try await requestVoid(Endpoints.DoctorVisits.detail(id), method: "DELETE")
    }

    func updateDoctorVisit(id: Int, _ data: some Encodable) async throws -> DoctorVisit {
        try await request(Endpoints.DoctorVisits.detail(id), method: "PUT", body: data)
    }

    // MARK: - Health: Vaccinations

    func getVaccinations(babyId: Int) async throws -> [Vaccination] {
        try await request(Endpoints.Vaccinations.list(babyId: babyId))
    }

    func createVaccination(_ data: some Encodable) async throws -> Vaccination {
        try await request(Endpoints.Vaccinations.base, method: "POST", body: data)
    }

    func deleteVaccination(id: Int) async throws {
        try await requestVoid(Endpoints.Vaccinations.detail(id), method: "DELETE")
    }

    func updateVaccination(id: Int, _ data: some Encodable) async throws -> Vaccination {
        try await request(Endpoints.Vaccinations.detail(id), method: "PUT", body: data)
    }

    // MARK: - Health: Medications

    func getMedications(babyId: Int, activeOnly: Bool = false) async throws -> [Medication] {
        try await request(Endpoints.Medications.list(babyId: babyId, activeOnly: activeOnly))
    }

    func createMedication(_ data: some Encodable) async throws -> Medication {
        try await request(Endpoints.Medications.base, method: "POST", body: data)
    }

    func deleteMedication(id: Int) async throws {
        try await requestVoid(Endpoints.Medications.detail(id), method: "DELETE")
    }

    func updateMedication(id: Int, _ data: some Encodable) async throws -> Medication {
        try await request(Endpoints.Medications.detail(id), method: "PUT", body: data)
    }

    func toggleMedicationActive(id: Int) async throws -> Medication {
        try await request(Endpoints.Medications.toggle(id), method: "PATCH")
    }

    // MARK: - Health: Growth Records

    func getGrowthRecords(babyId: Int) async throws -> [GrowthRecord] {
        try await request(Endpoints.Growth.list(babyId: babyId))
    }

    func createGrowthRecord(_ data: some Encodable) async throws -> GrowthRecord {
        try await request(Endpoints.Growth.base, method: "POST", body: data)
    }

    func deleteGrowthRecord(id: Int) async throws {
        try await requestVoid(Endpoints.Growth.detail(id), method: "DELETE")
    }

    func updateGrowthRecord(id: Int, _ data: some Encodable) async throws -> GrowthRecord {
        try await request(Endpoints.Growth.detail(id), method: "PUT", body: data)
    }

    // MARK: - Health: Teeth

    func getTeeth(babyId: Int) async throws -> [Tooth] {
        try await request(Endpoints.Teeth.list(babyId: babyId))
    }

    func createTooth(_ data: some Encodable) async throws -> Tooth {
        try await request(Endpoints.Teeth.base, method: "POST", body: data)
    }

    func updateTooth(id: Int, _ data: some Encodable) async throws -> Tooth {
        try await request(Endpoints.Teeth.detail(id), method: "PUT", body: data)
    }

    func deleteTooth(id: Int) async throws {
        try await requestVoid(Endpoints.Teeth.detail(id), method: "DELETE")
    }

    // MARK: - Health: Sick Days

    func getSickDays(babyId: Int) async throws -> [SickDay] {
        try await request(Endpoints.SickDays.list(babyId: babyId))
    }

    func createSickDay(_ data: some Encodable) async throws -> SickDay {
        try await request(Endpoints.SickDays.base, method: "POST", body: data)
    }

    func updateSickDay(id: Int, _ data: some Encodable) async throws -> SickDay {
        try await request(Endpoints.SickDays.detail(id), method: "PUT", body: data)
    }

    func deleteSickDay(id: Int) async throws {
        try await requestVoid(Endpoints.SickDays.detail(id), method: "DELETE")
    }

    // MARK: - Health: Allergies

    func getAllergies(babyId: Int) async throws -> [Allergy] {
        try await request(Endpoints.Allergies.list(babyId: babyId))
    }

    func createAllergy(_ data: some Encodable) async throws -> Allergy {
        try await request(Endpoints.Allergies.base, method: "POST", body: data)
    }

    func updateAllergy(id: Int, _ data: some Encodable) async throws -> Allergy {
        try await request(Endpoints.Allergies.detail(id), method: "PUT", body: data)
    }

    func deleteAllergy(id: Int) async throws {
        try await requestVoid(Endpoints.Allergies.detail(id), method: "DELETE")
    }

    // MARK: - Health: Upcoming

    func getUpcoming(babyId: Int) async throws -> UpcomingResponse {
        try await request(Endpoints.Upcoming.list(babyId: babyId))
    }

    // MARK: - Activities: Potty

    func getPottyLogs(babyId: Int, limit: Int = 50) async throws -> [PottyLog] {
        try await request(Endpoints.Potty.list(babyId: babyId, limit: limit))
    }

    func createPottyLog(_ data: some Encodable) async throws -> PottyLog {
        try await request(Endpoints.Potty.base, method: "POST", body: data)
    }

    func deletePottyLog(id: Int) async throws {
        try await requestVoid(Endpoints.Potty.detail(id), method: "DELETE")
    }

    func updatePottyLog(id: Int, _ data: some Encodable) async throws -> PottyLog {
        try await request(Endpoints.Potty.detail(id), method: "PUT", body: data)
    }

    // MARK: - Activities: Tummy Time

    func getTummyTimes(babyId: Int, limit: Int = 50) async throws -> [TummyTime] {
        try await request(Endpoints.TummyTimes.list(babyId: babyId, limit: limit))
    }

    func createTummyTime(_ data: some Encodable) async throws -> TummyTime {
        try await request(Endpoints.TummyTimes.base, method: "POST", body: data)
    }

    func deleteTummyTime(id: Int) async throws {
        try await requestVoid(Endpoints.TummyTimes.detail(id), method: "DELETE")
    }

    func updateTummyTime(id: Int, _ data: some Encodable) async throws -> TummyTime {
        try await request(Endpoints.TummyTimes.detail(id), method: "PUT", body: data)
    }

    // MARK: - Activities: Baths

    func getBaths(babyId: Int, limit: Int = 50) async throws -> [Bath] {
        try await request(Endpoints.Baths.list(babyId: babyId, limit: limit))
    }

    func createBath(_ data: some Encodable) async throws -> Bath {
        try await request(Endpoints.Baths.base, method: "POST", body: data)
    }

    func deleteBath(id: Int) async throws {
        try await requestVoid(Endpoints.Baths.detail(id), method: "DELETE")
    }

    func updateBath(id: Int, _ data: some Encodable) async throws -> Bath {
        try await request(Endpoints.Baths.detail(id), method: "PUT", body: data)
    }

    // MARK: - Activities: Supplements

    func getSupplements(babyId: Int, limit: Int = 50) async throws -> [Supplement] {
        try await request(Endpoints.Supplements.list(babyId: babyId, limit: limit))
    }

    func createSupplement(_ data: some Encodable) async throws -> Supplement {
        try await request(Endpoints.Supplements.base, method: "POST", body: data)
    }

    func deleteSupplement(id: Int) async throws {
        try await requestVoid(Endpoints.Supplements.detail(id), method: "DELETE")
    }

    func updateSupplement(id: Int, _ data: some Encodable) async throws -> Supplement {
        try await request(Endpoints.Supplements.detail(id), method: "PUT", body: data)
    }

    // MARK: - Rest Planner

    func getRestPlan(babyId: Int, days: Int = 7) async throws -> RestPlanData? {
        let tzOffset = TimeZone.current.secondsFromGMT() / 60
        return try await request(Endpoints.RestPlanner.plan(babyId: babyId, days: days, tzOffset: tzOffset))
    }

    // MARK: - Analytics

    func getAnalytics(babyId: Int, days: Int = 7) async throws -> AnalyticsData {
        let tzOffset = TimeZone.current.secondsFromGMT() / 60
        return try await request(Endpoints.Analytics.data(babyId: babyId, days: days, tzOffset: tzOffset))
    }

    // MARK: - Subscription

    func getSubscriptionStatus() async throws -> SubscriptionStatus {
        try await request(Endpoints.Subscription.status)
    }

    // MARK: - User

    func getUserInfo() async throws -> UserInfo {
        try await request(Endpoints.Users.me)
    }

    func completeOnboarding() async throws {
        try await requestVoid(Endpoints.Users.onboarding, method: "POST")
    }

    func completeTour() async throws {
        try await requestVoid(Endpoints.Users.tour, method: "POST")
    }

    func deleteAccount() async throws {
        try await requestVoid(Endpoints.Users.me, method: "DELETE")
    }

    // MARK: - Billing

    func createCheckoutSession(priceId: String, successUrl: String, cancelUrl: String) async throws -> CheckoutSession {
        try await request(
            Endpoints.Billing.createCheckout,
            method: "POST",
            body: CheckoutRequest(priceId: priceId, successUrl: successUrl, cancelUrl: cancelUrl)
        )
    }

    func getBillingSubscription() async throws -> BillingSubscription {
        try await request(Endpoints.Billing.subscription)
    }

    func createBillingPortal() async throws -> BillingPortal {
        try await request(Endpoints.Billing.portal, method: "POST")
    }

    // MARK: - Export

    func exportBabyDataJson(babyId: Int, startDate: String? = nil, endDate: String? = nil) async throws -> ExportData {
        try await request(Endpoints.Export.json(babyId: babyId, startDate: startDate, endDate: endDate))
    }
}

// MARK: - EmptyBody

/// Sentinel type used as the default generic body when no body is needed.
struct EmptyBody: Encodable {}
