import AppIntents
import WidgetKit

// MARK: - Diaper

/// `typeRaw` keeps a stable string identifier (pee/poo/mixed) the widget can pass.
/// Siri parameter resolution uses `DiaperType` below.
struct LogDiaperIntent: AppIntent {
    static var title: LocalizedStringResource = "Log diaper"
    static var description = IntentDescription("Records a diaper change for the current baby.")
    static var openAppWhenRun: Bool = false

    @Parameter(title: "Type", default: .mixed)
    var type: DiaperType

    /// Convenience init for the widget buttons (`Button(intent: LogDiaperIntent(typeRaw: "pee"))`).
    init() {}
    init(typeRaw: String) {
        self.type = DiaperType(rawValue: typeRaw) ?? .mixed
    }

    func perform() async throws -> some IntentResult & ProvidesDialog {
        try await BabylogClient.shared.createDiaper(type: type.rawValue)
        WidgetCenter.shared.reloadTimelines(ofKind: "DiaperWidget")
        return .result(dialog: "Logged a \(type.spokenName) diaper.")
    }
}

enum DiaperType: String, AppEnum {
    case pee, poo, mixed

    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Diaper Type"
    static var caseDisplayRepresentations: [DiaperType: DisplayRepresentation] = [
        .pee: "Wet",
        .poo: "Dirty",
        .mixed: "Mixed"
    ]

    var spokenName: String {
        switch self {
        case .pee: return "wet"
        case .poo: return "dirty"
        case .mixed: return "mixed"
        }
    }
}

// MARK: - Sleep

struct StartSleepIntent: AppIntent {
    static var title: LocalizedStringResource = "Log baby sleeping"
    static var description = IntentDescription("Starts a sleep session for the current baby.")
    static var openAppWhenRun: Bool = false

    func perform() async throws -> some IntentResult & ProvidesDialog {
        try await BabylogClient.shared.startSleep()
        WidgetCenter.shared.reloadTimelines(ofKind: "SleepWidget")
        return .result(dialog: "Started sleep timer.")
    }
}

struct EndSleepIntent: AppIntent {
    static var title: LocalizedStringResource = "Log baby is awake"
    static var description = IntentDescription("Ends the active sleep session for the current baby.")
    static var openAppWhenRun: Bool = false

    func perform() async throws -> some IntentResult & ProvidesDialog {
        try await BabylogClient.shared.endSleep()
        WidgetCenter.shared.reloadTimelines(ofKind: "SleepWidget")
        return .result(dialog: "Got it — baby is awake.")
    }
}

// MARK: - Feeding

/// One-tap default feeding from the widget: 120 ml bottle. For Siri voice flow
/// we use a smarter intent (`LogFeedingIntent`) that lets the user say
/// "log a 90 ml bottle".
struct LogQuickBottleIntent: AppIntent {
    static var title: LocalizedStringResource = "Log quick bottle"
    static var description = IntentDescription("Logs a 120 ml bottle feeding.")
    static var openAppWhenRun: Bool = false

    func perform() async throws -> some IntentResult & ProvidesDialog {
        try await BabylogClient.shared.createFeeding(type: "bottle", amountMl: 120)
        WidgetCenter.shared.reloadTimelines(ofKind: "FeedingWidget")
        return .result(dialog: "Logged a 120 ml bottle.")
    }
}

struct LogFeedingIntent: AppIntent {
    static var title: LocalizedStringResource = "Log feeding"
    static var description = IntentDescription("Records a feeding for the current baby.")
    static var openAppWhenRun: Bool = false

    @Parameter(title: "Type", default: .bottle)
    var feedingType: FeedingType

    @Parameter(title: "Amount (ml)")
    var amountMl: Int?

    func perform() async throws -> some IntentResult & ProvidesDialog {
        try await BabylogClient.shared.createFeeding(
            type: feedingType.rawValue,
            amountMl: amountMl,
            durationMinutes: nil
        )
        WidgetCenter.shared.reloadTimelines(ofKind: "FeedingWidget")
        if let ml = amountMl {
            return .result(dialog: "Logged a \(ml) ml \(feedingType.spokenName).")
        }
        return .result(dialog: "Logged a \(feedingType.spokenName).")
    }
}

enum FeedingType: String, AppEnum {
    case breast, bottle, formula, breastmilk_bottle, solid

    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Feeding Type"
    static var caseDisplayRepresentations: [FeedingType: DisplayRepresentation] = [
        .breast: "Breast",
        .bottle: "Bottle",
        .formula: "Formula",
        .breastmilk_bottle: "Breastmilk bottle",
        .solid: "Solid"
    ]

    var spokenName: String {
        switch self {
        case .breast: return "breastfeed"
        case .bottle: return "bottle"
        case .formula: return "formula bottle"
        case .breastmilk_bottle: return "breastmilk bottle"
        case .solid: return "solid feeding"
        }
    }
}

// MARK: - Shortcut phrases

struct HeyBubShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: LogDiaperIntent(),
            phrases: [
                "Log a diaper in \(.applicationName)",
                "Log baby diaper in \(.applicationName)",
                "Diaper change in \(.applicationName)"
            ],
            shortTitle: "Log diaper",
            systemImageName: "drop.fill"
        )
        AppShortcut(
            intent: StartSleepIntent(),
            phrases: [
                "Log baby sleeping in \(.applicationName)",
                "Start sleep in \(.applicationName)",
                "Baby is asleep in \(.applicationName)"
            ],
            shortTitle: "Start sleep",
            systemImageName: "moon.zzz.fill"
        )
        AppShortcut(
            intent: EndSleepIntent(),
            phrases: [
                "Log baby is awake in \(.applicationName)",
                "Wake baby in \(.applicationName)",
                "Baby woke up in \(.applicationName)"
            ],
            shortTitle: "Baby awake",
            systemImageName: "sun.max.fill"
        )
        AppShortcut(
            intent: LogFeedingIntent(),
            phrases: [
                "Log a feeding in \(.applicationName)",
                "Log baby feeding in \(.applicationName)"
            ],
            shortTitle: "Log feeding",
            systemImageName: "fork.knife"
        )
    }
}
