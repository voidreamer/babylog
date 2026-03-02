import SwiftUI

// MARK: - TodayVsAverageView

struct TodayVsAverageView: View {

    let todayVsAverage: TodayVsAverage

    @Environment(\.colorScheme) private var colorScheme
    @State private var barsAppeared = false

    var body: some View {
        let theme = AppTheme.resolved(for: colorScheme)

        VStack(alignment: .leading, spacing: Spacing.md) {
            // Section header
            HStack(spacing: Spacing.sm) {
                Image(systemName: "arrow.left.arrow.right")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(theme.accent)
                Text("Today vs Average")
                    .font(.appHeading(size: 18, weight: .semibold))
                    .foregroundStyle(theme.text)
            }

            // Comparison cards
            if let feedings = todayVsAverage.feedings {
                comparisonCard(
                    icon: "fork.knife",
                    iconColor: theme.feeding.main,
                    label: "Feedings",
                    today: feedings.today,
                    average: feedings.dailyAvg,
                    unit: "",
                    theme: theme
                )
            }

            if let diapers = todayVsAverage.diapers {
                comparisonCard(
                    icon: "drop",
                    iconColor: theme.diaper.main,
                    label: "Diapers",
                    today: diapers.today,
                    average: diapers.dailyAvg,
                    unit: "",
                    theme: theme,
                    subtitle: diapers.wetToday.map { "(\($0) wet)" }
                )
            }

            if let sleepHours = todayVsAverage.sleepHours {
                comparisonCard(
                    icon: "moon.zzz",
                    iconColor: theme.sleep.main,
                    label: "Sleep",
                    today: sleepHours.today,
                    average: sleepHours.dailyAvg,
                    unit: "h",
                    theme: theme,
                    isDecimal: true
                )
            }
        }
        .cardStyle()
    }

    // MARK: - Comparison Card

    private func comparisonCard(
        icon: String,
        iconColor: Color,
        label: String,
        today: Double,
        average: Double,
        unit: String,
        theme: ResolvedTheme,
        subtitle: String? = nil,
        isDecimal: Bool = false
    ) -> some View {
        let status = comparisonStatus(today: today, average: average)
        let statusColor = statusColor(status, theme: theme)

        return VStack(alignment: .leading, spacing: Spacing.sm) {
            // Header row
            HStack(spacing: Spacing.sm) {
                Image(systemName: icon)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(iconColor)
                    .frame(width: 20)

                Text(label)
                    .font(.appBody(size: 14, weight: .semibold))
                    .foregroundStyle(theme.text)

                if let subtitle {
                    Text(subtitle)
                        .font(.appBody(size: 12))
                        .foregroundStyle(theme.textMuted)
                }

                Spacer()

                // Status indicator
                HStack(spacing: 4) {
                    Circle()
                        .fill(statusColor)
                        .frame(width: 8, height: 8)
                    Text(status.label)
                        .font(.appBody(size: 12, weight: .medium))
                        .foregroundStyle(statusColor)
                }
            }

            // Values row
            HStack(spacing: Spacing.xl) {
                // Today value
                VStack(alignment: .leading, spacing: 2) {
                    Text("Today")
                        .font(.appBody(size: 11))
                        .foregroundStyle(theme.textMuted)
                    Text(formatValue(today, isDecimal: isDecimal) + unit)
                        .font(.appMono(size: 20, weight: .bold))
                        .foregroundStyle(theme.text)
                        .contentTransition(.numericText())
                }

                // Average value
                VStack(alignment: .leading, spacing: 2) {
                    Text("Daily Avg")
                        .font(.appBody(size: 11))
                        .foregroundStyle(theme.textMuted)
                    Text(formatValue(average, isDecimal: isDecimal) + unit)
                        .font(.appMono(size: 20, weight: .medium))
                        .foregroundStyle(theme.textSecondary)
                        .contentTransition(.numericText())
                }

                Spacer()
            }

            // Progress bar comparison
            comparisonBar(today: today, average: average, color: iconColor, statusColor: statusColor, theme: theme)
        }
        .padding(Spacing.md)
        .background(
            RoundedRectangle(cornerRadius: Radii.sm, style: .continuous)
                .fill(theme.surface)
        )
    }

    // MARK: - Comparison Bar

    private func comparisonBar(
        today: Double,
        average: Double,
        color: Color,
        statusColor: Color,
        theme: ResolvedTheme
    ) -> some View {
        let maxValue = max(today, average, 1)

        return VStack(spacing: Spacing.xs) {
            // Today bar
            HStack(spacing: Spacing.sm) {
                Text("T")
                    .font(.appBody(size: 10, weight: .bold))
                    .foregroundStyle(theme.textMuted)
                    .frame(width: 14)

                GeometryReader { geometry in
                    RoundedRectangle(cornerRadius: 3)
                        .fill(statusColor)
                        .frame(width: barsAppeared
                            ? barWidth(value: today, maxValue: maxValue, totalWidth: geometry.size.width)
                            : 4
                        )
                        .animation(.appGentle.delay(0.2), value: barsAppeared)
                }
                .frame(height: 8)
            }

            // Average bar
            HStack(spacing: Spacing.sm) {
                Text("A")
                    .font(.appBody(size: 10, weight: .bold))
                    .foregroundStyle(theme.textMuted)
                    .frame(width: 14)

                GeometryReader { geometry in
                    RoundedRectangle(cornerRadius: 3)
                        .fill(color.opacity(0.35))
                        .frame(width: barsAppeared
                            ? barWidth(value: average, maxValue: maxValue, totalWidth: geometry.size.width)
                            : 4
                        )
                        .animation(.appGentle.delay(0.3), value: barsAppeared)
                }
                .frame(height: 8)
            }
        }
        .onAppear {
            barsAppeared = true
        }
    }

    // MARK: - Helpers

    private func barWidth(value: Double, maxValue: Double, totalWidth: CGFloat) -> CGFloat {
        guard maxValue > 0 else { return 0 }
        return max(CGFloat(value / maxValue) * totalWidth, 4)
    }

    private enum ComparisonStatus {
        case onTrack
        case low
        case veryLow
        case high

        var label: String {
            switch self {
            case .onTrack: return "On track"
            case .low:     return "Low"
            case .veryLow: return "Very low"
            case .high:    return "Above avg"
            }
        }
    }

    private func comparisonStatus(today: Double, average: Double) -> ComparisonStatus {
        guard average > 0 else { return .onTrack }
        let ratio = today / average
        if ratio < 0.5 {
            return .veryLow
        } else if ratio < 0.75 {
            return .low
        } else if ratio > 1.25 {
            return .high
        }
        return .onTrack
    }

    private func statusColor(_ status: ComparisonStatus, theme: ResolvedTheme) -> Color {
        switch status {
        case .onTrack: return theme.success
        case .low:     return Color.orange
        case .veryLow: return theme.danger
        case .high:    return theme.sleep.main
        }
    }

    private func formatValue(_ value: Double, isDecimal: Bool) -> String {
        if isDecimal {
            return String(format: "%.1f", value)
        }
        if value == value.rounded() {
            return "\(Int(value))"
        }
        return String(format: "%.1f", value)
    }
}

// MARK: - Preview

#Preview {
    TodayVsAverageView(
        todayVsAverage: TodayVsAverage(
            feedings: TodayVsAverageItem(today: 5, dailyAvg: 7.2),
            diapers: TodayVsAverageDiapers(today: 4, dailyAvg: 6.5, wetToday: 3),
            sleepHours: TodayVsAverageItem(today: 3.5, dailyAvg: 4.2)
        )
    )
    .padding()
}
