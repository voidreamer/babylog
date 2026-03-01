import AppIntents
import ActivityKit

struct EndSleepLiveActivityIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "End Sleep"
    static var description = IntentDescription("End the current sleep session")

    @Parameter(title: "Sleep ID")
    var sleepId: Int

    init() {
        self.sleepId = 0
    }

    init(sleepId: Int) {
        self.sleepId = sleepId
    }

    func perform() async throws -> some IntentResult {
        guard sleepId > 0 else { return .result() }

        do {
            _ = try await IntentAPIClient.endSleep(sleepId: sleepId)
        } catch {
            // Best effort — activity will still be dismissed
        }

        SleepActivityManager.endActivity()

        return .result()
    }
}
