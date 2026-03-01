import AppIntents

struct QuickFeedIntent: AppIntent {
    static var title: LocalizedStringResource = "Log Feeding"
    static var description = IntentDescription("Log a feeding for your baby")
    static var openAppWhenRun = false

    @Parameter(title: "Feeding Type")
    var feedingType: FeedingTypeEntity?

    func perform() async throws -> some IntentResult & ReturnsValue<String> & ProvidesDialog {
        guard let babyId = SharedDefaults.selectedBabyId else {
            return .result(value: "No baby selected", dialog: "Please open HeyBub and select a baby first.")
        }

        let type = feedingType?.rawValue ?? "breast"
        let babyName = SharedDefaults.selectedBabyName ?? "your baby"

        do {
            try await IntentAPIClient.logFeeding(babyId: babyId, type: type)
            let message = "Logged \(type) feeding for \(babyName)"
            return .result(value: message, dialog: "\(message).")
        } catch {
            return .result(value: "Failed", dialog: "Couldn't log feeding. Please try again.")
        }
    }
}

enum FeedingTypeEntity: String, AppEnum {
    case breast, bottle, formula, solid

    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Feeding Type")
    static var caseDisplayRepresentations: [FeedingTypeEntity: DisplayRepresentation] = [
        .breast: "Breast",
        .bottle: "Bottle",
        .formula: "Formula",
        .solid: "Solid"
    ]
}
