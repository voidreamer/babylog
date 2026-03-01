import SwiftUI

// MARK: - GrowthCardView

struct GrowthCardView: View {
    let latestRecord: GrowthRecord?

    var body: some View {
        WidgetCard(
            title: "Growth",
            icon: "chart.line.uptrend.xyaxis",
            accentColor: AppColors.Light.primary
        ) {
            if let record = latestRecord {
                VStack(alignment: .leading, spacing: 12) {
                    // Date header
                    HStack {
                        Text("Latest: \(FormatUtils.formatDisplayDate(record.recordedDate))")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Spacer()
                        HStack(spacing: 4) {
                            Text("View Chart")
                                .font(.caption)
                                .foregroundStyle(AppColors.Light.primary)
                            Image(systemName: "chevron.right")
                                .font(.caption2)
                                .foregroundStyle(AppColors.Light.primary)
                        }
                    }

                    // Measurements row
                    HStack(spacing: 16) {
                        if let weight = record.weightKg {
                            measurementItem(
                                label: "Weight",
                                value: FormatUtils.formatWeight(kg: weight, useLbs: false),
                                icon: "scalemass",
                                color: .blue
                            )
                        }

                        if let height = record.heightCm {
                            measurementItem(
                                label: "Height",
                                value: FormatUtils.formatHeight(cm: height, useIn: false),
                                icon: "ruler",
                                color: .green
                            )
                        }

                        if let head = record.headCm {
                            measurementItem(
                                label: "Head",
                                value: FormatUtils.formatHeight(cm: head, useIn: false),
                                icon: "circle.dashed",
                                color: .orange
                            )
                        }
                    }
                }
            } else {
                HStack {
                    Text("No growth records yet")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    Spacer()
                    HStack(spacing: 4) {
                        Text("View Chart")
                            .font(.caption)
                            .foregroundStyle(AppColors.Light.primary)
                        Image(systemName: "chevron.right")
                            .font(.caption2)
                            .foregroundStyle(AppColors.Light.primary)
                    }
                }
            }
        }
    }

    // MARK: - Measurement Item

    private func measurementItem(label: String, value: String, icon: String, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.system(size: 10))
                    .foregroundStyle(color)
                Text(label)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
            Text(value)
                .font(.system(size: 16, weight: .semibold))
                .foregroundStyle(.primary)
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
