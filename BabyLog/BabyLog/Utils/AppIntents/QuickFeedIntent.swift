import AppIntents

struct QuickFeedIntent: AppIntent {
    static var title: LocalizedStringResource = "Log Feeding"
    static var description = IntentDescription("Log a feeding for your baby")
    static var openAppWhenRun = true

    @Parameter(title: "Feeding Type")
    var feedingType: FeedingTypeEntity?

    func perform() async throws -> some IntentResult {
        return .result()
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
