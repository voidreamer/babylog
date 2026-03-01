import AppIntents
import SwiftUI
import WidgetKit

// MARK: - Timeline Provider

struct QuickLogProvider: TimelineProvider {
    func placeholder(in context: Context) -> QuickLogEntry {
        QuickLogEntry(date: Date(), dashboard: nil, babyName: "Baby")
    }

    func getSnapshot(in context: Context, completion: @escaping (QuickLogEntry) -> Void) {
        let entry = QuickLogEntry(
            date: Date(),
            dashboard: SharedDefaults.dashboardSnapshot,
            babyName: SharedDefaults.selectedBabyName ?? "Baby"
        )
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<QuickLogEntry>) -> Void) {
        let entry = QuickLogEntry(
            date: Date(),
            dashboard: SharedDefaults.dashboardSnapshot,
            babyName: SharedDefaults.selectedBabyName ?? "Baby"
        )
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }
}

// MARK: - Entry

struct QuickLogEntry: TimelineEntry {
    let date: Date
    let dashboard: DashboardData?
    let babyName: String
}

// MARK: - Widget View

struct QuickLogWidgetView: View {
    let entry: QuickLogEntry

    private var isSleeping: Bool {
        entry.dashboard?.currentSleep != nil
    }

    var body: some View {
        VStack(spacing: 8) {
            // Header
            HStack {
                Text(entry.babyName)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(.primary)
                Spacer()
                if isSleeping {
                    HStack(spacing: 3) {
                        Image(systemName: "moon.zzz.fill")
                            .font(.system(size: 10))
                        Text("Sleeping")
                            .font(.system(size: 10, weight: .medium))
                    }
                    .foregroundStyle(Color(hex: "#7c3aed"))
                } else {
                    Text("Awake")
                        .font(.system(size: 10, weight: .medium))
                        .foregroundStyle(.secondary)
                }
            }

            Divider()

            // Interactive buttons
            HStack(spacing: 8) {
                Button(intent: WidgetQuickFeedIntent()) {
                    quickButtonLabel(icon: "fork.knife", label: "Feed", color: Color(hex: "#d4849c"))
                }
                .buttonStyle(.plain)

                Button(intent: WidgetQuickDiaperIntent()) {
                    quickButtonLabel(icon: "circle.dotted", label: "Diaper", color: Color(hex: "#7ab89c"))
                }
                .buttonStyle(.plain)

                Button(intent: WidgetQuickSleepIntent()) {
                    quickButtonLabel(
                        icon: isSleeping ? "stop.fill" : "moon.zzz",
                        label: isSleeping ? "End" : "Sleep",
                        color: Color(hex: "#7c3aed")
                    )
                }
                .buttonStyle(.plain)

                Button(intent: WidgetQuickPumpingIntent()) {
                    quickButtonLabel(icon: "drop.fill", label: "Pump", color: Color(hex: "#d4849c"))
                }
                .buttonStyle(.plain)
            }
        }
        .padding(12)
    }

    private func quickButtonLabel(icon: String, label: String, color: Color) -> some View {
        VStack(spacing: 4) {
            ZStack {
                Circle()
                    .fill(color.opacity(0.15))
                    .frame(width: 36, height: 36)
                Image(systemName: icon)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(color)
            }
            Text(label)
                .font(.system(size: 10, weight: .medium))
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Widget Definition

struct QuickLogWidget: Widget {
    let kind = "QuickLogWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: QuickLogProvider()) { entry in
            QuickLogWidgetView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("Quick Log")
        .description("Log feedings, diapers, and sleep with one tap.")
        .supportedFamilies([.systemMedium])
    }
}
