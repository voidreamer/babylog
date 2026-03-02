import SwiftUI

// MARK: - PatternsSectionView

struct PatternsSectionView: View {

    let patterns: AnalyticsPatterns

    @Environment(\.colorScheme) private var colorScheme
    @State private var rowsAppeared = false

    var body: some View {
        let theme = AppTheme.resolved(for: colorScheme)

        VStack(alignment: .leading, spacing: Spacing.md) {
            // Section header
            HStack(spacing: Spacing.sm) {
                Image(systemName: "repeat")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(theme.accent)
                Text("Patterns")
                    .font(.appHeading(size: 18, weight: .semibold))
                    .foregroundStyle(theme.text)
            }

            // Pattern rows
            VStack(spacing: 0) {
                if let wakeTime = patterns.usualWakeTime {
                    patternRow(
                        icon: "sunrise",
                        iconColor: Color.orange,
                        label: "Usual Wake Time",
                        value: wakeTime,
                        theme: theme,
                        showDivider: true,
                        rowIndex: 0
                    )
                }

                if let bedtime = patterns.usualBedtime {
                    patternRow(
                        icon: "moon.stars",
                        iconColor: theme.sleep.main,
                        label: "Usual Bedtime",
                        value: bedtime,
                        theme: theme,
                        showDivider: true,
                        rowIndex: 1
                    )
                }

                if let feedingInterval = patterns.avgFeedingIntervalHours {
                    patternRow(
                        icon: "fork.knife",
                        iconColor: theme.feeding.main,
                        label: "Avg Feeding Interval",
                        value: formatHoursDecimal(feedingInterval),
                        theme: theme,
                        showDivider: true,
                        rowIndex: 2
                    )
                }

                if let napDuration = patterns.avgNapDurationMinutes {
                    patternRow(
                        icon: "moon.zzz",
                        iconColor: theme.sleep.main,
                        label: "Avg Nap Duration",
                        value: formatMinutesValue(napDuration),
                        theme: theme,
                        showDivider: true,
                        rowIndex: 3
                    )
                }

                if let wakeInterval = patterns.wakeIntervalHours {
                    patternRow(
                        icon: "clock.arrow.circlepath",
                        iconColor: theme.accent,
                        label: "Wake Interval",
                        value: formatHoursDecimal(wakeInterval),
                        theme: theme,
                        showDivider: false,
                        rowIndex: 4
                    )
                }
            }

            // Empty state if no patterns found
            if !hasAnyPattern {
                HStack {
                    Spacer()
                    Text("No patterns detected yet")
                        .font(.appBody(size: 14))
                        .foregroundStyle(theme.textMuted)
                    Spacer()
                }
                .padding(.vertical, Spacing.md)
            }
        }
        .cardStyle()
    }

    // MARK: - Pattern Row

    private func patternRow(
        icon: String,
        iconColor: Color,
        label: String,
        value: String,
        theme: ResolvedTheme,
        showDivider: Bool,
        rowIndex: Int = 0
    ) -> some View {
        VStack(spacing: 0) {
            HStack(spacing: Spacing.md) {
                // Icon
                ZStack {
                    Circle()
                        .fill(iconColor.opacity(0.12))
                        .frame(width: 28, height: 28)
                    Image(systemName: icon)
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(iconColor)
                }

                // Label
                Text(label)
                    .font(.appBody(size: 14))
                    .foregroundStyle(theme.textSecondary)

                Spacer()

                // Value badge
                Text(value)
                    .font(.appBody(size: 15, weight: .semibold))
                    .foregroundStyle(iconColor)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .background(
                        Capsule()
                            .fill(iconColor.opacity(0.1))
                    )
            }
            .padding(.vertical, Spacing.md)
            .opacity(rowsAppeared ? 1 : 0)
            .offset(x: rowsAppeared ? 0 : 20)
            .animation(.appGentle.delay(0.05 * Double(rowIndex)), value: rowsAppeared)

            if showDivider {
                ThemedDivider()
            }
        }
        .onAppear {
            rowsAppeared = true
        }
    }

    // MARK: - Helpers

    private var hasAnyPattern: Bool {
        patterns.usualWakeTime != nil ||
        patterns.usualBedtime != nil ||
        patterns.avgFeedingIntervalHours != nil ||
        patterns.avgNapDurationMinutes != nil ||
        patterns.wakeIntervalHours != nil
    }

    private func formatHoursDecimal(_ hours: Double) -> String {
        let h = Int(hours)
        let m = Int((hours - Double(h)) * 60)
        if h == 0 {
            return "\(m) min"
        }
        if m == 0 {
            return "\(h)h"
        }
        return "\(h)h \(m)m"
    }

    private func formatMinutesValue(_ minutes: Double) -> String {
        let rounded = Int(minutes.rounded())
        if rounded >= 60 {
            let h = rounded / 60
            let m = rounded % 60
            if m == 0 {
                return "\(h)h"
            }
            return "\(h)h \(m)m"
        }
        return "\(rounded) min"
    }
}

// MARK: - Preview

#Preview {
    PatternsSectionView(
        patterns: AnalyticsPatterns(
            usualWakeTime: "6:30 AM",
            usualBedtime: "7:15 PM",
            wakeIntervalHours: 2.25,
            avgFeedingIntervalHours: 2.75,
            avgNapDurationMinutes: 45
        )
    )
    .padding()
}
