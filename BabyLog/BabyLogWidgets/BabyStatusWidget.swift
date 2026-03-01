import SwiftUI
import WidgetKit

// MARK: - Timeline Provider

struct BabyStatusProvider: TimelineProvider {
    func placeholder(in context: Context) -> BabyStatusEntry {
        BabyStatusEntry(date: Date(), dashboard: nil, babyName: "Baby")
    }

    func getSnapshot(in context: Context, completion: @escaping (BabyStatusEntry) -> Void) {
        let entry = BabyStatusEntry(
            date: Date(),
            dashboard: SharedDefaults.dashboardSnapshot,
            babyName: SharedDefaults.selectedBabyName ?? "Baby"
        )
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<BabyStatusEntry>) -> Void) {
        let entry = BabyStatusEntry(
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

struct BabyStatusEntry: TimelineEntry {
    let date: Date
    let dashboard: DashboardData?
    let babyName: String
}

// MARK: - Widget View

struct BabyStatusWidgetView: View {
    let entry: BabyStatusEntry

    var body: some View {
        if let data = entry.dashboard {
            VStack(alignment: .leading, spacing: 6) {
                // Header
                HStack {
                    Text(entry.babyName)
                        .font(.system(size: 13, weight: .bold))
                        .foregroundStyle(.primary)
                    Spacer()
                    Text(timeAgo(from: entry.date))
                        .font(.system(size: 9))
                        .foregroundStyle(.secondary)
                }

                Divider()

                // Last Feed
                statusRow(
                    icon: "fork.knife",
                    color: Color(hex: "#d4849c"),
                    label: "Fed",
                    time: data.lastFeeding?.time
                )

                // Last Diaper
                statusRow(
                    icon: "circle.dotted",
                    color: Color(hex: "#7ab89c"),
                    label: "Diaper",
                    time: data.lastDiaper?.time
                )

                // Sleep Status
                if data.currentSleep != nil {
                    HStack(spacing: 4) {
                        Image(systemName: "moon.zzz.fill")
                            .font(.system(size: 10))
                            .foregroundStyle(Color(hex: "#7c3aed"))
                        Text("Sleeping")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundStyle(Color(hex: "#7c3aed"))
                        if let startTime = parseISO8601(data.currentSleep!.startTime) {
                            Text(startTime, style: .timer)
                                .font(.system(size: 11, weight: .semibold, design: .monospaced))
                                .foregroundStyle(Color(hex: "#7c3aed"))
                        }
                    }
                } else {
                    statusRow(
                        icon: "moon.zzz.fill",
                        color: Color(hex: "#6a9cb8"),
                        label: "Slept",
                        time: data.lastSleep?.startTime
                    )
                }
            }
            .padding(12)
        } else {
            VStack(spacing: 8) {
                Image(systemName: "baby.and.heart")
                    .font(.system(size: 24))
                    .foregroundStyle(.secondary)
                Text("Open app to sync")
                    .font(.system(size: 12))
                    .foregroundStyle(.secondary)
            }
            .padding()
        }
    }

    private func statusRow(icon: String, color: Color, label: String, time: String?) -> some View {
        HStack(spacing: 4) {
            Image(systemName: icon)
                .font(.system(size: 10))
                .foregroundStyle(color)
            Text(label)
                .font(.system(size: 11))
                .foregroundStyle(.secondary)
            Spacer()
            if let time, let date = parseISO8601(time) {
                Text(timeAgo(from: date))
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(.primary)
            } else {
                Text("--")
                    .font(.system(size: 11))
                    .foregroundStyle(.tertiary)
            }
        }
    }

    private func timeAgo(from date: Date) -> String {
        let interval = Date().timeIntervalSince(date)
        if interval < 60 { return "now" }
        if interval < 3600 { return "\(Int(interval / 60))m ago" }
        if interval < 86400 { return "\(Int(interval / 3600))h ago" }
        return "\(Int(interval / 86400))d ago"
    }

    private func parseISO8601(_ string: String) -> Date? {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = formatter.date(from: string) { return date }
        formatter.formatOptions = [.withInternetDateTime]
        return formatter.date(from: string)
    }
}

// MARK: - Widget Definition

struct BabyStatusWidget: Widget {
    let kind = "BabyStatusWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: BabyStatusProvider()) { entry in
            BabyStatusWidgetView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("Baby Status")
        .description("See your baby's latest activities at a glance.")
        .supportedFamilies([.systemSmall])
    }
}
