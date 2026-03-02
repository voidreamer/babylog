import SwiftUI

struct StatusHeroCard: View {
    let baby: Baby
    let predictions: AnalyticsPredictions?
    let currentSleep: SleepRecord?
    let lastSleep: SleepRecord?
    let hasEnoughData: Bool
    var onTapInsights: (() -> Void)?
    var onEndSleep: (() -> Void)?

    @Environment(\.colorScheme) private var colorScheme

    private var theme: ResolvedTheme {
        AppTheme.resolved(for: colorScheme)
    }

    private var isSleeping: Bool { currentSleep != nil }

    // MARK: - Body

    var body: some View {
        HStack(spacing: Spacing.md) {
            // Left: ring with timer
            pressureRing
                .frame(width: 68, height: 68)

            // Right: status info
            VStack(alignment: .leading, spacing: Spacing.xs) {
                // Status text
                Text(statusText)
                    .font(.appBody(size: 15, weight: .semibold))
                    .foregroundStyle(isSleeping ? theme.sleep.main : theme.text)
                    .lineLimit(2)

                // SP badge + confidence when we have data
                if let score = predictions?.sleepPressure?.score, hasEnoughData {
                    HStack(spacing: Spacing.xs) {
                        Text("SP \(Int(score))")
                            .font(.appBody(size: 10, weight: .bold))
                            .foregroundStyle(gaugeColor(score: score))
                            .padding(.horizontal, Spacing.sm)
                            .padding(.vertical, 2)
                            .background(gaugeColor(score: score).opacity(0.12))
                            .clipShape(Capsule())

                        if let confidence = predictions?.nextNap?.confidence?.qualityLabel {
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
            }

            Spacer(minLength: 0)

            // End Sleep button when sleeping
            if isSleeping {
                Button {
                    onEndSleep?()
                } label: {
                    VStack(spacing: Spacing.xs) {
                        Image(systemName: "stop.fill")
                            .font(.system(size: 14, weight: .semibold))
                        Text("End")
                            .font(.appBody(size: 10, weight: .semibold))
                    }
                    .foregroundStyle(.white)
                    .frame(width: 48, height: 48)
                    .background(theme.sleep.main)
                    .clipShape(Circle())
                }
            }
        }
        .padding(Spacing.lg)
        .background(
            RoundedRectangle(cornerRadius: Radii.lg, style: .continuous)
                .fill(isSleeping ? theme.sleep.bg.opacity(0.4) : theme.surface)
                .overlay(
                    RoundedRectangle(cornerRadius: Radii.lg, style: .continuous)
                        .stroke(
                            isSleeping ? theme.sleep.main.opacity(0.3) : theme.borderLight,
                            lineWidth: isSleeping ? 1 : 0.5
                        )
                )
                .shadow(
                    color: AppShadow.card.color,
                    radius: AppShadow.card.radius,
                    x: AppShadow.card.x,
                    y: AppShadow.card.y
                )
        )
        .contentShape(Rectangle())
        .onTapGesture {
            if hasEnoughData, predictions?.sleepPressure != nil {
                onTapInsights?()
            }
        }
    }

    // MARK: - Pressure Ring with Live Timer

    private var pressureRing: some View {
        SwiftUI.TimelineView(.periodic(from: .now, by: 1.0)) { context in
            let elapsed = elapsedTime(at: context.date)

            ZStack {
                // Background ring
                Circle()
                    .stroke(ringBackgroundColor.opacity(0.3), style: StrokeStyle(lineWidth: 6, lineCap: .round))

                // Filled ring
                if let score = predictions?.sleepPressure?.score, hasEnoughData {
                    Circle()
                        .trim(from: 0, to: min(score / 100, 1.0))
                        .stroke(
                            ringGradient(score: score),
                            style: StrokeStyle(lineWidth: 6, lineCap: .round)
                        )
                        .rotationEffect(.degrees(-90))
                } else if isSleeping {
                    Circle()
                        .trim(from: 0, to: 0.75)
                        .stroke(
                            theme.sleep.main,
                            style: StrokeStyle(lineWidth: 6, lineCap: .round)
                        )
                        .rotationEffect(.degrees(-90))
                }

                // Center: elapsed time
                VStack(spacing: 0) {
                    Text(elapsed)
                        .font(.system(size: 14, weight: .bold, design: .rounded))
                        .foregroundStyle(isSleeping ? theme.sleep.main : theme.text)
                        .monospacedDigit()

                    Text(isSleeping ? "asleep" : "awake")
                        .font(.system(size: 9, weight: .medium))
                        .foregroundStyle(theme.textMuted)
                }

                // Pulsing dot when sleeping
                if isSleeping {
                    Circle()
                        .fill(theme.sleep.main)
                        .frame(width: 8, height: 8)
                        .offset(y: -30)
                        .modifier(PulseModifier())
                }
            }
        }
    }

    // MARK: - Elapsed Time

    private func elapsedTime(at now: Date) -> String {
        let referenceTime: Date?

        if let sleepStart = currentSleep?.startTime {
            referenceTime = parseISO8601(sleepStart)
        } else if let lastEnd = lastSleep?.endTime {
            referenceTime = parseISO8601(lastEnd)
        } else if let lastStart = lastSleep?.startTime,
                  let dur = lastSleep?.durationMinutes {
            if let start = parseISO8601(lastStart) {
                referenceTime = start.addingTimeInterval(dur * 60)
            } else {
                referenceTime = nil
            }
        } else {
            referenceTime = nil
        }

        guard let ref = referenceTime else { return "--:--" }

        let interval = max(0, now.timeIntervalSince(ref))
        let hours = Int(interval) / 3600
        let minutes = (Int(interval) % 3600) / 60
        let seconds = Int(interval) % 60

        if hours > 0 {
            return String(format: "%d:%02d:%02d", hours, minutes, seconds)
        }
        return String(format: "%d:%02d", minutes, seconds)
    }

    // MARK: - Status Text

    private var statusText: String {
        if isSleeping {
            return "Currently sleeping..."
        }

        guard hasEnoughData else {
            return "Tracking \(baby.name)'s day"
        }

        if let nap = predictions?.nextNap {
            if nap.pastDue == true || (nap.inMinutes ?? 0) <= 0 {
                return "Nap window open now"
            }
            if let minutes = nap.inMinutes {
                return "Nap window in ~\(Int(minutes))m"
            }
        }

        if let pressure = predictions?.sleepPressure {
            return pressure.label
        }

        return "Tracking \(baby.name)'s day"
    }

    // MARK: - Ring Colors

    private var ringBackgroundColor: Color {
        if isSleeping { return theme.sleep.main }
        if let score = predictions?.sleepPressure?.score, hasEnoughData {
            return gaugeColor(score: score)
        }
        return theme.textMuted
    }

    private func ringGradient(score: Double) -> AngularGradient {
        AngularGradient(
            colors: [theme.success, Color(hex: "#f59e0b"), theme.danger],
            center: .center,
            startAngle: .degrees(-90),
            endAngle: .degrees(-90 + 360 * min(score / 100, 1.0))
        )
    }

    private func gaugeColor(score: Double) -> Color {
        if score < 40 { return theme.success }
        if score < 70 { return Color(hex: "#f59e0b") }
        return theme.danger
    }

    private func confidenceColor(_ label: String) -> Color {
        switch label.lowercased() {
        case "high": return theme.success
        case "fair": return Color(hex: "#f59e0b")
        default: return theme.textMuted
        }
    }

    private func parseISO8601(_ string: String) -> Date? {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = formatter.date(from: string) { return date }
        formatter.formatOptions = [.withInternetDateTime]
        return formatter.date(from: string)
    }
}

// MARK: - Pulse Animation Modifier

private struct PulseModifier: ViewModifier {
    @State private var isPulsing = false

    func body(content: Content) -> some View {
        content
            .opacity(isPulsing ? 0.3 : 1.0)
            .animation(
                .easeInOut(duration: 1.2).repeatForever(autoreverses: true),
                value: isPulsing
            )
            .onAppear { isPulsing = true }
    }
}
