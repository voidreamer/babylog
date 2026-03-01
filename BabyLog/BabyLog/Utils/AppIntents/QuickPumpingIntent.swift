import AppIntents

struct QuickPumpingIntent: AppIntent {
    static var title: LocalizedStringResource = "Log Pumping"
    static var description = IntentDescription("Log a pumping session")
    static var openAppWhenRun = false

    func perform() async throws -> some IntentResult & ReturnsValue<String> & ProvidesDialog {
        guard let babyId = SharedDefaults.selectedBabyId else {
            return .result(value: "No baby selected", dialog: "Please open HeyBub and select a baby first.")
        }

        let babyName = SharedDefaults.selectedBabyName ?? "your baby"

        do {
            try await IntentAPIClient.logPumping(babyId: babyId)
            let message = "Logged pumping for \(babyName)"
            return .result(value: message, dialog: "\(message).")
        } catch {
            return .result(value: "Failed", dialog: "Couldn't log pumping. Please try again.")
        }
    }
}
