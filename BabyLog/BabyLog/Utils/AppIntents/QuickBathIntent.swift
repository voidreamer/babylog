import AppIntents

struct QuickBathIntent: AppIntent {
    static var title: LocalizedStringResource = "Log Bath"
    static var description = IntentDescription("Log a bath for your baby")
    static var openAppWhenRun = false

    func perform() async throws -> some IntentResult & ReturnsValue<String> & ProvidesDialog {
        guard let babyId = SharedDefaults.selectedBabyId else {
            return .result(value: "No baby selected", dialog: "Please open HeyBub and select a baby first.")
        }

        let babyName = SharedDefaults.selectedBabyName ?? "your baby"

        do {
            try await IntentAPIClient.logBath(babyId: babyId)
            let message = "Logged bath for \(babyName)"
            return .result(value: message, dialog: "\(message).")
        } catch {
            return .result(value: "Failed", dialog: "Couldn't log bath. Please try again.")
        }
    }
}
