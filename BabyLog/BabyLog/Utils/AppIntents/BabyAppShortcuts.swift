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
                "Log sleep in \(.applicationName)",
                "End sleep in \(.applicationName)"
            ],
            shortTitle: "Log Sleep",
            systemImageName: "moon.fill"
        )
        AppShortcut(
            intent: QuickPumpingIntent(),
            phrases: [
                "Log pumping in \(.applicationName)",
                "Record pumping in \(.applicationName)"
            ],
            shortTitle: "Log Pumping",
            systemImageName: "drop.fill"
        )
        AppShortcut(
            intent: QuickBathIntent(),
            phrases: [
                "Log a bath in \(.applicationName)",
                "Record bath in \(.applicationName)"
            ],
            shortTitle: "Log Bath",
            systemImageName: "bathtub.fill"
        )
        AppShortcut(
            intent: QuickTummyTimeIntent(),
            phrases: [
                "Log tummy time in \(.applicationName)",
                "Record tummy time in \(.applicationName)"
            ],
            shortTitle: "Log Tummy Time",
            systemImageName: "figure.play"
        )
        AppShortcut(
            intent: CheckBabyStatusIntent(),
            phrases: [
                "Check on baby in \(.applicationName)",
                "How is baby in \(.applicationName)",
                "Baby status in \(.applicationName)"
            ],
            shortTitle: "Check on Baby",
            systemImageName: "heart.fill"
        )
    }
}
