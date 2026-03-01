import AppIntents

struct QuickDiaperIntent: AppIntent {
    static var title: LocalizedStringResource = "Log Diaper Change"
    static var description = IntentDescription("Log a diaper change for your baby")
    static var openAppWhenRun = true

    @Parameter(title: "Diaper Type")
    var diaperType: DiaperTypeEntity?

    func perform() async throws -> some IntentResult {
        return .result()
    }
}

enum DiaperTypeEntity: String, AppEnum {
    case pee, poo, mixed

    static var typeDisplayRepresentation = TypeDisplayRepresentation(name: "Diaper Type")
    static var caseDisplayRepresentations: [DiaperTypeEntity: DisplayRepresentation] = [
        .pee: "Pee",
        .poo: "Poo",
        .mixed: "Mixed"
    ]
}
