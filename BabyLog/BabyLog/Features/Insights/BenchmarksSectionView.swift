import SwiftUI

// MARK: - BenchmarksSectionView

struct BenchmarksSectionView: View {

    let benchmarks: AnalyticsBenchmarks

    @Environment(\.colorScheme) private var colorScheme
    @State private var rangeAppeared = false

    var body: some View {
        let theme = AppTheme.resolved(for: colorScheme)

        VStack(alignment: .leading, spacing: Spacing.md) {
            // Section header
            HStack(spacing: Spacing.sm) {
                Image(systemName: "chart.bar")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(theme.accent)
                Text("Benchmarks")
                    .font(.appHeading(size: 18, weight: .semibold))
                    .foregroundStyle(theme.text)
            }

            // Age indicator
            if let ageWeeks = benchmarks.ageWeeks {
                HStack(spacing: Spacing.xs) {
                    Image(systemName: "calendar")
                        .font(.system(size: 13))
                    Text("Baby is \(ageWeeks) \(ageWeeks == 1 ? "week" : "weeks") old")
                        .font(.appBody(size: 14, weight: .medium))
                }
                .foregroundStyle(theme.textSecondary)
            }

            // Benchmark categories
            if let diapers = benchmarks.diapers {
                benchmarkCategory(
                    icon: "drop",
                    iconColor: AppColors.Light.diaper,
                    label: "Diapers",
                    category: diapers,
                    theme: theme
                )
            }

            if let sleep = benchmarks.sleep {
                benchmarkCategory(
                    icon: "moon.zzz",
                    iconColor: theme.sleep.main,
                    label: "Sleep (hours)",
                    category: sleep,
                    theme: theme
                )
            }

            if let feeding = benchmarks.feeding {
                benchmarkCategory(
                    icon: "fork.knife",
                    iconColor: theme.feeding.main,
                    label: "Feedings",
                    category: feeding,
                    theme: theme
                )
            }
        }
        .cardStyle()
    }

    // MARK: - Benchmark Category

    private func benchmarkCategory(
        icon: String,
        iconColor: Color,
        label: String,
        category: BenchmarkCategory,
        theme: ResolvedTheme
    ) -> some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            // Label row
            HStack(spacing: Spacing.sm) {
                Image(systemName: icon)
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(iconColor)
                    .frame(width: 20)

                Text(label)
                    .font(.appBody(size: 14, weight: .semibold))
                    .foregroundStyle(theme.text)
            }

            // Range bar visualization
            if let range = category.expectedRange {
                expectedRangeBar(range: range, iconColor: iconColor, theme: theme)
            }

            // Notes
            if let notes = category.notes, !notes.isEmpty {
                HStack(alignment: .top, spacing: Spacing.xs) {
                    Image(systemName: "info.circle")
                        .font(.system(size: 11))
                        .foregroundStyle(theme.textMuted)
                        .padding(.top, 2)
                    Text(notes)
                        .font(.appBody(size: 12))
                        .foregroundStyle(theme.textMuted)
                }
                .padding(.leading, 20 + Spacing.sm)
            }
        }
        .padding(Spacing.md)
        .background(
            RoundedRectangle(cornerRadius: Radii.sm, style: .continuous)
                .fill(theme.surface)
        )
    }

    // MARK: - Expected Range Bar

    private func expectedRangeBar(range: MinMaxRange, iconColor: Color, theme: ResolvedTheme) -> some View {
        VStack(alignment: .leading, spacing: Spacing.xs) {
            // Range labels
            HStack {
                Text(formatValue(range.min))
                    .font(.appMono(size: 12))
                    .foregroundStyle(theme.textSecondary)
                Spacer()
                Text("Expected Range")
                    .font(.appBody(size: 11))
                    .foregroundStyle(theme.textMuted)
                Spacer()
                Text(formatValue(range.max))
                    .font(.appMono(size: 12))
                    .foregroundStyle(theme.textSecondary)
            }
            .opacity(rangeAppeared ? 1 : 0)
            .animation(.appGentle.delay(0.1), value: rangeAppeared)

            // Bar visualization
            GeometryReader { geometry in
                let width = geometry.size.width

                ZStack(alignment: .leading) {
                    // Background track
                    RoundedRectangle(cornerRadius: 4)
                        .fill(theme.border)
                        .frame(height: 12)

                    // Expected range fill
                    let rangeStart = rangePosition(range.min, range: range, totalWidth: width)
                    let rangeEnd = rangePosition(range.max, range: range, totalWidth: width)
                    let rangeWidth = max(rangeEnd - rangeStart, 4)

                    RoundedRectangle(cornerRadius: 4)
                        .fill(iconColor.opacity(0.3))
                        .frame(width: rangeAppeared ? rangeWidth : 0, height: 12)
                        .offset(x: rangeAppeared ? rangeStart : width / 2)
                        .animation(.appGentle.delay(0.2), value: rangeAppeared)

                    // Min marker
                    RoundedRectangle(cornerRadius: 1)
                        .fill(iconColor)
                        .frame(width: 3, height: 16)
                        .offset(x: rangeAppeared ? rangeStart : width / 2)
                        .opacity(rangeAppeared ? 1 : 0)
                        .animation(.appGentle.delay(0.3), value: rangeAppeared)

                    // Max marker
                    RoundedRectangle(cornerRadius: 1)
                        .fill(iconColor)
                        .frame(width: 3, height: 16)
                        .offset(x: rangeAppeared ? rangeEnd - 3 : width / 2)
                        .opacity(rangeAppeared ? 1 : 0)
                        .animation(.appGentle.delay(0.3), value: rangeAppeared)
                }
            }
            .frame(height: 16)
            .onAppear { rangeAppeared = true }
        }
        .padding(.leading, 20 + Spacing.sm)
    }

    // MARK: - Helpers

    private func rangePosition(_ value: Double, range: MinMaxRange, totalWidth: CGFloat) -> CGFloat {
        // Add padding around the range so it doesn't sit at the edges
        let paddedMin = range.min * 0.7
        let paddedMax = range.max * 1.3
        let span = paddedMax - paddedMin
        guard span > 0 else { return 0 }
        let ratio = (value - paddedMin) / span
        return CGFloat(ratio) * totalWidth
    }

    private func formatValue(_ value: Double) -> String {
        if value == value.rounded() {
            return "\(Int(value))"
        }
        return String(format: "%.1f", value)
    }
}

// MARK: - Preview

#Preview {
    BenchmarksSectionView(
        benchmarks: AnalyticsBenchmarks(
            ageWeeks: 12,
            diapers: BenchmarkCategory(
                expectedRange: MinMaxRange(min: 6, max: 10),
                notes: "6-10 wet diapers per day is typical at this age"
            ),
            sleep: BenchmarkCategory(
                expectedRange: MinMaxRange(min: 12, max: 16),
                notes: "Including naps and nighttime sleep"
            ),
            feeding: BenchmarkCategory(
                expectedRange: MinMaxRange(min: 6, max: 10),
                notes: "Breastfed babies may feed more frequently"
            )
        )
    )
    .padding()
}
