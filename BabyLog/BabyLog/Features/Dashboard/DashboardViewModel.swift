import ActivityKit
import Foundation
import Observation

// MARK: - Quick-Log Request Bodies

private struct QuickFeedingRequest: Encodable {
    let babyId: Int
    let time: String
    let type: String
    let durationMinutes: Double?
    let amountMl: Double?

    enum CodingKeys: String, CodingKey {
        case babyId = "baby_id"
        case time
        case type
        case durationMinutes = "duration_minutes"
        case amountMl = "amount_ml"
    }
}

private struct QuickDiaperRequest: Encodable {
    let babyId: Int
    let time: String
    let type: String

    enum CodingKeys: String, CodingKey {
        case babyId = "baby_id"
        case time
        case type
    }
}

private struct QuickSleepRequest: Encodable {
    let babyId: Int
    let startTime: String

    enum CodingKeys: String, CodingKey {
        case babyId = "baby_id"
        case startTime = "start_time"
    }
}

private struct QuickPumpingRequest: Encodable {
    let babyId: Int
    let time: String

    enum CodingKeys: String, CodingKey {
        case babyId = "baby_id"
        case time
    }
}

private struct QuickPottyRequest: Encodable {
    let babyId: Int
    let time: String
    let result: String

    enum CodingKeys: String, CodingKey {
        case babyId = "baby_id"
        case time
        case result
    }
}

private struct QuickTummyTimeRequest: Encodable {
    let babyId: Int
    let startTime: String
    let durationMinutes: Double

    enum CodingKeys: String, CodingKey {
        case babyId = "baby_id"
        case startTime = "start_time"
        case durationMinutes = "duration_minutes"
    }
}

private struct QuickBathRequest: Encodable {
    let babyId: Int
    let time: String

    enum CodingKeys: String, CodingKey {
        case babyId = "baby_id"
        case time
    }
}

// MARK: - DashboardViewModel

@Observable
@MainActor
final class DashboardViewModel {
    var dashboardData: DashboardData?
    var analyticsData: AnalyticsData?
    var upcomingItems: [UpcomingItem] = []
    var isLoading = false
    var error: String?

    // Quick-log state
    var isQuickLogging = false
    var quickLogSuccess: String?

    // Widget visibility (persisted in UserDefaults)
    var visibleWidgets: Set<String> {
        get {
            let saved = UserDefaults.standard.stringArray(forKey: "visibleWidgets")
            return Set(saved ?? ["feeding", "diaper", "sleep", "pumping", "potty", "tummy", "bath", "supplement"])
        }
        set {
            UserDefaults.standard.set(Array(newValue), forKey: "visibleWidgets")
        }
    }

    private let apiClient: APIClient

    init(apiClient: APIClient = APIClient()) {
        self.apiClient = apiClient
    }

    func loadDashboard(babyId: Int) async {
        isLoading = true
        defer { isLoading = false }
        do {
            let tzOffset = TimeZone.current.secondsFromGMT() / 60
            let dateFormatter = DateFormatter()
            dateFormatter.dateFormat = "yyyy-MM-dd"
            let localDate = dateFormatter.string(from: Date())

            dashboardData = try await apiClient.getDashboard(
                babyId: babyId,
                localDate: localDate,
                tzOffset: tzOffset
            )

            // Write snapshot to shared defaults for widgets/intents
            SharedDefaults.dashboardSnapshot = dashboardData
            SharedDefaults.selectedBabyId = babyId
            SharedDefaults.lastSyncDate = Date()
        } catch {
            self.error = error.localizedDescription
        }
    }

    func loadAnalytics(babyId: Int) async {
        do {
            let tzOffset = TimeZone.current.secondsFromGMT() / 60
            analyticsData = try await apiClient.request(
                Endpoints.Analytics.data(babyId: babyId, days: 7, tzOffset: tzOffset)
            )

            // Write predictions to shared defaults for widgets
            SharedDefaults.analyticsSnapshot = analyticsData?.predictions
        } catch {
            // Non-critical, silently fail
        }
    }

    func loadUpcoming(babyId: Int) async {
        do {
            let response = try await apiClient.getUpcoming(babyId: babyId)
            upcomingItems = response.upcoming
        } catch {
            // Non-critical, silently fail
        }
    }

    func toggleWidget(_ type: String) {
        var widgets = visibleWidgets
        if widgets.contains(type) {
            widgets.remove(type)
        } else {
            widgets.insert(type)
        }
        visibleWidgets = widgets
    }

    // MARK: - Quick-Log Methods

