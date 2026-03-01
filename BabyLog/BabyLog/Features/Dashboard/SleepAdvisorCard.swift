import SwiftUI

struct SleepAdvisorCard: View {
    let predictions: AnalyticsPredictions?
    let isSleeping: Bool
    var onTapInsights: (() -> Void)?

    @Environment(\.colorScheme) private var colorScheme

    private var theme: ResolvedTheme {
        AppTheme.resolved(for: colorScheme)
    }

    var body: some View {
        if let pressure = predictions?.sleepPressure {
            Button {
                onTapInsights?()
            } label: {
                cardContent(pressure: pressure)
            }
            .buttonStyle(.plain)
        }
    }

    @ViewBuilder
    private func cardContent(pressure: SleepPressure) -> some View {
        HStack(spacing: Spacing.md) {
            // Sleep pressure gauge
            pressureGauge(score: pressure.score)
                .frame(width: 56, height: 56)

            VStack(alignment: .leading, spacing: Spacing.xxs) {
                // Status text
                Text(statusText(pressure: pressure))
                    .font(.appBody(size: 14, weight: .semibold))
                    .foregroundStyle(theme.text)

                // Recommendation
                Text(pressure.recommendation)
                    .font(.appBody(size: 12))
                    .foregroundStyle(theme.textSecondary)
                    .lineLimit(2)

                // Confidence badge
                if let confidence = predictions?.nextNap?.confidence?.qualityLabel {
                    HStack(spacing: Spacing.xs) {
                        Text(confidence)
                            .font(.appBody(size: 10, weight: .semibold))
                            .foregroundStyle(confidenceColor(confidence))
                            .padding(.horizontal, Spacing.sm)
                            .padding(.vertical, 2)
                            .background(confidenceColor(confidence).opacity(0.12))
                            .clipShape(Capsule())
                    }
                }
            }

            Spacer(minLength: 0)

            Image(systemName: "chevron.right")
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(theme.textMuted)
        }
        .padding(Spacing.lg)
        .background(theme.sleep.bg.opacity(0.4))
        .clipShape(RoundedRectangle(cornerRadius: Radii.md, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: Radii.md, style: .continuous)
                .stroke(theme.sleep.main.opacity(0.2), lineWidth: 1)
        )
    }

    // MARK: - Pressure Gauge

    private func pressureGauge(score: Double) -> some View {
        ZStack {
            // Background arc
            Circle()
                .trim(from: 0.15, to: 0.85)
                .stroke(theme.sleep.bg, style: StrokeStyle(lineWidth: 5, lineCap: .round))
                .rotationEffect(.degrees(90))

            // Filled arc
            Circle()
                .trim(from: 0.15, to: 0.15 + 0.7 * min(score / 100, 1.0))
                .stroke(
                    gaugeGradient(score: score),
                    style: StrokeStyle(lineWidth: 5, lineCap: .round)
                )
                .rotationEffect(.degrees(90))

            // Center label
            VStack(spacing: 0) {
                Text("\(Int(score))")
                    .font(.system(size: 18, weight: .bold, design: .rounded))
                    .foregroundStyle(gaugeColor(score: score))
                Text("SP")
                    .font(.system(size: 8, weight: .medium))
                    .foregroundStyle(theme.textMuted)
            }
        }
    }

    // MARK: - Helpers

    private func statusText(pressure: SleepPressure) -> String {
        if isSleeping {
            return "Baby is sleeping"
        }

        if let nap = predictions?.nextNap {
            if nap.pastDue == true || (nap.inMinutes ?? 0) <= 0 {
                return "Nap window open now"
            }
            if let minutes = nap.inMinutes {
                return "Next nap in ~\(Int(minutes)) min"
            }
        }

        return pressure.label
    }

    private func gaugeColor(score: Double) -> Color {
        if score < 40 { return theme.success }
        if score < 70 { return Color(hex: "#f59e0b") }
        return theme.danger
    }

    private func gaugeGradient(score: Double) -> AngularGradient {
        AngularGradient(
            colors: [theme.success, Color(hex: "#f59e0b"), theme.danger],
            center: .center,
            startAngle: .degrees(0),
            endAngle: .degrees(360 * min(score / 100, 1.0))
        )
    }

    private func confidenceColor(_ label: String) -> Color {
        switch label.lowercased() {
        case "high": return theme.success
        case "fair": return Color(hex: "#f59e0b")
        default: return theme.textMuted
        }
    }
}

// MARK: - Loading Skeleton

struct SleepAdvisorCardSkeleton: View {
    @Environment(\.colorScheme) private var colorScheme

    private var theme: ResolvedTheme {
        AppTheme.resolved(for: colorScheme)
    }

    var body: some View {
        HStack(spacing: Spacing.md) {
            Circle()
                .fill(theme.surface)
                .frame(width: 56, height: 56)

            VStack(alignment: .leading, spacing: Spacing.sm) {
                RoundedRectangle(cornerRadius: 4)
                    .fill(theme.surface)
                    .frame(width: 140, height: 14)
                RoundedRectangle(cornerRadius: 4)
                    .fill(theme.surface)
                    .frame(width: 200, height: 12)
            }

            Spacer()
        }
        .padding(Spacing.lg)
        .background(theme.sleep.bg.opacity(0.2))
        .clipShape(RoundedRectangle(cornerRadius: Radii.md, style: .continuous))
        .redacted(reason: .placeholder)
    }
}
