import SwiftUI
import WidgetKit

// MARK: - Shared Provider for Lock Screen Widgets

struct LockScreenProvider: TimelineProvider {
    func placeholder(in context: Context) -> LockScreenEntry {
        LockScreenEntry(
            date: Date(),
            dashboard: nil,
            predictions: nil,
            babyName: "Baby"
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (LockScreenEntry) -> Void) {
        let entry = LockScreenEntry(
            date: Date(),
            dashboard: SharedDefaults.dashboardSnapshot,
            predictions: SharedDefaults.analyticsSnapshot,
            babyName: SharedDefaults.selectedBabyName ?? "Baby"
        )
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<LockScreenEntry>) -> Void) {
        let entry = LockScreenEntry(
            date: Date(),
            dashboard: SharedDefaults.dashboardSnapshot,
            predictions: SharedDefaults.analyticsSnapshot,
            babyName: SharedDefaults.selectedBabyName ?? "Baby"
        )
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }
}

struct LockScreenEntry: TimelineEntry {
    let date: Date
    let dashboard: DashboardData?
    let predictions: AnalyticsPredictions?
    let babyName: String
}

// MARK: - Sleep Pressure Widget (Circular)

struct SleepPressureWidgetView: View {
    let entry: LockScreenEntry

    var body: some View {
        let score = entry.predictions?.sleepPressure?.score ?? 0

        ZStack {
            // Arc background
            Circle()
                .trim(from: 0, to: 0.75)
                .stroke(Color.gray.opacity(0.3), lineWidth: 4)
                .rotationEffect(.degrees(135))

            // Arc fill
            Circle()
                .trim(from: 0, to: 0.75 * min(score / 100, 1.0))
                .stroke(pressureColor(score: score), lineWidth: 4)
                .rotationEffect(.degrees(135))

            VStack(spacing: 0) {
                Text("\(Int(score))")
                    .font(.system(size: 16, weight: .bold))
                Image(systemName: "moon.zzz")
                    .font(.system(size: 8))
                    .foregroundStyle(.secondary)
            }
        }
    }

    private func pressureColor(score: Double) -> Color {
        if score < 40 { return .green }
        if score < 70 { return .yellow }
        return .red
    }
}

struct SleepPressureWidget: Widget {
    let kind = "SleepPressureWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: LockScreenProvider()) { entry in
            SleepPressureWidgetView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("Sleep Pressure")
        .description("See your baby's sleep pressure at a glance.")
        .supportedFamilies([.accessoryCircular])
    }
}

// MARK: - Next Nap Widget (Rectangular)

struct NextNapWidgetView: View {
    let entry: LockScreenEntry

    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            if entry.dashboard?.currentSleep != nil {
                HStack(spacing: 4) {
                    Image(systemName: "moon.zzz.fill")
                        .font(.system(size: 10))
                    Text("Sleeping...")
                        .font(.system(size: 12, weight: .semibold))
                }

                if let startTime = entry.dashboard?.currentSleep?.startTime,
                   let date = parseISO8601(startTime) {
                    Text(date, style: .timer)
                        .font(.system(size: 14, weight: .bold, design: .monospaced))
                }
            } else if let napPrediction = entry.predictions?.nextNap,
                      let minutes = napPrediction.inMinutes {
                HStack(spacing: 4) {
                    Image(systemName: "moon.zzz")
                        .font(.system(size: 10))
                    Text(entry.babyName)
                        .font(.system(size: 11))
                        .foregroundStyle(.secondary)
                }

                if minutes <= 0 || napPrediction.pastDue == true {
                    Text("Nap window open")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(.yellow)
                } else {
                    Text("Nap in ~\(Int(minutes))m")
                        .font(.system(size: 14, weight: .bold))
                }
            } else {
                HStack(spacing: 4) {
                    Image(systemName: "moon.zzz")
                        .font(.system(size: 10))
                    Text(entry.babyName)
                        .font(.system(size: 11))
                        .foregroundStyle(.secondary)
                }
                Text("Open app to sync")
                    .font(.system(size: 11))
                    .foregroundStyle(.secondary)
            }
        }
    }

    private func parseISO8601(_ string: String) -> Date? {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = formatter.date(from: string) { return date }
        formatter.formatOptions = [.withInternetDateTime]
        return formatter.date(from: string)
    }
}

struct NextNapWidget: Widget {
    let kind = "NextNapWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: LockScreenProvider()) { entry in
            NextNapWidgetView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("Next Nap")
        .description("See when your baby's next nap is predicted.")
        .supportedFamilies([.accessoryRectangular])
    }
}

// MARK: - Status Inline Widget

struct StatusInlineWidgetView: View {
    let entry: LockScreenEntry

    var body: some View {
        if let data = entry.dashboard {
            let feedText: String = {
                guard let time = data.lastFeeding?.time, let date = parseISO8601(time) else { return "Fed --" }
                return "Fed \(timeAgo(from: date))"
            }()

            let sleepText: String = {
                if data.currentSleep != nil {
                    if let start = data.currentSleep?.startTime, let date = parseISO8601(start) {
                        let mins = Int(Date().timeIntervalSince(date) / 60)
                        return "Sleeping \(mins)m"
                    }
                    return "Sleeping"
                }
                guard let time = data.lastSleep?.startTime, let date = parseISO8601(time) else { return "Awake" }
                return "Awake \(timeAgo(from: date))"
            }()

            Text("\(feedText) \u{00B7} \(sleepText)")
        } else {
            Text("HeyBub \u{00B7} Open to sync")
        }
    }

    private func timeAgo(from date: Date) -> String {
        let interval = Date().timeIntervalSince(date)
        if interval < 60 { return "now" }
        if interval < 3600 { return "\(Int(interval / 60))m" }
        if interval < 86400 { return "\(Int(interval / 3600))h" }
        return "\(Int(interval / 86400))d"
    }

    private func parseISO8601(_ string: String) -> Date? {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = formatter.date(from: string) { return date }
        formatter.formatOptions = [.withInternetDateTime]
        return formatter.date(from: string)
    }
}

struct StatusInlineWidget: Widget {
    let kind = "StatusInlineWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: LockScreenProvider()) { entry in
            StatusInlineWidgetView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("Baby Status")
        .description("Quick status line for your baby.")
        .supportedFamilies([.accessoryInline])
    }
}
