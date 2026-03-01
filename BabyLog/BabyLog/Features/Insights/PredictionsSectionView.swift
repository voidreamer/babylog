import SwiftUI

// MARK: - PredictionsSectionView

struct PredictionsSectionView: View {

    let predictions: AnalyticsPredictions

    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        let theme = AppTheme.resolved(for: colorScheme)

        VStack(alignment: .leading, spacing: Spacing.md) {
            // Section header
            HStack(spacing: Spacing.sm) {
                Image(systemName: "sparkles")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(theme.accent)
                Text("Predictions")
                    .font(.appHeading(size: 18, weight: .semibold))
                    .foregroundStyle(theme.text)
            }

            // Next Feeding
            if let feeding = predictions.nextFeeding {
                feedingPredictionRow(feeding, theme: theme)
            }

            // Next Nap
            if let nap = predictions.nextNap {
                napPredictionRow(nap, theme: theme)
            }

            // Sleep Pressure
            if let pressure = predictions.sleepPressure {
                sleepPressureGauge(pressure, theme: theme)
            }
        }
        .cardStyle()
    }

    // MARK: - Feeding Prediction Row

    private func feedingPredictionRow(_ prediction: Prediction, theme: ResolvedTheme) -> some View {
        HStack(spacing: Spacing.md) {
            // Icon
            ZStack {
                Circle()
                    .fill(theme.feeding.bg)
                    .frame(width: 40, height: 40)
                Image(systemName: "fork.knife")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundStyle(theme.feeding.main)
            }

            // Label & time
            VStack(alignment: .leading, spacing: 2) {
                Text("Next Feeding")
                    .font(.appBody(size: 14, weight: .medium))
                    .foregroundStyle(theme.textSecondary)

                if prediction.pastDue == true {
                    Text("Past due")
                        .font(.appBody(size: 16, weight: .bold))
                        .foregroundStyle(theme.danger)
                } else {
                    Text(formatMinutes(prediction.inMinutes ?? 0))
                        .font(.appBody(size: 16, weight: .bold))
                        .foregroundStyle(theme.text)
                }
            }

            Spacer()

            // Confidence badge
            if let confidence = prediction.confidence {
                confidenceBadge(confidence, theme: theme)
            }
        }
        .padding(Spacing.md)
        .background(
            RoundedRectangle(cornerRadius: Radii.sm, style: .continuous)
                .fill(prediction.pastDue == true ? theme.danger.opacity(0.08) : Color.clear)
        )
    }

    // MARK: - Nap Prediction Row

    private func napPredictionRow(_ nap: NapPrediction, theme: ResolvedTheme) -> some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            HStack(spacing: Spacing.md) {
                // Icon
                ZStack {
                    Circle()
                        .fill(theme.sleep.bg)
                        .frame(width: 40, height: 40)
                    Image(systemName: "moon.zzz")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundStyle(theme.sleep.main)
                }

                // Label & time
                VStack(alignment: .leading, spacing: 2) {
                    Text("Next Nap")
                        .font(.appBody(size: 14, weight: .medium))
                        .foregroundStyle(theme.textSecondary)

                    if nap.pastDue == true {
                        Text("Past due")
                            .font(.appBody(size: 16, weight: .bold))
                            .foregroundStyle(theme.danger)
                    } else {
                        Text(formatMinutes(nap.inMinutes ?? 0))
                            .font(.appBody(size: 16, weight: .bold))
                            .foregroundStyle(theme.text)
                    }
                }

                Spacer()

                // Confidence badge
                if let confidence = nap.confidence {
                    confidenceBadge(confidence, theme: theme)
                }
            }
            .padding(Spacing.md)
            .background(
                RoundedRectangle(cornerRadius: Radii.sm, style: .continuous)
                    .fill(nap.pastDue == true ? theme.danger.opacity(0.08) : Color.clear)
            )

            // Status label
            if let statusLabel = nap.statusLabel {
                HStack(spacing: Spacing.xs) {
                    Image(systemName: "info.circle")
                        .font(.system(size: 12))
                    Text(statusLabel)
                        .font(.appBody(size: 13))
                }
                .foregroundStyle(theme.textMuted)
                .padding(.leading, Spacing.md)
            }

            // Wake window info
            if let wakeWindow = nap.wakeWindow {
                HStack(spacing: Spacing.xs) {
                    Image(systemName: "clock")
                        .font(.system(size: 12))
                    Text("Wake window: \(formatHours(wakeWindow.min))–\(formatHours(wakeWindow.max))")
                        .font(.appBody(size: 13))
                }
                .foregroundStyle(theme.textMuted)
                .padding(.leading, Spacing.md)
            }
        }
    }

    // MARK: - Sleep Pressure Gauge

    private func sleepPressureGauge(_ pressure: SleepPressure, theme: ResolvedTheme) -> some View {
        VStack(alignment: .leading, spacing: Spacing.sm) {
            HStack {
                Text("Sleep Pressure")
                    .font(.appBody(size: 14, weight: .medium))
                    .foregroundStyle(theme.textSecondary)
                Spacer()
                Text(pressure.label)
                    .font(.appBody(size: 14, weight: .semibold))
                    .foregroundStyle(zoneColor(pressure.zone, theme: theme))
            }

            // Gauge bar
            GeometryReader { geometry in
                ZStack(alignment: .leading) {
                    // Background track
                    RoundedRectangle(cornerRadius: 4)
                        .fill(theme.border)
                        .frame(height: 8)

                    // Fill
                    RoundedRectangle(cornerRadius: 4)
                        .fill(zoneColor(pressure.zone, theme: theme))
                        .frame(width: geometry.size.width * min(pressure.score / 100.0, 1.0), height: 8)
                }
            }
            .frame(height: 8)

            // Zone indicators
            HStack {
                zoneLabel("Low", isActive: pressure.zone == "low", theme: theme)
                Spacer()
                zoneLabel("Medium", isActive: pressure.zone == "medium", theme: theme)
                Spacer()
                zoneLabel("High", isActive: pressure.zone == "high", theme: theme)
            }

            // Recommendation
            HStack(spacing: Spacing.xs) {
                Image(systemName: "lightbulb")
                    .font(.system(size: 12))
                Text(pressure.recommendation)
                    .font(.appBody(size: 13))
            }
            .foregroundStyle(theme.textMuted)

            // Awake duration
            Text("Awake for \(formatMinutes(pressure.minutesAwake))")
                .font(.appBody(size: 12))
                .foregroundStyle(theme.textMuted)
        }
        .padding(Spacing.md)
        .background(
            RoundedRectangle(cornerRadius: Radii.sm, style: .continuous)
                .fill(theme.surface)
        )
    }

    // MARK: - Helpers

    private func confidenceBadge(_ confidence: PredictionConfidence, theme: ResolvedTheme) -> some View {
        let color = confidenceColor(confidence.qualityLabel, theme: theme)
        return Text(confidence.qualityLabel.capitalized)
            .font(.appBody(size: 11, weight: .semibold))
            .foregroundStyle(color)
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(color.opacity(0.12))
            .clipShape(Capsule())
    }

    private func confidenceColor(_ label: String, theme: ResolvedTheme) -> Color {
        switch label.lowercased() {
        case "high", "good":    return theme.success
        case "medium", "fair":  return Color.orange
        case "low", "poor":     return theme.danger
        default:                return theme.textMuted
        }
    }

    private func zoneColor(_ zone: String, theme: ResolvedTheme) -> Color {
        switch zone.lowercased() {
        case "low":    return theme.success
        case "medium": return Color.orange
        case "high":   return theme.danger
        default:       return theme.textMuted
        }
    }

    private func zoneLabel(_ label: String, isActive: Bool, theme: ResolvedTheme) -> some View {
        Text(label)
            .font(.appBody(size: 11, weight: isActive ? .bold : .regular))
            .foregroundStyle(isActive ? zoneColor(label.lowercased(), theme: theme) : theme.textMuted)
    }

    private func formatMinutes(_ minutes: Double) -> String {
        let rounded = Int(minutes.rounded())
        if rounded < 60 {
            return "~\(rounded) min"
        }
        let hours = rounded / 60
        let mins = rounded % 60
        if mins == 0 {
            return "~\(hours)h"
        }
        return "~\(hours)h \(mins)m"
    }

    private func formatHours(_ hours: Double) -> String {
        let h = Int(hours)
        let m = Int((hours - Double(h)) * 60)
        if m == 0 {
            return "\(h)h"
        }
        return "\(h)h \(m)m"
    }
}

// MARK: - Preview

#Preview {
    PredictionsSectionView(
        predictions: AnalyticsPredictions(
            nextFeeding: Prediction(
                inMinutes: 45,
                pastDue: false,
                confidence: PredictionConfidence(rangeMinutes: 15, qualityLabel: "good")
            ),
            nextNap: NapPrediction(
                inMinutes: 90,
                pastDue: false,
                confidence: PredictionConfidence(rangeMinutes: 20, qualityLabel: "fair"),
                status: "awake",
                statusLabel: "Baby has been awake for 1.5 hours",
                wakeWindow: WakeWindow(min: 1.5, max: 2.5)
            ),
            sleepPressure: SleepPressure(
                score: 60,
                zone: "medium",
                label: "Medium",
                minutesAwake: 90,
                recommendation: "Consider starting nap routine soon"
            )
        )
    )
    .padding()
}
