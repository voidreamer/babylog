import AppIntents

struct QuickSleepIntent: AppIntent {
    static var title: LocalizedStringResource = "Log Sleep"
    static var description = IntentDescription("Start or end sleep tracking for your baby")
    static var openAppWhenRun = true

    func perform() async throws -> some IntentResult {
        return .result()
    }
}
