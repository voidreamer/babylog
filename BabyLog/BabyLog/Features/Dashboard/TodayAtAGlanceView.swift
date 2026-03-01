import SwiftUI

struct TodayAtAGlanceView: View {
    let summary: DailySummaryData?
    let benchmarks: AnalyticsBenchmarks?

    @Environment(\.colorScheme) private var colorScheme

    private var theme: ResolvedTheme {
        AppTheme.resolved(for: colorScheme)
    }

    // MARK: - Targets

    private var feedingTarget: Double {
        if let range = benchmarks?.feeding?.expectedRange {
            return (range.min + range.max) / 2
        }
        return 6
    }

    private var diaperTarget: Double {
        if let range = benchmarks?.diapers?.expectedRange {
            return (range.min + range.max) / 2
        }
        return 8
    }

    private var sleepTargetHours: Double {
        if let range = benchmarks?.sleep?.expectedRange {
            return (range.min + range.max) / 2
        }
        return 4
    }

    // MARK: - Body

    var body: some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            Text("Today")
                .font(.appHeading(size: 16, weight: .semibold))
                .foregroundStyle(theme.text)

            HStack(spacing: Spacing.sm) {
                glanceCard(
                    icon: "fork.knife",
                    label: "Feeds",
                    current: Double(summary?.totalFeedings ?? 0),
                    target: feedingTarget,
                    colors: theme.feeding
                )

                glanceCard(
                    icon: "circle.dotted",
                    label: "Diapers",
                    current: Double(summary?.totalDiapers ?? 0),
                    target: diaperTarget,
                    colors: theme.diaper
                )

                glanceCard(
                    icon: "moon.zzz.fill",
                    label: "Sleep",
                    current: (summary?.totalSleepMinutes ?? 0) / 60,
                    target: sleepTargetHours,
                    colors: theme.sleep,
                    formatAsHours: true
                )
            }
        }
    }

    // MARK: - Glance Card

    private func glanceCard(
        icon: String,
        label: String,
        current: Double,
        target: Double,
        colors: ActivityColorSet,
        formatAsHours: Bool = false
    ) -> some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            HStack(spacing: Spacing.xs) {
                Image(systemName: icon)
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(colors.main)

                Text(label)
                    .font(.appBody(size: 11, weight: .semibold))
                    .foregroundStyle(theme.textSecondary)
            }

            // Value
            if formatAsHours {
                let hours = Int(current)
                let mins = Int((current - Double(hours)) * 60)
                Text(hours > 0 ? "\(hours)h \(mins)m" : "\(mins)m")
                    .font(.appBody(size: 16, weight: .bold))
                    .foregroundStyle(theme.text)
            } else {
                Text("\(Int(current))/\(Int(target))")
                    .font(.appBody(size: 16, weight: .bold))
                    .foregroundStyle(theme.text)
            }

            // Progress bar
            let progress = target > 0 ? min(current / target, 1.0) : 0
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule()
                        .fill(colors.bg)
                        .frame(height: 6)

                    Capsule()
                        .fill(colors.main)
                        .frame(width: max(0, geo.size.width * progress), height: 6)
                }
            }
            .frame(height: 6)
        }
        .padding(Spacing.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(theme.surface)
        .clipShape(RoundedRectangle(cornerRadius: Radii.md, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: Radii.md, style: .continuous)
                .stroke(theme.borderLight, lineWidth: 0.5)
        )
    }
}
