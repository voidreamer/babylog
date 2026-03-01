import SwiftUI

// MARK: - TrendsSectionView

struct TrendsSectionView: View {

    let trends: AnalyticsTrends

    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        let theme = AppTheme.resolved(for: colorScheme)

        VStack(alignment: .leading, spacing: Spacing.md) {
            // Section header
            HStack(spacing: Spacing.sm) {
                Image(systemName: "chart.line.uptrend.xyaxis")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(theme.accent)
                Text("Trends")
                    .font(.appHeading(size: 18, weight: .semibold))
                    .foregroundStyle(theme.text)
            }

            // Sleep trend
            if let sleep = trends.sleep {
                trendRow(
                    icon: "moon.zzz",
                    iconColor: theme.sleep.main,
                    label: "Sleep",
                    item: sleep,
                    theme: theme
                )
            }

            // Feeding trend
            if let feeding = trends.feeding {
                trendRow(
                    icon: "fork.knife",
                    iconColor: theme.feeding.main,
                    label: "Feeding",
                    item: feeding,
                    theme: theme
                )
            }

            // Empty state
            if trends.sleep == nil && trends.feeding == nil {
                HStack {
                    Spacer()
                    Text("No trends available yet")
                        .font(.appBody(size: 14))
                        .foregroundStyle(theme.textMuted)
                    Spacer()
                }
                .padding(.vertical, Spacing.md)
            }
        }
        .cardStyle()
    }

    // MARK: - Trend Row

    private func trendRow(
        icon: String,
        iconColor: Color,
        label: String,
        item: TrendItem,
        theme: ResolvedTheme
    ) -> some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            HStack(spacing: Spacing.md) {
                // Activity icon
                Image(systemName: icon)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(iconColor)
                    .frame(width: 24, height: 24)

                // Label
                Text(label)
                    .font(.appBody(size: 15, weight: .semibold))
                    .foregroundStyle(theme.text)

                Spacer()

                // Trend direction arrow + label
                HStack(spacing: 4) {
                    trendArrow(item.trend, theme: theme)
                    Text(item.trendLabel)
                        .font(.appBody(size: 14, weight: .semibold))
                        .foregroundStyle(trendColor(item.trend, theme: theme))
                }
            }

            // Description
            Text(item.description)
                .font(.appBody(size: 13))
                .foregroundStyle(theme.textSecondary)
                .padding(.leading, 24 + Spacing.md) // align with text after icon

            // Visual trend indicator
            trendIndicator(item.trend, theme: theme)
                .padding(.leading, 24 + Spacing.md)
        }
        .padding(Spacing.md)
        .background(
            RoundedRectangle(cornerRadius: Radii.sm, style: .continuous)
                .fill(theme.surface)
        )
    }

    // MARK: - Trend Arrow

    @ViewBuilder
    private func trendArrow(_ trend: String, theme: ResolvedTheme) -> some View {
        let color = trendColor(trend, theme: theme)
        switch trend.lowercased() {
        case "up", "increasing":
            Image(systemName: "arrow.up.right")
                .font(.system(size: 14, weight: .bold))
                .foregroundStyle(color)
        case "down", "decreasing":
            Image(systemName: "arrow.down.right")
                .font(.system(size: 14, weight: .bold))
                .foregroundStyle(color)
        default:
            Image(systemName: "arrow.right")
                .font(.system(size: 14, weight: .bold))
                .foregroundStyle(color)
        }
    }

    // MARK: - Trend Color

    private func trendColor(_ trend: String, theme: ResolvedTheme) -> Color {
        switch trend.lowercased() {
        case "up", "increasing":    return theme.success
        case "down", "decreasing":  return Color.orange
        default:                    return theme.textMuted
        }
    }

    // MARK: - Trend Indicator

    private func trendIndicator(_ trend: String, theme: ResolvedTheme) -> some View {
        let color = trendColor(trend, theme: theme)
        return HStack(spacing: 2) {
            ForEach(0..<5, id: \.self) { index in
                RoundedRectangle(cornerRadius: 2)
                    .fill(color.opacity(barOpacity(for: index, trend: trend)))
                    .frame(width: 20, height: barHeight(for: index, trend: trend))
            }
        }
        .frame(height: 16, alignment: .bottom)
    }

    private func barHeight(for index: Int, trend: String) -> CGFloat {
        let base: CGFloat = 6
        let step: CGFloat = 2.5
        switch trend.lowercased() {
        case "up", "increasing":
            return base + step * CGFloat(index)
        case "down", "decreasing":
            return base + step * CGFloat(4 - index)
        default:
            return 10 // stable: all same height
        }
    }

    private func barOpacity(for index: Int, trend: String) -> Double {
        switch trend.lowercased() {
        case "up", "increasing":
            return 0.3 + 0.15 * Double(index)
        case "down", "decreasing":
            return 0.3 + 0.15 * Double(4 - index)
        default:
            return 0.6
        }
    }
}

// MARK: - Preview

#Preview {
    TrendsSectionView(
        trends: AnalyticsTrends(
            sleep: TrendItem(
                trend: "up",
                trendLabel: "Increasing",
                description: "Sleep duration has increased over the past week"
            ),
            feeding: TrendItem(
                trend: "stable",
                trendLabel: "Stable",
                description: "Feeding frequency is consistent"
            )
        )
    )
    .padding()
}
