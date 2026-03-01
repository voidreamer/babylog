import SwiftUI

struct DailySummaryView: View {
    let summary: DailySummaryData

    @Environment(\.colorScheme) private var colorScheme

    private var theme: ResolvedTheme {
        AppTheme.resolved(for: colorScheme)
    }

    // MARK: - Pill Data

    private struct SummaryPill: Identifiable {
        let id: String
        let icon: String
        let label: String
        let value: String
        let detail: String?
        let colors: ActivityColorSet
    }

    private var pills: [SummaryPill] {
        var result: [SummaryPill] = []

        // Feedings
        if summary.totalFeedings > 0 {
            let detail: String? = summary.totalMl > 0 ? "\(Int(summary.totalMl)) ml" : nil
            result.append(SummaryPill(
                id: "feeding",
                icon: "fork.knife",
                label: "Feedings",
                value: "\(summary.totalFeedings)",
                detail: detail,
                colors: theme.feeding
            ))
        }

        // Diapers
        if summary.totalDiapers > 0 {
            let parts = diaperBreakdown
            result.append(SummaryPill(
                id: "diaper",
                icon: "circle.dotted",
                label: "Diapers",
                value: "\(summary.totalDiapers)",
                detail: parts.isEmpty ? nil : parts,
                colors: theme.diaper
            ))
        }

        // Sleep
        if summary.totalSleepMinutes > 0 {
            result.append(SummaryPill(
                id: "sleep",
                icon: "moon.zzz.fill",
                label: "Sleep",
                value: formatHours(summary.totalSleepMinutes),
                detail: summary.sleepCount > 0 ? "\(summary.sleepCount) nap\(summary.sleepCount == 1 ? "" : "s")" : nil,
                colors: theme.sleep
            ))
        }

        // Pumping
        if summary.pumpingCount > 0 {
            let detail: String? = summary.totalPumpingMl > 0 ? "\(Int(summary.totalPumpingMl)) ml" : nil
            result.append(SummaryPill(
                id: "pumping",
                icon: "drop.fill",
                label: "Pumping",
                value: "\(summary.pumpingCount)",
                detail: detail,
                colors: theme.pumping
            ))
        }

        // Potty
        if summary.pottyCount > 0 {
            let detail: String? = summary.pottySuccessCount > 0
                ? "\(summary.pottySuccessCount) success"
                : nil
            result.append(SummaryPill(
                id: "potty",
                icon: "toilet.fill",
                label: "Potty",
                value: "\(summary.pottyCount)",
                detail: detail,
                colors: theme.potty
            ))
        }

        // Tummy Time
        if summary.tummyCount > 0 {
            result.append(SummaryPill(
                id: "tummy",
                icon: "figure.play",
                label: "Tummy",
                value: "\(summary.tummyCount)",
                detail: summary.tummyMinutes > 0 ? formatMinutes(summary.tummyMinutes) : nil,
                colors: theme.tummy
            ))
        }

        // Bath
        if summary.bathCount > 0 {
            result.append(SummaryPill(
                id: "bath",
                icon: "bathtub.fill",
                label: "Bath",
                value: "\(summary.bathCount)",
                detail: nil,
                colors: theme.bath
            ))
        }

        return result
    }

    private var diaperBreakdown: String {
        var parts: [String] = []
        if summary.peeCount > 0 { parts.append("\(summary.peeCount) pee") }
        if summary.pooCount > 0 { parts.append("\(summary.pooCount) poo") }
        if summary.mixedCount > 0 { parts.append("\(summary.mixedCount) mix") }
        return parts.joined(separator: ", ")
    }

    // MARK: - Formatting

    private func formatHours(_ minutes: Double) -> String {
        let hours = minutes / 60.0
        if hours < 1 {
            return "\(Int(minutes))m"
        }
        let wholeHours = Int(hours)
        let remainingMinutes = Int(minutes) % 60
        if remainingMinutes == 0 {
            return "\(wholeHours)h"
        }
        return "\(wholeHours)h \(remainingMinutes)m"
    }

