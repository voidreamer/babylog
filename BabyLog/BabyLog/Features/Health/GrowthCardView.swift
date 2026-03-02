import SwiftUI

// MARK: - GrowthCardView

struct GrowthCardView: View {
    let latestRecord: GrowthRecord?

    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        let theme = AppTheme.resolved(for: colorScheme)

        WidgetCard(
            title: "Growth",
            icon: "chart.line.uptrend.xyaxis",
            accentColor: theme.accent
        ) {
            if let record = latestRecord {
                VStack(alignment: .leading, spacing: Spacing.md) {
                    // Date header
                    HStack {
                        Text("Latest: \(FormatUtils.formatDisplayDate(record.recordedDate))")
                            .font(.appBody(size: 12))
                            .foregroundStyle(theme.textSecondary)
                        Spacer()
                        HStack(spacing: Spacing.xs) {
                            Text("View Chart")
                                .font(.appBody(size: 12, weight: .medium))
                                .foregroundStyle(theme.accent)
                            Image(systemName: "chevron.right")
                                .font(.system(size: 10, weight: .semibold))
                                .foregroundStyle(theme.accent)
                        }
                    }

                    // Measurements row
                    HStack(spacing: Spacing.lg) {
                        if let weight = record.weightKg {
                            measurementItem(
                                label: "Weight",
                                value: FormatUtils.formatWeight(kg: weight, useLbs: false),
                                icon: "scalemass",
                                color: .blue,
                                theme: theme
                            )
                        }

                        if let height = record.heightCm {
                            measurementItem(
                                label: "Height",
                                value: FormatUtils.formatHeight(cm: height, useIn: false),
                                icon: "ruler",
                                color: .green,
                                theme: theme
                            )
                        }

                        if let head = record.headCm {
                            measurementItem(
                                label: "Head",
                                value: FormatUtils.formatHeight(cm: head, useIn: false),
                                icon: "circle.dashed",
                                color: .orange,
                                theme: theme
                            )
                        }
                    }
                }
            } else {
                HStack {
                    Text("No growth records yet")
                        .font(.appBody(size: 14))
                        .foregroundStyle(theme.textSecondary)
                    Spacer()
                    HStack(spacing: Spacing.xs) {
                        Text("View Chart")
                            .font(.appBody(size: 12, weight: .medium))
                            .foregroundStyle(theme.accent)
                        Image(systemName: "chevron.right")
                            .font(.system(size: 10, weight: .semibold))
                            .foregroundStyle(theme.accent)
                    }
                }
            }
        }
    }

    // MARK: - Measurement Item

    private func measurementItem(label: String, value: String, icon: String, color: Color, theme: ResolvedTheme) -> some View {
        VStack(alignment: .leading, spacing: Spacing.xs) {
            HStack(spacing: Spacing.xs) {
                Image(systemName: icon)
                    .font(.system(size: 10))
                    .foregroundStyle(color)
                Text(label)
                    .font(.appBody(size: 11))
                    .foregroundStyle(theme.textMuted)
            }
            Text(value)
                .font(.appMono(size: 16, weight: .semibold))
                .foregroundStyle(theme.text)
                .contentTransition(.numericText())
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

// MARK: - Preview

#Preview("With Data") {
    GrowthCardView(latestRecord: GrowthRecord(
        id: 1,
        babyId: 1,
        recordedDate: "2025-02-15",
        weightKg: 7.2,
        heightCm: 65.5,
        headCm: 42.0,
        notes: nil
    ))
    .padding()
}

#Preview("Empty") {
    GrowthCardView(latestRecord: nil)
        .padding()
}
