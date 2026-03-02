import SwiftUI

struct PredictionCardsRow: View {
    let predictions: AnalyticsPredictions?
    let hasEnoughData: Bool
    var onTapInsights: (() -> Void)?

    @Environment(\.colorScheme) private var colorScheme

    private var theme: ResolvedTheme {
        AppTheme.resolved(for: colorScheme)
    }

    // MARK: - Body

    var body: some View {
        if hasEnoughData, predictions != nil {
            VStack(alignment: .leading, spacing: Spacing.sm) {
                // Section label
                HStack(spacing: Spacing.xs) {
                    Image(systemName: "sparkles")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundStyle(theme.accent)
                    Text("Predictions")
                        .font(.appBody(size: 13, weight: .semibold))
                        .foregroundStyle(theme.textSecondary)

                    Spacer()

                    Button {
                        onTapInsights?()
                    } label: {
                        HStack(spacing: Spacing.xxs) {
                            Text("All insights")
                                .font(.appBody(size: 13, weight: .medium))
                            Image(systemName: "chevron.right")
                                .font(.system(size: 10, weight: .semibold))
                        }
                        .foregroundStyle(theme.primary)
                    }
                }

                // Prediction cards grid
                HStack(spacing: Spacing.sm) {
                    if let feeding = predictions?.nextFeeding {
                        feedingCard(feeding)
                    }

                    if let nap = predictions?.nextNap {
                        napCard(nap)
                    }
                }

                // Advisor tip
                if let recommendation = predictions?.sleepPressure?.recommendation,
                   !recommendation.isEmpty {
                    advisorTip(recommendation)
                }
            }
        }
    }

    // MARK: - Feeding Card

    private func feedingCard(_ prediction: Prediction) -> some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            HStack(spacing: Spacing.xs) {
                Image(systemName: "fork.knife")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(theme.feeding.main)
                Text("Next Feed")
                    .font(.appBody(size: 12, weight: .semibold))
                    .foregroundStyle(theme.textSecondary)
            }

            if prediction.pastDue == true {
                Text("Past due")
                    .font(.system(size: 22, weight: .bold, design: .rounded))
                    .foregroundStyle(theme.danger)
            } else if let minutes = prediction.inMinutes {
                Text(formatMinutes(minutes))
                    .font(.system(size: 22, weight: .bold, design: .rounded))
                    .foregroundStyle(theme.text)
            } else {
                Text("--")
                    .font(.system(size: 22, weight: .bold, design: .rounded))
                    .foregroundStyle(theme.textMuted)
            }

            if let confidence = prediction.confidence {
                confidenceBadge(confidence)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(Spacing.md)
        .background(
            RoundedRectangle(cornerRadius: Radii.md, style: .continuous)
                .fill(prediction.pastDue == true ? theme.danger.opacity(0.06) : theme.surface)
                .overlay(
                    RoundedRectangle(cornerRadius: Radii.md, style: .continuous)
                        .stroke(
                            prediction.pastDue == true ? theme.danger.opacity(0.2) : theme.borderLight,
                            lineWidth: 0.5
                        )
                )
        )
        .contentShape(Rectangle())
        .onTapGesture { onTapInsights?() }
    }

    // MARK: - Nap Card

    private func napCard(_ nap: NapPrediction) -> some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            HStack(spacing: Spacing.xs) {
                Image(systemName: "moon.zzz")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(theme.sleep.main)
                Text("Next Nap")
                    .font(.appBody(size: 12, weight: .semibold))
                    .foregroundStyle(theme.textSecondary)
            }

            if nap.pastDue == true || (nap.inMinutes ?? 0) <= 0 {
                Text("Now")
                    .font(.system(size: 22, weight: .bold, design: .rounded))
                    .foregroundStyle(theme.sleep.main)
            } else if let minutes = nap.inMinutes {
                Text(formatMinutes(minutes))
                    .font(.system(size: 22, weight: .bold, design: .rounded))
                    .foregroundStyle(theme.text)
            } else {
                Text("--")
                    .font(.system(size: 22, weight: .bold, design: .rounded))
                    .foregroundStyle(theme.textMuted)
            }

            if let confidence = nap.confidence {
                confidenceBadge(confidence)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(Spacing.md)
        .background(
            RoundedRectangle(cornerRadius: Radii.md, style: .continuous)
                .fill(
                    (nap.pastDue == true || (nap.inMinutes ?? 1) <= 0)
                        ? theme.sleep.bg.opacity(0.4)
                        : theme.surface
                )
                .overlay(
                    RoundedRectangle(cornerRadius: Radii.md, style: .continuous)
                        .stroke(
                            (nap.pastDue == true || (nap.inMinutes ?? 1) <= 0)
                                ? theme.sleep.main.opacity(0.2)
                                : theme.borderLight,
                            lineWidth: 0.5
                        )
                )
        )
        .contentShape(Rectangle())
        .onTapGesture { onTapInsights?() }
    }

    // MARK: - Advisor Tip

    private func advisorTip(_ recommendation: String) -> some View {
        HStack(spacing: Spacing.sm) {
            Image(systemName: "lightbulb.fill")
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(theme.accent)

            Text(recommendation)
                .font(.appBody(size: 13))
                .foregroundStyle(theme.textSecondary)
                .lineLimit(2)

            Spacer(minLength: 0)
        }
        .padding(.horizontal, Spacing.md)
        .padding(.vertical, Spacing.sm)
        .background(
            RoundedRectangle(cornerRadius: Radii.sm, style: .continuous)
                .fill(theme.accent.opacity(0.06))
        )
    }

    // MARK: - Confidence Badge

    private func confidenceBadge(_ confidence: PredictionConfidence) -> some View {
        let color = confidenceColor(confidence.qualityLabel)
        return HStack(spacing: 4) {
            Circle()
                .fill(color)
                .frame(width: 6, height: 6)
            Text(confidence.qualityLabel.capitalized)
                .font(.appBody(size: 11, weight: .semibold))
                .foregroundStyle(color)
        }
    }

    private func confidenceColor(_ label: String) -> Color {
        switch label.lowercased() {
        case "high", "good": return theme.success
        case "medium", "fair": return Color(hex: "#f59e0b")
        default: return theme.textMuted
        }
    }

    // MARK: - Formatting

    private func formatMinutes(_ minutes: Double) -> String {
        let rounded = Int(minutes.rounded())
        if rounded <= 0 { return "Now" }
        if rounded < 60 { return "~\(rounded)m" }
        let hours = rounded / 60
        let mins = rounded % 60
        if mins == 0 { return "~\(hours)h" }
        return "~\(hours)h \(mins)m"
    }
}

// MARK: - Preview

#Preview {
    PredictionCardsRow(
        predictions: AnalyticsPredictions(
            nextFeeding: Prediction(
                inMinutes: 45,
                pastDue: false,
                confidence: PredictionConfidence(rangeMinutes: 15, qualityLabel: "good")
            ),
            nextNap: NapPrediction(
                inMinutes: 80,
                pastDue: false,
                confidence: PredictionConfidence(rangeMinutes: 20, qualityLabel: "fair"),
                status: "awake",
                statusLabel: nil,
                wakeWindow: nil
            ),
            sleepPressure: SleepPressure(
                score: 42,
                zone: "low",
                label: "Low pressure",
                minutesAwake: 90,
                recommendation: "Consider starting nap routine soon"
            )
        ),
        hasEnoughData: true
    )
    .padding()
}
