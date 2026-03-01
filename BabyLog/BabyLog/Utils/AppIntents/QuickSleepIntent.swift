import AppIntents

struct QuickSleepIntent: AppIntent {
    static var title: LocalizedStringResource = "Log Sleep"
    static var description = IntentDescription("Start or end sleep tracking for your baby")
    static var openAppWhenRun = false

    func perform() async throws -> some IntentResult & ReturnsValue<String> & ProvidesDialog {
        guard let babyId = SharedDefaults.selectedBabyId else {
            return .result(value: "No baby selected", dialog: "Please open HeyBub and select a baby first.")
        }

        let babyName = SharedDefaults.selectedBabyName ?? "your baby"

        do {
            // Check if currently sleeping
            if let currentSleep = try? await IntentAPIClient.getCurrentSleep(babyId: babyId),
               let sleepId = currentSleep.id.intValue {
                // End sleep
                let ended = try await IntentAPIClient.endSleep(sleepId: sleepId)
                SleepActivityManager.endActivity()

                let durationText: String
                if let minutes = ended.durationMinutes {
                    let hours = Int(minutes) / 60
                    let mins = Int(minutes) % 60
                    durationText = hours > 0 ? "\(hours)h \(mins)m" : "\(mins)m"
                } else {
                    durationText = "unknown duration"
                }

                let message = "Sleep ended for \(babyName) — \(durationText)"
                return .result(value: message, dialog: "\(message).")
            } else {
                // Start sleep
                let sleep = try await IntentAPIClient.startSleep(babyId: babyId)
                if let sleepId = sleep.id.intValue {
                    SleepActivityManager.startActivity(babyName: babyName, startTime: Date(), sleepId: sleepId)
                }

                let message = "Started sleep for \(babyName)"
                return .result(value: message, dialog: "\(message).")
            }
        } catch {
            return .result(value: "Failed", dialog: "Couldn't log sleep. Please try again.")
        }
    }
}
