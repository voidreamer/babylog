import AppIntents

struct CheckBabyStatusIntent: AppIntent {
    static var title: LocalizedStringResource = "Check on Baby"
    static var description = IntentDescription("Get current status of your baby")
    static var openAppWhenRun = false

    func perform() async throws -> some IntentResult & ReturnsValue<String> & ProvidesDialog {
        guard let babyId = SharedDefaults.selectedBabyId else {
            return .result(value: "No baby selected", dialog: "Please open HeyBub and select a baby first.")
        }

        let babyName = SharedDefaults.selectedBabyName ?? "Your baby"

        // Try to fetch fresh data, fall back to cached snapshot
        let dashboard: DashboardData?
        do {
            dashboard = try await IntentAPIClient.getDashboard(babyId: babyId)
        } catch {
            dashboard = SharedDefaults.dashboardSnapshot
        }

        guard let data = dashboard else {
            return .result(value: "No data", dialog: "No data available. Please open HeyBub to sync.")
        }

        var parts: [String] = []

        // Sleep status
        if data.currentSleep != nil {
            if let startTime = data.currentSleep?.startTime,
               let date = parseISO8601(startTime) {
                let mins = Int(Date().timeIntervalSince(date) / 60)
                parts.append("\(babyName) is sleeping for \(mins) min")
            } else {
                parts.append("\(babyName) is sleeping")
            }
        } else {
            parts.append("\(babyName) is awake")
        }

        // Last feed
        if let feedTime = data.lastFeeding?.time, let date = parseISO8601(feedTime) {
            parts.append("Last fed \(timeAgo(from: date))")
        }

        // Last diaper
        if let diaperTime = data.lastDiaper?.time, let date = parseISO8601(diaperTime) {
            parts.append("Last diaper \(timeAgo(from: date))")
        }

        let message = parts.joined(separator: ". ")
        return .result(value: message, dialog: "\(message).")
    }

    private func timeAgo(from date: Date) -> String {
        let interval = Date().timeIntervalSince(date)
        if interval < 60 { return "just now" }
        if interval < 3600 { return "\(Int(interval / 60)) minutes ago" }
        if interval < 7200 { return "1 hour ago" }
        return "\(Int(interval / 3600)) hours ago"
    }

    private func parseISO8601(_ string: String) -> Date? {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = formatter.date(from: string) { return date }
        formatter.formatOptions = [.withInternetDateTime]
        return formatter.date(from: string)
    }
}
