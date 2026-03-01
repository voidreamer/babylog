import AppIntents

struct BabyAppShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: QuickFeedIntent(),
            phrases: [
                "Log a feeding in \(.applicationName)",
                "Record feeding in \(.applicationName)"
            ],
            shortTitle: "Log Feeding",
            systemImageName: "cup.and.saucer.fill"
        )
        AppShortcut(
            intent: QuickDiaperIntent(),
            phrases: [
                "Log a diaper in \(.applicationName)",
                "Record diaper change in \(.applicationName)"
            ],
            shortTitle: "Log Diaper",
            systemImageName: "arrow.triangle.2.circlepath"
        )
        AppShortcut(
            intent: QuickSleepIntent(),
            phrases: [
                "Start sleep in \(.applicationName)",
                "Log sleep in \(.applicationName)"
            ],
            shortTitle: "Log Sleep",
            systemImageName: "moon.fill"
        )
    }
}