    func quickLogFeeding(babyId: Int, type: FeedingType) async {
        let now = isoNow()
        let durationMinutes: Double? = (type == .breast) ? 15 : nil
        let amountMl: Double? = (type == .formula || type == .bottle) ? 120 : nil

        let request = QuickFeedingRequest(
            babyId: babyId,
            time: now,
            type: type.rawValue,
            durationMinutes: durationMinutes,
            amountMl: amountMl
        )

        await performQuickLog(babyId: babyId, toast: "\(type.rawValue.capitalized) feeding logged") {
            let _: Feeding = try await self.apiClient.request(
                Endpoints.Feedings.base,
                method: "POST",
                body: request
            )
        }
    }

    func quickLogDiaper(babyId: Int, type: DiaperType) async {
        let request = QuickDiaperRequest(
            babyId: babyId,
            time: isoNow(),
            type: type.rawValue
        )

        await performQuickLog(babyId: babyId, toast: "\(type.rawValue.capitalized) diaper logged") {
            let _: Diaper = try await self.apiClient.request(
                Endpoints.Diapers.base,
                method: "POST",
                body: request
            )
        }
    }

    func quickLogStartSleep(babyId: Int, babyName: String? = nil) async {
        let now = isoNow()
        let request = QuickSleepRequest(
            babyId: babyId,
            startTime: now
        )

        await performQuickLog(babyId: babyId, toast: "Sleep started") {
            let sleep: SleepRecord = try await self.apiClient.request(
                Endpoints.Sleeps.base,
                method: "POST",
                body: request
            )

            // Start Live Activity
            if let sleepIdInt = sleep.id.intValue {
                let name = babyName ?? SharedDefaults.selectedBabyName ?? "Baby"
                let startDate = self.parseISO8601(now) ?? Date()
                SleepActivityManager.startActivity(babyName: name, startTime: startDate, sleepId: sleepIdInt)
            }
        }
    }

    func quickLogEndSleep(babyId: Int) async {
        guard let sleepId = dashboardData?.currentSleep?.id.intValue else { return }

        await performQuickLog(babyId: babyId, toast: "Sleep ended") {
            let _: SleepRecord = try await self.apiClient.endSleep(id: sleepId)
            SleepActivityManager.endActivity()
        }
    }

    func quickLogPumping(babyId: Int) async {
        let request = QuickPumpingRequest(
            babyId: babyId,
            time: isoNow()
        )

        await performQuickLog(babyId: babyId, toast: "Pumping logged") {
            let _: Pumping = try await self.apiClient.request(
                Endpoints.Pumpings.base,
                method: "POST",
                body: request
            )
        }
    }

    func quickLogPotty(babyId: Int) async {
        let request = QuickPottyRequest(
            babyId: babyId,
            time: isoNow(),
            result: "success"
        )

        await performQuickLog(babyId: babyId, toast: "Potty logged") {
            let _: PottyLog = try await self.apiClient.request(
                Endpoints.Potty.base,
                method: "POST",
                body: request
            )
        }
    }

    func quickLogTummyTime(babyId: Int) async {
        let request = QuickTummyTimeRequest(
            babyId: babyId,
            startTime: isoNow(),
            durationMinutes: 5
        )

        await performQuickLog(babyId: babyId, toast: "Tummy time logged") {
            let _: TummyTime = try await self.apiClient.request(
                Endpoints.TummyTimes.base,
                method: "POST",
                body: request
            )
        }
    }

    func quickLogBath(babyId: Int) async {
        let request = QuickBathRequest(
            babyId: babyId,
            time: isoNow()
        )

        await performQuickLog(babyId: babyId, toast: "Bath logged") {
            let _: Bath = try await self.apiClient.request(
                Endpoints.Baths.base,
                method: "POST",
                body: request
            )
        }
    }

    // MARK: - Private Helpers

    private func performQuickLog(babyId: Int, toast: String, action: () async throws -> Void) async {
        isQuickLogging = true
        do {
            try await action()
            HapticFeedback.success()
            quickLogSuccess = toast
            await loadDashboard(babyId: babyId)
            try? await Task.sleep(for: .seconds(2))
            quickLogSuccess = nil
        } catch {
            HapticFeedback.error()
            quickLogSuccess = "Failed to log"
            try? await Task.sleep(for: .seconds(2))
            quickLogSuccess = nil
        }
        isQuickLogging = false
    }

    private func isoNow() -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        return formatter.string(from: Date())
    }

    private func parseISO8601(_ string: String) -> Date? {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = formatter.date(from: string) { return date }
        formatter.formatOptions = [.withInternetDateTime]
        return formatter.date(from: string)
    }
}