    private func formatMinutes(_ minutes: Double) -> String {
        let total = Int(minutes)
        if total < 60 {
            return "\(total) min"
        }
        let hours = total / 60
        let mins = total % 60
        if mins == 0 {
            return "\(hours)h"
        }
        return "\(hours)h \(mins)m"
    }

    // MARK: - Body

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            HStack {
                Text("Today")
                    .font(.appHeading(size: 18, weight: .semibold))
                    .foregroundStyle(theme.text)

                Spacer()

                Text(todayDateString)
                    .font(.appBody(size: 13))
                    .foregroundStyle(theme.textMuted)
            }
            .padding(.horizontal, Spacing.lg)

            if pills.isEmpty {
                emptyState
                    .padding(.horizontal, Spacing.lg)
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: Spacing.sm) {
                        ForEach(pills) { pill in
                            summaryPillView(pill)
                        }
                    }
                    .padding(.horizontal, Spacing.lg)
                }
            }
        }
    }

    // MARK: - Empty State

    private var emptyState: some View {
        HStack(spacing: Spacing.md) {
            Image(systemName: "sparkles")
                .font(.system(size: 20))
                .foregroundStyle(theme.primary.opacity(0.6))

            Text("No activities recorded today. Tap an activity to get started!")
                .font(.appBody(size: 14))
                .foregroundStyle(theme.textMuted)
        }
        .padding(Spacing.lg)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(theme.surface)
        .clipShape(RoundedRectangle(cornerRadius: Radii.md, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: Radii.md, style: .continuous)
                .stroke(theme.borderLight, lineWidth: 0.5)
        )
    }

    // MARK: - Pill View

    private func summaryPillView(_ pill: SummaryPill) -> some View {
        VStack(spacing: Spacing.xs) {
            // Icon + Value
            HStack(spacing: Spacing.xs) {
                Image(systemName: pill.icon)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(pill.colors.main)

                Text(pill.value)
                    .font(.appBody(size: 18, weight: .bold))
                    .foregroundStyle(theme.text)
            }

            // Label
            Text(pill.label)
                .font(.appBody(size: 11, weight: .medium))
                .foregroundStyle(pill.colors.text)

            // Detail
            if let detail = pill.detail {
                Text(detail)
                    .font(.appBody(size: 10))
                    .foregroundStyle(theme.textMuted)
                    .lineLimit(1)
            }
        }
        .padding(.horizontal, Spacing.md)
        .padding(.vertical, Spacing.sm)
        .frame(minWidth: 80)
        .background(pill.colors.bg.opacity(0.6))
        .clipShape(RoundedRectangle(cornerRadius: Radii.sm, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: Radii.sm, style: .continuous)
                .stroke(pill.colors.main.opacity(0.15), lineWidth: 0.5)
        )
    }

    // MARK: - Date String

    private var todayDateString: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d"
        return formatter.string(from: Date())
    }
}

// MARK: - Preview

#Preview("With Data") {
    DailySummaryView(summary: DailySummaryData(
        totalFeedings: 6,
        totalDiapers: 4,
        totalMl: 720,
        peeCount: 2,
        pooCount: 1,
        mixedCount: 1,
        totalSleepMinutes: 195,
        sleepCount: 2,
        pumpingCount: 3,
        totalPumpingMl: 340,
        pottyCount: 0,
        pottySuccessCount: 0,
        tummyCount: 2,
        tummyMinutes: 25,
        bathCount: 1
    ))
    .padding(.vertical)
}

#Preview("Empty") {
    DailySummaryView(summary: DailySummaryData(
        totalFeedings: 0,
        totalDiapers: 0,
        totalMl: 0,
        peeCount: 0,
        pooCount: 0,
        mixedCount: 0,
        totalSleepMinutes: 0,
        sleepCount: 0,
        pumpingCount: 0,
        totalPumpingMl: 0,
        pottyCount: 0,
        pottySuccessCount: 0,
        tummyCount: 0,
        tummyMinutes: 0,
        bathCount: 0
    ))
    .padding(.vertical)
}
