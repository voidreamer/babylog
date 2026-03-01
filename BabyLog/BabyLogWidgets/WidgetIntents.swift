import AppIntents
import WidgetKit

// MARK: - Quick Feed

struct WidgetQuickFeedIntent: AppIntent {
    static var title: LocalizedStringResource = "Quick Feed"
    static var description = IntentDescription("Log a breast feeding")

    func perform() async throws -> some IntentResult {
        guard let babyId = SharedDefaults.selectedBabyId else {
            return .result()
        }
        try await IntentAPIClient.logFeeding(babyId: babyId, type: "breast")
        WidgetCenter.shared.reloadAllTimelines()
        return .result()
    }
}

// MARK: - Quick Diaper

struct WidgetQuickDiaperIntent: AppIntent {
    static var title: LocalizedStringResource = "Quick Diaper"
    static var description = IntentDescription("Log a diaper change")

    func perform() async throws -> some IntentResult {
        guard let babyId = SharedDefaults.selectedBabyId else {
            return .result()
        }
        try await IntentAPIClient.logDiaper(babyId: babyId, type: "pee")
        WidgetCenter.shared.reloadAllTimelines()
        return .result()
    }
}

// MARK: - Quick Sleep

struct WidgetQuickSleepIntent: AppIntent {
    static var title: LocalizedStringResource = "Quick Sleep"
    static var description = IntentDescription("Start or end sleep tracking")

    func perform() async throws -> some IntentResult {
        guard let babyId = SharedDefaults.selectedBabyId else {
            return .result()
        }

        // Check if currently sleeping
        if let currentSleep = try? await IntentAPIClient.getCurrentSleep(babyId: babyId),
           let sleepId = currentSleep.id.intValue {
            // End sleep
            _ = try await IntentAPIClient.endSleep(sleepId: sleepId)
            SleepActivityManager.endActivity()
        } else {
            // Start sleep
            let sleep = try await IntentAPIClient.startSleep(babyId: babyId)
            if let sleepId = sleep.id.intValue {
                let name = SharedDefaults.selectedBabyName ?? "Baby"
                SleepActivityManager.startActivity(babyName: name, startTime: Date(), sleepId: sleepId)
            }
        }

        WidgetCenter.shared.reloadAllTimelines()
        return .result()
    }
}

// MARK: - Quick Pumping

struct WidgetQuickPumpingIntent: AppIntent {
    static var title: LocalizedStringResource = "Quick Pumping"
    static var description = IntentDescription("Log a pumping session")

    func perform() async throws -> some IntentResult {
        guard let babyId = SharedDefaults.selectedBabyId else {
            return .result()
        }
        try await IntentAPIClient.logPumping(babyId: babyId)
        WidgetCenter.shared.reloadAllTimelines()
        return .result()
    }
}
