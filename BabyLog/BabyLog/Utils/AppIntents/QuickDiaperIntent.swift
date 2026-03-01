import AppIntents

struct QuickDiaperIntent: AppIntent {
    static var title: LocalizedStringResource = "Log Diaper Change"
    static var description = IntentDescription("Log a diaper change for your baby")
    static var openAppWhenRun = false

    @Parameter(title: "Diaper Type")
    var diaperType: DiaperTypeEntity?

    func perform() async throws -> some IntentResult & ReturnsValue<String> & ProvidesDialog {
        guard let babyId = SharedDefaults.selectedBabyId else {
            return .result(value: "No baby selected", dialog: "Please open HeyBub and select a baby first.")
        }

        let type = diaperType?.rawValue ?? "pee"
        let babyName = SharedDefaults.selectedBabyName ?? "your baby"

        do {
            try await IntentAPIClient.logDiaper(babyId: babyId, type: type)
            let message = "Logged \(type) diaper for \(babyName)"
            return .result(value: message, dialog: "\(message).")
        } catch {
            return .result(value: "Failed", dialog: "Couldn't log diaper. Please try again.")
        }
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
