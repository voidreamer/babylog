import SwiftUI

// MARK: - PatternsSectionView

struct PatternsSectionView: View {

    let patterns: AnalyticsPatterns

    @Environment(\.colorScheme) private var colorScheme

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
                        showDivider: true
                    )
                }

                if let bedtime = patterns.usualBedtime {
                    patternRow(
                        icon: "moon.stars",
                        iconColor: theme.sleep.main,
                        label: "Usual Bedtime",
                        value: bedtime,
                        theme: theme,
                        showDivider: true
                    )
                }

                if let feedingInterval = patterns.avgFeedingIntervalHours {
                    patternRow(
                        icon: "fork.knife",
                        iconColor: theme.feeding.main,
                        label: "Avg Feeding Interval",
                        value: formatHoursDecimal(feedingInterval),
                        theme: theme,
                        showDivider: true
                    )
                }

                if let napDuration = patterns.avgNapDurationMinutes {
                    patternRow(
                        icon: "moon.zzz",
                        iconColor: theme.sleep.main,
                        label: "Avg Nap Duration",
                        value: formatMinutesValue(napDuration),
                        theme: theme,
                        showDivider: true
                    )
                }

                if let wakeInterval = patterns.wakeIntervalHours {
                    patternRow(
                        icon: "clock.arrow.circlepath",
                        iconColor: theme.accent,
                        label: "Wake Interval",
                        value: formatHoursDecimal(wakeInterval),
                        theme: theme,
                        showDivider: false
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
        showDivider: Bool
    ) -> some View {
        VStack(spacing: 0) {
            HStack(spacing: Spacing.md) {
                // Icon
                Image(systemName: icon)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(iconColor)
                    .frame(width: 24, height: 24)

                // Label
                Text(label)
                    .font(.appBody(size: 14))
                    .foregroundStyle(theme.textSecondary)

                Spacer()

                // Value
                Text(value)
                    .font(.appBody(size: 15, weight: .semibold))
                    .foregroundStyle(theme.text)
            }
            .padding(.vertical, Spacing.md)

            if showDivider {
                ThemedDivider()
            }
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
